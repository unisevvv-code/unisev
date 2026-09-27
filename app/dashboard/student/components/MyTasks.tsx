"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Task {
  id?: string;
  title?: string;
  category?: string;
  description?: string;
  recommended_price?: number;
  expected_day?: string | number;
  expected_month?: string | number;
  attachments?: string[];

  // Multi Task fields (null/undefined on single tasks)
  task_type?: string | null;
  max_participants?: number | null;
  current_participants?: number | null;
  reward_per_participant?: number | null;
  duration_minutes?: number | null;
}

interface MyTask {
  id: string;
  status?: string;
  client_status?: string;
  completion_requested_at?: string | null;
  asking_price?: number | string | null;
  tasks?: Task;
}

interface MyTasksProps {
  myTasks: MyTask[];
}

export default function MyTasks({
  myTasks,
}: MyTasksProps) {
  const [confirmTaskId, setConfirmTaskId] =
    useState<string | null>(null);

  const [completingTaskId, setCompletingTaskId] =
    useState<string | null>(null);

  async function requestTaskCompletion(
    applicationId: string
  ) {
    setCompletingTaskId(applicationId);

    const { data, error } = await supabase.rpc(
      "request_task_completion",
      {
        p_application_id: applicationId,
      }
    );

    if (error) {
      console.log(
        "COMPLETION REQUEST ERROR:",
        error
      );

      alert(
        error.message ||
        "Could not submit this task for completion."
      );

      setCompletingTaskId(null);
      return;
    }

    console.log(
      "COMPLETION REQUEST RESULT:",
      data
    );

    setConfirmTaskId(null);
    setCompletingTaskId(null);

    alert(
      "Work completion submitted.\n\nThe client has been notified to confirm your work."
    );

    window.location.reload();
  }

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

  return (
    <div className="w-full">

      {/* PAGE HEADER */}
      <div className="mb-6 sm:mb-7">
        <div className="flex items-start justify-between gap-4">

          <div>
            <h2 className="text-2xl sm:text-[30px] font-bold tracking-tight text-slate-900">
              My Tasks
            </h2>

            <p className="mt-1 text-sm sm:text-[15px] text-slate-500">
              Manage the tasks you have applied for and track your progress.
            </p>
          </div>

          {/* TASK COUNT */}
          <div className="
            hidden
            shrink-0
            rounded-full
            border
            border-slate-200
            bg-white
            px-4
            py-2
            text-sm
            font-medium
            text-slate-600
            shadow-sm
            md:block
          ">
            {myTasks.length}{" "}
            {myTasks.length === 1
              ? "task"
              : "tasks"}
          </div>

        </div>
      </div>

      {/* EMPTY STATE */}
      {myTasks.length === 0 ? (
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
            No tasks yet
          </h3>

          <p className="
            mx-auto
            mt-2
            max-w-md
            text-sm
            leading-6
            text-slate-500
          ">
            Tasks you apply for will appear here.
          </p>

        </div>
      ) : (

        <div className="space-y-4">

          {myTasks.map((item) => {

            const status =
              item.status?.toLowerCase();

            const clientStatus =
              item.client_status?.toLowerCase();

            const isAccepted =
              status === "accepted";

            const isCompleted =
              status === "completed";

            const isWaitingForClient =
              isAccepted &&
              clientStatus === "pending" &&
              !!item.completion_requested_at;

            const category =
              getCategoryIcon(
                item.tasks?.category || ""
              );

            // Multi Task detection — mirrors the client dashboard's
            // MyTasks component so a student sees the same
            // reward/duration framing on a multi task instead of the
            // single-task "asking price" + "due date" fields.
            const isMulti =
              item.tasks?.task_type === "multi";

            return (
              <details
                key={item.id}
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

                    {/* TASK */}
                    <div className="
                      flex
                      min-w-0
                      items-start
                      gap-3
                      sm:col-span-2
                      sm:gap-4
                      lg:col-span-1
                    ">

                      {/* CATEGORY ICON */}
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

                      {/* TITLE */}
                      <div className="min-w-0">

                        <div className="
                          flex
                          flex-wrap
                          items-start
                          gap-2
                        ">

                          <h3 className="
                            whitespace-normal
                            wrap-break-word
                            text-[15px]
                            font-semibold
                            leading-6
                            text-slate-900
                            sm:text-[16px]
                          ">
                            {item.tasks?.title ||
                              "Untitled Task"}
                          </h3>

                          {/* STATUS BADGE */}
                          {isWaitingForClient ? (
                            <span className="
                              shrink-0
                              inline-flex
                              items-center
                              gap-1
                              rounded-full
                              bg-yellow-50
                              px-2.5
                              py-1
                              text-[11px]
                              font-semibold
                              text-yellow-700
                            ">
                              <span className="
                                h-1.5
                                w-1.5
                                rounded-full
                                bg-yellow-500
                              " />

                              Awaiting Client
                            </span>
                          ) : isCompleted ? (
                            <span className="
                              shrink-0
                              inline-flex
                              items-center
                              gap-1
                              rounded-full
                              bg-purple-50
                              px-2.5
                              py-1
                              text-[11px]
                              font-semibold
                              text-purple-600
                            ">
                              <span className="
                                h-1.5
                                w-1.5
                                rounded-full
                                bg-purple-500
                              " />

                              Completed
                            </span>
                          ) : isAccepted ? (
                            <span className="
                              shrink-0
                              inline-flex
                              items-center
                              gap-1
                              rounded-full
                              bg-orange-50
                              px-2.5
                              py-1
                              text-[11px]
                              font-semibold
                              text-orange-600
                            ">
                              <span className="
                                h-1.5
                                w-1.5
                                rounded-full
                                bg-orange-500
                              " />

                              Assigned
                            </span>
                          ) : (
                            <span className="
                              shrink-0
                              inline-flex
                              items-center
                              gap-1
                              rounded-full
                              bg-slate-50
                              px-2.5
                              py-1
                              text-[11px]
                              font-semibold
                              text-slate-600
                            ">
                              {item.status ||
                                "Unknown"}
                            </span>
                          )}

                          {isMulti && (
                            <span className="
                              shrink-0
                              inline-flex
                              items-center
                              gap-1
                              rounded-full
                              bg-blue-50
                              px-2.5
                              py-1
                              text-[11px]
                              font-semibold
                              text-blue-600
                            ">
                              Multi Task
                            </span>
                          )}

                        </div>

                        <p className="
                          mt-1
                          text-[13px]
                          text-slate-500
                          sm:text-[14px]
                        ">
                          {item.tasks?.category ||
                            "Not provided"}
                        </p>

                        <p className="
                          mt-1
                          max-w-full
                          truncate
                          text-[12px]
                          text-slate-400
                          sm:max-w-105
                        ">
                          {item.tasks?.description ||
                            "No description provided."}
                        </p>

                      </div>

                    </div>

                    {/* AMOUNT */}
                    <div>

                      <p className="
                        mb-1
                        text-[12px]
                        font-medium
                        text-slate-400
                      ">
                        {isMulti
                          ? "Amount"
                          : "Your Price"}
                      </p>

                      <p className="
                        text-[17px]
                        font-bold
                        text-emerald-600
                        sm:text-[19px]
                      ">
                        $
                        {isMulti
                          ? item.tasks?.reward_per_participant ?? 0
                          : item.asking_price ??
                            item.tasks?.recommended_price ??
                            "0"}
                      </p>

                    </div>

                    {/* DUE DATE / DURATION */}
                    <div>

                      <p className="
                        mb-1
                        text-[12px]
                        font-medium
                        text-slate-400
                      ">
                        {isMulti ? "Duration" : "Due Date"}
                      </p>

                      <div className="
                        flex
                        items-center
                        gap-2
                      ">

                        <span className="text-slate-400">
                          {isMulti ? "⏱" : "📅"}
                        </span>

                        <p className="
                          text-[14px]
                          font-medium
                          text-slate-700
                        ">
                          {isMulti ? (
                            `${item.tasks?.duration_minutes ?? "-"} min`
                          ) : item.tasks?.expected_day &&
                            item.tasks?.expected_month ? (
                            `${item.tasks.expected_day}/${item.tasks.expected_month}`
                          ) : (
                            "Not provided"
                          )}
                        </p>

                      </div>

                    </div>

                    {/* STATUS */}
                    <div>

                      <p className="
                        mb-1
                        text-[12px]
                        font-medium
                        text-slate-400
                      ">
                        Status
                      </p>

                      {isWaitingForClient ? (
                        <p className="
                          text-[14px]
                          font-semibold
                          text-yellow-600
                        ">
                          Awaiting Client
                        </p>
                      ) : isCompleted ? (
                        <p className="
                          text-[14px]
                          font-semibold
                          text-purple-600
                        ">
                          Completed
                        </p>
                      ) : isAccepted ? (
                        <p className="
                          text-[14px]
                          font-semibold
                          text-orange-500
                        ">
                          Assigned
                        </p>
                      ) : (
                        <p className="
                          text-[14px]
                          font-semibold
                          text-slate-500
                        ">
                          {item.status ||
                            "Unknown"}
                        </p>
                      )}

                    </div>

                    {/* EXPAND */}
                    <div className="
                      flex
                      items-center
                      justify-end
                      sm:col-span-2
                      lg:col-span-1
                    ">

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

                {/* EXPANDED CONTENT */}
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

                    {/* FULL TITLE */}
                    <h3 className="
                      mb-4
                      whitespace-normal
                      wrap-break-word
                      text-base
                      font-bold
                      leading-7
                      text-slate-900
                      sm:text-lg
                    ">
                      {item.tasks?.title ||
                        "Untitled Task"}
                    </h3>

                    {/* DESCRIPTION */}
                    <p className="
                      mb-3
                      text-sm
                      font-semibold
                      text-slate-800
                    ">
                      Full Description
                    </p>

                    <p className="
                      max-w-4xl
                      whitespace-pre-wrap
                      wrap-break-word
                      text-[14px]
                      leading-7
                      text-slate-500
                    ">
                      {item.tasks?.description ||
                        "No description provided."}
                    </p>

                    {/* MULTI TASK SUMMARY — same fields the client
                        dashboard shows (minus participant count,
                        which students don't need to see), so a
                        student sees consistent info about the task
                        they joined. */}
                    {isMulti && (
                      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                          <p className="text-[11px] font-medium text-slate-400">Amount</p>
                          <p className="mt-1 text-sm font-bold text-emerald-600">
                            ${item.tasks?.reward_per_participant ?? 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                          <p className="text-[11px] font-medium text-slate-400">Duration</p>
                          <p className="mt-1 text-sm font-bold text-slate-700">
                            {item.tasks?.duration_minutes ?? "-"} min
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ATTACHMENTS */}
                    {item.tasks?.attachments &&
                      item.tasks.attachments.length > 0 && (

                        <div className="mt-6">

                          <p className="
                            mb-3
                            text-sm
                            font-semibold
                            text-slate-800
                          ">
                            Attachment
                          </p>

                          <div className="
                            grid
                            grid-cols-2
                            gap-3
                            sm:grid-cols-3
                            lg:grid-cols-4
                          ">

                            {item.tasks.attachments.map(
                              (
                                url: string,
                                index: number
                              ) => {

                                const fileName =
                                  decodeURIComponent(
                                    url.split("/").pop() ||
                                      `File ${index + 1}`
                                  );

                                const extension =
                                  fileName
                                    .split(".")
                                    .pop()
                                    ?.toLowerCase() ||
                                  "";

                                const isImage = [
                                  "png",
                                  "jpg",
                                  "jpeg",
                                  "gif",
                                  "webp",
                                ].includes(
                                  extension
                                );

                                return (
                                  <div
                                    key={index}
                                    className="
                                      overflow-hidden
                                      rounded-xl
                                      border
                                      border-slate-200
                                      bg-white
                                      p-2
                                      transition
                                      hover:border-blue-200
                                      hover:shadow-sm
                                    "
                                  >

                                    {isImage ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={url}
                                        alt={fileName}
                                        className="
                                          h-24
                                          w-full
                                          rounded-lg
                                          object-cover
                                        "
                                      />
                                    ) : (
                                      <div className="
                                        flex
                                        h-24
                                        w-full
                                        items-center
                                        justify-center
                                        rounded-lg
                                        bg-slate-50
                                        text-3xl
                                      ">
                                        📄
                                      </div>
                                    )}

                                    <p className="
                                      mt-2
                                      w-full
                                      truncate
                                      px-1
                                      text-center
                                      text-xs
                                      text-slate-500
                                    ">
                                      {fileName}
                                    </p>

                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                      onClick={(e) =>
                                        e.stopPropagation()
                                      }
                                      className="
                                        mt-2
                                        flex
                                        w-full
                                        items-center
                                        justify-center
                                        gap-1
                                        rounded-lg
                                        border
                                        border-slate-200
                                        bg-slate-50
                                        px-2
                                        py-1.5
                                        text-xs
                                        font-semibold
                                        text-slate-600
                                        transition
                                        hover:border-blue-200
                                        hover:bg-blue-50
                                        hover:text-blue-600
                                      "
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

                    {/* WAITING FOR CLIENT */}
                    {isWaitingForClient && (
                      <div className="
                        mt-6
                        rounded-xl
                        border
                        border-yellow-200
                        bg-yellow-50
                        p-4
                      ">

                        <div className="
                          flex
                          items-start
                          gap-3
                        ">

                          <span className="text-lg">
                            ⏳
                          </span>

                          <div>

                            <p className="
                              font-semibold
                              text-yellow-800
                            ">
                              Waiting for client confirmation
                            </p>

                            <p className="
                              mt-1
                              text-sm
                              leading-6
                              text-yellow-700
                            ">
                              Your work completion request
                              has been sent to the client.
                            </p>

                            <p className="
                              mt-1
                              text-sm
                              leading-6
                              text-yellow-700
                            ">
                              If the client does not respond
                              within 48 hours, the payment
                              will automatically be released
                              to you.
                            </p>

                          </div>

                        </div>

                      </div>
                    )}

                    {/* TASK COMPLETE BUTTON */}
                    {isAccepted &&
                      !isWaitingForClient && (
                        <div className="
                          mt-6
                          flex
                          justify-end
                        ">

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              setConfirmTaskId(
                                item.id
                              );
                            }}
                            className="
                              w-full
                              rounded-xl
                              bg-blue-400!
                              px-5
                              py-2.5
                              font-semibold
                              text-white!
                              shadow-sm
                              transition
                              hover:bg-blue-500!
                              hover:shadow-md
                              active:scale-[0.98]
                              sm:w-auto
                            "
                          >
                            Task Complete
                          </button>

                        </div>
                      )}

                    {/* COMPLETED */}
                    {isCompleted && (
                      <div className="
                        mt-6
                        rounded-xl
                        border
                        border-green-200
                        bg-green-50
                        p-4
                      ">

                        <div className="
                          flex
                          items-start
                          gap-3
                        ">

                          <span className="text-lg">
                            ✓
                          </span>

                          <div>

                            <p className="
                              font-semibold
                              text-green-700
                            ">
                              Task completed
                            </p>

                            <p className="
                              mt-1
                              text-sm
                              leading-6
                              text-green-600
                            ">
                              Payment has been released
                              according to the task
                              completion process.
                            </p>

                          </div>

                        </div>

                      </div>
                    )}

                  </div>

                </div>

                {/* CONFIRMATION POPUP */}
                {confirmTaskId === item.id && (
                  <div
                    className="
                      fixed
                      inset-0
                      z-50
                      flex
                      items-end
                      justify-center
                      bg-black/40
                      p-0
                      backdrop-blur-sm
                      sm:items-center
                      sm:p-4
                    "
                    onClick={() =>
                      setConfirmTaskId(null)
                    }
                  >

                    <div
                      className="
                        w-full
                        max-w-md
                        rounded-t-2xl
                        rounded-b-none
                        border
                        border-slate-100
                        bg-white
                        p-5
                        shadow-2xl
                        sm:rounded-2xl
                        sm:p-7
                      "
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >

                      <div className="
                        mb-5
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-50
                        text-xl
                      ">
                        ✓
                      </div>

                      <h3 className="
                        text-lg
                        font-bold
                        text-slate-900
                        sm:text-xl
                      ">
                        Submit Work for Confirmation
                      </h3>

                      <p className="
                        mt-4
                        text-[15px]
                        leading-6
                        text-slate-600
                      ">
                        Are you sure you have completed
                        this task?
                      </p>

                      <p className="
                        mt-4
                        text-sm
                        leading-6
                        text-slate-500
                      ">
                        The client will be asked to confirm
                        your work. Your payment will remain
                        in escrow until the client confirms
                        or 48 hours pass without a response.
                      </p>

                      <div className="
                        mt-7
                        flex
                        flex-col-reverse
                        gap-3
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      ">

                        {/* CANCEL */}
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmTaskId(null)
                          }
                          className="
                            w-full
                            rounded-xl
                            border
                            border-slate-300
                            px-5
                            py-2.5
                            font-medium
                            text-slate-600
                            transition
                            hover:bg-slate-50
                            sm:w-auto
                          "
                        >
                          Cancel
                        </button>

                        {/* SUBMIT */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirmTaskId) {
                              requestTaskCompletion(
                                confirmTaskId
                              );
                            }
                          }}
                          disabled={
                            completingTaskId ===
                            confirmTaskId
                          }
                          className="
                            w-full
                            rounded-xl
                            bg-blue-400!
                            px-5
                            py-2.5
                            font-semibold
                            text-white!
                            transition
                            hover:bg-blue-500!
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            sm:w-auto
                          "
                        >
                          {completingTaskId ===
                          confirmTaskId
                            ? "Submitting..."
                            : "Submit for Confirmation"}
                        </button>

                      </div>

                    </div>

                  </div>
                )}

              </details>
            );
          })}

        </div>
      )}

      {/* MOBILE TASK COUNT */}
      {myTasks.length > 0 && (
        <div className="
          mt-5
          text-sm
          font-medium
          text-slate-500
          md:hidden
        ">
          {myTasks.length}{" "}
          {myTasks.length === 1
            ? "task"
            : "tasks"}
        </div>
      )}

    </div>
  );
}