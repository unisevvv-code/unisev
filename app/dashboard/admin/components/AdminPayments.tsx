"use client";

import { useMemo, useState } from "react";
import {
    Search,
    Download,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Wallet,
    Landmark,
    User,
    Clock,
    PenTool,
    FileText,
    Video,
    BarChart3,
    Code2,
    Briefcase,
    X,
} from "lucide-react";

interface Payment {
    id?: string;
    task_id?: string;
    task_title?: string;
    task_category?: string;
    task_created_at?: string;
    client_id?: string;
    client_name?: string;
    student_id?: string;
    student_name?: string;
    amount?: number;
    status?: string;
    funded_at?: string;
    released_at?: string;
    refunded_at?: string;
    created_at?: string;
}

interface AdminPaymentsProps {
    payments: Payment[];
}

const PAGE_SIZE = 7;

const CATEGORY_STYLES: Record<
    string,
    { icon: React.ElementType; bg: string; fg: string }
> = {
    "Graphic Design": {
        icon: PenTool,
        bg: "bg-violet-100",
        fg: "text-violet-600",
    },
    "Research & Writing": {
        icon: FileText,
        bg: "bg-emerald-100",
        fg: "text-emerald-600",
    },
    "Video Editing": {
        icon: Video,
        bg: "bg-rose-100",
        fg: "text-rose-600",
    },
    "Data Analysis": {
        icon: BarChart3,
        bg: "bg-purple-100",
        fg: "text-purple-600",
    },
    "Web Development": {
        icon: Code2,
        bg: "bg-orange-100",
        fg: "text-orange-600",
    },
};

const DEFAULT_CATEGORY_STYLE = {
    icon: Briefcase,
    bg: "bg-slate-100",
    fg: "text-slate-500",
};

const AVATAR_COLORS = [
    "bg-blue-600",
    "bg-emerald-600",
    "bg-purple-600",
    "bg-orange-500",
    "bg-rose-600",
    "bg-teal-600",
    "bg-indigo-600",
    "bg-amber-600",
];

function colorForName(name: string) {
    let hash = 0;

    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % AVATAR_COLORS.length;

    return AVATAR_COLORS[index];
}

function initialsForName(name: string) {
    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name }: { name: string }) {
    return (
        <div
            className={`
                w-8
                h-8
                rounded-full
                ${colorForName(name)}
                text-white
                text-xs
                font-semibold
                flex
                items-center
                justify-center
                shrink-0
            `}
        >
            {initialsForName(name)}
        </div>
    );
}

function StatusBadge({ status }: { status?: string }) {
    const value = status || "pending";

    const styles: Record<string, string> = {
        released: "bg-green-100 text-green-700",
        funded: "bg-blue-100 text-blue-700",
        refunded: "bg-red-100 text-red-700",
        pending: "bg-orange-100 text-orange-700",
    };

    return (
        <span
            className={`
                inline-flex
                px-3
                py-1
                rounded-full
                text-xs
                font-semibold
                ${styles[value] || styles.pending}
            `}
        >
            {value}
        </span>
    );
}

function SummaryCard({
    icon: Icon,
    iconBg,
    iconFg,
    label,
    value,
    sublabel,
}: {
    icon: React.ElementType;
    iconBg: string;
    iconFg: string;
    label: string;
    value: string;
    sublabel: string;
}) {
    return (
        <div className="bg-white border rounded-2xl p-6 shadow-sm flex items-start gap-4">
            <div
                className={`
                    w-11
                    h-11
                    rounded-xl
                    ${iconBg}
                    flex
                    items-center
                    justify-center
                    shrink-0
                `}
            >
                <Icon className={`w-5 h-5 ${iconFg}`} />
            </div>

            <div>
                <p className="text-sm text-slate-500">{label}</p>

                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                    {value}
                </h2>

                <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
            </div>
        </div>
    );
}

