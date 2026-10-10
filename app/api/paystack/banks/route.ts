import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

interface PaystackBank {
    name: string;
    code: string;
}

// Returns the Ghana mobile money providers or banks from Paystack
export async function GET(req: Request) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = new URL(req.url).searchParams.get("type");
    if (type !== "mobile_money" && type !== "ghipss") {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const res = await fetch(
        `https://api.paystack.co/bank?currency=GHS&type=${type}&perPage=100`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const json = await res.json().catch(() => null);

    if (!res.ok || !Array.isArray(json?.data)) {
        console.log("PAYSTACK BANKS ERROR:", json);
        return NextResponse.json({ error: "Could not load providers" }, { status: 502 });
    }

    const list = (json.data as PaystackBank[]).map((bank) => ({
        name: bank.name,
        code: bank.code,
    }));

    return NextResponse.json({ banks: list });
}