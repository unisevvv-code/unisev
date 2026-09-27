"use client";

import { useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StudentProfilePreview from "../student/components/StudentProfilePreview";

interface ApplicationsPageProps {
    goToWallet: () => void;
    goToMyTasks: () => void;
}

interface ApplicantProfile {
    id: string;
    full_name: string | null;
    department: string | null;
    university: string | null;
    verification_status: string | null;
    average_rating: number | null;
    total_ratings: number;
}

interface ApplicationTask {
    id: string;
    title: string | null;
    category: string | null;
    recommended_price: number | null;
    client_id: string;
}

interface Application {
    id: string;
    task_id: string;
    student_id: string;
    status: string;
    client_status: string | null;
    completion_requested_at: string | null;
    asking_price: number | null;
    created_at: string;
    reviewed_at: string | null;
    tasks: ApplicationTask;
    profiles: ApplicantProfile;
}

const AVATAR_COLORS = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-teal-500",
];

type TabKey = "all" | "open" | "accepted" | "rejected";

export default function ApplicationsPage({
    goToWallet,
    goToMyTasks,
}: ApplicationsPageProps) {

    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<TabKey>("open");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sortOrder, setSortOrder] =
        useState<"newest" | "oldest">("newest");

    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    const [selectedStudentId, setSelectedStudentId] =
        useState<string | null>(null);

    const [processingId, setProcessingId] =
        useState<string | null>(null);

    const [completionPopupId, setCompletionPopupId] =
        useState<string | null>(null);

    useEffect(() => {
        loadApplications();

        let channel: RealtimeChannel | null = null;
        let cancelled = false;

        async function setupRealtime() {
            const { data: userData } = await supabase.auth.getUser();

            if (!userData.user || cancelled) return;

            const newChannel = supabase
                .channel(`client-applications-${userData.user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "applications",
                    },
                    () => {
                        loadApplications();
                    }
                );

            if (cancelled) {
                supabase.removeChannel(newChannel);
                return;
            }

            channel = newChannel;
            channel.subscribe();
        }

        setupRealtime();

        return () => {
            cancelled = true;

            if (channel) {
                supabase.removeChannel(channel);
                channel = null;
            }
        };
    }, []);

    // =========================================================
    // RESET PAGE WHEN FILTERS CHANGE
    //
    // Adjusted during render rather than in an Effect (React's
    // recommended pattern for "resetting state when a prop/derived
    // value changes") so we don't trigger an extra cascading render.
    // =========================================================

    const filterKey = `${activeTab}|${categoryFilter}|${sortOrder}`;
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);

    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey);
        setCurrentPage(1);
    }

    // =========================================================
    // LOAD ALL APPLICATIONS ACROSS ALL OF THE CLIENT'S TASKS
    // =========================================================

    async function loadApplications() {
        setLoading(true);

        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("applications")
            .select(`
                id,
                task_id,
                student_id,
                status,
                client_status,
                completion_requested_at,
                asking_price,
                created_at,
                reviewed_at,
                tasks!inner(
                    id,
                    title,
                    category,
                    recommended_price,
                    client_id
                ),
                profiles!applications_student_id_fkey(
                    id,
                    full_name,
                    department,
                    university,
                    verification_status,
                    average_rating,
                    total_ratings
                )
            `)
            .eq("tasks.client_id", userData.user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.log("LOAD APPLICATIONS ERROR:", error);
            setLoading(false);
            return;
        }

        setApplications((data as unknown as Application[]) || []);
        setLoading(false);
    }

    // =========================================================
    // MARK REVIEWED (on avatar click)
    // =========================================================

    async function openStudentDetails(app: Application) {
        setSelectedStudentId(app.student_id);

        if (!app.reviewed_at) {
            const { error } = await supabase.rpc(
                "mark_application_reviewed",
                { p_application_id: app.id }
            );

            if (error) {
                console.log("MARK REVIEWED ERROR:", error);
                return;
            }

            setApplications((previous) =>
                previous.map((item) =>
                    item.id === app.id
                        ? { ...item, reviewed_at: new Date().toISOString() }
                        : item
                )
            );
        }
    }

    // =========================================================
    // ACCEPT STUDENT
    //
    // Same escrow + acceptance flow as before, now parameterized
    // by taskId since this page spans every task at once.
    // =========================================================

    async function acceptStudent(app: Application) {
        setProcessingId(app.id);

        try {
            const {
                data: userData,
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !userData.user) {
                alert("Your session has expired. Please log in again.");
                return;
            }

            const { data, error } = await supabase.rpc(
                "accept_student_with_payment",
                {
                    p_task_id: app.task_id,
                    p_student_id: app.student_id,
                }
            );

            if (error) {
                console.log("ACCEPT STUDENT PAYMENT ERROR:", error);

                const errorMessage = error.message || "";

                if (errorMessage.startsWith("INSUFFICIENT_FUNDS:")) {
                    const parts = errorMessage.split(":");
                    const walletBalance = Number(parts[1] || 0);
                    const requiredAmount = Number(parts[2] || 0);

                    alert(
                        `Insufficient funds.\n\n` +
                        `Available balance: $${walletBalance.toFixed(2)}\n` +
                        `Required amount: $${requiredAmount.toFixed(2)}\n\n` +
                        `Please add funds to your wallet before accepting this student.`
                    );

                    goToWallet();
                    return;
                }

                alert(errorMessage || "Could not accept this student.");
                return;
            }

            const result = data as {
                success: boolean;
                task_type: string;
                escrow_id: string;
                amount: number;
                wallet_id: string;
                remaining_balance: number;
                current_participants?: number;
                max_participants?: number;
                currency: string;
            };

            const { error: messageError } = await supabase
                .from("messages")
                .insert({
                    sender_id: userData.user.id,
                    receiver_id: app.student_id,
                    task_id: app.task_id,
                    message:
                        "Hello, your application was accepted and the task has been funded.",
                });

            if (messageError) {
                console.log("MESSAGE ERROR:", messageError);
            }

            if (String(result.task_type).toLowerCase() === "multi") {
                alert(
                    `Student accepted successfully.\n\n` +
                    `Amount funded: $${Number(result.amount).toFixed(2)}\n\n` +
                    `Participants: ${result.current_participants}/${result.max_participants}\n\n` +
                    `Remaining wallet balance: $${Number(
                        result.remaining_balance
                    ).toFixed(2)}`
                );
            } else {
                alert(
                    `Student selected successfully.\n\n` +
                    `Amount funded: $${Number(result.amount).toFixed(2)}\n\n` +
                    `Remaining wallet balance: $${Number(
                        result.remaining_balance
                    ).toFixed(2)}`
                );
            }

            await loadApplications();

        } catch (error) {
            console.log("UNEXPECTED ACCEPT ERROR:", error);
            alert("Something went wrong while accepting the student.");

        } finally {
            setProcessingId(null);
        }
    }

    // =========================================================
    // CLIENT CONFIRMS STUDENT COMPLETION
    // =========================================================

    async function confirmCompletion(applicationId: string) {
        setProcessingId(applicationId);

        try {
            const { data, error } = await supabase.rpc(
                "confirm_task_completion",
                { p_application_id: applicationId }
            );

            if (error) {
                console.log("CONFIRM COMPLETION ERROR:", error);
                alert(error.message || "Could not confirm task completion.");
                return;
            }

            console.log("COMPLETION RESULT:", data);

            setCompletionPopupId(null);

            alert(
                "Task completed successfully.\n\nThe escrow payment has been released to the student."
            );

            await loadApplications();

        } catch (error) {
            console.log("UNEXPECTED COMPLETION ERROR:", error);
            alert("Something went wrong while confirming the task.");

        } finally {
            setProcessingId(null);
        }
    }

    // =========================================================
    // CLIENT REJECTS COMPLETION
    // =========================================================

    async function rejectCompletion(applicationId: string) {
        setProcessingId(applicationId);

        try {
            const { error } = await supabase.rpc(
                "reject_task_completion",
                { p_application_id: applicationId }
            );

            if (error) {
                console.log("REJECT COMPLETION ERROR:", error);
                alert(
                    error.message ||
                    "Could not reject the completion request."
                );
                return;
            }

            setCompletionPopupId(null);

            alert(
                "Completion request rejected.\n\nThe task remains active and the escrow payment is still held."
            );

            await loadApplications();

        } catch (error) {
            console.log("UNEXPECTED REJECTION ERROR:", error);
            alert("Something went wrong.");

        } finally {
            setProcessingId(null);
        }
    }

    // =========================================================
    // HELPERS
    // =========================================================

    function getInitials(name: string) {
        return (
            name
                ?.split(" ")
                .filter(Boolean)
                .map((word: string) => word[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "ST"
        );
    }

    function avatarColor(id: string) {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    function formatAppliedTime(dateString: string) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) return "Just now";
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
        }

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    }

    // =========================================================
    // DERIVED DATA
    // =========================================================

    const categories = Array.from(
        new Set(
            applications
                .map((app) => app.tasks?.category)
                .filter((category): category is string => Boolean(category))
        )
    );

    const openCount = applications.filter(
        (app) => app.status === "pending"
    ).length;

    const tabCounts: Record<TabKey, number> = {
        all: applications.length,
        open: openCount,
        accepted: applications.filter(
            (app) => app.status === "accepted" || app.status === "completed"
        ).length,
        rejected: applications.filter((app) => app.status === "rejected")
            .length,
    };

    let filtered = applications.filter((app) => {
        if (activeTab === "open") return app.status === "pending";
        if (activeTab === "accepted")
            return app.status === "accepted" || app.status === "completed";
        if (activeTab === "rejected") return app.status === "rejected";
        return true;
    });

    if (categoryFilter !== "all") {
        filtered = filtered.filter(
            (app) => app.tasks?.category === categoryFilter
        );
    }

    filtered = [...filtered].sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    const totalPages = Math.max(
        1,
        Math.ceil(filtered.length / PAGE_SIZE)
    );

    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    const TABS: { key: TabKey; label: string }[] = [
        { key: "all", label: "All Applications" },
        { key: "open", label: "Open" },
        { key: "accepted", label: "Accepted" },
        { key: "rejected", label: "Rejected" },
    ];

    return (
        <div>

            {/* ================================================= */}
            {/* HEADER */}
            {/* ================================================= */}

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                <div>
                    <div className="flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4"
                            />
                        </svg>

                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            Review Applications
                        </h1>
                    </div>

                    <p className="text-sm sm:text-base text-gray-500 mt-1">
                        Manage and review applications from students.
                    </p>
                </div>

                <button
                    onClick={goToMyTasks}
                    className="
                        w-full
                        sm:w-auto
                        border
                        border-blue-200
                        text-blue-600
                        bg-blue-50
                        px-5
                        py-2.5
                        rounded-xl
                        font-semibold
                        hover:bg-blue-100
                        active:bg-blue-100
                        transition
                        flex
                        items-center
                        justify-center
                        gap-2
                        shrink-0
                    "
                >
                    View All Tasks
                    <span>→</span>
                </button>

            </div>


            {/* ================================================= */}
            {/* STAT CARDS */}
            {/* ================================================= */}

            <div className="grid grid-cols-2 gap-3 sm:gap-5 mt-5 sm:mt-6">

                <div className="col-span-2 bg-white border rounded-2xl p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
    <div className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center text-xl sm:text-2xl">
        📄
    </div>
    <div className="min-w-0">
        <p className="text-2xl sm:text-3xl font-bold text-blue-600">
            {openCount}
        </p>
        <p className="font-semibold text-gray-900 text-sm sm:text-base">
            Open Applications
        </p>
        <p className="text-xs sm:text-sm text-gray-400">
            Awaiting your review
        </p>
    </div>
</div>

                 

            </div>


            {/* ================================================= */}
            {/* TABS + FILTER/SORT */}
            {/* ================================================= */}

            <div className="bg-white border rounded-2xl mt-5 sm:mt-6 overflow-hidden">

                <div className="flex flex-col gap-3 px-4 sm:px-5 pt-4">

                    {/*
                        Five tabs don't fit a phone's width, so this
                        scrolls horizontally instead of wrapping —
                        wrapped tab chips would look broken. Swipe to
                        see the rest on small screens.
                    */}
                    <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`
                                    shrink-0
                                    whitespace-nowrap
                                    pb-3
                                    border-b-2
                                    font-semibold
                                    text-sm
                                    flex
                                    items-center
                                    gap-1.5
                                    ${
                                        activeTab === tab.key
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700"
                                    }
                                `}
                            >
                                {tab.label}

                                {tabCounts[tab.key] > 0 && (
                                    <span
                                        className={`
                                            text-xs
                                            px-2
                                            py-0.5
                                            rounded-full
                                            ${
                                                activeTab === tab.key
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-gray-100 text-gray-600"
                                            }
                                        `}
                                    >
                                        {tabCounts[tab.key]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-3">

                        <select
                            value={categoryFilter}
                            onChange={(e) =>
                                setCategoryFilter(e.target.value)
                            }
                            className="w-full sm:w-auto border rounded-xl px-3 py-2 text-sm text-gray-600"
                        >
                            <option value="all">Filter: All categories</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>

                        <select
                            value={sortOrder}
                            onChange={(e) =>
                                setSortOrder(
                                    e.target.value as "newest" | "oldest"
                                )
                            }
                            className="w-full sm:w-auto border rounded-xl px-3 py-2 text-sm text-gray-600"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>

                    </div>

                </div>

                <div className="border-t" />


                {/* ================================================= */}
                {/* APPLICATION ROWS */}
                {/* ================================================= */}

                {loading ? (

                    <p className="text-center text-gray-500 py-10">
                        Loading applications...
                    </p>

                ) : pageItems.length === 0 ? (

                    <p className="text-center text-gray-500 py-10">
                        No applications here.
                    </p>

                ) : (

                    <div className="divide-y">

                        {pageItems.map((app: Application) => {

                            const profile = app.profiles;
                            const task = app.tasks;

                            const hasRating =
                                profile?.total_ratings > 0 &&
                                profile?.average_rating !== null;

                            const isPending = app.status === "pending";

                            const isAccepted =
                                app.status === "accepted" ||
                                app.status === "completed";

                            const hasCompletionRequest =
                                isAccepted &&
                                app.client_status === "pending" &&
                                app.completion_requested_at;

                            return (
                                <div
                                    key={app.id}
                                    className="
                                        flex
                                        flex-col
                                        sm:flex-row
                                        sm:items-center
                                        gap-3
                                        sm:gap-4
                                        px-4
                                        sm:px-5
                                        py-4
                                        hover:bg-gray-50
                                    "
                                >

                                    {/* APPLICANT */}
                                    <div className="flex items-center gap-3 w-full sm:w-56 sm:shrink-0 min-w-0">

                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => openStudentDetails(app)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    openStudentDetails(app);
                                                }
                                            }}
                                            className={`
                                                w-11
                                                h-11
                                                rounded-full
                                                ${avatarColor(app.student_id)}
                                                text-white
                                                flex
                                                items-center
                                                justify-center
                                                font-semibold
                                                text-sm
                                                shrink-0
                                                cursor-pointer
                                                hover:opacity-90
                                                transition
                                            `}
                                            title="View student profile"
                                        >
                                            {getInitials(profile?.full_name || "")}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">
                                                {profile?.full_name || "Unknown Student"}
                                            </p>

                                            <p className="text-sm text-gray-500 truncate">
                                                {profile?.department || "Not provided"}
                                            </p>

                                            {hasRating && (
                                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                                    <span className="text-yellow-400">★</span>
                                                    {Number(profile.average_rating).toFixed(1)}
                                                </p>
                                            )}
                                        </div>

                                    </div>

                                    {/* TASK */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">
                                            {task?.title || "Untitled Task"}
                                        </p>

                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-sm text-gray-500">
                                                {task?.category || "Uncategorized"}
                                            </span>

                                            {!app.reviewed_at && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                                    New
                                                </span>
                                            )}

                                            {hasCompletionRequest && (
                                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                                                    Completion pending review
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/*
                                        AMOUNT + APPLIED
                                        Grouped side-by-side on mobile to save
                                        vertical space. `sm:contents` unwraps this
                                        div at sm: and up, so the two children
                                        become direct items of the row again and
                                        pick up their normal fixed widths.
                                    */}
                                    <div className="flex items-center gap-6 sm:contents">

                                        <div className="sm:w-28 sm:shrink-0">
                                            <p className="text-xs text-gray-400">
                                                Amount
                                            </p>
                                            <p className="text-green-600 font-semibold">
                                                $
                                                {app.asking_price ||
                                                    task?.recommended_price ||
                                                    "Not set"}
                                            </p>
                                        </div>

                                        <div className="sm:w-36 sm:shrink-0 text-sm text-gray-500">
                                            <p>Applied</p>
                                            <p>{formatAppliedTime(app.created_at)}</p>
                                        </div>

                                    </div>

                                    {/* ACTIONS */}
                                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">

                                        {isPending && (
                                            <button
                                                onClick={() => acceptStudent(app)}
                                                disabled={processingId === app.id}
                                                className="
                                                    flex-1
                                                    sm:flex-none
                                                    bg-green-600
                                                    text-white
                                                    px-4
                                                    py-2
                                                    rounded-xl
                                                    text-sm
                                                    font-semibold
                                                    hover:bg-green-700
                                                    active:bg-green-700
                                                    disabled:opacity-50
                                                "
                                            >
                                                {processingId === app.id
                                                    ? "Accepting..."
                                                    : "Accept"}
                                            </button>
                                        )}

                                        {hasCompletionRequest && (
                                            <button
                                                onClick={() => setCompletionPopupId(app.id)}
                                                className="
                                                    flex-1
                                                    sm:flex-none
                                                    border
                                                    border-yellow-300
                                                    text-yellow-700
                                                    px-4
                                                    py-2
                                                    rounded-xl
                                                    text-sm
                                                    font-semibold
                                                    hover:bg-yellow-50
                                                    active:bg-yellow-50
                                                "
                                            >
                                                Review Completion
                                            </button>
                                        )}

                                        {!isPending && !hasCompletionRequest && (
                                            <span className="text-sm text-gray-400">
                                                No actions
                                            </span>
                                        )}

                                    </div>

                                </div>
                            );
                        })}

                    </div>

                )}


                {/* ================================================= */}
                {/* PAGINATION */}
                {/* ================================================= */}

                {filtered.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 border-t">

                        <p className="text-sm text-gray-500">
                            Showing {pageStart + 1} to{" "}
                            {Math.min(pageStart + PAGE_SIZE, filtered.length)} of{" "}
                            {filtered.length} applications
                        </p>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1">

                            <button
                                onClick={() =>
                                    setCurrentPage((p) => Math.max(1, p - 1))
                                }
                                disabled={currentPage === 1}
                                className="
                                    w-9
                                    h-9
                                    shrink-0
                                    rounded-lg
                                    border
                                    flex
                                    items-center
                                    justify-center
                                    text-gray-500
                                    disabled:opacity-40
                                "
                            >
                                ‹
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                (page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`
                                            w-9
                                            h-9
                                            shrink-0
                                            rounded-lg
                                            text-sm
                                            font-semibold
                                            ${
                                                currentPage === page
                                                    ? "bg-blue-600 text-white"
                                                    : "border text-gray-600 hover:bg-gray-50"
                                            }
                                        `}
                                    >
                                        {page}
                                    </button>
                                )
                            )}

                            <button
                                onClick={() =>
                                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                                }
                                disabled={currentPage === totalPages}
                                className="
                                    w-9
                                    h-9
                                    shrink-0
                                    rounded-lg
                                    border
                                    flex
                                    items-center
                                    justify-center
                                    text-gray-500
                                    disabled:opacity-40
                                "
                            >
                                ›
                            </button>

                        </div>

                    </div>
                )}

            </div>


            {/* ===================================================== */}
            {/* STUDENT PROFILE POPUP */}
            {/* ===================================================== */}

            {selectedStudentId && (
                <StudentProfilePreview
                    studentId={selectedStudentId}
                    onClose={() => setSelectedStudentId(null)}
                />
            )}


            {/* ===================================================== */}
            {/* COMPLETION REVIEW POPUP */}
            {/* ===================================================== */}

            {completionPopupId && (
                <div
                    className="
                        fixed
                        inset-0
                        z-50
                        flex
                        items-center
                        justify-center
                        bg-black/50
                        backdrop-blur-sm
                        p-4
                    "
                    onClick={() => setCompletionPopupId(null)}
                >

                    <div
                        className="
                            w-full
                            max-w-md
                            bg-white
                            rounded-2xl
                            shadow-2xl
                            p-5
                            sm:p-7
                        "
                        onClick={(e) => e.stopPropagation()}
                    >

                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                            Work Completion Request
                        </h3>

                        <p className="text-gray-600 mt-4">
                            The student says the work has been completed.
                        </p>

                        <p className="text-gray-500 text-sm mt-3">
                            If you confirm, the escrow payment will be released
                            to the student and the task will be marked as completed.
                        </p>

                        <p className="text-gray-500 text-sm mt-3">
                            If you choose No, the task will remain active and
                            the escrow payment will remain held.
                        </p>

                        <p className="text-gray-500 text-sm mt-3">
                            If you do not respond within 48 hours, the payment
                            will automatically be released and the task will be
                            marked as completed.
                        </p>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-7">

                            <button
                                type="button"
                                onClick={() => rejectCompletion(completionPopupId)}
                                disabled={processingId === completionPopupId}
                                className="
                                    w-full
                                    sm:w-auto
                                    px-5
                                    py-2.5
                                    rounded-xl
                                    border
                                    border-red-300
                                    text-red-600
                                    font-semibold
                                    hover:bg-red-50
                                    active:bg-red-50
                                    disabled:opacity-50
                                "
                            >
                                {processingId === completionPopupId
                                    ? "Processing..."
                                    : "No, Not Yet"}
                            </button>

                            <button
                                type="button"
                                onClick={() => confirmCompletion(completionPopupId)}
                                disabled={processingId === completionPopupId}
                                className="
                                    w-full
                                    sm:w-auto
                                    px-5
                                    py-2.5
                                    rounded-xl
                                    bg-green-500
                                    text-white
                                    font-semibold
                                    hover:bg-green-600
                                    active:bg-green-600
                                    disabled:opacity-50
                                "
                            >
                                {processingId === completionPopupId
                                    ? "Processing..."
                                    : "Yes, Confirm"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}