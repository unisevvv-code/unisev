
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
        status?: string;
        fees?: number | null;
        transfer_code?: string;
        reason?: string;
        [key: string]: unknown;
    };
}

function isValidAmount(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
        console.error("PAYSTACK_SECRET_KEY is not configured");
        return NextResponse.json(
            { error: "Webhook is not configured" },
            { status: 500 }
        );
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    const expected = crypto
        .createHmac("sha512", secret)
        .update(rawBody)
        .digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");

    if (
        !/^[a-fA-F0-9]{128}$/.test(signature) ||
        expectedBuffer.length !== 64 ||
        signatureBuffer.length !== 64 ||
        !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
        );
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Bad payload" }, { status: 400 });
    }

    if (
        !isRecord(parsed) ||
        typeof parsed.event !== "string" ||
        !isRecord(parsed.data) ||
        typeof parsed.data.reference !== "string" ||
        !parsed.data.reference.trim()
    ) {
        return NextResponse.json(
            { error: "Invalid event payload" },
            { status: 400 }
        );
    }

    const event = parsed as unknown as PaystackEvent;
    const tx = event.data;

    // ---------------- deposits ----------------
    if (event.event === "charge.success") {
        if (
            !isValidAmount(tx.amount) ||
            tx.amount <= 0 ||
            typeof tx.currency !== "string" ||
            (typeof tx.id !== "string" && typeof tx.id !== "number") ||
            String(tx.id).length === 0 ||
            (tx.fees !== undefined &&
                tx.fees !== null &&
                (!isValidAmount(tx.fees) || tx.fees < 0))
        ) {
            return NextResponse.json(
                { error: "Invalid payment payload" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin.rpc(
            "credit_wallet_from_payment",
            {
                p_reference: tx.reference,
                p_paid_amount_ghs: new Decimal(tx.amount).div(100).toFixed(2),
                p_currency: tx.currency,
                p_gateway_txn_id: String(tx.id),
                p_fee_ghs: new Decimal(tx.fees ?? 0).div(100).toFixed(2),
                p_raw: tx,
            }
        );

        if (error) {
            console.error("WEBHOOK CREDIT ERROR:", error);
            return NextResponse.json(
                { error: "Processing error" },
                { status: 500 }
            );
        }

        const result = isRecord(data) ? data.result : undefined;

        if (result === "credited" || result === "already_processed") {
            return NextResponse.json({ received: true });
        }

        // Do not silently acknowledge missing references, mismatches, or
        // unexpected states. Alert through logs and let Paystack retry.
        console.error("WEBHOOK DEPOSIT NOT CREDITED:", {
            reference: tx.reference,
            result,
            data,
        });

        if (result === "not_found" || result === "mismatch" || result === "invalid_state") {
            // These need investigation; a retry alone may not resolve them.
            // Return 200 to avoid retry storms while retaining an error log.
            return NextResponse.json({
                received: true,
                reconciliationRequired: true,
            });
        }

        return NextResponse.json(
            { error: "Unexpected deposit processing result" },
            { status: 500 }
        );
    }

    // ---------------- withdrawals ----------------
    if (
        event.event === "transfer.success" ||
        event.event === "transfer.failed" ||
        event.event === "transfer.reversed"
    ) {
        if (
            !isValidAmount(tx.amount) ||
            tx.amount <= 0 ||
            typeof tx.currency !== "string"
        ) {
            return NextResponse.json(
                { error: "Invalid transfer payload" },
                { status: 400 }
            );
        }

        const reference = tx.reference;
        const isAdmin = reference.startsWith("unisev_awd_");
        const table = isAdmin ? "admin_withdrawals" : "withdrawals";

        const { data: withdrawal, error: lookupError } = await supabaseAdmin
            .from(table)
            .select("reference, ghs_net, status")
            .eq("reference", reference)
            .maybeSingle();

        if (lookupError) {
            console.error("WITHDRAWAL LOOKUP ERROR:", lookupError);
            return NextResponse.json(
                { error: "Could not verify withdrawal" },
                { status: 500 }
            );
        }

        if (!withdrawal) {
            console.error("UNKNOWN PAYSTACK TRANSFER REFERENCE:", reference);
            return NextResponse.json(
                { error: "Unknown transfer reference" },
                { status: 400 }
            );
        }

        const eventGhs = new Decimal(tx.amount).div(100);
        const expectedGhs = new Decimal(String(withdrawal.ghs_net));

        if (
            tx.currency.toUpperCase() !== "GHS" ||
            !eventGhs.equals(expectedGhs)
        ) {
            console.error("TRANSFER AMOUNT/CURRENCY MISMATCH:", {
                reference,
                eventAmountGhs: eventGhs.toFixed(2),
                expectedAmountGhs: expectedGhs.toFixed(2),
                currency: tx.currency,
            });

            return NextResponse.json(
                { error: "Transfer amount or currency mismatch" },
                { status: 400 }
            );
        }

        // Reversal is not a normal failure. Do not refund automatically.
        // Keep the status unchanged and flag it for manual reconciliation.
        if (event.event === "transfer.reversed") {
            console.error("TRANSFER REVERSAL REQUIRES RECONCILIATION:", {
                reference,
                currentStatus: withdrawal.status,
                transferCode: tx.transfer_code ?? null,
            });

            // Store the event in logs without overwriting the existing raw_event.
            // A dedicated reconciliation table/status should be added later.
            return NextResponse.json({
                received: true,
                reconciliationRequired: true,
            });
        }

        const outcome =
            event.event === "transfer.success" ? "completed" : "failed";

        const rpcName = isAdmin
            ? "finalize_admin_withdrawal"
            : "finalize_withdrawal";

        const { data, error } = await supabaseAdmin.rpc(rpcName, {
            p_reference: reference,
            p_outcome: outcome,
            p_transfer_code: tx.transfer_code ?? null,
            p_reason:
                outcome === "completed"
                    ? null
                    : String(tx.reason || event.event).slice(0, 200),
            p_raw: tx,
        });

        if (error) {
            console.error("WEBHOOK WITHDRAWAL RPC ERROR:", error);
            return NextResponse.json(
                { error: "Processing error" },
                { status: 500 }
            );
        }

        const result = isRecord(data) ? data.result : undefined;

        if (
            result === "completed" ||
            result === "refunded" ||
            result === "already_processed"
        ) {
            return NextResponse.json({ received: true });
        }

        if (result === "reconciliation_required") {
            console.error("WITHDRAWAL REQUIRES RECONCILIATION:", {
                reference,
                result,
            });

            return NextResponse.json({
                received: true,
                reconciliationRequired: true,
            });
        }

        console.error("WITHDRAWAL FINALIZATION NOT CONFIRMED:", {
            reference,
            outcome,
            result,
            data,
        });

        // Unexpected state/result: do not report successful processing.
        return NextResponse.json(
            { error: "Withdrawal finalization not confirmed" },
            { status: 500 }
        );
    }

    // Ignore other valid event types; they must not change wallet balances.
    return NextResponse.json({ received: true });
}
