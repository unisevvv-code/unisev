"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

const PLATFORM_FEE_RATE = 0.15;

// Transactions shown per page (same as the Payments tab)
const PAGE_SIZE = 7;

export default function AdminWallet() {
    const [revenue, setRevenue] =
        useState<RevenueItem[]>([]);

    const [balance, setBalance] =
        useState(0);

    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);

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
                : rows.filter((row) => Number(row.amount) > 0);

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

    useEffect(() => {
        // Fetching data on mount and storing it in state is one of
        // the two valid uses of an effect (see
        // https://react.dev/learn/synchronizing-with-effects#fetching-data).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadWallet();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadBalance();
    }, []);

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

    // ==================================================
    // PAGINATION
    // ==================================================

    const totalPages = Math.max(
        1,
        Math.ceil(revenue.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const startIndex = (currentPage - 1) * PAGE_SIZE;

    const endIndex = Math.min(
        startIndex + PAGE_SIZE,
        revenue.length
    );

    const pageItems = revenue.slice(startIndex, endIndex);

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

                <div className="bg-white rounded-2xl border p-5 sm:p-6">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-blue-600 mt-3">
                        ${totalRevenue.toFixed(2)}
                    </h2>
                </div>

                <div className="bg-white rounded-2xl border p-5 sm:p-6">
                    <p className="text-sm text-gray-500">Last Month</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-purple-600 mt-3">
                        ${lastMonthRevenue.toFixed(2)}
                    </h2>
                </div>

                <div className="bg-white rounded-2xl border p-5 sm:p-6">
                    <p className="text-sm text-gray-500">This Month</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-green-600 mt-3">
                        ${thisMonthRevenue.toFixed(2)}
                    </h2>
                </div>

                <div className="bg-white rounded-2xl border p-5 sm:p-6">
                    <p className="text-sm text-gray-500">Balance</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 mt-3">
                        ${balance.toFixed(2)}
                    </h2>
                </div>

            </div>


            {/* REVENUE NOTIFICATIONS */}

            <div className="bg-white rounded-2xl border p-5 sm:p-6 mt-6">

                <div className="flex items-start justify-between gap-3">

                    <div>
                        <h2 className="text-lg sm:text-xl font-bold">
                            Platform Revenue
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            UniSeV&apos;s 15% platform fees
                        </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {revenue.length}{" "}
                        {revenue.length === 1 ? "transaction" : "transactions"}
                    </span>

                </div>


                {revenue.length === 0 ? (

                    <div className="py-10 text-center">
                        <p className="text-gray-500">
                            No platform revenue yet.
                        </p>
                    </div>

                ) : (

                    <div className="mt-5 space-y-3">

                        {pageItems.map((item) => (

                            <div
                                key={item.id}
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

                        ))}

                    </div>

                )}

                {revenue.length > 0 && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                        <p className="text-sm text-gray-500">
                            Showing {startIndex + 1} to {endIndex} of{" "}
                            {revenue.length}{" "}
                            {revenue.length === 1
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

        </div>
    );
}