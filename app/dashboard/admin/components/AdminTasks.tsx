"use client";

import { useState } from "react";

interface Task {
    id?: string;
    title?: string;
    description?: string;
    category?: string;
    status?: string;
    recommended_price?: number;
    price?: number;
    budget?: number;
    asking_price?: number;
    expected_completion_date?: string;
    expected_day?: string | number;
    expected_month?: string | number;
    created_at?: string;
    attachments?: string[];

    // Multi Task fields (null/undefined on single tasks)
    task_type?: string | null;
    max_participants?: number | null;
    current_participants?: number | null;
    reward_per_participant?: number | null;
    duration_minutes?: number | null;
}

interface AdminTasksProps {
    tasks: Task[];
}

type SortOption = "newest" | "oldest" | "highest";

type TaskTypeFilter = "all" | "multi" | "single";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "newest", label: "Sort by: Newest" },
    { value: "oldest", label: "Sort by: Oldest" },
    { value: "highest", label: "Sort by: Highest Amount" },
];

const TYPE_OPTIONS: { value: TaskTypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "multi", label: "Multi Task" },
    { value: "single", label: "Single Task" },
];

export default function AdminTasks({
    tasks,
}: AdminTasksProps) {

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [taskTypeFilter, setTaskTypeFilter] =
        useState<TaskTypeFilter>("all");
    const [showTypeMenu, setShowTypeMenu] = useState(false);

    function isMultiTask(task: Task) {
        return task.task_type === "multi";
    }

    function getAmount(task: Task) {
        if (isMultiTask(task)) {
            return task.reward_per_participant ?? 0;
        }

        return (
            task.recommended_price ??
            task.price ??
            task.budget ??
            task.asking_price ??
            0
        );
    }

    function getTimeline(task: Task) {
        if (isMultiTask(task)) {
            return `${task.duration_minutes ?? "-"} min`;
        }

        if (task.expected_completion_date) {
            return task.expected_completion_date;
        }

        if (task.expected_day && task.expected_month) {
            return `${task.expected_day}/${task.expected_month}`;
        }

        return "Not specified";
    }

    function getParticipants(task: Task) {
        const current = task.current_participants ?? 0;
        const max = task.max_participants;

        return {
            current,
            max,
            label:
                max !== null && max !== undefined
                    ? `${current}/${max}`
                    : `${current}`,
            percent:
                max && max > 0
                    ? Math.min(100, Math.round((current / max) * 100))
                    : 0,
        };
    }

    function formatDate(value?: string) {
        if (!value) return "Not specified";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
        });
    }

    function statusClasses(status?: string) {
        const value = status?.toLowerCase();

        return value === "completed"
            ? "bg-purple-50 text-purple-600"
            : value === "assigned" || value === "accepted"
            ? "bg-orange-50 text-orange-600"
            : value === "cancelled"
            ? "bg-red-50 text-red-600"
            : "bg-emerald-50 text-emerald-600";
    }

    function statusDot(status?: string) {
        const value = status?.toLowerCase();

        return value === "completed"
            ? "bg-purple-500"
            : value === "assigned" || value === "accepted"
            ? "bg-orange-500"
            : value === "cancelled"
            ? "bg-red-500"
            : "bg-emerald-500";
    }

    function getCategoryIcon(category: string) {
        const value = category?.toLowerCase() || "";

        if (value.includes("development")) {
            return { icon: "💻", bg: "bg-blue-50", text: "text-blue-600" };
        }

        if (
            value.includes("design") ||
            value.includes("poster") ||
            value.includes("logo")
        ) {
            return { icon: "🎨", bg: "bg-purple-50", text: "text-purple-600" };
        }

        if (value.includes("writing") || value.includes("resume")) {
            return { icon: "✍️", bg: "bg-pink-50", text: "text-pink-600" };
        }

        if (value.includes("data")) {
            return { icon: "📊", bg: "bg-emerald-50", text: "text-emerald-600" };
        }

        if (value.includes("video")) {
            return { icon: "🎬", bg: "bg-orange-50", text: "text-orange-600" };
        }

        if (value.includes("social")) {
            return { icon: "📣", bg: "bg-rose-50", text: "text-rose-600" };
        }

        if (value.includes("mobile")) {
            return { icon: "📱", bg: "bg-amber-50", text: "text-amber-600" };
        }

        return { icon: "📋", bg: "bg-slate-50", text: "text-slate-600" };
    }

    // ---------------------------------------------
    // BASE LIST — everything except closed tasks
    // ---------------------------------------------

    const baseTasks = tasks.filter(
        (task) => task.status !== "closed"
    );

    // ---------------------------------------------
    // TASK TYPE — All / Multi Task / Single Task.
    // Tasks without a task_type are treated as
    // single tasks (covers older existing tasks).
    // ---------------------------------------------

    const typeFilteredTasks =
        taskTypeFilter === "all"
            ? baseTasks
            : baseTasks.filter((task) => {
                  const taskType = task.task_type || "single";
                  return taskType === taskTypeFilter;
              });

    // ---------------------------------------------
    // SEARCH — matches title, category, description
    // or status
    // ---------------------------------------------

    const query = searchQuery.trim().toLowerCase();

    const searchedTasks = query
        ? typeFilteredTasks.filter((task) => {
              return (
                  task.title?.toLowerCase().includes(query) ||
                  task.category?.toLowerCase().includes(query) ||
                  task.description?.toLowerCase().includes(query) ||
                  task.status?.toLowerCase().includes(query)
              );
          })
        : typeFilteredTasks;

    // ---------------------------------------------
    // SORT — newest/oldest by created_at, highest by
    // amount (reward per student for multi tasks)
    // ---------------------------------------------

    const visibleTasks = [...searchedTasks].sort((a, b) => {
        if (sortBy === "highest") {
            return (
                Number(getAmount(b)) - Number(getAmount(a))
            );
        }

        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();

        return sortBy === "oldest"
            ? dateA - dateB
            : dateB - dateA;
    });

    const currentSortLabel =
        SORT_OPTIONS.find((option) => option.value === sortBy)
            ?.label || "Sort by: Newest";

    const currentTypeLabel =
        TYPE_OPTIONS.find((option) => option.value === taskTypeFilter)
            ?.label || "All";

    return (
        <div className="w-full">

            {/* PAGE HEADER */}
            <div className="mb-2">

                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">
                    Tasks
                </h2>

                <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">
                    Monitor tasks across the UniSeV platform.
                </p>

            </div>

            {/* FILTERS */}
            <div className="mb-6 mt-6 flex flex-col gap-3 sm:mb-7 sm:mt-7 sm:gap-4 md:flex-row md:items-center">

                {/* TASK TYPE + SORT — share a row even on small phones */}
                <div className="flex gap-3 md:contents">

                    {/* TASK TYPE */}
                    <div className="relative w-1/2 md:w-47.5">

                        <button
                            type="button"
                            onClick={() => {
                                setShowTypeMenu((prev) => !prev);
                                setShowSortMenu(false);
                            }}
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:shadow sm:px-4"
                        >
                            <span className="truncate">
                                {currentTypeLabel}
                            </span>

                            <span className="shrink-0 pl-2 text-slate-400">
                                ▾
                            </span>
                        </button>

                        {showTypeMenu && (
                            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">

                                {TYPE_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setTaskTypeFilter(option.value);
                                            setShowTypeMenu(false);
                                        }}
                                        className={`
                                            block
                                            w-full
                                            px-4
                                            py-2.5
                                            text-left
                                            text-sm
                                            transition
                                            hover:bg-slate-50
                                            ${
                                                taskTypeFilter === option.value
                                                    ? "font-semibold text-blue-600"
                                                    : "text-slate-700"
                                            }
                                        `}
                                    >
                                        {option.label}
                                    </button>
                                ))}

                            </div>
                        )}

                    </div>

                    {/* SORT */}
                    <div className="relative w-1/2 md:w-47.5">

                        <button
                            type="button"
                            onClick={() => {
                                setShowSortMenu((prev) => !prev);
                                setShowTypeMenu(false);
                            }}
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:shadow sm:px-4"
                        >
                            <span className="truncate">
                                {currentSortLabel}
                            </span>

                            <span className="shrink-0 pl-2 text-slate-400">
                                ▾
                            </span>
                        </button>

                        {showSortMenu && (
                            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">

                                {SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setSortBy(option.value);
                                            setShowSortMenu(false);
                                        }}
                                        className={`
                                            block
                                            w-full
                                            px-4
                                            py-2.5
                                            text-left
                                            text-sm
                                            transition
                                            hover:bg-slate-50
                                            ${
                                                sortBy === option.value
                                                    ? "font-semibold text-blue-600"
                                                    : "text-slate-700"
                                            }
                                        `}
                                    >
                                        {option.label}
                                    </button>
                                ))}

                            </div>
                        )}

                    </div>

                </div>

                {/* SEARCH */}
                <div className="relative w-full md:ml-auto md:w-72.5">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        🔍
                    </span>

                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tasks..."
                        style={{ paddingLeft: 44 }}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />

                </div>

                {/* TASK COUNT */}
                <div className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm">
                    {visibleTasks.length}{" "}
                    {visibleTasks.length === 1 ? "task" : "tasks"}
                </div>

            </div>

            {/* EMPTY STATE */}
            {visibleTasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-3xl">
                        📋
                    </div>

                    <h3 className="text-lg font-semibold text-slate-800">
                        {query || taskTypeFilter !== "all"
                            ? "No matching tasks"
                            : "No tasks found"}
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        {query || taskTypeFilter !== "all"
                            ? "Try a different search term or filter."
                            : "Tasks posted on the platform will appear here."}
                    </p>

                </div>
            )}

            {/* TASK LIST */}
            {visibleTasks.length > 0 && (
                <div className="space-y-4">

                    {visibleTasks.map((task, index) => {

                        const multi = isMultiTask(task);
                        const category = getCategoryIcon(task.category || "");
                        const participants = getParticipants(task);

                        const totalPool =
                            multi &&
                            participants.max !== null &&
                            participants.max !== undefined
                                ? Number(task.reward_per_participant ?? 0) *
                                  participants.max
                                : null;

                        return (
                            <details
                                key={task.id ?? index}
                                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-blue-200 hover:shadow-[0_6px_20px_rgba(15,23,42,0.07)]"
                            >

                                {/* TASK SUMMARY */}
                                <summary className="cursor-pointer list-none px-4 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">

                                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:items-center sm:gap-x-4 sm:gap-y-4 lg:grid-cols-[2.4fr_0.9fr_1.1fr_0.9fr_1fr_auto] lg:items-center">

                                        {/* TASK TITLE */}
                                        <div className="flex min-w-0 items-start gap-3 sm:col-span-2 sm:gap-4 lg:col-span-1">

                                            <div
                                                className={`
                                                    mt-1
                                                    flex
                                                    h-10
                                                    w-10
                                                    shrink-0
                                                    items-center
                                                    justify-center
                                                    rounded-xl
                                                    sm:h-11
                                                    sm:w-11
                                                    ${category.bg}
                                                    ${category.text}
                                                `}
                                            >
                                                <span className="text-lg sm:text-xl">
                                                    {category.icon}
                                                </span>
                                            </div>

                                            <div className="min-w-0">

                                                <div className="flex flex-wrap items-start gap-2">

                                                    <h3 className="whitespace-normal wrap-break-word text-[15px] font-semibold leading-6 text-slate-900 sm:text-[16px]">
                                                        {task.title || "Untitled Task"}
                                                    </h3>

                                                    {/* MULTI TASK BADGE */}
                                                    {multi && (
                                                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 sm:px-2.5 sm:py-1 sm:text-[11px]">
                                                            👥 Multi Task
                                                        </span>
                                                    )}

                                                    {/* STATUS BADGE */}
                                                    <span
                                                        className={`
                                                            flex
                                                            shrink-0
                                                            items-center
                                                            gap-1
                                                            rounded-full
                                                            px-2
                                                            py-0.5
                                                            text-[10px]
                                                            font-semibold
                                                            capitalize
                                                            sm:px-2.5
                                                            sm:py-1
                                                            sm:text-[11px]
                                                            ${statusClasses(task.status)}
                                                        `}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${statusDot(task.status)}`}
                                                        />
                                                        {task.status || "Unknown"}
                                                    </span>

                                                </div>

                                                <p className="mt-1 text-[13px] text-slate-500 sm:text-[14px]">
                                                    {task.category || "Not specified"}
                                                </p>

                                                {/* SHORT PREVIEW */}
                                                <p className="mt-1 max-w-full truncate text-[12px] text-slate-400 sm:max-w-105">
                                                    {task.description || "No description provided."}
                                                </p>

                                            </div>

                                        </div>

                                        {/* AMOUNT */}
                                        <div>

                                            <p className="mb-1 text-[12px] font-medium text-slate-400">
                                                {multi ? "Amount" : "Amount"}
                                            </p>

                                            <p className="text-[17px] font-bold text-emerald-600 sm:text-[19px]">
                                                ${Number(getAmount(task)).toFixed(2)}
                                            </p>

                                        </div>

                                        {/* DURATION / DUE DATE */}
                                        <div>

                                            <p className="mb-1 text-[12px] font-medium text-slate-400">
                                                {multi ? "Duration" : "Due Date"}
                                            </p>

                                            <div className="flex items-center gap-2">

                                                <span className="text-slate-400">
                                                    {multi ? "⏱" : "📅"}
                                                </span>

                                                <p className="text-[14px] font-medium text-slate-700">
                                                    {getTimeline(task)}
                                                </p>

                                            </div>

                                        </div>

                                        {/* PARTICIPANTS */}
                                        <div>

                                            <p className="mb-1 text-[12px] font-medium text-slate-400">
                                                Participants
                                            </p>

                                            {multi ? (
                                                <p className="text-[14px] font-semibold text-slate-700">
                                                    {participants.label}
                                                </p>
                                            ) : (
                                                <p className="text-[14px] text-slate-300">
                                                    —
                                                </p>
                                            )}

                                        </div>

                                        {/* POSTED */}
                                        <div>

                                            <p className="mb-1 text-[12px] font-medium text-slate-400">
                                                Posted
                                            </p>

                                            <p className="text-[14px] font-medium text-slate-700">
                                                {formatDate(task.created_at)}
                                            </p>

                                        </div>

                                        {/* EXPAND ICON */}
                                        <div className="flex items-center justify-end sm:col-span-2 lg:col-span-1">

                                            <span className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-transform duration-200 group-open:rotate-180">
                                                ↓
                                            </span>

                                        </div>

                                    </div>

                                </summary>

                                {/* FULL DETAILS */}
                                <div className="border-t border-slate-100 bg-slate-50/60 px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">

                                    <div className="sm:ml-15">

                                        {/* FULL TITLE WHEN EXPANDED */}
                                        <h3 className="mb-4 whitespace-normal wrap-break-word text-base font-bold leading-7 text-slate-900 sm:text-lg">
                                            {task.title || "Untitled Task"}
                                        </h3>

                                        <p className="mb-3 text-sm font-semibold text-slate-800">
                                            Full Description
                                        </p>

                                        <p className="max-w-4xl whitespace-pre-wrap wrap-break-word text-[14px] leading-7 text-slate-500">
                                            {task.description || "No description provided."}
                                        </p>

                                        {/* DETAILS GRID */}
                                        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">

                                            <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                                                <p className="text-[11px] font-medium text-slate-400">
                                                    {multi ? "Reward / Student" : "Amount"}
                                                </p>
                                                <p className="mt-1 text-sm font-bold text-emerald-600">
                                                    ${Number(getAmount(task)).toFixed(2)}
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                                                <p className="text-[11px] font-medium text-slate-400">
                                                    {multi ? "Duration" : "Due Date"}
                                                </p>
                                                <p className="mt-1 text-sm font-bold text-slate-700">
                                                    {getTimeline(task)}
                                                </p>
                                            </div>

                                            {multi && (
                                                <>
                                                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                                                        <p className="text-[11px] font-medium text-slate-400">
                                                            Participants
                                                        </p>
                                                        <p className="mt-1 text-sm font-bold text-slate-700">
                                                            {participants.label}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                                                        <p className="text-[11px] font-medium text-slate-400">
                                                            Total Pool
                                                        </p>
                                                        <p className="mt-1 text-sm font-bold text-slate-700">
                                                            {totalPool !== null
                                                                ? `$${totalPool.toFixed(2)}`
                                                                : "-"}
                                                        </p>
                                                    </div>
                                                </>
                                            )}

                                        </div>

                                        {/* PARTICIPANT PROGRESS */}
                                        {multi &&
                                            participants.max !== null &&
                                            participants.max !== undefined && (
                                                <div className="mt-4 max-w-md">

                                                    <div className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-slate-500">
                                                        <span>Spots filled</span>
                                                        <span>{participants.percent}%</span>
                                                    </div>

                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                                        <div
                                                            className="h-full rounded-full bg-indigo-500 transition-all"
                                                            style={{ width: `${participants.percent}%` }}
                                                        />
                                                    </div>

                                                </div>
                                            )}

                                        {/* ATTACHMENTS */}
                                        {task.attachments && task.attachments.length > 0 && (

                                            <div className="mt-6">

                                                <p className="mb-3 text-sm font-semibold text-slate-800">
                                                    Attachment
                                                </p>

                                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

                                                    {task.attachments.map(
                                                        (url: string, fileIndex: number) => {

                                                            const fileName = decodeURIComponent(
                                                                url.split("/").pop() ||
                                                                    `File ${fileIndex + 1}`
                                                            );

                                                            const extension =
                                                                fileName
                                                                    .split(".")
                                                                    .pop()
                                                                    ?.toLowerCase() || "";

                                                            const isImage = [
                                                                "png",
                                                                "jpg",
                                                                "jpeg",
                                                                "gif",
                                                                "webp",
                                                            ].includes(extension);

                                                            return (
                                                                <div
                                                                    key={fileIndex}
                                                                    className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 transition hover:border-blue-200 hover:shadow-sm"
                                                                >

                                                                    {isImage ? (
                                                                        // eslint-disable-next-line @next/next/no-img-element
                                                                        <img
                                                                            src={url}
                                                                            alt={fileName}
                                                                            className="h-24 w-full rounded-lg object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex h-24 w-full items-center justify-center rounded-lg bg-slate-50 text-3xl">
                                                                            📄
                                                                        </div>
                                                                    )}

                                                                    <p className="mt-2 w-full truncate px-1 text-center text-xs text-slate-500">
                                                                        {fileName}
                                                                    </p>

                                                                    <a
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        download
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                                                    >
                                                                        ⬇ Download
                                                                    </a>

                                                                </div>
                                                            );
                                                        }
                                                    )}

                                                </div>

                                            </div>
                                        )}

                                    </div>

                                </div>

                            </details>
                        );
                    })}

                </div>
            )}

        </div>
    );
}