export default function AdminPayments({
    payments,
}: AdminPaymentsProps) {

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    function formatDate(value?: string) {
        if (!value) {
            return "—";
        }

        return new Date(value).toLocaleDateString();
    }

    function formatDateTime(value?: string): string | { date: string; time: string } {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };
    }

    // ==================================================
    // SUMMARY FIGURES
    // ==================================================

    const totalPayments = payments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
    );

    const uniSevFee = totalPayments * 0.15;
    const studentEarnings = totalPayments * 0.85;

    const pendingCount = payments.filter(
        (payment) => (payment.status || "pending") === "pending"
    ).length;

    // ==================================================
    // FILTERING, SEARCH, SORT
    // ==================================================

    const filteredPayments = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const previousMonth = previousMonthDate.getMonth();
        const previousMonthYear = previousMonthDate.getFullYear();

        let result = payments.filter((payment) => {
            const matchesSearch =
                search.trim() === "" ||
                [
                    payment.task_title,
                    payment.client_name,
                    payment.student_name,
                ]
                    .filter(Boolean)
                    .some((field) =>
                        field!
                            .toLowerCase()
                            .includes(search.trim().toLowerCase())
                    );

            const matchesStatus =
                statusFilter === "all" ||
                (payment.status || "pending") === statusFilter;

            let matchesDate = true;

            if (dateFilter !== "all" && payment.created_at) {
                const created = new Date(payment.created_at);

                if (dateFilter === "this_month") {
                    matchesDate =
                        created.getMonth() === currentMonth &&
                        created.getFullYear() === currentYear;
                }

                if (dateFilter === "last_month") {
                    matchesDate =
                        created.getMonth() === previousMonth &&
                        created.getFullYear() === previousMonthYear;
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
        });

        result = result.slice().sort((a, b) => {
            const diff = Number(a.amount || 0) - Number(b.amount || 0);

            return sortDirection === "asc" ? diff : -diff;
        });

        return result;
    }, [payments, search, statusFilter, dateFilter, sortDirection]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredPayments.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const pagedPayments = filteredPayments.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const rangeStart =
        filteredPayments.length === 0
            ? 0
            : (currentPage - 1) * PAGE_SIZE + 1;

    const rangeEnd = Math.min(
        currentPage * PAGE_SIZE,
        filteredPayments.length
    );

    // ==================================================
    // EXPORT
    // ==================================================

    function exportCsv() {
        const headers = [
            "Task",
            "Category",
            "Client",
            "Student",
            "Amount",
            "UniSeV Fee (15%)",
            "Student Amount (85%)",
            "Status",
            "Created",
        ];

        const rows = filteredPayments.map((payment) => {
            const amount = Number(payment.amount || 0);

            return [
                payment.task_title || payment.task_id || "Untitled Task",
                payment.task_category || "",
                payment.client_name || payment.client_id || "",
                payment.student_name || payment.student_id || "",
                amount.toFixed(2),
                (amount * 0.15).toFixed(2),
                (amount * 0.85).toFixed(2),
                payment.status || "pending",
                payment.created_at || "",
            ]
                .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                .join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "unisev-payments.csv";
        link.click();

        URL.revokeObjectURL(url);
    }

    function updatePage(next: number) {
        setPage(Math.min(Math.max(1, next), totalPages));
    }

    return (
        <div className="space-y-6">

            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    Payments
                </h1>

                <p className="text-slate-500 mt-1">
                    Monitor escrow payments and transaction activity.
                </p>
            </div>

            {/* SUMMARY CARDS */}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                <SummaryCard
                    icon={Wallet}
                    iconBg="bg-blue-100"
                    iconFg="text-blue-600"
                    label="Total Payments"
                    value={`$${totalPayments.toFixed(2)}`}
                    sublabel="All transactions"
                />

                <SummaryCard
                    icon={Landmark}
                    iconBg="bg-emerald-100"
                    iconFg="text-emerald-600"
                    label="UniSeV Fee (15%)"
                    value={`$${uniSevFee.toFixed(2)}`}
                    sublabel="Platform fee"
                />

                <SummaryCard
                    icon={User}
                    iconBg="bg-purple-100"
                    iconFg="text-purple-600"
                    label="Student Earnings (85%)"
                    value={`$${studentEarnings.toFixed(2)}`}
                    sublabel="Total released to students"
                />

                <SummaryCard
                    icon={Clock}
                    iconBg="bg-orange-100"
                    iconFg="text-orange-500"
                    label="Pending Payments"
                    value={String(pendingCount)}
                    sublabel="Awaiting release"
                />

            </div>

            {/* SEARCH + FILTERS */}

            <div className="flex flex-col md:flex-row gap-3 md:items-center">

                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

                    <input
                        type="text"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by task title, client, or student..."
                        className="
                            w-full
                            pl-9
                            pr-4
                            py-2.5
                            border
                            rounded-xl
                            text-sm
                            text-slate-700
                            focus:outline-none
                            focus:ring-2
                            focus:ring-blue-500
                        "
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(event) => {
                        setStatusFilter(event.target.value);
                        setPage(1);
                    }}
                    className="
                        border
                        rounded-xl
                        px-3
                        py-2.5
                        text-sm
                        text-slate-700
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="funded">Funded</option>
                    <option value="released">Released</option>
                    <option value="refunded">Refunded</option>
                </select>

                <select
                    value={dateFilter}
                    onChange={(event) => {
                        setDateFilter(event.target.value);
                        setPage(1);
                    }}
                    className="
                        border
                        rounded-xl
                        px-3
                        py-2.5
                        text-sm
                        text-slate-700
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500
                    "
                >
                    <option value="all">All Dates</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                </select>

                <button
                    onClick={exportCsv}
                    className="
                        flex
                        items-center
                        gap-2
                        border
                        rounded-xl
                        px-4
                        py-2.5
                        text-sm
                        font-semibold
                        text-blue-600
                        border-blue-200
                        hover:bg-blue-50
                        transition
                    "
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>

            </div>

            {/* TABLE */}

            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">

                {filteredPayments.length === 0 ? (

                    <div className="p-8 text-center">

                        <p className="text-slate-500">
                            No payments match your filters.
                        </p>

                    </div>

                ) : (

                    <>

                        <div className="overflow-x-auto">

                            <table className="w-full">

                                <thead className="bg-slate-50 border-b">

                                    <tr>

                                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                                            Task
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                                            Client
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                                            Student
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                                            <button
                                                onClick={() =>
                                                    setSortDirection(
                                                        sortDirection === "asc"
                                                            ? "desc"
                                                            : "asc"
                                                    )
                                                }
                                                className="flex items-center gap-1 hover:text-slate-900"
                                            >
                                                Amount
                                                <ArrowUpDown className="w-3.5 h-3.5" />
                                            </button>
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                                            UniSeV Fee (15%)
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                                            Student Amount (85%)
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                                            Status
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                                            Date Created
                                        </th>

                                        <th className="p-4"></th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {pagedPayments.map((payment) => {
                                        const categoryStyle =
                                            (payment.task_category &&
                                                CATEGORY_STYLES[
                                                    payment.task_category
                                                ]) ||
                                            DEFAULT_CATEGORY_STYLE;

                                        const CategoryIcon = categoryStyle.icon;

                                        const created = formatDateTime(
                                            payment.created_at
                                        );

                                        return (

                                            <tr
                                                key={payment.id}
                                                className="border-b last:border-b-0 hover:bg-slate-50"
                                            >

                                                <td className="p-4">

                                                    <div className="flex items-center gap-3">

                                                        <div
                                                            className={`
                                                                w-9
                                                                h-9
                                                                rounded-lg
                                                                ${categoryStyle.bg}
                                                                flex
                                                                items-center
                                                                justify-center
                                                                shrink-0
                                                            `}
                                                        >
                                                            <CategoryIcon
                                                                className={`w-4 h-4 ${categoryStyle.fg}`}
                                                            />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-900 truncate">
                                                                {payment.task_title ||
                                                                    payment.task_id ||
                                                                    "Untitled Task"}
                                                            </p>

                                                            <p className="text-xs text-slate-400">
                                                                {payment.task_category ||
                                                                    "Uncategorized"}
                                                            </p>
                                                        </div>

                                                    </div>

                                                </td>

                                                <td className="p-4">

                                                    {payment.client_name || payment.client_id ? (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar
                                                                name={
                                                                    payment.client_name ||
                                                                    payment.client_id ||
                                                                    "?"
                                                                }
                                                            />

                                                            <span className="text-sm text-slate-700">
                                                                {payment.client_name ||
                                                                    payment.client_id}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">—</span>
                                                    )}

                                                </td>

                                                <td className="p-4">

                                                    {payment.student_name || payment.student_id ? (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar
                                                                name={
                                                                    payment.student_name ||
                                                                    payment.student_id ||
                                                                    "?"
                                                                }
                                                            />

                                                            <span className="text-sm text-slate-700">
                                                                {payment.student_name ||
                                                                    payment.student_id}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">—</span>
                                                    )}

                                                </td>

                                                <td className="p-4">
                                                    <span className="font-bold text-slate-900">
                                                        ${Number(payment.amount || 0).toFixed(2)}
                                                    </span>
                                                </td>

                                                <td className="p-4 text-sm text-slate-600">
                                                    ${(Number(payment.amount || 0) * 0.15).toFixed(2)}
                                                </td>

                                                <td className="p-4 text-sm text-slate-600">
                                                    ${(Number(payment.amount || 0) * 0.85).toFixed(2)}
                                                </td>

                                                <td className="p-4">
                                                    <StatusBadge status={payment.status} />
                                                </td>

                                                <td className="p-4 text-sm text-slate-600">
                                                    {typeof created === "string" ? (
                                                        created
                                                    ) : (
                                                        <>
                                                            <p>{created.date}</p>
                                                            <p className="text-xs text-slate-400">
                                                                {created.time}
                                                            </p>
                                                        </>
                                                    )}
                                                </td>

                                                <td className="p-4 relative">
                                                    <button
                                                        onClick={() =>
                                                            setOpenMenuId(
                                                                openMenuId === payment.id
                                                                    ? null
                                                                    : payment.id || null
                                                            )
                                                        }
                                                        className="p-1.5 rounded-lg hover:bg-slate-100"
                                                    >
                                                        <MoreVertical className="w-4 h-4 text-slate-500" />
                                                    </button>

                                                    {openMenuId === payment.id && (
                                                        <div
                                                            className="
                                                                absolute
                                                                right-4
                                                                top-10
                                                                z-10
                                                                bg-white
                                                                border
                                                                rounded-xl
                                                                shadow-lg
                                                                py-1
                                                                w-36
                                                            "
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedPayment(payment);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="
                                                                    w-full
                                                                    text-left
                                                                    px-4
                                                                    py-2
                                                                    text-sm
                                                                    text-slate-700
                                                                    hover:bg-slate-50
                                                                "
                                                            >
                                                                View details
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>

                                            </tr>
                                        );
                                    })}

                                </tbody>

                            </table>

                        </div>

                        {/* PAGINATION */}

                        <div className="flex items-center justify-between px-4 py-3 border-t">

                            <p className="text-sm text-slate-500">
                                Showing {rangeStart} to {rangeEnd} of{" "}
                                {filteredPayments.length} payments
                            </p>

                            <div className="flex items-center gap-2">

                                <button
                                    onClick={() => updatePage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="
                                        w-8
                                        h-8
                                        flex
                                        items-center
                                        justify-center
                                        rounded-lg
                                        border
                                        text-slate-500
                                        disabled:opacity-40
                                        hover:bg-slate-50
                                    "
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <span
                                    className="
                                        w-8
                                        h-8
                                        flex
                                        items-center
                                        justify-center
                                        rounded-lg
                                        bg-blue-600
                                        text-white
                                        text-sm
                                        font-semibold
                                    "
                                >
                                    {currentPage}
                                </span>

                                <button
                                    onClick={() => updatePage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="
                                        w-8
                                        h-8
                                        flex
                                        items-center
                                        justify-center
                                        rounded-lg
                                        border
                                        text-slate-500
                                        disabled:opacity-40
                                        hover:bg-slate-50
                                    "
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>

                            </div>

                        </div>

                    </>

                )}

            </div>

            {/* DETAILS MODAL */}

            {selectedPayment && (
                <div
                    className="
                        fixed
                        inset-0
                        bg-black/40
                        flex
                        items-center
                        justify-center
                        z-50
                        p-4
                    "
                    onClick={() => setSelectedPayment(null)}
                >
                    <div
                        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >

                        <div className="flex items-start justify-between mb-4">

                            <h3 className="text-lg font-bold text-slate-900">
                                Payment Details
                            </h3>

                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>

                        </div>

                        <div className="space-y-3 text-sm">

                            <div className="flex justify-between">
                                <span className="text-slate-500">Task</span>
                                <span className="font-semibold text-slate-900">
                                    {selectedPayment.task_title ||
                                        selectedPayment.task_id ||
                                        "Untitled Task"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Category</span>
                                <span className="text-slate-700">
                                    {selectedPayment.task_category || "Uncategorized"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Client</span>
                                <span className="text-slate-700">
                                    {selectedPayment.client_name ||
                                        selectedPayment.client_id ||
                                        "—"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Student</span>
                                <span className="text-slate-700">
                                    {selectedPayment.student_name ||
                                        selectedPayment.student_id ||
                                        "—"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Amount</span>
                                <span className="font-semibold text-slate-900">
                                    ${Number(selectedPayment.amount || 0).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">UniSeV Fee (15%)</span>
                                <span className="text-slate-700">
                                    ${(Number(selectedPayment.amount || 0) * 0.15).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Student Amount (85%)</span>
                                <span className="text-slate-700">
                                    ${(Number(selectedPayment.amount || 0) * 0.85).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Status</span>
                                <StatusBadge status={selectedPayment.status} />
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Funded</span>
                                <span className="text-slate-700">
                                    {formatDate(selectedPayment.funded_at)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Released</span>
                                <span className="text-slate-700">
                                    {formatDate(selectedPayment.released_at)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">Created</span>
                                <span className="text-slate-700">
                                    {formatDate(selectedPayment.created_at)}
                                </span>
                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}