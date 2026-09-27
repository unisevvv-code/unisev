"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Wallet as WalletIcon,
    Clock,
    ArrowUpDown,
    Download,
    ArrowUpRight,
    ArrowDownLeft,
    ChevronRight,
} from "lucide-react";

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

    const [pendingEscrowAmount, setPendingEscrowAmount] =
        useState(0);

    // Starts true so there's no synchronous setState call at
    // the top of the effect (that's what set-state-in-effect
    // flags) — loading is simply true until loadWallet's first
    // await resolves. Pass `true` explicitly if loadWallet is
    // ever re-called from a manual "refresh" event handler.
    const [loading, setLoading] = useState(true);

    async function loadWallet() {
        const {
            data: userData,
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !userData.user) {
            setLoading(false);
            return;
        }

        const userId = userData.user.id;

        // ---------------------------------------------
        // LOAD WALLET
        // ---------------------------------------------

        const {
            data: walletData,
            error: walletError,
        } = await supabase
            .from("wallets")
            .select(
                "id, balance, currency"
            )
            .eq("user_id", userId)
            .single();

        if (walletError) {
            console.log(
                "WALLET ERROR:",
                walletError
            );

            setWallet(null);
        } else {
            setWallet(walletData);
        }

        // ---------------------------------------------
        // LOAD TRANSACTIONS
        // ---------------------------------------------

        if (walletData) {
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
                .eq(
                    "wallet_id",
                    walletData.id
                )
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
        }

        // ---------------------------------------------
        // LOAD PENDING ESCROW
        //
        // Money the student has been accepted/funded for
        // but hasn't been released yet (task still in
        // progress). This doesn't exist as a wallet
        // transaction on the student's side until the
        // task is completed, so it's read directly from
        // escrow_payments instead. Shown at the same 85%
        // split the student will actually receive.
        // ---------------------------------------------

        const {
            data: escrowData,
            error: escrowError,
        } = await supabase
            .from("escrow_payments")
            .select("amount, status")
            .eq("student_id", userId)
            .eq("status", "pending");

        if (escrowError) {
            console.log(
                "PENDING ESCROW ERROR:",
                escrowError
            );

            setPendingEscrowAmount(0);
        } else {
            const total = (escrowData || []).reduce(
                (sum, escrow) =>
                    sum + Number(escrow.amount) * 0.85,
                0
            );

            setPendingEscrowAmount(total);
        }

        setLoading(false);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadWallet();
    }, []);

    // ---------------------------------------------
    // CALCULATE TOTALS
    // ---------------------------------------------

    const totalEarned = transactions
        .filter(
            (transaction) =>
                transaction.type ===
                "release"
        )
        .reduce(
            (total, transaction) =>
                total +
                Number(transaction.amount),
            0
        );

    const totalWithdrawn = transactions
        .filter(
            (transaction) =>
                transaction.type ===
                "withdrawal"
        )
        .reduce(
            (total, transaction) =>
                total +
                Number(transaction.amount),
            0
        );

    const pendingAmount = pendingEscrowAmount;

    const availableBalance =
        Number(wallet?.balance || 0);

    // ---------------------------------------------
    // LOADING
    // ---------------------------------------------

    if (loading) {
        return (
            <div className="max-w-5xl">

                <div className="bg-white border rounded-2xl p-6 sm:p-8">

                    <p className="text-gray-500">
                        Loading wallet...
                    </p>

                </div>

            </div>
        );
    }

    // ---------------------------------------------
    // NO WALLET
    // ---------------------------------------------

    if (!wallet) {
        return (
            <div className="max-w-5xl">

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

    // ---------------------------------------------
    // WALLET UI
    // ---------------------------------------------

    return (
        <div className="max-w-5xl">

            {/* HEADER */}

            <div>

                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    My Wallet
                </h2>

                <p className="text-sm sm:text-base text-gray-500 mt-1">
                    Manage your earnings and wallet activity.
                </p>

            </div>


            {/* MAIN BALANCE */}

            <div className="
                mt-6
                sm:mt-8
                relative
                overflow-hidden
                bg-linear-to-br
                from-white
                to-green-50
                border
                rounded-2xl
                p-5
                sm:p-8
            ">

                {/* decorative background wave */}
                <svg
                    className="absolute bottom-0 right-0 w-1/2 sm:w-2/3 h-28 sm:h-40 text-green-100/70 pointer-events-none"
                    viewBox="0 0 400 150"
                    preserveAspectRatio="none"
                    fill="none"
                >
                    <path
                        d="M0,120 C80,60 160,140 240,90 C300,55 340,90 400,40 L400,150 L0,150 Z"
                        fill="currentColor"
                    />
                </svg>

                {/*
                    Stacks to a single column on phones so the
                    "Active" pill / Withdraw button never squeeze
                    up against the balance figure — they drop
                    below it instead, full width for easy tapping.
                */}
                <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 sm:gap-4">

                    <div className="min-w-0">

                        <p className="text-sm text-gray-500">
                            Available Balance
                        </p>

                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mt-2 wrap-break-words">
                            ${availableBalance.toFixed(2)}
                        </h1>

                        <p className="text-sm text-gray-500 mt-3">
                            {wallet.currency || "USD"}
                        </p>

                    </div>

                    {/*
                        RIGHT-HAND COLUMN
                        "Active" pill and the Withdraw button are
                        stacked together, right-aligned, as their
                        own column next to the balance on larger
                        screens — full width and left-aligned on
                        phones.
                    */}

                    <div className="relative flex flex-col items-start sm:items-end gap-3 sm:gap-4">

                        <div className="
                            flex
                            items-center
                            gap-2
                            px-4
                            py-2
                            rounded-full
                            bg-green-50
                            text-green-700
                            text-sm
                            font-semibold
                        ">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Active
                        </div>

                        <button
                            disabled={
                                availableBalance <= 0
                            }
                            className="
                                w-full
                                sm:w-auto
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                px-6
                                py-3
                                rounded-xl
                                bg-green-600
                                hover:bg-green-700
                                active:bg-green-700
                                disabled:bg-gray-300
                                disabled:cursor-not-allowed
                                text-white
                                font-semibold
                                transition
                                whitespace-nowrap
                            "
                        >
                            <Download className="w-4 h-4" />
                            Withdraw Funds
                        </button>

                    </div>

                </div>

            </div>


            {/* SUMMARY */}

            <div className="
                grid
                grid-cols-1
                sm:grid-cols-3
                gap-4
                sm:gap-5
                mt-5
                sm:mt-6
            ">

                {/* TOTAL EARNED */}

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">

                    <div className="
                        w-11
                        h-11
                        shrink-0
                        rounded-full
                        bg-green-50
                        text-green-600
                        flex
                        items-center
                        justify-center
                    ">
                        <WalletIcon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">

                        <p className="text-sm text-gray-500">
                            Total Earned
                        </p>

                        <p className="
                            text-xl
                            sm:text-2xl
                            font-bold
                            text-green-600
                            mt-1
                            truncate
                        ">
                            ${totalEarned.toFixed(2)}
                        </p>

                    </div>

                </div>


                {/* PENDING */}

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">

                    <div className="
                        w-11
                        h-11
                        shrink-0
                        rounded-full
                        bg-orange-50
                        text-orange-500
                        flex
                        items-center
                        justify-center
                    ">
                        <Clock className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">

                        <p className="text-sm text-gray-500">
                            Pending
                        </p>

                        <p className="
                            text-xl
                            sm:text-2xl
                            font-bold
                            text-yellow-600
                            mt-1
                            truncate
                        ">
                            ${pendingAmount.toFixed(2)}
                        </p>

                    </div>

                </div>


                {/* WITHDRAWN */}

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">

                    <div className="
                        w-11
                        h-11
                        shrink-0
                        rounded-full
                        bg-blue-50
                        text-blue-600
                        flex
                        items-center
                        justify-center
                    ">
                        <ArrowUpDown className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">

                        <p className="text-sm text-gray-500">
                            Withdrawn
                        </p>

                        <p className="
                            text-xl
                            sm:text-2xl
                            font-bold
                            text-gray-700
                            mt-1
                            truncate
                        ">
                            ${totalWithdrawn.toFixed(2)}
                        </p>

                    </div>

                </div>

            </div>


            {/*
                TRANSACTION HISTORY

                The card itself is a fixed-height flex column so
                the header never moves and only the list below it
                (flex-1 + overflow-y-auto) scrolls. Shorter on
                phones (h-[420px]) since the full h-130 desktop
                height runs past the fold on a small viewport.
            */}

            <div className="
                bg-white
                border
                rounded-2xl
                p-5
                sm:p-6
                mt-5
                sm:mt-6
                h-105
                sm:h-130
                flex
                flex-col
            ">

                {/* FIXED HEADER - never scrolls */}
                <div className="flex items-center justify-between shrink-0">

                    <div>

                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                            Transaction History
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                            Your recent wallet activity.
                        </p>

                    </div>

                </div>


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
                            Your earnings will appear here after completing tasks.
                        </p>

                    </div>

                ) : (

                    // SCROLLABLE LIST - the only part that moves.
                    // flex-1 makes it fill the remaining height of
                    // the fixed-height card above; overflow-y-auto
                    // is what actually enables scrolling.
                    <div className="mt-5 flex-1 overflow-y-auto space-y-3 pr-1">

                        {transactions.map(
                            (transaction) => {

                                const isPositive =
                                    transaction.type ===
                                        "earning" ||
                                    transaction.type ===
                                        "deposit" ||
                                    transaction.type ===
                                        "release";

                                const amount =
                                    Number(
                                        transaction.amount
                                    );

                                return (
                                    <div
                                        key={
                                            transaction.id
                                        }
                                        className="
                                            flex
                                            items-start
                                            sm:items-center
                                            justify-between
                                            gap-3
                                            border
                                            rounded-xl
                                            p-3.5
                                            sm:p-4
                                            hover:bg-gray-50
                                            transition
                                        "
                                    >

                                        <div className="flex items-start sm:items-center gap-3 min-w-0">

                                            <div className={`
                                                w-9
                                                h-9
                                                shrink-0
                                                rounded-full
                                                flex
                                                items-center
                                                justify-center
                                                ${
                                                    isPositive
                                                        ? "bg-green-50 text-green-600"
                                                        : "bg-gray-100 text-gray-500"
                                                }
                                            `}>
                                                {isPositive ? (
                                                    <ArrowUpRight className="w-4 h-4" />
                                                ) : (
                                                    <ArrowDownLeft className="w-4 h-4" />
                                                )}
                                            </div>

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
                                                    flex-wrap
                                                    items-center
                                                    gap-x-2
                                                    gap-y-0.5
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
                                                                year: "numeric",
                                                                month: "short",
                                                                day: "numeric",
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

                                        </div>


                                        <p
                                            className={`
                                                shrink-0
                                                font-bold
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
                                            {amount.toFixed(
                                                2
                                            )}
                                        </p>

                                    </div>
                                );
                            }
                        )}

                    </div>

                )}


                {/* VIEW ALL — only shown once there's something to view */}

                {transactions.length > 0 && (
                    <div className="shrink-0 mt-5 flex justify-center">
                        <button className="
                            w-full
                            sm:w-auto
                            inline-flex
                            items-center
                            justify-center
                            gap-1
                            px-5
                            py-2.5
                            rounded-xl
                            border
                            text-sm
                            font-semibold
                            text-gray-700
                            hover:bg-gray-50
                            active:bg-gray-50
                            transition
                        ">
                            View All Transactions
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

            </div>

        </div>
    );
}