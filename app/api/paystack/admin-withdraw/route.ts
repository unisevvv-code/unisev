
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import Decimal from "decimal.js";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { getPaystackRates } from "@/lib/paystackRate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_USD = new Decimal(5);
const MAX_USD = new Decimal(200000);
const MAX_TRANSFER_GHS = new Decimal(50000);

type Method = "mobile_money" | "bank";

interface WithdrawBody {
    usdAmount?: string | number;
    method?: string;
    providerCode?: string;
    accountNumber?: string;
    accountName?: string;
}

function envDecimal(name: string, fallback: string): Decimal {
    try {
        const value = new Decimal(process.env[name] || fallback);
        return value.isFinite() && value.gte(0)
            ? value
            : new Decimal(fallback);
    } catch {
        return new Decimal(fallback);
    }
}

function responseForStatus(status: string | null | undefined, reference: string) {
    if (status === "completed") {
        return NextResponse.json({ status: "completed", reference });
    }

    if (status === "failed") {
        return NextResponse.json(
            { error: "The transfer failed and the withdrawal was refunded.", reference },
            { status: 502 }
        );
    }

    if (status === "reversed") {
        return NextResponse.json(
            {
                status: "reconciliation_required",
                reference,
                message: "The transfer was reversed and requires reconciliation.",
            },
            { status: 202 }
        );
    }

    return NextResponse.json({ status: "pending", reference }, { status: 202 });
}

