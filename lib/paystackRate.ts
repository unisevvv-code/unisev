
import Decimal from "decimal.js";

const RATE_URL = "https://connect.apighana.com/api/live/bog-usd-ghs";

export type PaystackRates = {
    rate: Decimal;
    payoutRate: Decimal;
    publishedAt: string;
};

export async function getPaystackRates(): Promise<PaystackRates> {
    const response = await fetch(RATE_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
        throw new Error(`Exchange-rate provider returned ${response.status}`);
    }

    const json = await response.json();
    const data = json?.data;

    const rateNumber = Number(data?.latest_value);
    const publishedAt = data?.latest_at;

    if (
        json?.status !== "success" ||
        data?.stale === true ||
        !Number.isFinite(rateNumber) ||
        rateNumber <= 0 ||
        typeof publishedAt !== "string" ||
        !Number.isFinite(Date.parse(publishedAt))
    ) {
        throw new Error("Invalid exchange-rate response");
    }

    const age = Date.now() - Date.parse(publishedAt);

    // Allow weekends and public holidays, but reject older rates.
    if (age < 0 || age > 4 * 24 * 60 * 60 * 1000) {
        throw new Error("Exchange rate is stale");
    }

    const rate = new Decimal(rateNumber);
    const margin = Number(process.env.USD_GHS_PAYOUT_MARGIN ?? "0.20");

    if (!Number.isFinite(margin) || margin < 0) {
        throw new Error("Invalid USD_GHS_PAYOUT_MARGIN");
    }

    const payoutRate = rate.minus(margin);

    if (payoutRate.lte(0)) {
        throw new Error("Invalid payout rate");
    }

    return { rate, payoutRate, publishedAt };
}
