"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Download, TrendingUp, Wallet as WalletIcon, ArrowUpDown } from "lucide-react";

// ==================================================
// TYPES
// ==================================================

// Raw row from unisev_wallet_transactions. Extra optional
// columns are listed so the component can find the task
// behind a fee no matter which column links it.
interface WalletTransaction {
    id: string;
    amount: number;
    type?: string | null;
    description?: string | null;
    created_at: string;

    task_id?: string | null;
    escrow_payment_id?: string | null;
    escrow_id?: string | null;
    payment_id?: string | null;
    reference_id?: string | null;
}

interface EscrowRow {
    id: string;
    task_id?: string | null;
    amount?: number | null;
    released_at?: string | null;
    created_at?: string | null;
}

interface TaskRow {
    id: string;
    title?: string | null;
}

// What the page actually renders: one row per platform fee.
interface RevenueItem {
    id: string;
    amount: number;
    created_at: string;
    description: string | null;
    taskTitle: string | null;
}

// A payout the admin made (row of admin_withdrawals)
interface WithdrawalRow {
    id: string;
    usd_amount: number;
    status: string;
    method: string | null;
    account_last4: string | null;
    created_at: string;
}

interface Provider {
    name: string;
    code: string;
}

type Method = "mobile_money" | "bank";

const PLATFORM_FEE_RATE = 0.15;

// Transactions shown per page (same as the Payments tab)
const PAGE_SIZE = 7;

const MIN_WITHDRAWAL = 5;
const MAX_WITHDRAWAL = 200000;

const INPUT_CLASS =
    "mt-1 w-full border rounded-xl px-4 py-3 outline-none focus:border-green-600 bg-white";

