import { NextResponse } from "next/server";
import Decimal from "decimal.js";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reference = new URL(req.url).searchParams.get("reference");
    if (!reference) {
        return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    // The payment must exist and belong to this user
    const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("id, user_id, status")
        .eq("reference", reference)
        .single();

    if (!payment || payment.user_id !== user.id) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "successful") {
        return NextResponse.json({ status: "successful" });
    }

    const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.data) {
        return NextResponse.json({ status: "pending" });
    }

    const tx = json.data;

    if (tx.reference !== reference) {
    console.error("PAYSTACK REFERENCE MISMATCH:", {
        requestedReference: reference,
        returnedReference: tx.reference,
    });

    return NextResponse.json(
        { status: "pending", error: "Transaction reference mismatch" },
        { status: 409 }
    );
}

    if (tx.status === "success") {
        const { data, error } = await supabaseAdmin.rpc("credit_wallet_from_payment", {
            p_reference: reference,
            p_paid_amount_ghs: new Decimal(tx.amount).div(100).toFixed(2),
            p_currency: tx.currency,
            p_gateway_txn_id: String(tx.id),
            p_fee_ghs: new Decimal(tx.fees ?? 0).div(100).toFixed(2),
            p_raw: tx,
        });

        if (error) {
            console.log("CREDIT ERROR:", error);
            return NextResponse.json({ status: "pending" }, { status: 500 });
        }

        const result = data?.result;
        if (result === "credited" || result === "already_processed") {
            return NextResponse.json({ status: "successful" });
        }
        return NextResponse.json({ status: "failed" });
    }

    if (tx.status === "failed") {
        await supabaseAdmin
            .from("payments")
            .update({
                status: "failed",
                failure_reason: "gateway_failed",
                updated_at: new Date().toISOString(),
            })
            .eq("reference", reference)
            .eq("status", "pending");
        return NextResponse.json({ status: "failed" });
    }

    // "abandoned" / "ongoing" / "pending": leave as pending
    return NextResponse.json({ status: "pending" });
}