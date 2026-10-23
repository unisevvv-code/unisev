"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Wallet as WalletIcon,
    Clock,
    ArrowUpDown,
    Download,
    Plus,
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

const MIN_DEPOSIT = 1;
const MAX_DEPOSIT = 200000;
const QUICK_AMOUNTS = [10, 25, 50, 100];

const MIN_WITHDRAWAL = 5;
const MAX_WITHDRAWAL = 200000;

const INPUT_CLASS =
    "mt-1 w-full border rounded-xl px-4 py-3 outline-none focus:border-green-600 bg-white";

export default function Wallet() {
    const [wallet, setWallet] = useState<Wallet | null>(null);

    const [transactions, setTransactions] = useState<
        WalletTransaction[]
    >([]);

    const [loading, setLoading] = useState(true);

    // ---------------------------------------------
    // ADD FUNDS (Paystack) STATE
    // ---------------------------------------------

    const [showAddFunds, setShowAddFunds] = useState(false);
    const [amountInput, setAmountInput] = useState("");
    const [rate, setRate] = useState<number | null>(null);
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);

    // ---------------------------------------------
    // WITHDRAW (Paystack) STATE
    // ---------------------------------------------

    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawInput, setWithdrawInput] = useState("");
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

    // showSpinner = false is used after a withdrawal so the open
    // popup isn't replaced by the full-page "Loading wallet..." view.
    async function loadWallet(showSpinner = true) {
        if (showSpinner) setLoading(true);

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadWallet();
    }, []);

    // Fetch the estimate rate whenever the Add Funds box opens
    useEffect(() => {
        if (!showAddFunds) return;

        let cancelled = false;

        fetch("/api/paystack/rate")
            .then((res) => res.json())
            .then((json) => {
                if (!cancelled && typeof json.rate === "number") {
                    setRate(json.rate);
                }
            })
            .catch(() => {
                if (!cancelled) setRate(null);
            });

        return () => {
            cancelled = true;
        };
    }, [showAddFunds]);

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

            if (!cancelled) setProviders(Array.isArray(json.banks) ? json.banks : []);
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProviders();

        return () => {
            cancelled = true;
        };
    }, [showWithdraw, method]);

    // ---------------------------------------------
    // ADD FUNDS HELPERS
    // ---------------------------------------------

    function openAddFunds() {
        setAmountInput("");
        setPayError(null);
        setShowAddFunds(true);
    }

    function closeAddFunds() {
        if (paying) return;
        setShowAddFunds(false);
    }

    const amountNumber = Number(amountInput);

    const amountValid =
        amountInput.trim() !== "" &&
        Number.isFinite(amountNumber) &&
        amountNumber >= MIN_DEPOSIT &&
        amountNumber <= MAX_DEPOSIT &&
        /^\d+(\.\d{1,2})?$/.test(amountInput.trim());

    const estimatedGhs =
        amountValid && rate
            ? (amountNumber * rate).toFixed(2)
            : null;

    async function handleContinueToPaystack() {
        if (!amountValid || paying) return;

        setPaying(true);
        setPayError(null);

        try {
            const { data: sessionData } =
                await supabase.auth.getSession();

            const token = sessionData.session?.access_token;

            if (!token) {
                setPayError("Please log in again and retry.");
                setPaying(false);
                return;
            }

            const res = await fetch("/api/paystack/initialize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    usdAmount: amountInput.trim(),
                }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json.authorization_url) {
                setPayError(
                    json.error || "Could not start payment. Please try again."
                );
                setPaying(false);
                return;
            }

            // Send the customer to Paystack's checkout page
            window.location.href = json.authorization_url;
        } catch (error) {
            console.log("ADD FUNDS ERROR:", error);
            setPayError("Something went wrong. Please try again.");
            setPaying(false);
        }
    }

    // ---------------------------------------------
    // TOTAL SPENT
    // ---------------------------------------------

    const totalSpent = transactions
                .filter(
            (transaction) =>
                transaction.type === "payment" ||
                transaction.type === "release" ||
                (transaction.type === "hold" &&
                    transaction.status === "completed")
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

    const availableBalance =
        Number(wallet?.balance || 0);

    // ---------------------------------------------
    // WITHDRAW HELPERS
    // ---------------------------------------------

    function openWithdraw() {
        setWithdrawInput("");
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

    const withdrawNumber = Number(withdrawInput);
    const cleanNumber = accountNumber.replace(/\s+/g, "");

    const withdrawAmountValid =
        withdrawInput.trim() !== "" &&
        /^\d+(\.\d{1,2})?$/.test(withdrawInput.trim()) &&
        Number.isFinite(withdrawNumber) &&
        withdrawNumber >= MIN_WITHDRAWAL &&
        withdrawNumber <= MAX_WITHDRAWAL;

    const withdrawWithinBalance =
        withdrawAmountValid && withdrawNumber <= availableBalance;

    const numberValid =
        method === "mobile_money"
            ? /^0\d{9}$/.test(cleanNumber)
            : /^\d{8,16}$/.test(cleanNumber);

    const withdrawFormValid =
        withdrawWithinBalance &&
        providerCode !== "" &&
        numberValid &&
        accountName.trim().length >= 2;

    const fee = method === "mobile_money" ? feeMobile : feeBank;

    const estimatedGross =
        withdrawAmountValid && payoutRate
            ? Math.round(withdrawNumber * payoutRate * 100) / 100
            : null;

    const estimatedNet =
        estimatedGross !== null
            ? Math.max(0, Math.round((estimatedGross - fee) * 100) / 100)
            : null;

    async function handleWithdraw() {
        if (!withdrawFormValid || submitting) return;

        setSubmitting(true);
        setWithdrawError(null);

        try {
            const { data: sessionData } = await supabase.auth.getSession();
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
                    usdAmount: withdrawInput.trim(),
                    method,
                    providerCode,
                    accountNumber: cleanNumber,
                    accountName: accountName.trim(),
                }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                setWithdrawError(json.error || "Could not process withdrawal. Please try again.");
                setSubmitting(false);
                return;
            }

            setWithdrawNotice("Withdrawal submitted. It will show as completed once the payout is confirmed.");
            setSubmitting(false);
            await loadWallet(false);
        } catch (error) {
            console.log("WITHDRAW ERROR:", error);
            setWithdrawError("Something went wrong. Please try again.");
            setSubmitting(false);
        }
    }

    const methodButton = (value: Method, label: string) => (
        <button
            type="button"
            onClick={() => changeMethod(value)}
            className={`py-2.5 rounded-lg border text-sm font-semibold transition ${
                method === value
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
        >
            {label}
        </button>
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


            {/* MAIN BALANCE */}

            <div className="mt-6 sm:mt-8 relative overflow-hidden bg-linear-to-br from-white to-green-50 border rounded-2xl p-5 sm:p-8">

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

                <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                    <div className="min-w-0">

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

                    <div className="self-start flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-semibold shrink-0">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Active
                    </div>

                </div>


                {/* ADD FUNDS (far left) + WITHDRAW (far right) */}

                <div className="relative mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                    <button
                        type="button"
                        onClick={openAddFunds}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-700 text-white font-semibold transition whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Add Funds
                    </button>

                    <button
                        type="button"
                        onClick={openWithdraw}
                        disabled={availableBalance <= 0}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition whitespace-nowrap"
                    >
                        <Download className="w-4 h-4" />
                        Withdraw Funds
                    </button>

                </div>

            </div>


            {/* SUMMARY */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mt-5 sm:mt-6">

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-blue-50 flex items-center justify-center">
                        <WalletIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">Available</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1 truncate">
                            ${availableBalance.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-orange-50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">In Escrow</p>
                        <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1 truncate">
                            ${inEscrow.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
                        <ArrowUpDown className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">Total Spent</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-700 mt-1 truncate">
                            ${totalSpent.toFixed(2)}
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


            {/* ADD FUNDS MODAL */}

            {showAddFunds && (
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
                    onClick={closeAddFunds}
                >

                    <div
                        className="
                            w-full
                            max-w-md
                            bg-white
                            rounded-2xl
                            p-5
                            sm:p-6
                            shadow-xl
                        "
                        onClick={(e) => e.stopPropagation()}
                    >

                        <h3 className="text-xl font-bold text-gray-900">
                            Add Funds
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                            Your wallet is kept in USD. You&apos;ll pay in Ghana cedis (GH₵) through Paystack.
                        </p>


                        {/* QUICK AMOUNTS */}

                        <div className="grid grid-cols-4 gap-2 mt-5">

                            {QUICK_AMOUNTS.map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                        setAmountInput(String(value))
                                    }
                                    className={`
                                        py-2
                                        rounded-lg
                                        border
                                        text-sm
                                        font-semibold
                                        transition
                                        ${
                                            amountInput === String(value)
                                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                                : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                        }
                                    `}
                                >
                                    ${value}
                                </button>
                            ))}

                        </div>


                        {/* AMOUNT INPUT */}

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
                            focus-within:border-blue-600
                        ">
                            <span className="text-gray-500 mr-2">$</span>

                            <input
                                type="text"
                                inputMode="decimal"
                                value={amountInput}
                                onChange={(e) =>
                                    setAmountInput(e.target.value)
                                }
                                placeholder="0.00"
                                className="
                                    w-full
                                    py-3
                                    outline-none
                                    bg-transparent
                                "
                            />
                        </div>

                        {amountInput.trim() !== "" && !amountValid && (
                            <p className="text-sm text-red-600 mt-2">
                                Enter an amount from ${MIN_DEPOSIT} to $
                                {MAX_DEPOSIT.toLocaleString()} (up to 2 decimals).
                            </p>
                        )}


                        {/* ESTIMATE */}

                        <div className="mt-5 rounded-xl bg-gray-50 border p-4">

                            <p className="text-sm text-gray-500">
                                Estimated payment through Paystack
                            </p>

                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {estimatedGhs
                                    ? `GH₵${Number(estimatedGhs).toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                      })}`
                                    : "—"}
                            </p>

                            <p className="text-xs text-gray-400 mt-1">
                                The final amount is confirmed when you continue. Your wallet will receive the USD amount above.
                            </p>

                        </div>

                        {payError && (
                            <p className="text-sm text-red-600 mt-3">
                                {payError}
                            </p>
                        )}


                        {/* ACTIONS */}

                        <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">

                            <button
                                type="button"
                                onClick={closeAddFunds}
                                disabled={paying}
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
                                onClick={handleContinueToPaystack}
                                disabled={!amountValid || paying}
                                className="
                                    w-full
                                    sm:flex-1
                                    px-5
                                    py-3
                                    rounded-xl
                                    bg-blue-600
                                    hover:bg-blue-700
                                    disabled:bg-gray-300
                                    disabled:cursor-not-allowed
                                    text-white
                                    font-semibold
                                    transition
                                "
                            >
                                {paying
                                    ? "Redirecting..."
                                    : "Continue to Paystack"}
                            </button>

                        </div>

                    </div>

                </div>
            )}


            {/* WITHDRAW MODAL */}

            {showWithdraw && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    onClick={closeWithdraw}
                >
                    <div
                        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-5 sm:p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-gray-900">Withdraw Funds</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Your wallet is in USD (${availableBalance.toFixed(2)} available). You&apos;ll be paid in Ghana cedis (GH₵).
                        </p>

                        {withdrawNotice ? (
                            <div className="mt-5">
                                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                                    {withdrawNotice}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowWithdraw(false)}
                                    className="w-full mt-5 px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-2 mt-5">
                                    {methodButton("mobile_money", "Mobile Money")}
                                    {methodButton("bank", "Bank Account")}
                                </div>

                                <label className="block text-sm font-medium text-gray-700 mt-5">Amount (USD)</label>
                                <div className="mt-1 flex items-center border rounded-xl px-4 focus-within:border-green-600">
                                    <span className="text-gray-500 mr-2">$</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={withdrawInput}
                                        onChange={(e) => setWithdrawInput(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full py-3 outline-none bg-transparent"
                                    />
                                </div>

                                {withdrawInput.trim() !== "" && !withdrawAmountValid && (
                                    <p className="text-sm text-red-600 mt-2">
                                        Enter an amount from ${MIN_WITHDRAWAL} to ${MAX_WITHDRAWAL.toLocaleString()} (up to 2 decimals).
                                    </p>
                                )}

                                {withdrawAmountValid && !withdrawWithinBalance && (
                                    <p className="text-sm text-red-600 mt-2">
                                        That&apos;s more than your available balance (${availableBalance.toFixed(2)}).
                                    </p>
                                )}

                                <label className="block text-sm font-medium text-gray-700 mt-4">
                                    {method === "mobile_money" ? "Mobile money provider" : "Bank"}
                                </label>
                                <select
                                    value={providerCode}
                                    onChange={(e) => setProviderCode(e.target.value)}
                                    disabled={providers === null}
                                    className={INPUT_CLASS}
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

                                <label className="block text-sm font-medium text-gray-700 mt-4">
                                    {method === "mobile_money" ? "Mobile money number" : "Account number"}
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder={method === "mobile_money" ? "0241234567" : "Account number"}
                                    className={INPUT_CLASS}
                                />

                                {accountNumber !== "" && !numberValid && (
                                    <p className="text-sm text-red-600 mt-2">
                                        {method === "mobile_money"
                                            ? "Enter a 10-digit number starting with 0."
                                            : "Enter a valid account number (8 to 16 digits)."}
                                    </p>
                                )}

                                <label className="block text-sm font-medium text-gray-700 mt-4">Account holder name</label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    placeholder="Name on the account"
                                    className={INPUT_CLASS}
                                />

                                <div className="mt-5 rounded-xl bg-gray-50 border p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Converted amount</span>
                                        <span className="font-medium text-gray-900">
                                            {estimatedGross !== null ? `GH₵${estimatedGross.toFixed(2)}` : "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Transfer fee</span>
                                        <span className="font-medium text-gray-900">GH₵{fee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t pt-2">
                                        <span className="text-gray-700 font-semibold">You receive (est.)</span>
                                        <span className="font-bold text-gray-900">
                                            {estimatedNet !== null ? `GH₵${estimatedNet.toFixed(2)}` : "—"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        The final amount is confirmed when you submit. Double-check your number —
                                        payouts can&apos;t be recalled.
                                    </p>
                                </div>

                                {withdrawError && <p className="text-sm text-red-600 mt-3">{withdrawError}</p>}

                                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                                    Withdrawals are only processed on working days (Monday to Friday, excluding public holidays).
                                    Requests made on a weekend or holiday may not go through until the next business day.
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={closeWithdraw}
                                        disabled={submitting}
                                        className="w-full sm:w-auto px-5 py-3 rounded-xl border font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleWithdraw}
                                        disabled={!withdrawFormValid || submitting}
                                        className="w-full sm:flex-1 px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition"
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