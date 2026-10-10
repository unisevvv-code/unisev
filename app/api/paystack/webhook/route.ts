import { NextResponse } from "next/server";
import crypto from "crypto";
import Decimal from "decimal.js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PaystackEvent {
    event: string;
    data: {
        id?: number | string;
        reference: string;
        amount: number;
        currency: string;
        fees?: number | null;
        transfer_code?: string;
        reason?: string;
        [key: string]: unknown;
    };
}

export async function POST(req: Request) {
    // Raw body is required for the signature check
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    const expected = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
        .update(rawBody)
        .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    let event: PaystackEvent;
    try {
        event = JSON.parse(rawBody) as PaystackEvent;
    } catch {
        return NextResponse.json({ error: "Bad payload" }, { status: 400 });
    }

    // ---------------- deposits ----------------
    if (event.event === "charge.success") {
        
        const tx = event.data;

        const { error } = await supabaseAdmin.rpc("credit_wallet_from_payment", {
            p_reference: tx.reference,
            p_paid_amount_ghs: new Decimal(tx.amount).div(100).toFixed(2),
            p_currency: tx.currency,
            p_gateway_txn_id: String(tx.id),
            p_fee_ghs: new Decimal(tx.fees ?? 0).div(100).toFixed(2),
            p_raw: tx,
        });

        // 500 makes Paystack retry later
        if (error) {
            console.log("WEBHOOK CREDIT ERROR:", error);
            return NextResponse.json({ error: "Processing error" }, { status: 500 });
        }
    }

    // ---------------- withdrawals ----------------
    if (
        event.event === "transfer.success" ||
        event.event === "transfer.failed" ||
        event.event === "transfer.reversed"
    ) {
        const tx = event.data;

        const outcome =
            event.event === "transfer.success"
                ? "completed"
                : event.event === "transfer.failed"
                  ? "failed"
                  : "reversed";

                const rpcName = String(tx.reference).startsWith("unisev_awd_")
            ? "finalize_admin_withdrawal"
            : "finalize_withdrawal";

        const { error } = await supabaseAdmin.rpc(rpcName, {
            p_reference: tx.reference,
            p_outcome: outcome,
            p_transfer_code: tx.transfer_code ?? null,
            p_reason: outcome === "completed" ? null : String(tx.reason || event.event).slice(0, 200),
            p_raw: tx,
        });

        if (error) {
            console.log("WEBHOOK WITHDRAWAL ERROR:", error);
            return NextResponse.json({ error: "Processing error" }, { status: 500 });
        }
    }

    // Always 200 for valid, handled or ignored events
    return NextResponse.json({ received: true });
}