export async function POST(req: Request) {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret || !secret.startsWith("sk_live_")) {
        return NextResponse.json(
            { error: "Live withdrawals are not configured." },
            { status: 503 }
        );
    }

    const user = await getUserFromRequest(req);

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin-only authorization.
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.role !== "admin") {
        console.log("ADMIN WITHDRAW BLOCKED:", user.id, profileError?.message);
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    let body: WithdrawBody;

    try {
        body = (await req.json()) as WithdrawBody;
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const method = body.method as Method;

    if (method !== "mobile_money" && method !== "bank") {
        return NextResponse.json({ error: "Invalid payout method" }, { status: 400 });
    }

    let usd: Decimal;

    try {
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
            { error: "Withdrawal must be between $5 and $200,000 with at most 2 decimals." },
            { status: 400 }
        );
    }

    const providerCode = String(body.providerCode || "").trim();
    const accountNumber = String(body.accountNumber || "").replace(/\s+/g, "");
    const accountName = String(body.accountName || "").trim();

    if (!/^[A-Za-z0-9_-]{1,30}$/.test(providerCode)) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const numberOk =
        method === "mobile_money"
            ? /^0\d{9}$/.test(accountNumber)
            : /^\d{8,16}$/.test(accountNumber);

    if (!numberOk) {
        return NextResponse.json(
            {
                error:
                    method === "mobile_money"
                        ? "Enter a 10-digit mobile money number starting with 0."
                        : "Invalid bank account number.",
            },
            { status: 400 }
        );
    }

    if (accountName.length < 2 || accountName.length > 100) {
        return NextResponse.json(
            { error: "Enter the account holder's name." },
            { status: 400 }
        );
    }

   let rate: Decimal;
let ratePublishedAt: string;

try {
    const rates = await getPaystackRates();
    rate = rates.payoutRate;
    ratePublishedAt = rates.publishedAt;
} catch (error) {
    console.error("ADMIN WITHDRAWAL RATE ERROR:", error);

    return NextResponse.json(
        { error: "Daily exchange rate unavailable. Please try again later." },
        { status: 503 }
    );
}

    const fee =
        method === "mobile_money"
            ? envDecimal("WITHDRAWAL_FEE_MOBILE_GHS", "1")
            : envDecimal("WITHDRAWAL_FEE_BANK_GHS", "8");

    const ghsGross = usd.mul(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const ghsNet = ghsGross.minus(fee);

    if (ghsNet.lt(1)) {
        return NextResponse.json(
            { error: "Amount is too small after fees." },
            { status: 400 }
        );
    }

    if (ghsNet.gt(MAX_TRANSFER_GHS)) {
        const maxUsd = MAX_TRANSFER_GHS
            .plus(fee)
            .div(rate)
            .toDecimalPlaces(2, Decimal.ROUND_DOWN);

        return NextResponse.json(
            {
                error: `A single withdrawal can be at most about $${maxUsd.toFixed(2)}. Please withdraw a smaller amount.`,
            },
            { status: 400 }
        );
    }

    const pesewas = ghsNet.mul(100).toNumber();

    // 1. Create the recipient before touching the platform wallet.
    let recipientRes: Response;

    try {
        recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: method === "mobile_money" ? "mobile_money" : "ghipss",
                name: accountName,
                account_number: accountNumber,
                bank_code: providerCode,
                currency: "GHS",
            }),
        });
    } catch (error) {
        console.error("ADMIN RECIPIENT NETWORK ERROR:", error);
        return NextResponse.json(
            { error: "Could not verify payout details. Please try again." },
            { status: 502 }
        );
    }

    const recipientJson = await recipientRes.json().catch(() => null);
    const recipientCode: string | undefined = recipientJson?.data?.recipient_code;

    if (!recipientRes.ok || !recipientCode) {
        console.error("ADMIN RECIPIENT ERROR:", recipientJson);
        return NextResponse.json(
            { error: "Could not verify those payout details. Please check them and try again." },
            { status: 400 }
        );
    }

    // 2. Reserve the USD amount and create the pending database record.
    const reference = `unisev_awd_${randomUUID()}`;

    const { data: created, error: createError } = await supabaseAdmin.rpc(
        "request_admin_withdrawal",
        {
            p_user_id: user.id,
            p_reference: reference,
            p_usd: usd.toFixed(2),
            p_rate: rate.toFixed(8),
           p_rate_at: new Date(ratePublishedAt).toISOString(),
            p_ghs_gross: ghsGross.toFixed(2),
            p_fee: fee.toFixed(2),
            p_ghs_net: ghsNet.toFixed(2),
            p_method: method,
            p_provider: providerCode,
            p_last4: accountNumber.slice(-4),
            p_account_name: accountName,
            p_recipient_code: recipientCode,
        }
    );

    if (createError) {
        console.error("REQUEST ADMIN WITHDRAWAL ERROR:", createError);
        return NextResponse.json(
            { error: "Could not start withdrawal." },
            { status: 500 }
        );
    }

    if (created?.result === "insufficient_funds") {
        return NextResponse.json(
            { error: "Insufficient platform balance." },
            { status: 400 }
        );
    }

    if (created?.result !== "created") {
        console.error("UNEXPECTED ADMIN WITHDRAWAL RESULT:", created);
        return NextResponse.json(
            { error: "Could not start withdrawal." },
            { status: 500 }
        );
    }

    // 3. Initiate the real Paystack transfer. Never simulate it.
    let transferRes: Response;

    try {
        transferRes = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                source: "balance",
                amount: pesewas,
                currency: "GHS",
                recipient: recipientCode,
                reference,
                reason: "UniSeV platform withdrawal",
            }),
        });
    } catch (error) {
        // The request may have reached Paystack despite the network failure.
        // Leave the withdrawal pending; do not refund without reconciliation.
        console.error("ADMIN TRANSFER NETWORK ERROR:", error);
        return NextResponse.json({ status: "pending", reference }, { status: 202 });
    }

    const transferJson = await transferRes.json().catch(() => null);

    if (!transferRes.ok) {
        console.error("ADMIN TRANSFER HTTP ERROR:", {
            httpStatus: transferRes.status,
            reference,
            response: transferJson,
        });

        // Only attempt an immediate refund for a 4xx rejection.
        // If refund outcome cannot be confirmed, leave it for reconciliation.
        if (transferRes.status >= 400 && transferRes.status < 500) {
            const { data: finalized, error: finalizeError } =
                await supabaseAdmin.rpc("finalize_admin_withdrawal", {
                    p_reference: reference,
                    p_outcome: "failed",
                    p_transfer_code: null,
                    p_reason: String(
                        transferJson?.message || "Paystack rejected the transfer"
                    ).slice(0, 200),
                    p_raw: transferJson ?? {},
                });

            if (finalizeError) {
                console.error("ADMIN WITHDRAWAL REFUND ERROR:", finalizeError);
                return NextResponse.json(
                    {
                        status: "pending",
                        reference,
                        message: "The withdrawal needs reconciliation.",
                    },
                    { status: 202 }
                );
            }

            if (
                finalized?.result !== "refunded" &&
                finalized?.result !== "already_processed"
            ) {
                console.error("ADMIN WITHDRAWAL REFUND UNCONFIRMED:", finalized);
                return NextResponse.json(
                    {
                        status: "pending",
                        reference,
                        message: "The withdrawal needs reconciliation.",
                    },
                    { status: 202 }
                );
            }

            if (finalized?.result === "already_processed") {
                const { data: current } = await supabaseAdmin
                    .from("admin_withdrawals")
                    .select("status")
                    .eq("reference", reference)
                    .maybeSingle();

                return responseForStatus(current?.status, reference);
            }

            return NextResponse.json(
                {
                    status: "failed",
                    reference,
                    message: "Paystack rejected the transfer; the platform balance was refunded.",
                },
                { status: 502 }
            );
        }

        // 5xx: transfer outcome is uncertain. Do not refund automatically.
        return NextResponse.json({ status: "pending", reference }, { status: 202 });
    }

    const transferCode: string | undefined = transferJson?.data?.transfer_code;
    const transferStatus: string | undefined = transferJson?.data?.status;

    // An HTTP 2xx response is not enough: require a reference-matching response.
    if (
        transferJson?.data?.reference !== reference ||
        !transferCode ||
        (transferStatus !== "pending" && transferStatus !== "otp")
    ) {
        console.error("ADMIN TRANSFER RESPONSE NEEDS RECONCILIATION:", {
            reference,
            transferJson,
        });

        return NextResponse.json(
            {
                status: "pending",
                reference,
                message: "The transfer response needs verification.",
            },
            { status: 202 }
        );
    }

    const nextStatus = transferStatus === "otp" ? "awaiting_otp" : "processing";

    const { data: updated, error: updateError } = await supabaseAdmin
        .from("admin_withdrawals")
        .update({
            status: nextStatus,
            transfer_code: transferCode,
            failure_reason: transferStatus === "otp" ? "awaiting_otp" : null,
            updated_at: new Date().toISOString(),
        })
        .eq("reference", reference)
        .eq("status", "pending")
        .select("status")
        .maybeSingle();

    if (updateError) {
        console.error("ADMIN WITHDRAWAL STATUS UPDATE ERROR:", updateError);
    }

    // A webhook may already have updated the row, or the update may have failed.
    // Read the authoritative database state rather than assuming "processing".
    if (!updated) {
        const { data: current, error: readError } = await supabaseAdmin
            .from("admin_withdrawals")
            .select("status")
            .eq("reference", reference)
            .maybeSingle();

        if (readError || !current) {
            console.error("ADMIN WITHDRAWAL STATUS READ ERROR:", readError);
            return NextResponse.json(
                { status: "pending", reference },
                { status: 202 }
            );
        }

        return responseForStatus(current.status, reference);
    }

    return NextResponse.json({
        status: nextStatus,
        reference,
        ghsNet: ghsNet.toFixed(2),
    });
}
