import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import Decimal from "decimal.js";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const MIN_USD = new Decimal(5);
const MAX_USD = new Decimal(200000);

// Paystack's maximum for a single transfer in Ghana
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
        return value.isFinite() && value.gte(0) ? value : new Decimal(fallback);
    } catch {
        return new Decimal(fallback);
    }
}

export async function POST(req: Request) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---------- ADMIN ONLY (fails closed) ----------
    // Platform money can only be withdrawn by an admin account.
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.role !== "admin") {
        console.log("ADMIN WITHDRAW BLOCKED:", user.id, profileError?.message);
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // ---------- read and validate the request ----------
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
            { error: "Withdrawal must be between $5 and $200,000 with at most 2 decimals" },
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
            { error: method === "mobile_money" ? "Enter a 10-digit mobile money number starting with 0" : "Invalid bank account number" },
            { status: 400 }
        );
    }

    if (accountName.length < 2 || accountName.length > 100) {
        return NextResponse.json({ error: "Enter the account holder's name" }, { status: 400 });
    }

    // ---------- amounts (the server decides all of them) ----------
    let rate: Decimal;
    try {
        rate = new Decimal(
            process.env.USD_GHS_PAYOUT_RATE || process.env.USD_GHS_RATE || ""
        );
    } catch {
        rate = new Decimal(0);
    }
    if (!rate.isFinite() || rate.lte(0)) {
        return NextResponse.json({ error: "Withdrawals are temporarily unavailable" }, { status: 500 });
    }

    const fee =
        method === "mobile_money"
            ? envDecimal("WITHDRAWAL_FEE_MOBILE_GHS", "1")
            : envDecimal("WITHDRAWAL_FEE_BANK_GHS", "8");

    const ghsGross = usd.mul(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const ghsNet = ghsGross.minus(fee);

    if (ghsNet.lt(1)) {
        return NextResponse.json({ error: "Amount is too small after fees" }, { status: 400 });
    }

    if (ghsNet.gt(MAX_TRANSFER_GHS)) {
        const maxUsd = MAX_TRANSFER_GHS.plus(fee).div(rate).toDecimalPlaces(2, Decimal.ROUND_DOWN);
        return NextResponse.json(
            { error: `A single withdrawal can be at most about $${maxUsd.toFixed(2)}. Please withdraw a smaller amount.` },
            { status: 400 }
        );
    }

    const pesewas = ghsNet.mul(100).toDecimalPlaces(0).toNumber();

    // ---------- 1. create the Paystack recipient (wallet untouched until this works) ----------
    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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

    const recipientJson = await recipientRes.json().catch(() => null);
    const recipientCode: string | undefined = recipientJson?.data?.recipient_code;

    if (!recipientRes.ok || !recipientCode) {
        console.log("ADMIN RECIPIENT ERROR:", recipientJson);
        return NextResponse.json(
            { error: "Could not verify those payout details. Please check them and try again." },
            { status: 400 }
        );
    }

    // ---------- 2. deduct the admin wallet and record the withdrawal (atomic) ----------
    // Reference prefix "unisev_awd_" tells the webhook this is an admin withdrawal.
    const reference = `unisev_awd_${randomUUID()}`;

    const { data: created, error: createError } = await supabaseAdmin.rpc(
        "request_admin_withdrawal",
        {
            p_user_id: user.id,
            p_reference: reference,
            p_usd: usd.toFixed(2),
            p_rate: rate.toFixed(8),
            p_rate_at: new Date().toISOString(),
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
        console.log("REQUEST ADMIN WITHDRAWAL ERROR:", createError);
        return NextResponse.json({ error: "Could not start withdrawal" }, { status: 500 });
    }

    if (created?.result === "insufficient_funds") {
        return NextResponse.json({ error: "Insufficient platform balance" }, { status: 400 });
    }

    if (created?.result !== "created") {
        return NextResponse.json({ error: "Could not start withdrawal" }, { status: 500 });
    }

    // ---------- DEV ONLY: pretend the transfer was sent ----------
    if (
        process.env.SIMULATE_TRANSFERS === "true" &&
        process.env.NODE_ENV !== "production"
    ) {
        await supabaseAdmin
            .from("admin_withdrawals")
            .update({
                status: "processing",
                transfer_code: `SIMULATED_${reference}`,
                updated_at: new Date().toISOString(),
            })
            .eq("reference", reference)
            .eq("status", "pending");

        return NextResponse.json({
            status: "processing",
            reference,
            ghsNet: ghsNet.toFixed(2),
        });
    }

    // ---------- 3. send the transfer ----------
    let transferRes: Response;
    try {
        transferRes = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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
        // Network problem: the transfer may or may not exist. Leave it pending
        // so the webhook / a later check can settle it. Do NOT refund yet.
        console.log("ADMIN TRANSFER NETWORK ERROR:", error);
        return NextResponse.json({ status: "pending", reference });
    }

    const transferJson = await transferRes.json().catch(() => null);

    // Definite rejection by Paystack: refund now
    if (!transferRes.ok && transferRes.status < 500) {
        console.log("ADMIN TRANSFER REJECTED:", transferJson);

        await supabaseAdmin.rpc("finalize_admin_withdrawal", {
            p_reference: reference,
            p_outcome: "failed",
            p_transfer_code: null,
            p_reason: String(transferJson?.message || "transfer_rejected").slice(0, 200),
            p_raw: transferJson,
        });

        const detail =
            process.env.NODE_ENV !== "production" && transferJson?.message
                ? ` (Paystack: ${String(transferJson.message).slice(0, 150)})`
                : "";

        return NextResponse.json(
            { error: `Withdrawals are temporarily unavailable. The platform wallet was not charged.${detail}` },
            { status: 502 }
        );
    }

    // Paystack server problem: outcome unknown, leave pending
    if (!transferRes.ok) {
        console.log("ADMIN TRANSFER SERVER ERROR:", transferJson);
        return NextResponse.json({ status: "pending", reference });
    }

    const transferCode: string | undefined = transferJson?.data?.transfer_code;
    const transferStatus: string | undefined = transferJson?.data?.status;

    if (transferStatus === "otp") {
        console.log("ADMIN TRANSFER WAITING FOR OTP: turn off transfer OTP in Paystack settings", transferCode);
    }

    await supabaseAdmin
        .from("admin_withdrawals")
        .update({
            status: "processing",
            transfer_code: transferCode ?? null,
            failure_reason: transferStatus === "otp" ? "awaiting_otp" : null,
            updated_at: new Date().toISOString(),
        })
        .eq("reference", reference)
        .eq("status", "pending");

    return NextResponse.json({
        status: "processing",
        reference,
        ghsNet: ghsNet.toFixed(2),
    });
}