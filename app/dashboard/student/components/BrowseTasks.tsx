"use client";

import { useState } from "react";

type Task = {
  id: string;
  status: string;
  title: string;
  category: string;
  description: string;
  created_at: string;
  task_type?: "single" | "multi" | null;

  // Single-task fields
  recommended_price?: number | null;
  budget?: number | null;
  expected_day?: number | string | null;
  expected_month?: number | string | null;

  // Multi-task fields
  reward_per_participant?: number | null;
  duration_minutes?: number | null;
  current_participants?: number | null;
  max_participants?: number | null;
};

interface BrowseTasksProps {
  tasks: Task[];
  askingPrices: Record<string, string>;
  setAskingPrices: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  applyTask: (taskId: string, askingPrice?: string) => void;
}

type SortOption = "newest" | "oldest" | "highest";

type TaskTypeFilter = "all" | "multi" | "single";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Sort by: Newest" },
  { value: "oldest", label: "Sort by: Oldest" },
  { value: "highest", label: "Sort by: Highest Amount" },
];

export default function BrowseTasks({
  tasks,
  askingPrices,
  setAskingPrices,
  applyTask,
}: BrowseTasksProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [taskTypeFilter, setTaskTypeFilter] =
    useState<TaskTypeFilter>("all");
  const [showCategoryMenu, setShowCategoryMenu] =
    useState(false);

  const getCategoryIcon = (category: string) => {
    const value = category?.toLowerCase() || "";

    if (value.includes("development")) {
      return {
        icon: "💻",
        bg: "bg-blue-50",
        text: "text-blue-600",
      };
    }

    if (
      value.includes("design") ||
      value.includes("poster") ||
      value.includes("logo")
    ) {
      return {
        icon: "🎨",
        bg: "bg-purple-50",
        text: "text-purple-600",
      };
    }

    if (
      value.includes("writing") ||
      value.includes("resume")
    ) {
      return {
        icon: "✍️",
        bg: "bg-pink-50",
        text: "text-pink-600",
      };
    }

    if (value.includes("data")) {
      return {
        icon: "📊",
        bg: "bg-emerald-50",
        text: "text-emerald-600",
      };
    }

    if (value.includes("video")) {
      return {
        icon: "🎬",
        bg: "bg-orange-50",
        text: "text-orange-600",
      };
    }

    if (value.includes("social")) {
      return {
        icon: "📣",
        bg: "bg-rose-50",
        text: "text-rose-600",
      };
    }

    if (value.includes("mobile")) {
      return {
        icon: "📱",
        bg: "bg-amber-50",
        text: "text-amber-600",
      };
    }

    return {
      icon: "📋",
      bg: "bg-slate-50",
      text: "text-slate-600",
    };
  };

  const openTasks = tasks.filter(
    (task) => task.status === "open"
  );

  // ---------------------------------------------
  // TASK TYPE — All / Multi Task / Single Task.
  // Tasks without a task_type are treated as
  // single tasks (covers older existing tasks).
  // ---------------------------------------------

  const categoryFilteredTasks =
    taskTypeFilter === "all"
      ? openTasks
      : openTasks.filter((task) => {
          const taskType = task.task_type || "single";
          return taskType === taskTypeFilter;
        });

  // ---------------------------------------------
  // SEARCH — matches title, category, or description
  // ---------------------------------------------

  const query = searchQuery.trim().toLowerCase();

  const searchedTasks = query
    ? categoryFilteredTasks.filter((task) => {
        return (
          task.title?.toLowerCase().includes(query) ||
          task.category?.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
        );
      })
    : categoryFilteredTasks;

  // ---------------------------------------------
  // SORT — newest/oldest by created_at, highest by
  // recommended_price (falling back to budget, or
  // reward_per_participant for multi tasks)
  // ---------------------------------------------

  const visibleTasks = [...searchedTasks].sort(
    (a, b) => {
      if (sortBy === "highest") {
        const amountA = Number(
          a.recommended_price ??
            a.reward_per_participant ??
            a.budget ??
            0
        );
        const amountB = Number(
          b.recommended_price ??
            b.reward_per_participant ??
            b.budget ??
            0
        );

        return amountB - amountA;
      }

      const dateA = new Date(
        a.created_at || 0
      ).getTime();

      const dateB = new Date(
        b.created_at || 0
      ).getTime();

      return sortBy === "oldest"
        ? dateA - dateB
        : dateB - dateA;
    }
  );

  const currentSortLabel =
    SORT_OPTIONS.find(
      (option) => option.value === sortBy
    )?.label || "Sort by: Newest";

  return (
    <div className="w-full">

      {/* PAGE HEADER */}
      <div className="mb-2">

        <div>
          <h2 className="text-2xl sm:text-[30px] font-bold tracking-tight text-slate-900">
            Browse Tasks
          </h2>

          <p className="mt-1 text-sm sm:text-[15px] text-slate-500">
            Explore and apply for tasks that match your skills.
          </p>
        </div>

      </div>

      {/* FILTERS */}
      <div className="
        mt-6
        mb-6
        flex
        flex-col
        gap-3
        sm:mt-7
        sm:mb-7
        sm:gap-4
        md:flex-row
        md:items-center
      ">

        {/* TASK TYPE + SORT — share a row even on small phones */}
        <div className="flex gap-3 md:contents">

          {/* TASK TYPE */}
          <div className="relative w-1/2 md:w-47.5">

            <button
              type="button"
              onClick={() =>
                setShowCategoryMenu((prev) => !prev)
              }
              className="
                flex
                h-11
                w-full
                items-center
                justify-between
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                sm:px-4
                text-sm
                font-medium
                text-slate-700
                shadow-sm
                transition
                hover:border-blue-300
                hover:shadow
              "
            >
              <span className="truncate">
                {taskTypeFilter === "all"
                  ? "All"
                  : taskTypeFilter === "multi"
                  ? "Multi Task"
                  : "Single Task"}
              </span>

              <span className="shrink-0 pl-2 text-slate-400">
                ▾
              </span>
            </button>

            {showCategoryMenu && (
              <div className="
                absolute
                left-0
                right-0
                top-[calc(100%+6px)]
                z-20
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
                shadow-lg
              ">

                {[
                  { value: "all", label: "All" },
                  { value: "multi", label: "Multi Task" },
                  { value: "single", label: "Single Task" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setTaskTypeFilter(
                        option.value as TaskTypeFilter
                      );
                      setShowCategoryMenu(false);
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
              onClick={() =>
                setShowSortMenu((prev) => !prev)
              }
              className="
                flex
                h-11
                w-full
                items-center
                justify-between
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                sm:px-4
                text-sm
                font-medium
                text-slate-700
                shadow-sm
                transition
                hover:border-blue-300
                hover:shadow
              "
            >
              <span className="truncate">{currentSortLabel}</span>

              <span className="shrink-0 pl-2 text-slate-400">
                ▾
              </span>
            </button>

            {showSortMenu && (
              <div className="
                absolute
                left-0
                right-0
                top-[calc(100%+6px)]
                z-20
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
                shadow-lg
              ">

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
        <div className="
          relative
          w-full
          md:ml-auto
          md:w-72.5
        ">

          <span className="
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            text-slate-400
          ">
            🔍
          </span>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            placeholder="           Search tasks..."
            className="
              h-11
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              pl-11
              pr-4
              text-sm
              text-slate-800
              outline-none
              shadow-sm
              placeholder:text-slate-400
              transition
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-50
            "
          />

        </div>

        {/* TASK COUNT */}
        <div className="
          flex
          h-11
          shrink-0
          items-center
          justify-center
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          text-sm
          font-medium
          text-slate-600
          shadow-sm
        ">
          {visibleTasks.length}{" "}
          {visibleTasks.length === 1
            ? "task"
            : "tasks"}{" "}
          available
        </div>

      </div>

      {/* EMPTY STATE */}
      {visibleTasks.length === 0 && (
        <div className="
          rounded-2xl
          border
          border-dashed
          border-slate-300
          bg-white
          px-6
          py-16
          text-center
        ">

          <div className="
            mx-auto
            mb-4
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            bg-slate-50
            text-3xl
          ">
            📋
          </div>

          <h3 className="
            text-lg
            font-semibold
            text-slate-800
          ">
            {query
              ? "No matching tasks"
              : "No tasks available"}
          </h3>

          <p className="
            mx-auto
            mt-2
            max-w-md
            text-sm
            leading-6
            text-slate-500
          ">
            {query
              ? "Try a different search term or clear the search."
              : "There are currently no open tasks. Check back again soon for new opportunities."}
          </p>

        </div>
      )}

      {/* TASK LIST */}
      {visibleTasks.length > 0 && (
        <div className="space-y-4">

          {visibleTasks.map((task) => {

            const category =
              getCategoryIcon(task.category);

            const isMulti = task.task_type === "multi";

            const filledSlots = Number(task.current_participants || 0);
            const maxSlots = Number(task.max_participants || 0);
            const isFull = isMulti && maxSlots > 0 && filledSlots >= maxSlots;

            return (
              <details
                key={task.id}
                className="
                  group
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  shadow-[0_2px_8px_rgba(15,23,42,0.04)]
                  transition-all
                  duration-200
                  hover:-translate-y-px
                  hover:border-blue-200
                  hover:shadow-[0_6px_20px_rgba(15,23,42,0.07)]
                "
              >

                {/* TASK SUMMARY */}
                <summary
                  className="
                    cursor-pointer
                    list-none
                    px-4
                    py-4
                    sm:px-6
                    sm:py-5
                    [&::-webkit-details-marker]:hidden
                  "
                >

                  <div className="
                    grid
                    grid-cols-1
                    items-start
                    gap-4
                    sm:grid-cols-2
                    sm:items-center
                    sm:gap-x-4
                    sm:gap-y-4
                    lg:grid-cols-[2.4fr_0.9fr_1.1fr_1.25fr_auto]
                    lg:items-center
                  ">

                    {/* TASK TITLE */}
                    <div className="
                      flex
                      min-w-0
                      items-start
                      gap-3
                      sm:col-span-2
                      sm:gap-4
                      lg:col-span-1
                    ">

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

                        <div className="
                          flex
                          flex-wrap
                          items-start
                          gap-2
                        ">

                          {/* FULL TITLE */}
                          <h3 className="
                            whitespace-normal
                            wrap-break-words
                            text-[15px]
                            font-semibold
                            leading-6
                            text-slate-900
                            sm:text-[16px]
                          ">
                            {task.title}
                          </h3>

                          {/* MULTI TASK BADGE — visible on all screens now */}
                          {isMulti && (
                            <span className="
                              flex
                              shrink-0
                              items-center
                              gap-1
                              rounded-full
                              bg-blue-50
                              px-2
                              py-0.5
                              text-[10px]
                              font-semibold
                              text-blue-600
                              sm:px-2.5
                              sm:py-1
                              sm:text-[11px]
                            ">
                              👥 Multi Task
                            </span>
                          )}

                          {/* OPEN BADGE — visible on all screens now */}
                          <span className="
                            flex
                            shrink-0
                            items-center
                            gap-1
                            rounded-full
                            bg-emerald-50
                            px-2
                            py-0.5
                            text-[10px]
                            font-semibold
                            text-emerald-600
                            sm:px-2.5
                            sm:py-1
                            sm:text-[11px]
                          ">
                            <span className="
                              h-1.5
                              w-1.5
                              rounded-full
                              bg-emerald-500
                            " />

                            Open
                          </span>

                        </div>

                        <p className="
                          mt-1
                          text-[13px]
                          text-slate-500
                          sm:text-[14px]
                        ">
                          {task.category}
                        </p>

                        {/* SHORT PREVIEW */}
                        <p className="
                          mt-1
                          max-w-full
                          truncate
                          text-[12px]
                          text-slate-400
                          sm:max-w-105
                        ">
                          {task.description}
                        </p>

                      </div>

                    </div>

                    {isMulti ? (
                      <>
                        {/* AMOUNT (client-entered, not a recommended price) */}
                        <div>

                          <p className="
                            mb-1
                            text-[12px]
                            font-medium
                            text-slate-400
                          ">
                            Amount
                          </p>

                          <p className="
                            text-[17px]
                            font-bold
                            text-emerald-600
                            sm:text-[19px]
                          ">
                            ${Number(task.reward_per_participant || 0).toFixed(2)}
                          </p>

                        </div>

                        {/* DURATION */}
                        <div>

                          <p className="
                            mb-1
                            text-[12px]
                            font-medium
                            text-slate-400
                          ">
                            Duration
                          </p>

                          <div className="
                            flex
                            items-center
                            gap-2
                          ">

                            <span className="text-slate-400">
                              ⏱
                            </span>

                            <p className="
                              text-[14px]
                              font-medium
                              text-slate-700
                            ">
                              {task.duration_minutes} minutes
                            </p>

                          </div>

                        </div>

                        {/* PARTICIPANTS — filled/max, updates as students are accepted */}
                        <div>

                          <p className="
                            mb-1
                            text-[12px]
                            font-medium
                            text-slate-400
                          ">
                            Participants
                          </p>

                          <p className="
                            text-[14px]
                            font-semibold
                            text-slate-700
                          ">
                            {filledSlots}/{maxSlots}
                          </p>

                        </div>
                      </>
                    ) : (
                      <>
                        {/* RECOMMENDED PRICE */}
                        <div>

                          <p className="
                            mb-1
                            text-[12px]
                            font-medium
                            text-slate-400
                          ">
                            Recommended Price
                          </p>

                          <p className="
                            text-[17px]
                            font-bold
                            text-emerald-600
                            sm:text-[19px]
                          ">
                            $
                            {task.recommended_price ||
                              task.budget}
                          </p>

                        </div>

                        {/* DUE DATE */}
                        <div>

                          <p className="
                            mb-1
                            text-[12px]
                            font-medium
                            text-slate-400
                          ">
                            Due Date
                          </p>

                          <div className="
                            flex
                            items-center
                            gap-2
                          ">

                            <span className="text-slate-400">
                              📅
                            </span>

                            <p className="
                              text-[14px]
                              font-medium
                              text-slate-700
                            ">
                              {task.expected_day}/
                              {task.expected_month}
                            </p>

                          </div>

                        </div>

                        {/* ASKING PRICE */}
                        <div className="sm:col-span-2 lg:col-span-1">

                          <p className="
                            mb-1
                            text-[12px]
                            font-medium
                            text-slate-400
                          ">
                            Your Asking Price
                          </p>

                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ask Price"
                            value={
                              askingPrices[task.id] || ""
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onChange={(e) => {
                              setAskingPrices({
                                ...askingPrices,
                                [task.id]:
                                  e.target.value,
                              });
                            }}
                            className="
                              h-9.5
                              w-full
                              rounded-lg
                              border
                              border-slate-200
                              bg-slate-50
                              px-3
                              text-[14px]
                              text-slate-800
                              outline-none
                              placeholder:text-slate-400
                              transition
                              focus:border-blue-500
                              focus:bg-white
                              focus:ring-4
                              focus:ring-blue-50
                            "
                          />

                        </div>
                      </>
                    )}

                    {/* APPLY + EXPAND */}
                    <div className="
                      flex
                      items-center
                      gap-2
                      sm:col-span-2
                      lg:col-span-1
                    ">

                      <button
                        type="button"
                        disabled={isFull}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          if (isMulti) {
                            applyTask(task.id);
                          } else {
                            applyTask(
                              task.id,
                              askingPrices[task.id]
                            );
                          }
                        }}
                        className="
                          h-10
                          flex-1
                          min-w-23.5
                          rounded-xl
                          bg-blue-600
                          px-5
                          text-[14px]
                          font-semibold
                          text-white
                          shadow-sm
                          transition-all
                          hover:bg-blue-700
                          hover:shadow-md
                          active:scale-[0.98]
                          disabled:opacity-50
                          disabled:cursor-not-allowed
                          disabled:hover:bg-blue-600
                          disabled:active:scale-100
                          sm:flex-none
                        "
                      >
                        {isFull ? "Full" : "Apply"}
                      </button>

                      {/* EXPAND ICON */}
                      <span className="
                        flex
                        h-9.5
                        w-9.5
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        text-slate-400
                        transition-transform
                        duration-200
                        group-open:rotate-180
                      ">
                        ↓
                      </span>

                    </div>

                  </div>

                </summary>

                {/* FULL DESCRIPTION */}
                <div className="
                  border-t
                  border-slate-100
                  bg-slate-50/60
                  px-4
                  pb-5
                  pt-4
                  sm:px-6
                  sm:pb-6
                  sm:pt-5
                ">

                  <div className="sm:ml-15">

                    {/* FULL TITLE WHEN EXPANDED */}
                    <h3 className="
                      mb-4
                      whitespace-normal
                      wrap-break-words
                      text-base
                      font-bold
                      leading-7
                      text-slate-900
                      sm:text-lg
                    ">
                      {task.title}
                    </h3>

                    <div className="
                      mb-3
                      flex
                      items-center
                      gap-2
                    ">

                      <span className="
                        text-sm
                        font-semibold
                        text-slate-800
                      ">
                        Full Description
                      </span>

                    </div>

                    <p className="
                      max-w-4xl
                      whitespace-pre-wrap
                      wrap-break-words
                      text-[14px]
                      leading-7
                      text-slate-500
                    ">
                      {task.description}
                    </p>

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