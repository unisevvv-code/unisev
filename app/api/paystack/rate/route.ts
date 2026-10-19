
import { NextResponse } from "next/server";
import { getPaystackRates } from "@/lib/paystackRate";

export const dynamic = "force-dynamic";

function fee(value: string | undefined, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function GET() {
    try {
        const { rate, payoutRate, publishedAt } = await getPaystackRates();

        return NextResponse.json({
            rate: rate.toNumber(),
            payoutRate: payoutRate.toNumber(),
            publishedAt,
            source: "Bank of Ghana interbank reference rate",
            feeMobile: fee(process.env.WITHDRAWAL_FEE_MOBILE_GHS, 1),
            feeBank: fee(process.env.WITHDRAWAL_FEE_BANK_GHS, 8),
        });
    } catch (error) {
        console.error(
    "PAYSTACK RATE ERROR:",
    error instanceof Error
        ? { message: error.message, stack: error.stack }
        : String(error)
);
        return NextResponse.json(
            { error: "Daily exchange rate unavailable. Please try again later." },
            { status: 503 }
        );
    }
}