export default function AdminWallet() {
    const [revenue, setRevenue] =
        useState<RevenueItem[]>([]);

    const [balance, setBalance] =
        useState(0);

    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);

    const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);

    // ==================================================
    // WITHDRAW (Paystack) STATE
    // ==================================================

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

    // ==================================================
    // LOAD REVENUE (platform fees + the task each came from)
    // ==================================================

    async function loadTaskTitles(
        taskIds: string[]
    ): Promise<Record<string, string>> {
        if (taskIds.length === 0) return {};

        const { data, error } = await supabase
            .from("tasks")
            .select("id, title")
            .in("id", taskIds);

        if (error) {
            console.log("WALLET TASK TITLES ERROR:", error);
            return {};
        }

        const titles: Record<string, string> = {};

        ((data as TaskRow[] | null) || []).forEach((task) => {
            if (task.title) titles[task.id] = task.title;
        });

        return titles;
    }

    async function loadWallet() {
        // `loading` already starts as `true` (see useState above), so
        // there is no need to set it synchronously here.

        const { data, error } = await supabase
            .from("unisev_wallet_transactions")
            .select("*")
            .order("created_at", {
                ascending: false,
            });

        if (error) {
            console.log("ADMIN WALLET ERROR:", error);
        }

        const rows = (data as WalletTransaction[] | null) || [];

        // Prefer rows typed "commission". If none are typed that
        // way, fall back to every credit (positive amount) so fees
        // still show up.
        const commissionRows = rows.filter(
            (row) => row.type === "commission"
        );

        const source =
            commissionRows.length > 0
                ? commissionRows
                : rows.filter(
                      (row) =>
                          Number(row.amount) > 0 &&
                          row.type !== "withdrawal" &&
                          row.type !== "refund"
                  );

        let items: RevenueItem[] = [];

        if (source.length > 0) {
            // Some fees point at an escrow payment instead of a task,
            // so resolve escrow -> task as well.
            const escrowIds = Array.from(
                new Set(
                    source
                        .map(
                            (row) =>
                                row.escrow_payment_id ||
                                row.escrow_id ||
                                row.payment_id ||
                                row.reference_id ||
                                null
                        )
                        .filter(Boolean) as string[]
                )
            );

            const escrowToTask: Record<string, string> = {};

            if (escrowIds.length > 0) {
                const { data: escrowData, error: escrowError } =
                    await supabase
                        .from("escrow_payments")
                        .select("id, task_id")
                        .in("id", escrowIds);

                if (escrowError) {
                    console.log("WALLET ESCROW LOOKUP ERROR:", escrowError);
                }

                ((escrowData as EscrowRow[] | null) || []).forEach(
                    (escrow) => {
                        if (escrow.task_id) {
                            escrowToTask[escrow.id] = escrow.task_id;
                        }
                    }
                );
            }

            const taskIdFor = (row: WalletTransaction) =>
                row.task_id ||
                escrowToTask[
                    row.escrow_payment_id ||
                        row.escrow_id ||
                        row.payment_id ||
                        row.reference_id ||
                        ""
                ] ||
                null;

            const titles = await loadTaskTitles(
                Array.from(
                    new Set(
                        source
                            .map(taskIdFor)
                            .filter(Boolean) as string[]
                    )
                )
            );

            items = source.map((row) => {
                const taskId = taskIdFor(row);

                return {
                    id: row.id,
                    amount: Number(row.amount) || 0,
                    created_at: row.created_at,
                    description: row.description ?? null,
                    taskTitle: taskId ? titles[taskId] ?? null : null,
                };
            });
        } else {
            // No fee rows in the wallet table (or it couldn't be read).
            // Rebuild the list from released escrow payments, taking the
            // 15% platform fee, the same way the dashboard overview does.
            const { data: escrowData, error: escrowError } =
                await supabase
                    .from("escrow_payments")
                    .select("id, task_id, amount, released_at, created_at")
                    .eq("status", "released")
                    .order("released_at", {
                        ascending: false,
                    });

            if (escrowError) {
                console.log("WALLET ESCROW FALLBACK ERROR:", escrowError);
            }

            const escrowRows = (escrowData as EscrowRow[] | null) || [];

            const titles = await loadTaskTitles(
                Array.from(
                    new Set(
                        escrowRows
                            .map((row) => row.task_id)
                            .filter(Boolean) as string[]
                    )
                )
            );

            items = escrowRows.map((row) => ({
                id: row.id,
                amount: (Number(row.amount) || 0) * PLATFORM_FEE_RATE,
                created_at:
                    row.released_at || row.created_at || new Date().toISOString(),
                description: null,
                taskTitle: row.task_id ? titles[row.task_id] ?? null : null,
            }));
        }

        setRevenue(items);
        setLoading(false);
    }

    // ==================================================
    // LOAD ACTUAL PLATFORM BALANCE
    // ==================================================

    async function loadBalance() {
        const { data, error } = await supabase
            .from("unisev_wallet")
            .select("balance")
            .eq("name", "UniSeV Admin Wallet")
            .limit(1)
            .single();

        if (error) {
            console.log("PLATFORM BALANCE ERROR:", error);
            return;
        }

        setBalance(Number(data?.balance || 0));
    }

    // The platform's own payouts: shown in the history and used for
    // the Withdrawn total.
    async function loadWithdrawals() {
        const { data, error } = await supabase
            .from("admin_withdrawals")
            .select("id, usd_amount, status, method, account_last4, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            console.log("ADMIN WITHDRAWALS ERROR:", error);
            return;
        }

        setWithdrawals((data as WithdrawalRow[] | null) || []);
    }

    useEffect(() => {
        // Fetching data on mount and storing it in state is one of
        // the two valid uses of an effect (see
        // https://react.dev/learn/synchronizing-with-effects#fetching-data).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadWallet();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadBalance();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadWithdrawals();
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

            if (!cancelled) setProviders(Array.isArray(json.banks) ? json.banks : []);
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProviders();

        return () => {
            cancelled = true;
        };
    }, [showWithdraw, method]);

    // ==================================================
    // WITHDRAW HELPERS
    // ==================================================

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
    const cleanNumber = accountNumber.replace(/\s+/g, "");

    const amountValid =
        amountInput.trim() !== "" &&
        /^\d+(\.\d{1,2})?$/.test(amountInput.trim()) &&
        Number.isFinite(amountNumber) &&
        amountNumber >= MIN_WITHDRAWAL &&
        amountNumber <= MAX_WITHDRAWAL;

    const amountWithinBalance = amountValid && amountNumber <= balance;

    const numberValid =
        method === "mobile_money"
            ? /^0\d{9}$/.test(cleanNumber)
            : /^\d{8,16}$/.test(cleanNumber);

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
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;

            if (!token) {
                setWithdrawError("Please log in again and retry.");
                setSubmitting(false);
                return;
            }

            const res = await fetch("/api/paystack/admin-withdraw", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    usdAmount: amountInput.trim(),
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

            setWithdrawNotice("Withdrawal submitted. It will be completed once the payout is confirmed.");
            setSubmitting(false);
            await loadBalance();
            await loadWithdrawals();
        } catch (error) {
            console.log("ADMIN WITHDRAW ERROR:", error);
            setWithdrawError("Something went wrong. Please try again.");
            setSubmitting(false);
        }
    }

    // ==================================================
    // TOTALS
    // ==================================================

    const totalRevenue = revenue.reduce(
        (total, item) => total + item.amount,
        0
    );

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = previousMonthDate.getMonth();
    const previousMonthYear = previousMonthDate.getFullYear();

    function sumForMonth(month: number, year: number) {
        return revenue
            .filter((item) => {
                const date = new Date(item.created_at);

                return (
                    date.getMonth() === month &&
                    date.getFullYear() === year
                );
            })
            .reduce((total, item) => total + item.amount, 0);
    }

    const thisMonthRevenue = sumForMonth(currentMonth, currentYear);
    const lastMonthRevenue = sumForMonth(previousMonth, previousMonthYear);

    // Failed / reversed payouts are refunded, so they don't count.
    const totalWithdrawn = withdrawals
        .filter((w) => w.status !== "failed" && w.status !== "reversed")
        .reduce((total, w) => total + Number(w.usd_amount || 0), 0);

    // One list: platform fees (money in) + payouts (money out), newest first.
    type HistoryEntry =
        | { kind: "revenue"; id: string; created_at: string; item: RevenueItem }
        | { kind: "withdrawal"; id: string; created_at: string; item: WithdrawalRow };

    const history: HistoryEntry[] = [
        ...revenue.map((item): HistoryEntry => ({
            kind: "revenue",
            id: `rev-${item.id}`,
            created_at: item.created_at,
            item,
        })),
        ...withdrawals.map((item): HistoryEntry => ({
            kind: "withdrawal",
            id: `wd-${item.id}`,
            created_at: item.created_at,
            item,
        })),
    ].sort(
        (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
    );

    // ==================================================
    // PAGINATION
    // ==================================================

    const totalPages = Math.max(
        1,
        Math.ceil(history.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const startIndex = (currentPage - 1) * PAGE_SIZE;

    const endIndex = Math.min(
        startIndex + PAGE_SIZE,
        history.length
    );

    const pageItems = history.slice(startIndex, endIndex);

    // Up to 3 page buttons, centred on the current page
    const firstButton = Math.max(
        1,
        Math.min(currentPage - 1, totalPages - 2)
    );

    const pageButtons = Array.from(
        { length: Math.min(3, totalPages) },
        (_, i) => firstButton + i
    );

    function formatWhen(value: string) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
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

                <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 sm:gap-4">

                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">
                            Platform Balance
                        </p>

                        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mt-2 wrap-break-words">
                            ${balance.toFixed(2)}
                        </h2>

                        <p className="text-sm text-gray-500 mt-3">
                            USD
                        </p>
                    </div>

                    <div className="relative flex flex-col items-start sm:items-end gap-3 sm:gap-4">

                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-semibold">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Active
                        </div>

                        <button
                            type="button"
                            onClick={openWithdraw}
                            disabled={balance <= 0}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition whitespace-nowrap"
                        >
                            <Download className="w-4 h-4" />
                            Withdraw Funds
                        </button>

                    </div>

                </div>

            </div>


            {/* SUMMARY */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mt-5 sm:mt-6">

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                        <WalletIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1 truncate">
                            ${totalRevenue.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">Last Month</p>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-1 truncate">
                            ${lastMonthRevenue.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">This Month</p>
                        <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1 truncate">
                            ${thisMonthRevenue.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="bg-white border rounded-2xl p-5 sm:p-6 flex items-center gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <ArrowUpDown className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">Withdrawn</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-700 mt-1 truncate">
                            ${totalWithdrawn.toFixed(2)}
                        </p>
                    </div>
                </div>

            </div>


            {/* TRANSACTION HISTORY */}

            <div className="bg-white rounded-2xl border p-5 sm:p-6 mt-6">

                <div className="flex items-start justify-between gap-3">

                    <div>
                        <h2 className="text-lg sm:text-xl font-bold">
                            Transaction History
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            Platform fees received and money withdrawn
                        </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {history.length}{" "}
                        {history.length === 1 ? "transaction" : "transactions"}
                    </span>

                </div>


                {history.length === 0 ? (

                    <div className="py-10 text-center">
                        <p className="text-gray-500">
                            No transactions yet.
                        </p>
                    </div>

                ) : (

                    <div className="mt-5 space-y-3">

                        {pageItems.map((entry) => {

                            if (entry.kind === "withdrawal") {
                                const w = entry.item;
                                const refunded =
                                    w.status === "failed" || w.status === "reversed";

                                const statusLabel =
                                    w.status === "completed"
                                        ? "Completed"
                                        : refunded
                                          ? "Failed - refunded"
                                          : "Processing";

                                return (
                                    <div
                                        key={entry.id}
                                        className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4"
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg">
                                            ⬇
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-gray-900">
                                                Money withdrawn
                                            </p>

                                            <p className="mt-0.5 text-sm text-gray-700">
                                                To {w.method === "bank" ? "bank account" : "mobile money"}
                                                {w.account_last4 ? ` ending ${w.account_last4}` : ""}
                                                {" · "}
                                                {statusLabel}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                {formatWhen(w.created_at)}
                                            </p>
                                        </div>

                                        <p
                                            className={`shrink-0 font-bold ${
                                                refunded
                                                    ? "text-gray-400 line-through"
                                                    : "text-blue-700"
                                            }`}
                                        >
                                            -${Number(w.usd_amount).toFixed(2)}
                                        </p>
                                    </div>
                                );
                            }

                            const item = entry.item;

                            return (
                                <div
                                    key={entry.id}
                                    className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50/50 p-4"
                                >

                                    {/* ICON */}
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg">
                                        💰
                                    </div>

                                    {/* DETAILS */}
                                    <div className="min-w-0 flex-1">

                                        <p className="font-semibold text-gray-900">
                                            Revenue received
                                        </p>

                                        <p className="mt-0.5 text-sm text-gray-700 wrap-break-word">
                                            {item.taskTitle
                                                ? <>Platform fee for <span className="font-semibold">{item.taskTitle}</span></>
                                                : item.description || "Platform fee"}
                                        </p>

                                        <p className="mt-1 text-xs text-gray-500">
                                            {formatWhen(item.created_at)}
                                        </p>

                                    </div>

                                    {/* AMOUNT */}
                                    <p className="shrink-0 font-bold text-green-600">
                                        +${item.amount.toFixed(2)}
                                    </p>

                                </div>
                            );
                        })}

                    </div>

                )}

                {history.length > 0 && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                        <p className="text-sm text-gray-500">
                            Showing {startIndex + 1} to {endIndex} of{" "}
                            {history.length}{" "}
                            {history.length === 1
                                ? "transaction"
                                : "transactions"}
                        </p>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage(Math.max(1, currentPage - 1))
                                    }
                                    disabled={currentPage === 1}
                                    aria-label="Previous page"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    ‹
                                </button>

                                {pageButtons.map((number) => (
                                    <button
                                        key={number}
                                        type="button"
                                        onClick={() => setPage(number)}
                                        className={`
                                            flex
                                            h-9
                                            w-9
                                            items-center
                                            justify-center
                                            rounded-lg
                                            border
                                            text-sm
                                            font-semibold
                                            transition
                                            ${
                                                number === currentPage
                                                    ? "border-blue-600 bg-blue-600 text-white"
                                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                            }
                                        `}
                                    >
                                        {number}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage(
                                            Math.min(totalPages, currentPage + 1)
                                        )
                                    }
                                    disabled={currentPage === totalPages}
                                    aria-label="Next page"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    ›
                                </button>

                            </div>
                        )}

                    </div>
                )}

            </div>


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
                            Platform balance is in USD (${balance.toFixed(2)} available). You&apos;ll be paid in Ghana cedis (GH₵).
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
                                        value={amountInput}
                                        onChange={(e) => setAmountInput(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full py-3 outline-none bg-transparent"
                                    />
                                </div>

                                {amountInput.trim() !== "" && !amountValid && (
                                    <p className="text-sm text-red-600 mt-2">
                                        Enter an amount from ${MIN_WITHDRAWAL} to ${MAX_WITHDRAWAL.toLocaleString()} (up to 2 decimals).
                                    </p>
                                )}

                                {amountValid && !amountWithinBalance && (
                                    <p className="text-sm text-red-600 mt-2">
                                        That&apos;s more than the platform balance (${balance.toFixed(2)}).
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
                                        The final amount is confirmed when you submit. Double-check the number —
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
                                        disabled={!formValid || submitting}
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