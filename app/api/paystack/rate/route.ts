import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Used only to show an estimate in the Add Funds box.
// The real amount is always calculated again on the server at payment time.
export async function GET() {
    const rate = Number(process.env.USD_GHS_RATE);

    if (!Number.isFinite(rate) || rate <= 0) {
        return NextResponse.json({ error: "Rate unavailable" }, { status: 500 });
    }

    return NextResponse.json({ rate });
}