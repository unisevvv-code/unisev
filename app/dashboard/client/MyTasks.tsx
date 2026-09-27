"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

interface Task {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    status: string | null;
    recommended_price: number | null;
    expected_day: string | number | null;
    expected_month: string | null;
    attachments: string[] | null;

    // Multi Task fields (null/undefined on single tasks)
    task_type?: string | null;
    max_participants?: number | null;
    current_participants?: number | null;
    reward_per_participant?: number | null;
    duration_minutes?: number | null;
}

interface AcceptedApplication {
    id: string;
    task_id: string;
    student_id: string;
    status: string;
    client_status: string | null;
    completion_requested_at: string | null;
    full_name: string;
}

type AcceptedApplicationRow = {
    id: string;
    task_id: string;
    student_id: string;
    status: string;
    client_status: string | null;
    completion_requested_at: string | null;
    profiles: { full_name: string | null }[] | null;
};

interface MyTasksProps {
    tasks: Task[];
}

export default function MyTasks({
    tasks,
}: MyTasksProps) {

    const [acceptedPrices, setAcceptedPrices] =
        useState<Record<string, number>>({});

    // Keyed by task_id -> every accepted/completed application on that
    // task. A single task will only ever have one entry; a multi task
    // can have many, one per participating student.
    const [applicationsByTask, setApplicationsByTask] =
        useState<Record<string, AcceptedApplication[]>>({});

    const [processingCompletionId, setProcessingCompletionId] =
        useState<string | null>(null);

    const [completionPopupId, setCompletionPopupId] =
        useState<string | null>(null);

    const [ratingPopupId, setRatingPopupId] =
        useState<string | null>(null);

    const [rating, setRating] =
        useState<number>(0);

    const [review, setReview] =
        useState("");

    const [submittingRating, setSubmittingRating] =
        useState(false);

    // Rated (task, student) pairs — keyed by `${task_id}_${student_id}`
    // rather than just task_id, so rating one student on a multi task
    // doesn't mark every other participant on that task as "rated".
    const [ratedPairs, setRatedPairs] =
        useState<Record<string, boolean>>({});

    function ratingKey(taskId: string, studentId: string) {
        return `${taskId}_${studentId}`;
    }


    // =========================================================
    // CATEGORY ICON
    // =========================================================

    const getCategoryIcon = (category: string) => {
        const value =
            category?.toLowerCase() || "";

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


    // =========================================================
    // LOAD ACCEPTED PRICES (single-task asking price only)
    // =========================================================

    const loadAcceptedPrices = useCallback(async () => {

        if (tasks.length === 0) return;

        const taskIds =
            tasks.map((task) => task.id);

        const { data, error } =
            await supabase
                .from("applications")
                .select(
                    "task_id, asking_price"
                )
                .in("task_id", taskIds)
                .eq("status", "accepted");

        if (error) {
            console.log(
                "ACCEPTED PRICES ERROR:",
                error
            );
            return;
        }

        const priceMap:
            Record<string, number> = {};

        (data || []).forEach(
            (application) => {
                priceMap[
                    application.task_id
                ] =
                    Number(
                        application.asking_price
                    );
            }
        );

        setAcceptedPrices(priceMap);
    }, [tasks]);


    // =========================================================
    // LOAD APPLICATIONS (grouped by task — supports multiple
    // accepted students per task for Multi Tasks)
    // =========================================================

    const loadApplications = useCallback(async () => {

        if (tasks.length === 0) {
            setApplicationsByTask({});
            return;
        }

        const taskIds =
            tasks.map((task) => task.id);

        const { data, error } =
            await supabase
                .from("applications")
                .select(`
                    id,
                    task_id,
                    student_id,
                    status,
                    client_status,
                    completion_requested_at,
                    profiles!applications_student_id_fkey(
                        full_name
                    )
                `)
                .in("task_id", taskIds)
                .in(
                    "status",
                    ["accepted", "completed"]
                );

        if (error) {
            console.log(
                "APPLICATIONS ERROR:",
                error
            );
            return;
        }

        const grouped:
            Record<string, AcceptedApplication[]> = {};

        (data as AcceptedApplicationRow[] || []).forEach(
            (application) => {

                const entry: AcceptedApplication = {
                    ...application,
                    full_name:
                        application.profiles?.[0]
                            ?.full_name ||
                        "Unknown Student",
                };

                if (!grouped[application.task_id]) {
                    grouped[application.task_id] = [];
                }

                grouped[application.task_id].push(entry);
            }
        );

        setApplicationsByTask(grouped);
    }, [tasks]);


    // =========================================================
    // LOAD EXISTING RATINGS (per task+student pair)
    // =========================================================

    const loadRatedPairs = useCallback(async () => {

        if (tasks.length === 0) {
            setRatedPairs({});
            return;
        }

        const {
            data: userData,
            error: userError,
        } =
            await supabase.auth.getUser();

        if (
            userError ||
            !userData.user
        ) {
            return;
        }

        const taskIds =
            tasks.map((task) => task.id);

        const { data, error } =
            await supabase
                .from("student_ratings")
                .select("task_id, student_id")
                .eq(
                    "client_id",
                    userData.user.id
                )
                .in(
                    "task_id",
                    taskIds
                );

        if (error) {
            console.log(
                "LOAD RATINGS ERROR:",
                error
            );
            return;
        }

        const ratedMap:
            Record<string, boolean> = {};

        (data || []).forEach(
            (row: { task_id: string; student_id: string }) => {
                ratedMap[
                    ratingKey(row.task_id, row.student_id)
                ] = true;
            }
        );

        setRatedPairs(ratedMap);
    }, [tasks]);


    // =========================================================
    // LOAD DATA
    // =========================================================

    useEffect(() => {
        // These loaders each set their own piece of state synchronously
        // on their "no tasks yet" early-return branch (e.g.
        // setApplicationsByTask({})) as well as after their await, so the
        // effect can't avoid a synchronous setState on first run.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadAcceptedPrices();
        loadApplications();
        loadRatedPairs();
    }, [loadAcceptedPrices, loadApplications, loadRatedPairs]);


    // =========================================================
    // CLIENT CONFIRMS COMPLETION (per application — already
    // scoped to a single student, so this works unchanged for
    // both single and multi tasks)
    // =========================================================

    async function confirmCompletion(
        applicationId: string
    ) {

        setProcessingCompletionId(
            applicationId
        );

        try {

            const { data, error } =
                await supabase.rpc(
                    "confirm_task_completion",
                    {
                        p_application_id:
                            applicationId,
                    }
                );

            if (error) {

                console.log(
                    "CONFIRM COMPLETION ERROR:",
                    error
                );

                alert(
                    error.message ||
                    "Could not confirm task completion."
                );

                return;
            }

            console.log(
                "COMPLETION RESULT:",
                data
            );

            setCompletionPopupId(null);

            await loadApplications();

            setRatingPopupId(
                applicationId
            );

        } catch (error) {

            console.log(
                "UNEXPECTED COMPLETION ERROR:",
                error
            );

            alert(
                "Something went wrong while confirming the task."
            );

        } finally {

            setProcessingCompletionId(
                null
            );
        }
    }


    // =========================================================
    // CLIENT REJECTS COMPLETION (per application)
    // =========================================================

    async function rejectCompletion(
        applicationId: string
    ) {

        setProcessingCompletionId(
            applicationId
        );

        try {

            const { error } =
                await supabase.rpc(
                    "reject_task_completion",
                    {
                        p_application_id:
                            applicationId,
                    }
                );

            if (error) {

                console.log(
                    "REJECT COMPLETION ERROR:",
                    error
                );

                alert(
                    error.message ||
                    "Could not reject the completion request."
                );

                return;
            }

            setCompletionPopupId(null);

            alert(
                "Completion request rejected.\n\nThe slot remains active and the escrow payment for this student is still held."
            );

            await loadApplications();

        } catch (error) {

            console.log(
                "UNEXPECTED REJECTION ERROR:",
                error
            );

            alert(
                "Something went wrong."
            );

        } finally {

            setProcessingCompletionId(
                null
            );
        }
    }


    // =========================================================
    // RATE STUDENT
    // =========================================================

    async function submitStudentRating(
        application: AcceptedApplication
    ) {

        if (
            rating < 1 ||
            rating > 5
        ) {
            alert(
                "Please select a rating from 1 to 5 stars."
            );
            return;
        }

        setSubmittingRating(true);

        try {

            // NOTE: p_task_id alone can't disambiguate which student is
            // being rated on a Multi Task (several accepted students
            // share the same task_id). Passing p_application_id and
            // p_student_id as well — make sure submit_student_rating on
            // the Supabase side accepts one of these and uses it,
            // otherwise a multi-task rating could be recorded against
            // the wrong participant.
            const { data, error } =
                await supabase.rpc(
                    "submit_student_rating",
                    {
                        p_task_id:
                            application.task_id,
                        p_application_id:
                            application.id,
                        p_student_id:
                            application.student_id,
                        p_rating:
                            rating,
                        p_review:
                            review.trim() ||
                            null,
                    }
                );

            if (error) {

                console.log(
                    "SUBMIT RATING ERROR:",
                    error
                );

                if (
                    error.message?.includes(
                        "already been rated"
                    )
                ) {

                    setRatedPairs(
                        (previous) => ({
                            ...previous,
                            [ratingKey(
                                application.task_id,
                                application.student_id
                            )]: true,
                        })
                    );

                    setRatingPopupId(
                        null
                    );
                }

                alert(
                    error.message ||
                    "Could not submit the rating."
                );

                return;
            }

            console.log(
                "RATING RESULT:",
                data
            );

            setRatedPairs(
                (previous) => ({
                    ...previous,
                    [ratingKey(
                        application.task_id,
                        application.student_id
                    )]: true,
                })
            );

            setRatingPopupId(null);
            setRating(0);
            setReview("");

            alert(
                "Thank you! Your rating has been submitted."
            );

        } catch (error) {

            console.log(
                "UNEXPECTED RATING ERROR:",
                error
            );

            alert(
                "Something went wrong while submitting the rating."
            );

        } finally {

            setSubmittingRating(false);
        }
    }


    return (
        <div className="w-full">

            {/* ================================================= */}
            {/* PAGE HEADER */}
            {/* ================================================= */}

            <div className="mb-5 sm:mb-7">

                <div className="
                    flex
                    items-start
                    justify-between
                    gap-4
                ">

                    <div>

                        <h2 className="
                            text-2xl
                            font-bold
                            tracking-tight
                            text-slate-900
                            sm:text-[30px]
                        ">
                            My Tasks
                        </h2>

                        <p className="
                            mt-1
                            text-sm
                            text-slate-500
                            sm:text-[15px]
                        ">
                            Manage your posted tasks and
                            track their progress.
                        </p>

                    </div>

                    {/* TASK COUNT */}

                    <div className="
                        flex
                        shrink-0
                        items-center
                        rounded-full
                        border
                        border-slate-200
                        bg-white
                        px-3
                        py-1.5
                        text-xs
                        font-medium
                        text-slate-600
                        shadow-sm
                        sm:px-4
                        sm:py-2
                        sm:text-sm
                    ">
                        {tasks.length}{" "}
                        {tasks.length === 1
                            ? "task"
                            : "tasks"}
                    </div>

                </div>

            </div>


            {/* ================================================= */}
            {/* EMPTY STATE */}
            {/* ================================================= */}

            {tasks.length === 0 ? (

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
                        You haven&apos;t posted any tasks yet.
                    </p>

                </div>

            ) : (

                /* ================================================= */
                /* TASK LIST */
                /* ================================================= */

                <div className="space-y-4">

                    {tasks.map(
                        (task) => {

                            const applications =
                                applicationsByTask[
                                    task.id
                                ] || [];

                            const isMulti =
                                task.task_type ===
                                "multi";

                            // Single-task views only ever deal with the
                            // first (and only) accepted application.
                            const acceptedApplication =
                                applications[0];

                            const category =
                                getCategoryIcon(
                                    task.category || ""
                                );

                            const status =
                                task.status
                                    ?.toLowerCase();

                            const isAssigned =
                                status ===
                                "assigned";

                            const isCompleted =
                                status ===
                                "completed";

                            const isOpen =
                                status ===
                                "open";

                            const completionPending =
                                !isMulti &&
                                acceptedApplication
                                    ?.client_status ===
                                    "pending" &&
                                !!acceptedApplication
                                    ?.completion_requested_at;

                            const completionRejected =
                                !isMulti &&
                                acceptedApplication
                                    ?.client_status ===
                                    "rejected";

                            const joinedCount =
                                applications.length;

                            const maxParticipants =
                                task.max_participants ??
                                null;

                            const slotsFull =
                                isMulti &&
                                maxParticipants !== null &&
                                joinedCount >=
                                    maxParticipants;

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

                                    {/* ================================================= */}
                                    {/* TASK SUMMARY */}
                                    {/* ================================================= */}

                                    <summary className="
                                        cursor-pointer
                                        list-none
                                        px-4
                                        py-4
                                        sm:px-6
                                        sm:py-5
                                        [&::-webkit-details-marker]:hidden
                                    ">

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
                                            lg:gap-6
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

                                                        <h3 className="
                                                            whitespace-normal
                                                            wrap-break-word
                                                            text-[15px]
                                                            font-semibold
                                                            leading-6
                                                            text-slate-900
                                                            sm:text-[16px]
                                                        ">
                                                            {task.title}
                                                        </h3>

                                                        {/* STATUS BADGE */}

                                                        {isMulti ? (

                                                            slotsFull ? (

                                                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 sm:px-2.5 sm:py-1 sm:text-[11px]">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                                    All Slots Filled
                                                                </span>

                                                            ) : (

                                                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:px-2.5 sm:py-1 sm:text-[11px]">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                    {joinedCount}
                                                                    {maxParticipants !== null
                                                                        ? `/${maxParticipants}`
                                                                        : ""}{" "}
                                                                    Joined
                                                                </span>
                                                            )

                                                        ) : completionPending ? (

                                                            <span className="
                                                                inline-flex
                                                                shrink-0
                                                                items-center
                                                                gap-1
                                                                rounded-full
                                                                bg-yellow-50
                                                                px-2
                                                                py-0.5
                                                                text-[10px]
                                                                font-semibold
                                                                text-yellow-700
                                                                sm:px-2.5
                                                                sm:py-1
                                                                sm:text-[11px]
                                                            ">
                                                                <span className="
                                                                    h-1.5
                                                                    w-1.5
                                                                    rounded-full
                                                                    bg-yellow-500
                                                                " />
                                                                Completion Review
                                                            </span>

                                                        ) : isCompleted ? (

                                                            <span className="
                                                                inline-flex
                                                                shrink-0
                                                                items-center
                                                                gap-1
                                                                rounded-full
                                                                bg-purple-50
                                                                px-2
                                                                py-0.5
                                                                text-[10px]
                                                                font-semibold
                                                                text-purple-600
                                                                sm:px-2.5
                                                                sm:py-1
                                                                sm:text-[11px]
                                                            ">
                                                                <span className="
                                                                    h-1.5
                                                                    w-1.5
                                                                    rounded-full
                                                                    bg-purple-500
                                                                " />
                                                                Completed
                                                            </span>

                                                        ) : isAssigned ? (

                                                            <span className="
                                                                inline-flex
                                                                shrink-0
                                                                items-center
                                                                gap-1
                                                                rounded-full
                                                                bg-orange-50
                                                                px-2
                                                                py-0.5
                                                                text-[10px]
                                                                font-semibold
                                                                text-orange-600
                                                                sm:px-2.5
                                                                sm:py-1
                                                                sm:text-[11px]
                                                            ">
                                                                <span className="
                                                                    h-1.5
                                                                    w-1.5
                                                                    rounded-full
                                                                    bg-orange-500
                                                                " />
                                                                Assigned
                                                            </span>

                                                        ) : isOpen ? (

                                                            <span className="
                                                                inline-flex
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

                                                        ) : (

                                                            <span className="
                                                                inline-flex
                                                                shrink-0
                                                                rounded-full
                                                                bg-slate-50
                                                                px-2
                                                                py-0.5
                                                                text-[10px]
                                                                font-semibold
                                                                text-slate-600
                                                                sm:px-2.5
                                                                sm:py-1
                                                                sm:text-[11px]
                                                            ">
                                                                {task.status ||
                                                                    "Unknown"}
                                                            </span>
                                                        )}

                                                        {isMulti && (
                                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 sm:px-2.5 sm:py-1 sm:text-[11px]">
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
                                                        {task.category ||
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
                                                        {task.description ||
                                                            "No description provided."}
                                                    </p>

                                                </div>

                                            </div>


                                            {/* PRICE */}

                                            <div>

                                                <p className="
                                                    mb-1
                                                    text-[12px]
                                                    font-medium
                                                    text-slate-400
                                                ">
                                                    {isMulti
                                                        ? "Reward / Student"
                                                        : "Task Price"}
                                                </p>

                                                <p className="
                                                    text-[17px]
                                                    font-bold
                                                    text-emerald-600
                                                    sm:text-[19px]
                                                ">
                                                    $
                                                    {isMulti
                                                        ? task.reward_per_participant ?? 0
                                                        : acceptedPrices[
                                                              task.id
                                                          ] ??
                                                          task.recommended_price}
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
                                                        {isMulti
                                                            ? `${task.duration_minutes ?? "-"} min`
                                                            : <>{task.expected_day}{" "}{task.expected_month}</>}
                                                    </p>

                                                </div>

                                            </div>


                                            {/* STATUS */}

                                            <div className="sm:col-span-2 lg:col-span-1">

                                                <p className="
                                                    mb-1
                                                    text-[12px]
                                                    font-medium
                                                    text-slate-400
                                                ">
                                                    Status
                                                </p>

                                                {isMulti ? (

                                                    <p className={`text-[14px] font-semibold ${slotsFull ? "text-slate-500" : "text-emerald-600"}`}>
                                                        {joinedCount}
                                                        {maxParticipants !== null
                                                            ? `/${maxParticipants}`
                                                            : ""}{" "}
                                                        Participants
                                                    </p>

                                                ) : completionPending ? (

                                                    <p className="
                                                        text-[14px]
                                                        font-semibold
                                                        text-yellow-600
                                                    ">
                                                        Awaiting Review
                                                    </p>

                                                ) : isCompleted ? (

                                                    <p className="
                                                        text-[14px]
                                                        font-semibold
                                                        text-purple-600
                                                    ">
                                                        Completed
                                                    </p>

                                                ) : isAssigned ? (

                                                    <p className="
                                                        text-[14px]
                                                        font-semibold
                                                        text-orange-500
                                                    ">
                                                        Assigned
                                                    </p>

                                                ) : isOpen ? (

                                                    <p className="
                                                        text-[14px]
                                                        font-semibold
                                                        text-emerald-600
                                                    ">
                                                        Open
                                                    </p>

                                                ) : (

                                                    <p className="
                                                        text-[14px]
                                                        font-semibold
                                                        text-slate-500
                                                    ">
                                                        {task.status ||
                                                            "Unknown"}
                                                    </p>
                                                )}

                                            </div>


                                            {/* EXPAND */}

                                            <div className="
                                                flex
                                                items-center
                                                justify-end
                                            ">

                                                <span className="
                                                    flex
                                                    h-9
                                                    w-9
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
                                                    sm:h-9.5
                                                    sm:w-9.5
                                                ">
                                                    ↓
                                                </span>

                                            </div>

                                        </div>

                                    </summary>


                                    {/* ================================================= */}
                                    {/* EXPANDED CONTENT */}
                                    {/* ================================================= */}

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
                                                {task.title}
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
                                                {task.description}
                                            </p>


                                            {/* MULTI TASK SUMMARY */}

                                            {isMulti && (
                                                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
                                                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                                                        <p className="text-[11px] font-medium text-slate-400">Reward / Student</p>
                                                        <p className="mt-1 text-sm font-bold text-emerald-600">
                                                            ${task.reward_per_participant ?? 0}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                                                        <p className="text-[11px] font-medium text-slate-400">Total Budget</p>
                                                        <p className="mt-1 text-sm font-bold text-emerald-600">
                                                            $
                                                            {(
                                                                (task.reward_per_participant ?? 0) *
                                                                (maxParticipants ?? 0)
                                                            ).toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                                                        <p className="text-[11px] font-medium text-slate-400">Participants</p>
                                                        <p className="mt-1 text-sm font-bold text-slate-700">
                                                            {joinedCount}
                                                            {maxParticipants !== null ? `/${maxParticipants}` : ""}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                                                        <p className="text-[11px] font-medium text-slate-400">Duration</p>
                                                        <p className="mt-1 text-sm font-bold text-slate-700">
                                                            {task.duration_minutes ?? "-"} min
                                                        </p>
                                                    </div>
                                                </div>
                                            )}


                                            {/* ================================================= */}
                                            {/* ATTACHMENTS */}
                                            {/* ================================================= */}

                                            {task.attachments &&
                                                task.attachments.length >
                                                0 && (

                                                    <div className="mt-6">

                                                        <p className="
                                                            mb-3
                                                            text-sm
                                                            font-semibold
                                                            text-slate-800
                                                        ">
                                                            Attachments
                                                        </p>

                                                        <div className="
                                                            grid
                                                            grid-cols-2
                                                            gap-3
                                                            sm:grid-cols-3
                                                            lg:grid-cols-4
                                                        ">

                                                            {task.attachments.map(
                                                                (
                                                                    url: string,
                                                                    index: number
                                                                ) => {

                                                                    const fileName =
                                                                        decodeURIComponent(
                                                                            url
                                                                                .split("/")
                                                                                .pop() ||
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

                                                                        <a
                                                                            key={index}
                                                                            href={url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            download
                                                                            onClick={(e) =>
                                                                                e.stopPropagation()
                                                                            }
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

                                                                                <div className="relative h-24 w-full overflow-hidden rounded-lg">
                                                                                    <Image
                                                                                        src={url}
                                                                                        alt={fileName}
                                                                                        fill
                                                                                        unoptimized
                                                                                        sizes="(max-width: 640px) 45vw, 200px"
                                                                                        className="object-cover"
                                                                                    />
                                                                                </div>

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

                                                                        </a>
                                                                    );
                                                                }
                                                            )}

                                                        </div>

                                                    </div>
                                                )}


                                            {/* ================================================= */}
                                            {/* MULTI TASK — ALL PARTICIPANTS, EACH INDEPENDENT */}
                                            {/* ================================================= */}

                                            {isMulti && (

                                                <div className="mt-6">

                                                    <p className="mb-3 text-sm font-semibold text-slate-800">
                                                        Participants ({joinedCount}
                                                        {maxParticipants !== null ? `/${maxParticipants}` : ""})
                                                    </p>

                                                    {applications.length === 0 ? (

                                                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                                                            No students have joined this task yet.
                                                        </div>

                                                    ) : (

                                                        <div className="space-y-3">

                                                            {applications.map((application) => {

                                                                const participantCompletionPending =
                                                                    application.client_status === "pending" &&
                                                                    !!application.completion_requested_at;

                                                                const participantCompletionRejected =
                                                                    application.client_status === "rejected";

                                                                const participantRated =
                                                                    !!ratedPairs[
                                                                        ratingKey(
                                                                            application.task_id,
                                                                            application.student_id
                                                                        )
                                                                    ];

                                                                return (

                                                                    <div
                                                                        key={application.id}
                                                                        className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4"
                                                                    >

                                                                        <div className="flex flex-wrap items-center justify-between gap-3">

                                                                            <div className="flex items-center gap-3">

                                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                                                    👤
                                                                                </div>

                                                                                <div className="min-w-0">
                                                                                    <p className="text-sm font-semibold text-blue-800 truncate">
                                                                                        {application.full_name}
                                                                                    </p>
                                                                                    <p className="mt-0.5 text-xs text-blue-700">
                                                                                        {application.status === "completed"
                                                                                            ? "Completed"
                                                                                            : participantCompletionPending
                                                                                            ? "Awaiting your review"
                                                                                            : "In progress"}
                                                                                    </p>
                                                                                </div>

                                                                            </div>

                                                                            {application.status === "completed" && (

                                                                                participantRated ? (

                                                                                    <span className="text-xs font-semibold text-green-600">
                                                                                        ✓ Rated
                                                                                    </span>

                                                                                ) : (

                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            e.stopPropagation();
                                                                                            setRatingPopupId(application.id);
                                                                                        }}
                                                                                        className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
                                                                                    >
                                                                                        Rate Student
                                                                                    </button>
                                                                                )
                                                                            )}

                                                                        </div>

                                                                        {participantCompletionPending && (

                                                                            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        setCompletionPopupId(application.id);
                                                                                    }}
                                                                                    className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 sm:w-auto"
                                                                                >
                                                                                    Review
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        confirmCompletion(application.id);
                                                                                    }}
                                                                                    disabled={processingCompletionId === application.id}
                                                                                    className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50 sm:w-auto"
                                                                                >
                                                                                    {processingCompletionId === application.id
                                                                                        ? "Processing..."
                                                                                        : "Confirm"}
                                                                                </button>

                                                                            </div>
                                                                        )}

                                                                        {participantCompletionRejected && (

                                                                            <p className="mt-3 text-xs font-medium text-red-600">
                                                                                ⚠️ You rejected this completion request — the slot remains active.
                                                                            </p>
                                                                        )}

                                                                    </div>
                                                                );
                                                            })}

                                                        </div>
                                                    )}

                                                </div>
                                            )}


                                            {/* ================================================= */}
                                            {/* SINGLE TASK — ASSIGNED STUDENT */}
                                            {/* ================================================= */}

                                            {!isMulti && acceptedApplication && (

                                                <div className="
                                                    mt-6
                                                    rounded-xl
                                                    border
                                                    border-blue-200
                                                    bg-blue-50
                                                    p-3
                                                    sm:p-4
                                                ">

                                                    <div className="
                                                        flex
                                                        items-center
                                                        gap-3
                                                    ">

                                                        <div className="
                                                            flex
                                                            h-10
                                                            w-10
                                                            shrink-0
                                                            items-center
                                                            justify-center
                                                            rounded-full
                                                            bg-blue-100
                                                            text-blue-600
                                                        ">
                                                            👤
                                                        </div>

                                                        <div className="min-w-0">

                                                            <p className="
                                                                text-sm
                                                                font-semibold
                                                                text-blue-800
                                                            ">
                                                                Student Assigned
                                                            </p>

                                                            <p className="
                                                                mt-0.5
                                                                text-sm
                                                                text-blue-700
                                                                truncate
                                                            ">
                                                                {acceptedApplication.full_name}
                                                            </p>

                                                        </div>

                                                    </div>


                                                    {/* ================================================= */}
                                                    {/* COMPLETION REQUEST */}
                                                    {/* ================================================= */}

                                                    {acceptedApplication.client_status ===
                                                        "pending" &&
                                                        acceptedApplication.completion_requested_at && (

                                                            <div className="
                                                                mt-4
                                                                rounded-xl
                                                                border
                                                                border-yellow-200
                                                                bg-yellow-50
                                                                p-3
                                                                sm:p-4
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
                                                                            Work Completion Request
                                                                        </p>

                                                                        <p className="
                                                                            mt-1
                                                                            text-sm
                                                                            leading-6
                                                                            text-yellow-700
                                                                        ">
                                                                            The student has submitted
                                                                            this task as completed.
                                                                        </p>

                                                                        <p className="
                                                                            mt-1
                                                                            text-sm
                                                                            leading-6
                                                                            text-yellow-700
                                                                        ">
                                                                            Please confirm whether
                                                                            the work has been completed
                                                                            satisfactorily.
                                                                        </p>

                                                                    </div>

                                                                </div>

                                                                <div className="
                                                                    mt-4
                                                                    flex
                                                                    flex-col-reverse
                                                                    gap-3
                                                                    sm:flex-row
                                                                    sm:justify-end
                                                                ">

                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {

                                                                            e.preventDefault();
                                                                            e.stopPropagation();

                                                                            setCompletionPopupId(
                                                                                acceptedApplication.id
                                                                            );
                                                                        }}
                                                                        className="
                                                                            w-full
                                                                            rounded-xl
                                                                            border
                                                                            border-red-200
                                                                            bg-white
                                                                            px-5
                                                                            py-2.5
                                                                            font-semibold
                                                                            text-red-600
                                                                            transition
                                                                            hover:bg-red-50
                                                                            sm:w-auto
                                                                        "
                                                                    >
                                                                        Review
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {

                                                                            e.preventDefault();
                                                                            e.stopPropagation();

                                                                            confirmCompletion(
                                                                                acceptedApplication.id
                                                                            );
                                                                        }}
                                                                        disabled={
                                                                            processingCompletionId ===
                                                                            acceptedApplication.id
                                                                        }
                                                                        className="
                                                                            w-full
                                                                            rounded-xl
                                                                            bg-emerald-500
                                                                            px-5
                                                                            py-2.5
                                                                            font-semibold
                                                                            text-white
                                                                            transition
                                                                            hover:bg-emerald-600
                                                                            disabled:opacity-50
                                                                            sm:w-auto
                                                                        "
                                                                    >
                                                                        {processingCompletionId ===
                                                                            acceptedApplication.id
                                                                            ? "Processing..."
                                                                            : "Yes, Confirm"}
                                                                    </button>

                                                                </div>

                                                            </div>
                                                        )}


                                                    {/* ================================================= */}
                                                    {/* REJECTED */}
                                                    {/* ================================================= */}

                                                    {completionRejected && (

                                                        <div className="
                                                            mt-4
                                                            rounded-xl
                                                            border
                                                            border-red-200
                                                            bg-red-50
                                                            p-3
                                                            sm:p-4
                                                        ">

                                                            <div className="
                                                                flex
                                                                items-start
                                                                gap-3
                                                            ">

                                                                <span className="text-lg">
                                                                    ⚠️
                                                                </span>

                                                                <div>

                                                                    <p className="
                                                                        font-semibold
                                                                        text-red-700
                                                                    ">
                                                                        Completion Request Rejected
                                                                    </p>

                                                                    <p className="
                                                                        mt-1
                                                                        text-sm
                                                                        leading-6
                                                                        text-red-600
                                                                    ">
                                                                        The task remains active.
                                                                        The escrow payment is still
                                                                        being held.
                                                                    </p>

                                                                </div>

                                                            </div>

                                                        </div>
                                                    )}


                                                    {/* ================================================= */}
                                                    {/* RATING */}
                                                    {/* ================================================= */}

                                                    {acceptedApplication.status ===
                                                        "completed" && (

                                                            <div className="mt-5">

                                                                {ratedPairs[
                                                                    ratingKey(
                                                                        task.id,
                                                                        acceptedApplication.student_id
                                                                    )
                                                                ] ? (

                                                                    <div className="
                                                                        rounded-xl
                                                                        border
                                                                        border-green-200
                                                                        bg-green-50
                                                                        p-3
                                                                        sm:p-4
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
                                                                                    Student Rated
                                                                                </p>

                                                                                <p className="
                                                                                    mt-1
                                                                                    text-sm
                                                                                    leading-6
                                                                                    text-green-600
                                                                                ">
                                                                                    You have already
                                                                                    submitted your
                                                                                    rating for this task.
                                                                                </p>

                                                                            </div>

                                                                        </div>

                                                                    </div>

                                                                ) : (

                                                                    <div className="
                                                                        flex
                                                                        justify-end
                                                                    ">

                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {

                                                                                e.preventDefault();
                                                                                e.stopPropagation();

                                                                                setRatingPopupId(
                                                                                    acceptedApplication.id
                                                                                );
                                                                            }}
                                                                            className="
                                                                                w-full
                                                                                rounded-xl
                                                                                bg-blue-500
                                                                                px-5
                                                                                py-2.5
                                                                                font-semibold
                                                                                text-white
                                                                                shadow-sm
                                                                                transition
                                                                                hover:bg-blue-600
                                                                                hover:shadow-md
                                                                                active:scale-[0.98]
                                                                                sm:w-auto
                                                                            "
                                                                        >
                                                                            Rate Student
                                                                        </button>

                                                                    </div>
                                                                )}

                                                            </div>
                                                        )}

                                                </div>
                                            )}

                                        </div>

                                    </div>

                                </details>
                            );
                        }
                    )}

                </div>
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
                        bg-black/40
                        p-4
                        backdrop-blur-sm
                    "
                    onClick={() =>
                        setCompletionPopupId(null)
                    }
                >

                    <div
                        className="
                            w-full
                            max-w-md
                            max-h-[90vh]
                            overflow-y-auto
                            rounded-2xl
                            border
                            border-slate-100
                            bg-white
                            p-5
                            shadow-2xl
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
                            bg-yellow-50
                            text-xl
                        ">
                            ⏳
                        </div>

                        <h3 className="
                            text-lg
                            font-bold
                            text-slate-900
                            sm:text-xl
                        ">
                            Work Completion Request
                        </h3>

                        <p className="
                            mt-4
                            text-[15px]
                            leading-6
                            text-slate-600
                        ">
                            The student says the work has
                            been completed.
                        </p>

                        <p className="
                            mt-4
                            text-sm
                            leading-6
                            text-slate-500
                        ">
                            If you confirm, the escrow payment
                            will be released to the student and
                            their slot will be marked as completed.
                        </p>

                        <p className="
                            mt-3
                            text-sm
                            leading-6
                            text-slate-500
                        ">
                            If you choose No, the slot will
                            remain active and the escrow payment
                            will remain held.
                        </p>

                        <p className="
                            mt-3
                            text-sm
                            leading-6
                            text-slate-500
                        ">
                            If you do not respond within 48
                            hours, the payment will automatically
                            be released and the slot will be
                            marked as completed.
                        </p>

                        <div className="
                            mt-7
                            flex
                            flex-col-reverse
                            items-stretch
                            gap-3
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                        ">

                            <button
                                type="button"
                                onClick={() =>
                                    rejectCompletion(
                                        completionPopupId
                                    )
                                }
                                disabled={
                                    processingCompletionId ===
                                    completionPopupId
                                }
                                className="
                                    rounded-xl
                                    border
                                    border-red-200
                                    px-5
                                    py-2.5
                                    font-semibold
                                    text-red-600
                                    transition
                                    hover:bg-red-50
                                    disabled:opacity-50
                                "
                            >
                                {processingCompletionId ===
                                    completionPopupId
                                    ? "Processing..."
                                    : "No, Not Yet"}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    confirmCompletion(
                                        completionPopupId
                                    )
                                }
                                disabled={
                                    processingCompletionId ===
                                    completionPopupId
                                }
                                className="
                                    rounded-xl
                                    bg-emerald-500
                                    px-5
                                    py-2.5
                                    font-semibold
                                    text-white
                                    transition
                                    hover:bg-emerald-600
                                    disabled:opacity-50
                                "
                            >
                                {processingCompletionId ===
                                    completionPopupId
                                    ? "Processing..."
                                    : "Yes, Confirm"}
                            </button>

                        </div>

                    </div>

                </div>
            )}


            {/* ===================================================== */}
            {/* RATE STUDENT POPUP */}
            {/* ===================================================== */}

            {ratingPopupId && (

                <div
                    className="
                        fixed
                        inset-0
                        z-50
                        flex
                        items-center
                        justify-center
                        bg-black/40
                        p-4
                        backdrop-blur-sm
                    "
                    onClick={() => {

                        if (!submittingRating) {

                            setRatingPopupId(null);
                            setRating(0);
                            setReview("");
                        }
                    }}
                >

                    <div
                        className="
                            w-full
                            max-w-md
                            max-h-[90vh]
                            overflow-y-auto
                            rounded-2xl
                            border
                            border-slate-100
                            bg-white
                            p-5
                            shadow-2xl
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
                            ⭐
                        </div>

                        <h3 className="
                            text-lg
                            font-bold
                            text-slate-900
                            sm:text-xl
                        ">
                            Rate Student
                        </h3>

                        <p className="
                            mt-2
                            text-sm
                            leading-6
                            text-slate-500
                        ">
                            How would you rate the student&apos;s
                            work?
                        </p>


                        {/* STARS */}

                        <div className="
                            mt-5
                            flex
                            gap-1.5
                            sm:gap-2
                        ">

                            {[1, 2, 3, 4, 5].map(
                                (star) => (

                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() =>
                                            setRating(star)
                                        }
                                        className={`
                                            text-3xl
                                            transition-transform
                                            duration-150
                                            hover:scale-110
                                            sm:text-4xl
                                            ${
                                                star <= rating
                                                    ? "text-yellow-400"
                                                    : "text-slate-200"
                                            }
                                        `}
                                    >
                                        ★
                                    </button>
                                )
                            )}

                        </div>

                        <p className="
                            mt-2
                            text-sm
                            font-medium
                            text-slate-500
                        ">
                            {rating === 0
                                ? "Select a rating"
                                : `${rating} out of 5 stars`}
                        </p>


                        {/* REVIEW */}

                        <textarea
                            value={review}
                            onChange={(e) =>
                                setReview(
                                    e.target.value
                                )
                            }
                            placeholder="Write a review (optional)"
                            rows={4}
                            className="
                                mt-5
                                w-full
                                resize-none
                                rounded-xl
                                border
                                border-slate-200
                                bg-slate-50
                                p-3
                                text-sm
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


                        {/* ACTIONS */}

                        <div className="
                            mt-6
                            flex
                            flex-col-reverse
                            items-stretch
                            gap-3
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                        ">

                            <button
                                type="button"
                                disabled={
                                    submittingRating
                                }
                                onClick={() => {

                                    setRatingPopupId(
                                        null
                                    );

                                    setRating(0);
                                    setReview("");
                                }}
                                className="
                                    rounded-xl
                                    border
                                    border-slate-300
                                    px-5
                                    py-2.5
                                    font-medium
                                    text-slate-600
                                    transition
                                    hover:bg-slate-50
                                    disabled:opacity-50
                                "
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                disabled={
                                    submittingRating ||
                                    rating === 0
                                }
                                onClick={() => {

                                    const application =
                                        Object.values(
                                            applicationsByTask
                                        )
                                            .flat()
                                            .find(
                                                (app) =>
                                                    app.id ===
                                                    ratingPopupId
                                            );

                                    if (
                                        application
                                    ) {

                                        submitStudentRating(
                                            application
                                        );
                                    }
                                }}
                                className="
                                    rounded-xl
                                    bg-blue-500
                                    px-5
                                    py-2.5
                                    font-semibold
                                    text-white
                                    transition
                                    hover:bg-blue-600
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                {submittingRating
                                    ? "Submitting..."
                                    : "Submit Rating"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}