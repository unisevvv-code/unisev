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

interface Provider {
    name: string;
    code: string;
}

type Method = "mobile_money" | "bank";

const MIN_WITHDRAWAL = 5;
const MAX_WITHDRAWAL = 200000;

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

    // ---------------------------------------------
    // WITHDRAW (Paystack) STATE
    // ---------------------------------------------

    const [showWithdraw, setShowWithdraw] = useState(false);
    const [amountInput, setAmountInput] = useState("");
    const [method, setMethod] = useState<Method>("mobile_money");
    const [providers, setProviders] = useState<Provider[] | null>(null);
    const [providerCode, setProviderCode] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [withdrawNotice, setWithdrawNotice] = useState<string | null>(null);

    const [payoutRate, setPayoutRate] = useState<number | null>(null);
    const [feeMobile, setFeeMobile] = useState(1);
    const [feeBank, setFeeBank] = useState(8);

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

    // Load estimate rate + fees when the Withdraw box opens
    useEffect(() => {
        if (!showWithdraw) return;

        let cancelled = false;

        fetch("/api/paystack/rate")
            .then((res) => res.json())
            .then((json) => {
                if (cancelled) return;
                if (typeof json.payoutRate === "number") setPayoutRate(json.payoutRate);
                if (typeof json.feeMobile === "number") setFeeMobile(json.feeMobile);
                if (typeof json.feeBank === "number") setFeeBank(json.feeBank);
            })
            .catch(() => {
                if (!cancelled) setPayoutRate(null);
            });

        return () => {
            cancelled = true;
        };
    }, [showWithdraw]);

    // Load mobile money providers / banks from Paystack
    useEffect(() => {
        if (!showWithdraw) return;

        let cancelled = false;

        async function loadProviders() {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            const type = method === "mobile_money" ? "mobile_money" : "ghipss";

            const res = await fetch(`/api/paystack/banks?type=${type}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json().catch(() => ({}));

            if (!cancelled) {
                setProviders(Array.isArray(json.banks) ? json.banks : []);
            }
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProviders();

        return () => {
            cancelled = true;
        };
    }, [showWithdraw, method]);

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
                    "withdrawal" &&
                transaction.status !== "failed"
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
    // WITHDRAW HELPERS
    // ---------------------------------------------

    function openWithdraw() {
        setAmountInput("");
        setMethod("mobile_money");
        setProviders(null);
        setProviderCode("");
        setAccountNumber("");
        setAccountName("");
        setWithdrawError(null);
        setWithdrawNotice(null);
        setShowWithdraw(true);
    }

    function closeWithdraw() {
        if (submitting) return;
        setShowWithdraw(false);
    }

    function changeMethod(next: Method) {
        if (next === method) return;
        setMethod(next);
        setProviders(null);
        setProviderCode("");
        setAccountNumber("");
        setWithdrawError(null);
    }

    const amountNumber = Number(amountInput);

    const amountValid =
        amountInput.trim() !== "" &&
        /^\d+(\.\d{1,2})?$/.test(amountInput.trim()) &&
        Number.isFinite(amountNumber) &&
        amountNumber >= MIN_WITHDRAWAL &&
        amountNumber <= MAX_WITHDRAWAL;

    const amountWithinBalance =
        amountValid && amountNumber <= availableBalance;

    const numberValid =
        method === "mobile_money"
            ? /^0\d{9}$/.test(accountNumber.replace(/\s+/g, ""))
            : /^\d{8,16}$/.test(accountNumber.replace(/\s+/g, ""));

    const formValid =
        amountWithinBalance &&
        providerCode !== "" &&
        numberValid &&
        accountName.trim().length >= 2;

    const fee = method === "mobile_money" ? feeMobile : feeBank;

    const estimatedGross =
        amountValid && payoutRate
            ? Math.round(amountNumber * payoutRate * 100) / 100
            : null;

    const estimatedNet =
        estimatedGross !== null
            ? Math.max(0, Math.round((estimatedGross - fee) * 100) / 100)
            : null;

    async function handleWithdraw() {
        if (!formValid || submitting) return;

        setSubmitting(true);
        setWithdrawError(null);

        try {
            const { data: sessionData } =
                await supabase.auth.getSession();

            const token = sessionData.session?.access_token;

            if (!token) {
                setWithdrawError("Please log in again and retry.");
                setSubmitting(false);
                return;
            }

            const res = await fetch("/api/paystack/withdraw", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    usdAmount: amountInput.trim(),
                    method,
                    providerCode,
                    accountNumber: accountNumber.replace(/\s+/g, ""),
                    accountName: accountName.trim(),
                }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                setWithdrawError(
                    json.error || "Could not process withdrawal. Please try again."
                );
                setSubmitting(false);
                return;
            }

            setWithdrawNotice(
                "Withdrawal submitted. It will show as completed once the payout is confirmed."
            );
            setSubmitting(false);
            await loadWallet();
        } catch (error) {
            console.log("WITHDRAW ERROR:", error);
            setWithdrawError("Something went wrong. Please try again.");
            setSubmitting(false);
        }
    }

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
                            onClick={openWithdraw}
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


            {/* TRANSACTION HISTORY */}

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

                    <div className="mt-5 flex-1 overflow-y-auto space-y-3 pr-1">

                        {transactions.map(
                            (transaction) => {

                                const isPositive =
                                    transaction.type ===
                                        "earning" ||
                                    transaction.type ===
                                        "deposit" ||
                                    transaction.type ===
                                        "release" ||
                                    transaction.type ===
                                        "refund";

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


            {/* WITHDRAW MODAL */}

            {showWithdraw && (
                <div
                    className="
                        fixed
                        inset-0
                        z-50
                        flex
                        items-center
                        justify-center
                        bg-black/40
                        px-4
                    "
                    onClick={closeWithdraw}
                >

                    <div
                        className="
                            w-full
                            max-w-md
                            max-h-[90vh]
                            overflow-y-auto
                            bg-white
                            rounded-2xl
                            p-5
                            sm:p-6
                            shadow-xl
                        "
                        onClick={(e) => e.stopPropagation()}
                    >

                        <h3 className="text-xl font-bold text-gray-900">
                            Withdraw Funds
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                            Your wallet is in USD. You&apos;ll be paid in Ghana cedis (GH₵).
                        </p>

                        {withdrawNotice ? (

                            <div className="mt-5">

                                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                                    {withdrawNotice}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowWithdraw(false)}
                                    className="
                                        w-full
                                        mt-5
                                        px-5
                                        py-3
                                        rounded-xl
                                        bg-green-600
                                        hover:bg-green-700
                                        text-white
                                        font-semibold
                                        transition
                                    "
                                >
                                    Done
                                </button>

                            </div>

                        ) : (

                            <>

                                {/* METHOD */}

                                <div className="grid grid-cols-2 gap-2 mt-5">

                                    <button
                                        type="button"
                                        onClick={() => changeMethod("mobile_money")}
                                        className={`
                                            py-2.5
                                            rounded-lg
                                            border
                                            text-sm
                                            font-semibold
                                            transition
                                            ${
                                                method === "mobile_money"
                                                    ? "border-green-600 bg-green-50 text-green-700"
                                                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                            }
                                        `}
                                    >
                                        Mobile Money
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => changeMethod("bank")}
                                        className={`
                                            py-2.5
                                            rounded-lg
                                            border
                                            text-sm
                                            font-semibold
                                            transition
                                            ${
                                                method === "bank"
                                                    ? "border-green-600 bg-green-50 text-green-700"
                                                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                            }
                                        `}
                                    >
                                        Bank Account
                                    </button>

                                </div>


                                {/* AMOUNT */}

                                <label className="block text-sm font-medium text-gray-700 mt-5">
                                    Amount (USD)
                                </label>

                                <div className="
                                    mt-1
                                    flex
                                    items-center
                                    border
                                    rounded-xl
                                    px-4
                                    focus-within:border-green-600
                                ">
                                    <span className="text-gray-500 mr-2">$</span>

                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amountInput}
                                        onChange={(e) => setAmountInput(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full py-3 outline-none bg-transparent"
                                    />
                                </div>

                                {amountInput.trim() !== "" && !amountValid && (
                                    <p className="text-sm text-red-600 mt-2">
                                        Enter an amount from ${MIN_WITHDRAWAL} to $
                                        {MAX_WITHDRAWAL.toLocaleString()} (up to 2 decimals).
                                    </p>
                                )}

                                {amountValid && !amountWithinBalance && (
                                    <p className="text-sm text-red-600 mt-2">
                                        That&apos;s more than your available balance
                                        (${availableBalance.toFixed(2)}).
                                    </p>
                                )}


                                {/* PROVIDER */}

                                <label className="block text-sm font-medium text-gray-700 mt-4">
                                    {method === "mobile_money" ? "Mobile money provider" : "Bank"}
                                </label>

                                <select
                                    value={providerCode}
                                    onChange={(e) => setProviderCode(e.target.value)}
                                    disabled={providers === null}
                                    className="
                                        mt-1
                                        w-full
                                        border
                                        rounded-xl
                                        px-4
                                        py-3
                                        bg-white
                                        outline-none
                                        focus:border-green-600
                                    "
                                >
                                    <option value="">
                                        {providers === null
                                            ? "Loading..."
                                            : providers.length === 0
                                              ? "Could not load options"
                                              : "Select..."}
                                    </option>

                                    {(providers || []).map((provider) => (
                                        <option key={provider.code} value={provider.code}>
                                            {provider.name}
                                        </option>
                                    ))}
                                </select>


                                {/* ACCOUNT NUMBER */}

                                <label className="block text-sm font-medium text-gray-700 mt-4">
                                    {method === "mobile_money" ? "Mobile money number" : "Account number"}
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder={method === "mobile_money" ? "0241234567" : "Account number"}
                                    className="
                                        mt-1
                                        w-full
                                        border
                                        rounded-xl
                                        px-4
                                        py-3
                                        outline-none
                                        focus:border-green-600
                                    "
                                />

                                {accountNumber !== "" && !numberValid && (
                                    <p className="text-sm text-red-600 mt-2">
                                        {method === "mobile_money"
                                            ? "Enter a 10-digit number starting with 0."
                                            : "Enter a valid account number (8 to 16 digits)."}
                                    </p>
                                )}


                                {/* ACCOUNT NAME */}

                                <label className="block text-sm font-medium text-gray-700 mt-4">
                                    Account holder name
                                </label>

                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    placeholder="Name on the account"
                                    className="
                                        mt-1
                                        w-full
                                        border
                                        rounded-xl
                                        px-4
                                        py-3
                                        outline-none
                                        focus:border-green-600
                                    "
                                />


                                {/* SUMMARY */}

                                <div className="mt-5 rounded-xl bg-gray-50 border p-4 space-y-2">

                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Converted amount</span>
                                        <span className="font-medium text-gray-900">
                                            {estimatedGross !== null
                                                ? `GH₵${estimatedGross.toFixed(2)}`
                                                : "—"}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Transfer fee</span>
                                        <span className="font-medium text-gray-900">
                                            GH₵{fee.toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm border-t pt-2">
                                        <span className="text-gray-700 font-semibold">You receive (est.)</span>
                                        <span className="font-bold text-gray-900">
                                            {estimatedNet !== null
                                                ? `GH₵${estimatedNet.toFixed(2)}`
                                                : "—"}
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-400">
                                        The final amount is confirmed when you submit. Double-check your number —
                                        payouts can&apos;t be recalled.
                                    </p>

                                </div>

                                {withdrawError && (
                                    <p className="text-sm text-red-600 mt-3">
                                        {withdrawError}
                                    </p>
                                )}


                                {/* ACTIONS */}

                                <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">

                                    <button
                                        type="button"
                                        onClick={closeWithdraw}
                                        disabled={submitting}
                                        className="
                                            w-full
                                            sm:w-auto
                                            px-5
                                            py-3
                                            rounded-xl
                                            border
                                            font-semibold
                                            text-gray-700
                                            hover:bg-gray-50
                                            disabled:opacity-50
                                            transition
                                        "
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleWithdraw}
                                        disabled={!formValid || submitting}
                                        className="
                                            w-full
                                            sm:flex-1
                                            px-5
                                            py-3
                                            rounded-xl
                                            bg-green-600
                                            hover:bg-green-700
                                            disabled:bg-gray-300
                                            disabled:cursor-not-allowed
                                            text-white
                                            font-semibold
                                            transition
                                        "
                                    >
                                        {submitting ? "Processing..." : "Withdraw"}
                                    </button>

                                </div>

                            </>

                        )}

                    </div>

                </div>
            )}

        </div>
    );
}