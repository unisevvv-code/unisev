
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import Decimal from "decimal.js";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { getPaystackRates } from "@/lib/paystackRate";

export const dynamic = "force-dynamic";

const MIN_USD = new Decimal(1);
const MAX_USD = new Decimal(200000);

export async function POST(req: Request) {
    const user = await getUserFromRequest(req);
    if (!user || !user.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- validate amount (server decides everything else) ----
    let usd: Decimal;
    try {
        const body = await req.json();
        usd = new Decimal(String(body.usdAmount));
    } catch {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (
        !usd.isFinite() ||
        usd.lt(MIN_USD) ||
        usd.gt(MAX_USD) ||
        usd.decimalPlaces() > 2
    ) {
        return NextResponse.json(
            { error: "Amount must be between $1 and $200,000 with at most 2 decimals" },
            { status: 400 }
        );
    }

    // ---- fetch the latest daily exchange rate ----
    let rate: Decimal;
    let publishedAt: string;

    try {
        const rates = await getPaystackRates();
        rate = rates.rate;
        publishedAt = rates.publishedAt;
    } catch (error) {
        console.error("PAYMENT RATE ERROR:", error);

        return NextResponse.json(
            { error: "Daily exchange rate unavailable. Please try again later." },
            { status: 503 }
        );
    }

    const ghs = usd.mul(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const pesewas = ghs.mul(100).toDecimalPlaces(0).toNumber();

    // ---- save pending payment ----
    const reference = `unisev_${randomUUID()}`;

    const { error: insertError } = await supabaseAdmin.from("payments").insert({
        user_id: user.id,
        reference,
        usd_amount: usd.toFixed(2),
        ghs_amount: ghs.toFixed(2),
        exchange_rate: rate.toFixed(8),
        rate_fetched_at: new Date(publishedAt).toISOString(),
        gateway: "paystack",
        gateway_currency: "GHS",
        status: "pending",
    });

    if (insertError) {
        console.log("PAYMENT INSERT ERROR:", insertError);
        return NextResponse.json({ error: "Could not start payment" }, { status: 500 });
    }

    // ---- initialize with Paystack ----
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: user.email,
            amount: pesewas,
            currency: "GHS",
            reference,
            callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/callback`,
            metadata: { user_id: user.id, usd_amount: usd.toFixed(2) },
        }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.status || !json?.data?.authorization_url) {
        console.log("PAYSTACK INIT ERROR:", json);

        await supabaseAdmin
            .from("payments")
            .update({
                status: "failed",
                failure_reason: "initialize_failed",
                updated_at: new Date().toISOString(),
            })
            .eq("reference", reference)
            .eq("status", "pending");

        return NextResponse.json({ error: "Could not reach payment gateway" }, { status: 502 });
    }

    return NextResponse.json({
        authorization_url: json.data.authorization_url,
        reference,
        ghsAmount: ghs.toFixed(2),
    });
}
