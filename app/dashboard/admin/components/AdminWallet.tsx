"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface RevenueTransaction {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    created_at: string;
}

export default function AdminWallet() {
    const [transactions, setTransactions] =
        useState<RevenueTransaction[]>([]);

    const [loading, setLoading] = useState(true);

    async function loadWallet() {
        setLoading(true);

        const { data, error } =
            await supabase
                .from("unisev_wallet_transactions")
                .select(`
                    id,
                    amount,
                    type,
                    description,
                    created_at
                `)
                .eq("type", "commission")
                .order("created_at", {
                    ascending: false,
                });

        if (error) {
            console.log(
                "ADMIN WALLET ERROR:",
                error
            );

            setLoading(false);
            return;
        }

        setTransactions(data || []);
        setLoading(false);
    }

    useEffect(() => {
        loadWallet();
    }, []);

    /*
     * TOTAL REVENUE
     *
     * Every platform fee collected
     * since UniSeV started.
     */
    const totalRevenue =
        transactions.reduce(
            (total, transaction) =>
                total +
                Number(transaction.amount),
            0
        );

    /*
     * CURRENT MONTH
     */
    const now = new Date();

    const currentMonth =
        now.getMonth();

    const currentYear =
        now.getFullYear();

    const thisMonthRevenue =
        transactions
            .filter((transaction) => {
                const date =
                    new Date(
                        transaction.created_at
                    );

                return (
                    date.getMonth() ===
                        currentMonth &&
                    date.getFullYear() ===
                        currentYear
                );
            })
            .reduce(
                (total, transaction) =>
                    total +
                    Number(
                        transaction.amount
                    ),
                0
            );

    /*
     * PREVIOUS MONTH
     */
    const previousMonthDate =
        new Date(
            currentYear,
            currentMonth - 1,
            1
        );

    const previousMonth =
        previousMonthDate.getMonth();

    const previousMonthYear =
        previousMonthDate.getFullYear();

    const lastMonthRevenue =
        transactions
            .filter((transaction) => {
                const date =
                    new Date(
                        transaction.created_at
                    );

                return (
                    date.getMonth() ===
                        previousMonth &&
                    date.getFullYear() ===
                        previousMonthYear
                );
            })
            .reduce(
                (total, transaction) =>
                    total +
                    Number(
                        transaction.amount
                    ),
                0
            );

    /*
     * LOAD ACTUAL PLATFORM BALANCE
     */
    const [balance, setBalance] =
        useState(0);

    async function loadBalance() {
    const { data, error } =
        await supabase
            .from("unisev_wallet")
            .select("balance")
            .eq("name", "UniSeV Admin Wallet")
            .limit(1)
            .single();

    if (error) {
        console.log(
            "PLATFORM BALANCE ERROR:",
            error
        );

        return;
    }

    setBalance(
        Number(data?.balance || 0)
    );
}

    useEffect(() => {
        loadBalance();
    }, []);

    if (loading) {
        return (
            <div className="px-3 sm:px-0">
                <div className="bg-white rounded-2xl border p-6 sm:p-8">
                    <p className="text-gray-500">
                        Loading admin wallet...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl px-3 sm:px-0">

            {/* HEADER */}

            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    UniSeV Admin Wallet
                </h1>

                <p className="text-gray-500 mt-1 text-sm sm:text-base">
                    Platform revenue and financial overview
                </p>
            </div>


            {/* FINANCIAL CARDS */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mt-6 sm:mt-8">

                {/* TOTAL REVENUE */}

                <div className="bg-white rounded-2xl border p-5 sm:p-6">

                    <p className="text-sm text-gray-500">
                        Total Revenue
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-bold text-blue-600 mt-3">
                        $
                        {totalRevenue.toFixed(
                            2
                        )}
                    </h2>

                </div>


                {/* LAST MONTH */}

                <div className="bg-white rounded-2xl border p-5 sm:p-6">

                    <p className="text-sm text-gray-500">
                        Last Month
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-bold text-purple-600 mt-3">
                        $
                        {lastMonthRevenue.toFixed(
                            2
                        )}
                    </h2>

                </div>


                {/* THIS MONTH */}

                <div className="bg-white rounded-2xl border p-5 sm:p-6">

                    <p className="text-sm text-gray-500">
                        This Month
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-bold text-green-600 mt-3">
                        $
                        {thisMonthRevenue.toFixed(
                            2
                        )}
                    </h2>

                </div>


                {/* BALANCE */}

                <div className="bg-white rounded-2xl border p-5 sm:p-6">

                    <p className="text-sm text-gray-500">
                        Balance
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 mt-3">
                        $
                        {balance.toFixed(
                            2
                        )}
                    </h2>

                </div>

            </div>


            {/* TRANSACTION HISTORY */}

            <div className="bg-white rounded-2xl border p-5 sm:p-6 mt-6">

                <h2 className="text-lg sm:text-xl font-bold">
                    Platform Revenue
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                    UniSeV's 15% platform fees
                </p>


                {transactions.length === 0 ? (

                    <div className="py-10 text-center">

                        <p className="text-gray-500">
                            No platform revenue yet.
                        </p>

                    </div>

                ) : (

                    <div className="mt-5 space-y-3">

                        {transactions.map(
                            (transaction) => (

                                <div
                                    key={
                                        transaction.id
                                    }
                                    className="
                                        flex
                                        flex-col
                                        sm:flex-row
                                        sm:items-center
                                        justify-between
                                        gap-1
                                        border
                                        rounded-xl
                                        p-4
                                    "
                                >

                                    <div className="min-w-0">

                                        <p className="font-semibold text-gray-900 truncate">
                                            {transaction.description ||
                                                "Platform fee"}
                                        </p>

                                        <p className="text-sm text-gray-500 mt-1">
                                            {new Date(
                                                transaction.created_at
                                            ).toLocaleDateString()}
                                        </p>

                                    </div>

                                    <p className="font-bold text-green-600 self-end sm:self-auto shrink-0">
                                        +$
                                        {Number(
                                            transaction.amount
                                        ).toFixed(
                                            2
                                        )}
                                    </p>

                                </div>

                            )
                        )}

                    </div>

                )}

            </div>

        </div>
    );
}