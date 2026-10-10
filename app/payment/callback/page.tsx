"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const WALLET_PATH = "/dashboard/client";

function CallbackInner() {
    const params = useSearchParams();
    const router = useRouter();
    const reference = params.get("reference") || params.get("trxref");

    const [status, setStatus] = useState<"checking" | "successful" | "failed" | "pending">("checking");

    useEffect(() => {
        if (!reference) return;

        let cancelled = false;

        async function check(attempt = 0) {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            const res = await fetch(`/api/paystack/verify?reference=${reference}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json().catch(() => ({}));

            if (cancelled) return;

            if (json.status === "successful") return setStatus("successful");
            if (json.status === "failed") return setStatus("failed");

            // still pending: retry a few times
            if (attempt < 5) setTimeout(() => check(attempt + 1), 3000);
            else setStatus("pending");
        }

        check();
        return () => { cancelled = true; };
    }, [reference]);

    return (
        <div className="max-w-md mx-auto mt-20 bg-white border rounded-2xl p-8 text-center">
            {!reference && <p className="text-gray-600">Missing payment reference.</p>}

            {reference && status === "checking" && (
                <p className="text-gray-600">Confirming your payment...</p>
            )}
            {status === "successful" && (
                <>
                    <h2 className="text-xl font-bold text-green-600">Payment successful</h2>
                    <p className="text-gray-500 mt-2">Your wallet has been topped up.</p>
                </>
            )}
            {status === "failed" && (
                <>
                    <h2 className="text-xl font-bold text-red-600">Payment failed</h2>
                    <p className="text-gray-500 mt-2">Your wallet was not charged or credited.</p>
                </>
            )}
            {status === "pending" && (
                <>
                    <h2 className="text-xl font-bold text-yellow-600">Still processing</h2>
                    <p className="text-gray-500 mt-2">
                        We haven&apos;t received confirmation yet. Your balance will update automatically once it does.
                    </p>
                </>
            )}

            <button
                onClick={() => router.push(WALLET_PATH)}
                className="mt-6 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
                Back to wallet
            </button>
        </div>
    );
}

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={<p className="p-8 text-gray-500">Loading...</p>}>
            <CallbackInner />
        </Suspense>
    );
}