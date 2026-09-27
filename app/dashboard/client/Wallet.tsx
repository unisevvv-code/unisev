"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Wallet {
    id: string;
    balance: number;
    currency: string;
}

interface WalletTransaction {
    id: string;
    amount: number;
    type: string;
    status: string;
    description: string | null;
    created_at: string;
}

export default function Wallet() {
    const [wallet, setWallet] = useState<Wallet | null>(null);

    const [transactions, setTransactions] = useState<
        WalletTransaction[]
    >([]);

    const [loading, setLoading] = useState(true);

    async function loadWallet() {
        setLoading(true);

        const {
            data: userData,
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            console.log("USER ERROR:", userError);
            setLoading(false);
            return;
        }

        const userId = userData.user.id;

        // ---------------------------------------------
        // LOAD CLIENT WALLET
        // ---------------------------------------------

        const {
            data: walletData,
            error: walletError,
        } = await supabase
            .from("wallets")
            .select("id, balance, currency")
            .eq("user_id", userId)
            .single();

        if (walletError) {
            console.log("WALLET ERROR:", walletError);
            setWallet(null);
            setLoading(false);
            return;
        }

        setWallet(walletData);

        // ---------------------------------------------
        // LOAD TRANSACTIONS
        // ---------------------------------------------

        const {
            data: transactionData,
            error: transactionError,
        } = await supabase
            .from("wallet_transactions")
            .select(`
                id,
                amount,
                type,
                status,
                description,
                created_at
            `)
            .eq("wallet_id", walletData.id)
            .order("created_at", {
                ascending: false,
            });

        if (transactionError) {
            console.log(
                "TRANSACTION ERROR:",
                transactionError
            );

            setTransactions([]);
        } else {
            setTransactions(
                transactionData || []
            );
        }

        setLoading(false);
    }

    useEffect(() => {
        loadWallet();
    }, []);

    // ---------------------------------------------
    // TOTAL SPENT
    // ---------------------------------------------

    const totalSpent = transactions
        .filter(
            (transaction) =>
                transaction.type === "payment" ||
                transaction.type === "release"
        )
        .reduce(
            (total, transaction) =>
                total +
                Number(transaction.amount),
            0
        );

    // ---------------------------------------------
    // MONEY IN ESCROW
    // ---------------------------------------------

    const inEscrow = transactions
        .filter(
            (transaction) =>
                transaction.type === "hold" &&
                transaction.status === "pending"
        )
        .reduce(
            (total, transaction) =>
                total +
                Number(transaction.amount),
            0
        );

    // ---------------------------------------------
    // LOADING
    // ---------------------------------------------

    if (loading) {
        return (
            <div className="max-w-5xl px-3 sm:px-0">

                <div className="bg-white border rounded-2xl p-6 sm:p-8">

                    <p className="text-gray-500">
                        Loading wallet...
                    </p>

                </div>

            </div>
        );
    }

    // ---------------------------------------------
    // WALLET NOT FOUND
    // ---------------------------------------------

    if (!wallet) {
        return (
            <div className="max-w-5xl px-3 sm:px-0">

                <div className="bg-white border rounded-2xl p-6 sm:p-8">

                    <h2 className="text-xl font-bold text-gray-900">
                        Wallet unavailable
                    </h2>

                    <p className="text-gray-500 mt-2">
                        Your wallet could not be found.
                    </p>

                </div>

            </div>
        );
    }

    const availableBalance =
        Number(wallet.balance || 0);

    // ---------------------------------------------
    // MAIN UI
    // ---------------------------------------------

    return (
        <div className="max-w-5xl px-3 sm:px-0">

            {/* HEADER */}

            <div>

                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    My Wallet
                </h2>

                <p className="text-gray-500 mt-1 text-sm sm:text-base">
                    Manage your funds and payment activity.
                </p>

            </div>


            {/* BALANCE */}

            <div className="mt-6 sm:mt-8 bg-white border rounded-2xl p-5 sm:p-8">

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                    <div>

                        <p className="text-sm text-gray-500">
                            Available Balance
                        </p>

                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mt-2 break-all">
                            ${availableBalance.toFixed(2)}
                        </h1>

                        <p className="text-sm text-gray-500 mt-3">
                            {wallet.currency || "USD"}
                        </p>

                    </div>

                    <div className="
                        self-start
                        px-4
                        py-2
                        rounded-full
                        bg-blue-50
                        text-blue-700
                        text-sm
                        font-semibold
                        shrink-0
                    ">
                        Client Wallet
                    </div>

                </div>


                {/* ADD FUNDS */}

                <div className="mt-6 sm:mt-8">

                    <button
                        className="
                            w-full
                            sm:w-auto
                            px-6
                            py-3
                            rounded-xl
                            bg-blue-600
                            hover:bg-blue-700
                            text-white
                            font-semibold
                            transition
                        "
                    >
                        Add Funds
                    </button>

                </div>

            </div>


            {/* SUMMARY */}

            <div className="
                grid
                grid-cols-1
                sm:grid-cols-3
                gap-4
                sm:gap-5
                mt-6
            ">

                {/* AVAILABLE */}

                <div className="bg-white border rounded-2xl p-5 sm:p-6">

                    <p className="text-sm text-gray-500">
                        Available
                    </p>

                    <p className="
                        text-2xl
                        font-bold
                        text-blue-600
                        mt-2
                    ">
                        ${availableBalance.toFixed(2)}
                    </p>

                </div>


                {/* IN ESCROW */}

                <div className="bg-white border rounded-2xl p-5 sm:p-6">

                    <p className="text-sm text-gray-500">
                        In Escrow
                    </p>

                    <p className="
                        text-2xl
                        font-bold
                        text-yellow-600
                        mt-2
                    ">
                        ${inEscrow.toFixed(2)}
                    </p>

                </div>


                {/* TOTAL SPENT */}

                <div className="bg-white border rounded-2xl p-5 sm:p-6">

                    <p className="text-sm text-gray-500">
                        Total Spent
                    </p>

                    <p className="
                        text-2xl
                        font-bold
                        text-gray-700
                        mt-2
                    ">
                        ${totalSpent.toFixed(2)}
                    </p>

                </div>

            </div>


            {/* TRANSACTION HISTORY */}

            <div className="
                bg-white
                border
                rounded-2xl
                p-5
                sm:p-6
                mt-6
            ">

                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    Transaction History
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                    Your recent wallet activity.
                </p>


                {transactions.length === 0 ? (

                    <div className="
                        mt-6
                        border
                        border-dashed
                        rounded-xl
                        p-6
                        sm:p-8
                        text-center
                    ">

                        <p className="text-gray-500">
                            No transactions yet.
                        </p>

                        <p className="text-sm text-gray-400 mt-1">
                            Your payments and wallet activity will appear here.
                        </p>

                    </div>

                ) : (

                    <div className="mt-5 space-y-3">

                        {transactions.map(
                            (transaction) => {

                                const isDeposit =
                                    transaction.type ===
                                    "deposit";

                                const isRefund =
                                    transaction.type ===
                                    "refund";

                                const isPositive =
                                    isDeposit ||
                                    isRefund;

                                return (
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
                                            gap-2
                                            border
                                            rounded-xl
                                            p-4
                                            hover:bg-gray-50
                                            transition
                                        "
                                    >

                                        <div className="min-w-0">

                                            <p className="
                                                font-semibold
                                                text-gray-900
                                                truncate
                                            ">
                                                {transaction.description ||
                                                    transaction.type}
                                            </p>

                                            <div className="
                                                flex
                                                items-center
                                                flex-wrap
                                                gap-2
                                                mt-1
                                            ">

                                                <p className="
                                                    text-sm
                                                    text-gray-500
                                                ">
                                                    {new Date(
                                                        transaction.created_at
                                                    ).toLocaleDateString(
                                                        "en-US",
                                                        {
                                                            year:
                                                                "numeric",
                                                            month:
                                                                "short",
                                                            day:
                                                                "numeric",
                                                        }
                                                    )}
                                                </p>

                                                <span className="text-gray-300">
                                                    •
                                                </span>

                                                <p className="
                                                    text-sm
                                                    text-gray-500
                                                    capitalize
                                                ">
                                                    {transaction.status}
                                                </p>

                                            </div>

                                        </div>


                                        <p
                                            className={`
                                                font-bold
                                                self-end
                                                sm:self-auto
                                                shrink-0
                                                ${
                                                    isPositive
                                                        ? "text-green-600"
                                                        : "text-gray-700"
                                                }
                                            `}
                                        >
                                            {isPositive
                                                ? "+"
                                                : "-"}
                                            $
                                            {Number(
                                                transaction.amount
                                            ).toFixed(2)}
                                        </p>

                                    </div>
                                );
                            }
                        )}

                    </div>

                )}

            </div>

        </div>
    );
}