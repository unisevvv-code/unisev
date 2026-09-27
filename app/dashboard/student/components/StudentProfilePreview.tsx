"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface StudentProfilePreviewProps {
    studentId: string;
    onClose: () => void;
    initialShowReviews?: boolean;
}

interface Profile {
    full_name: string;
    university: string;
    department: string;
    level: string;
    skills: string;
    bio: string;
    verification_status: string;
    average_rating: number | null;
    total_ratings: number;
}

interface Review {
    id: string;
    client_id: string;
    task_id: string;
    rating: number;
    review: string | null;
    created_at: string;
    client_name: string;
    category: string;
}

interface RatingRow {
    id: string;
    client_id: string;
    task_id: string;
    rating: number;
    review: string | null;
    created_at: string;
}

interface ClientRow {
    id: string;
    full_name: string | null;
}

interface TaskRow {
    id: string;
    category: string | null;
}

export default function StudentProfilePreview({
    studentId,
    onClose,
    initialShowReviews = false,
}: StudentProfilePreviewProps) {
    const [profile, setProfile] =
        useState<Profile | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [reviews, setReviews] =
        useState<Review[]>([]);

    const [loadingReviews, setLoadingReviews] =
        useState(true);

    const [showReviews, setShowReviews] =
        useState(initialShowReviews);

    // =========================================================
    // LOAD PROFILE
    // =========================================================

    const loadProfile = useCallback(async () => {
        setLoading(true);

        const { data, error } =
            await supabase
                .from("profiles")
                .select(`
                    full_name,
                    university,
                    department,
                    level,
                    skills,
                    bio,
                    verification_status,
                    average_rating,
                    total_ratings
                `)
                .eq("id", studentId)
                .single();

        if (error) {
            console.log(
                "PROFILE ERROR:",
                error
            );

            setProfile(null);
            setLoading(false);

            return;
        }

        setProfile(data);
        setLoading(false);
    }, [studentId]);

    // =========================================================
    // LOAD REVIEWS
    // =========================================================

    const loadReviews = useCallback(async () => {
        setLoadingReviews(true);

        const {
            data: ratings,
            error,
        } = await supabase
            .from("student_ratings")
            .select(`
                id,
                client_id,
                task_id,
                rating,
                review,
                created_at
            `)
            .eq("student_id", studentId)
            .order("created_at", {
                ascending: false,
            });

        if (error) {
            console.log(
                "REVIEWS ERROR:",
                error
            );

            setReviews([]);
            setLoadingReviews(false);

            return;
        }

        const clientIds = Array.from(
            new Set(
                (ratings || []).map(
                    (item: RatingRow) =>
                        item.client_id
                )
            )
        );

        const taskIds = Array.from(
            new Set(
                (ratings || []).map(
                    (item: RatingRow) =>
                        item.task_id
                )
            )
        );

        // =====================================================
        // LOAD CLIENT NAMES
        // =====================================================

        const clientNames: Record<
            string,
            string
        > = {};

        if (clientIds.length > 0) {
            const {
                data: clients,
                error: clientsError,
            } = await supabase
                .from("profiles")
                .select(`
                    id,
                    full_name
                `)
                .in("id", clientIds);

            if (clientsError) {
                console.log(
                    "REVIEW CLIENTS ERROR:",
                    clientsError
                );
            } else {
                (clients || []).forEach(
                    (client: ClientRow) => {
                        clientNames[client.id] =
                            client.full_name ||
                            "Client";
                    }
                );
            }
        }

        // =====================================================
        // LOAD TASK CATEGORIES
        // =====================================================

        const taskCategories: Record<
            string,
            string
        > = {};

        if (taskIds.length > 0) {
            const {
                data: taskData,
                error: taskError,
            } = await supabase
                .from("tasks")
                .select(`
                    id,
                    category
                `)
                .in("id", taskIds);

            if (taskError) {
                console.log(
                    "REVIEW TASK ERROR:",
                    taskError
                );
            } else {
                (taskData || []).forEach(
                    (task: TaskRow) => {
                        taskCategories[task.id] =
                            task.category ||
                            "General";
                    }
                );
            }
        }

        // =====================================================
        // FORMAT REVIEWS
        // =====================================================

        setReviews(
            (ratings || []).map(
                (item: RatingRow) => ({
                    id: item.id,
                    client_id:
                        item.client_id,
                    task_id:
                        item.task_id,
                    rating:
                        Number(item.rating),
                    review:
                        item.review,
                    created_at:
                        item.created_at,

                    client_name:
                        clientNames[
                            item.client_id
                        ] ||
                        "Anonymous Client",

                    category:
                        taskCategories[
                            item.task_id
                        ] ||
                        "General",
                })
            )
        );

        setLoadingReviews(false);
    }, [studentId]);

    useEffect(() => {
        // Both loadProfile and loadReviews set their "loading" flag
        // synchronously before their first await — that's the initial
        // fetch state, not a sync of external state into React, so the
        // lint rule's usual advice doesn't apply here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProfile();
        loadReviews();
    }, [loadProfile, loadReviews]);

    // =========================================================
    // HELPERS
    // =========================================================

    function getInitials(name: string) {
        return (
            name
                ?.split(" ")
                .filter(Boolean)
                .map(
                    (word) => word[0]
                )
                .join("")
                .substring(0, 2)
                .toUpperCase() ||
            "ST"
        );
    }

    function formatReviewDate(
        dateString: string
    ) {
        const date =
            new Date(dateString);

        const now = new Date();

        const difference =
            Math.floor(
                (now.getTime() -
                    date.getTime()) /
                    (1000 *
                        60 *
                        60 *
                        24)
            );

        if (difference < 1)
            return "Today";

        if (difference === 1)
            return "1 day ago";

        if (difference < 30)
            return `${difference} days ago`;

        const months =
            Math.floor(
                difference / 30
            );

        if (months < 12) {
            return `${months} month${
                months === 1
                    ? ""
                    : "s"
            } ago`;
        }

        return date.toLocaleDateString();
    }

    // =========================================================
    // REVIEW STATISTICS
    //
    // These stay based on ALL ratings (with or without written
    // text), so the overall score and count are accurate even
    // though the lists below only render the written ones.
    // =========================================================

    const totalReviews =
        reviews.length;

    const calculatedAverage =
        totalReviews > 0
            ? reviews.reduce(
                  (
                      total,
                      item
                  ) =>
                      total +
                      Number(
                          item.rating
                      ),
                  0
              ) / totalReviews
            : Number(
                  profile?.average_rating ||
                      0
              );

    const positiveReviews =
        totalReviews > 0
            ? Math.round(
                  (reviews.filter(
                      (item) =>
                          Number(
                              item.rating
                          ) >= 4
                  ).length /
                      totalReviews) *
                      100
              )
            : 0;

    // Only reviews with actual written text — used for the
    // rendered lists below. The stats above stay based on ALL
    // ratings so the overall score doesn't shift just because
    // some clients rated without leaving a comment.
    const writtenReviews = reviews.filter(
        (item) => item.review
    );

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {
        return (
            <div
                className="
                    fixed
                    inset-0
                    bg-black/40
                    flex
                    items-center
                    justify-center
                    z-50
                    p-3
                    sm:p-5
                "
            >
                <div
                    className="
                        bg-white
                        rounded-2xl
                        p-6
                        sm:p-8
                        shadow-xl
                    "
                >
                    Loading profile...
                </div>
            </div>
        );
    }

    // =========================================================
    // PROFILE ERROR
    // =========================================================

    if (!profile) {
        return (
            <div
                className="
                    fixed
                    inset-0
                    bg-black/40
                    flex
                    items-center
                    justify-center
                    z-50
                    p-3
                    sm:p-5
                "
                onClick={onClose}
            >
                <div
                    className="
                        bg-white
                        rounded-2xl
                        p-6
                        sm:p-8
                        shadow-xl
                        w-full
                        max-w-sm
                    "
                    onClick={(e) =>
                        e.stopPropagation()
                    }
                >
                    <p>
                        Unable to load student
                        profile.
                    </p>

                    <button
                        onClick={onClose}
                        className="
                            mt-4
                            w-full
                            sm:w-auto
                            bg-gray-800
                            text-white
                            px-5
                            py-2.5
                            rounded-xl
                        "
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const isVerified =
        profile.verification_status ===
        "Verified";

    const initials =
        profile.full_name
            ?.split(" ")
            .filter(Boolean)
            .map(
                (word) => word[0]
            )
            .join("")
            .substring(0, 2)
            .toUpperCase() ||
        "ST";

    // =========================================================
    // MAIN MODAL
    // =========================================================

    return (
        <div
            className="
                fixed
                inset-0
                bg-black/40
                flex
                items-center
                justify-center
                z-50
                p-0
                sm:p-5
            "
            onClick={onClose}
        >
            <div
                className="
                    bg-white
                    w-full
                    h-full
                    sm:h-auto
                    max-w-4xl
                    max-h-full
                    sm:max-h-[92vh]
                    rounded-none
                    sm:rounded-2xl
                    shadow-2xl
                    overflow-hidden
                    flex
                    flex-col
                "
                onClick={(e) =>
                    e.stopPropagation()
                }
            >

                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <div
                    className="
                        px-4
                        py-3
                        sm:px-6
                        sm:py-4
                        border-b
                        flex
                        items-center
                        justify-between
                        gap-3
                        shrink-0
                    "
                >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">

                        {showReviews && (
                            <button
                                type="button"
                                onClick={() =>
                                    setShowReviews(
                                        false
                                    )
                                }
                                className="
                                    shrink-0
                                    text-blue-600
                                    hover:text-blue-800
                                    font-semibold
                                    text-sm
                                    sm:text-base
                                "
                            >
                                ← Back
                            </button>
                        )}

                        <h2 className="
                            truncate
                            text-lg
                            sm:text-xl
                            font-bold
                        ">
                            {showReviews
                                ? "Reviews & Ratings"
                                : "Student Profile"}
                        </h2>

                    </div>

                    <button
                        onClick={onClose}
                        className="
                            shrink-0
                            w-10
                            h-10
                            rounded-full
                            hover:bg-gray-100
                            active:bg-gray-100
                            text-gray-500
                            text-xl
                            flex
                            items-center
                            justify-center
                        "
                    >
                        ×
                    </button>
                </div>

                {/* ================================================= */}
                {/* REVIEWS SCREEN */}
                {/* ================================================= */}

                {showReviews ? (

                    <div
                        className="
                            overflow-y-auto
                            p-4
                            sm:p-6
                            bg-gray-50
                        "
                    >

                        {/* PAGE DESCRIPTION */}

                        <p className="
                            text-sm
                            sm:text-base
                            text-gray-600
                            mb-4
                            sm:mb-5
                        ">
                            See what clients say about{" "}
                            <span className="font-semibold">
                                {profile.full_name}
                            </span>{" "}
                            and their experience working
                            together.
                        </p>

                        {/* ========================================= */}
                        {/* SUMMARY CARD */}
                        {/* ========================================= */}

                        <div
                            className="
                                bg-white
                                rounded-2xl
                                border
                                shadow-sm
                                p-4
                                sm:p-6
                                grid
                                grid-cols-1
                                md:grid-cols-3
                                gap-5
                                sm:gap-6
                                items-center
                            "
                        >

                            {/* STUDENT */}

                            <div
                                className="
                                    flex
                                    items-center
                                    gap-4
                                "
                            >

                                <div
                                    className="
                                        w-16
                                        h-16
                                        sm:w-20
                                        sm:h-20
                                        rounded-full
                                        bg-blue-600
                                        text-white
                                        flex
                                        items-center
                                        justify-center
                                        text-xl
                                        sm:text-2xl
                                        font-bold
                                        shrink-0
                                    "
                                >
                                    {initials}
                                </div>

                                <div className="min-w-0">

                                    <h3 className="
                                        truncate
                                        text-lg
                                        sm:text-xl
                                        font-bold
                                        text-gray-900
                                    ">
                                        {profile.full_name}
                                    </h3>

                                    <p className="
                                        text-gray-500
                                    ">
                                        Student
                                    </p>

                                    <p className="
                                        text-sm
                                        text-gray-500
                                        mt-1
                                    ">
                                        {profile.university ||
                                            "University not provided"}
                                    </p>

                                </div>

                            </div>

                            {/* OVERALL RATING */}

                            <div
                                className="
                                    border-t
                                    md:border-t-0
                                    md:border-l
                                    md:border-r
                                    border-gray-200
                                    pt-5
                                    md:pt-0
                                    px-0
                                    md:px-6
                                    text-center
                                "
                            >

                                <p className="
                                    text-sm
                                    font-semibold
                                    text-gray-600
                                ">
                                    Overall Rating
                                </p>

                                <p className="
                                    text-3xl
                                    sm:text-4xl
                                    font-bold
                                    text-gray-900
                                    mt-1
                                ">
                                    {calculatedAverage
                                        ? calculatedAverage.toFixed(
                                              1
                                          )
                                        : "0.0"}
                                </p>

                                <div className="
                                    flex
                                    justify-center
                                    gap-1
                                    mt-1
                                ">
                                    {[1, 2, 3, 4, 5].map(
                                        (star) => (
                                            <span
                                                key={star}
                                                className={
                                                    star <=
                                                    Math.round(
                                                        calculatedAverage
                                                    )
                                                        ? "text-yellow-400 text-xl"
                                                        : "text-gray-300 text-xl"
                                                }
                                            >
                                                ★
                                            </span>
                                        )
                                    )}
                                </div>

                                <p className="
                                    text-sm
                                    text-gray-500
                                    mt-1
                                ">
                                    Based on{" "}
                                    {totalReviews}{" "}
                                    {totalReviews ===
                                    1
                                        ? "review"
                                        : "reviews"}
                                </p>

                            </div>

                            {/* STATISTICS */}

                            <div className="
                                border-t
                                md:border-t-0
                                border-gray-200
                                pt-5
                                md:pt-0
                                space-y-4
                            ">

                                <div className="
                                    flex
                                    items-center
                                    gap-4
                                ">

                                    <div className="
                                        w-12
                                        h-12
                                        rounded-full
                                        bg-blue-50
                                        flex
                                        items-center
                                        justify-center
                                        text-blue-600
                                        text-xl
                                        shrink-0
                                    ">
                                        ☆
                                    </div>

                                    <div>

                                        <p className="
                                            text-2xl
                                            font-bold
                                            text-gray-900
                                        ">
                                            {totalReviews}
                                        </p>

                                        <p className="
                                            text-sm
                                            text-gray-500
                                        ">
                                            Total Reviews
                                        </p>

                                    </div>

                                </div>

                                <div className="
                                    flex
                                    items-center
                                    gap-4
                                ">

                                    <div className="
                                        w-12
                                        h-12
                                        rounded-full
                                        bg-green-50
                                        flex
                                        items-center
                                        justify-center
                                        text-green-600
                                        text-xl
                                        shrink-0
                                    ">
                                        👍
                                    </div>

                                    <div>

                                        <p className="
                                            text-2xl
                                            font-bold
                                            text-gray-900
                                        ">
                                            {positiveReviews}%
                                        </p>

                                        <p className="
                                            text-sm
                                            text-gray-500
                                        ">
                                            Positive Reviews
                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>

                        {/* ========================================= */}
                        {/* REVIEWS HEADER */}
                        {/* ========================================= */}

                        <div
                            className="
                                flex
                                items-center
                                justify-between
                                mt-6
                                mb-3
                            "
                        >

                            <div>

                                <h3 className="
                                    text-base
                                    sm:text-lg
                                    font-bold
                                    text-gray-900
                                ">
                                    All Reviews ({writtenReviews.length})
                                </h3>

                            </div>

                        </div>

                        {/* ========================================= */}
                        {/* REVIEWS */}
                        {/* ========================================= */}

                        {loadingReviews ? (

                            <div className="
                                bg-white
                                rounded-xl
                                border
                                p-8
                                text-center
                            ">
                                <p className="
                                    text-gray-500
                                ">
                                    Loading reviews...
                                </p>
                            </div>

                        ) : writtenReviews.length === 0 ? (

                            <div className="
                                bg-white
                                rounded-xl
                                border
                                p-8
                                sm:p-10
                                text-center
                            ">

                                <div className="
                                    text-4xl
                                    mb-3
                                ">
                                    ☆
                                </div>

                                <p className="
                                    font-semibold
                                    text-gray-700
                                ">
                                    No reviews yet
                                </p>

                                <p className="
                                    text-sm
                                    text-gray-500
                                    mt-1
                                ">
                                    This student has not
                                    received any written reviews yet.
                                </p>

                            </div>

                        ) : (

                            <div className="
                                bg-white
                                rounded-xl
                                border
                                overflow-hidden
                            ">

                                {writtenReviews.map(
                                    (item) => (

                                        <div
                                            key={item.id}
                                            className="
                                                p-4
                                                sm:p-5
                                                border-b
                                                last:border-b-0
                                            "
                                        >

                                            <div className="
                                                flex
                                                items-start
                                                gap-3
                                                sm:gap-4
                                            ">

                                                {/* CLIENT AVATAR */}

                                                <div
                                                    className="
                                                        w-10
                                                        h-10
                                                        sm:w-12
                                                        sm:h-12
                                                        rounded-full
                                                        bg-blue-50
                                                        text-blue-700
                                                        flex
                                                        items-center
                                                        justify-center
                                                        font-semibold
                                                        text-sm
                                                        sm:text-base
                                                        shrink-0
                                                    "
                                                >
                                                    {getInitials(
                                                        item.client_name
                                                    )}
                                                </div>

                                                {/* REVIEW CONTENT */}

                                                <div className="
                                                    flex-1
                                                    min-w-0
                                                ">

                                                    <div className="
                                                        flex
                                                        flex-wrap
                                                        items-start
                                                        justify-between
                                                        gap-2
                                                        sm:gap-4
                                                    ">

                                                        <div className="min-w-0">

                                                            <p className="
                                                                truncate
                                                                font-semibold
                                                                text-gray-900
                                                            ">
                                                                {
                                                                    item.client_name
                                                                }
                                                            </p>

                                                            <p className="
                                                                text-sm
                                                                text-gray-400
                                                                mt-1
                                                            ">
                                                                {formatReviewDate(
                                                                    item.created_at
                                                                )}
                                                            </p>

                                                        </div>

                                                        <div className="
                                                            text-right
                                                            shrink-0
                                                        ">

                                                            <div className="
                                                                flex
                                                                gap-0.5
                                                            ">
                                                                {[
                                                                    1,
                                                                    2,
                                                                    3,
                                                                    4,
                                                                    5,
                                                                ].map(
                                                                    (
                                                                        star
                                                                    ) => (
                                                                        <span
                                                                            key={
                                                                                star
                                                                            }
                                                                            className={
                                                                                star <=
                                                                                item.rating
                                                                                    ? "text-yellow-400"
                                                                                    : "text-gray-300"
                                                                            }
                                                                        >
                                                                            ★
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>

                                                            <p className="
                                                                text-sm
                                                                font-semibold
                                                                text-gray-700
                                                                mt-1
                                                            ">
                                                                {Number(
                                                                    item.rating
                                                                ).toFixed(
                                                                    1
                                                                )}
                                                            </p>

                                                        </div>

                                                    </div>

                                                    {item.review && (
                                                        <p className="
                                                            text-sm
                                                            sm:text-base
                                                            text-gray-700
                                                            mt-3
                                                            leading-relaxed
                                                            wrap-break-words
                                                        ">
                                                            {
                                                                item.review
                                                            }
                                                        </p>
                                                    )}

                                                    <span className="
                                                        inline-block
                                                        mt-3
                                                        px-3
                                                        py-1
                                                        rounded-full
                                                        bg-blue-50
                                                        text-blue-700
                                                        text-xs
                                                        font-medium
                                                    ">
                                                        {
                                                            item.category
                                                        }
                                                    </span>

                                                </div>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        )}

                    </div>

                ) : (

                    /* ================================================= */
                    /* ORIGINAL STUDENT PROFILE */
                    /* ================================================= */

                    <div className="overflow-y-auto">

                        {/* PROFILE HEADER */}

                        <div
                            className="
                                px-4
                                py-5
                                sm:px-6
                                sm:py-6
                                flex
                                items-center
                                gap-4
                                sm:gap-5
                            "
                        >

                            <div className="relative shrink-0">

                                <div
                                    className="
                                        w-16
                                        h-16
                                        sm:w-20
                                        sm:h-20
                                        rounded-full
                                        bg-blue-600
                                        text-white
                                        flex
                                        items-center
                                        justify-center
                                        text-xl
                                        sm:text-2xl
                                        font-bold
                                    "
                                >
                                    {initials}
                                </div>

                                {/* RATING BADGE */}

                                {profile.total_ratings >
                                    0 &&
                                    profile.average_rating !==
                                        null && (
                                        <div
                                            className="
                                                absolute
                                                -top-2
                                                -right-2
                                                rounded-full
                                                bg-white
                                                border
                                                border-gray-200
                                                shadow
                                                flex
                                                items-center
                                                gap-0.5
                                                font-bold
                                                text-gray-900
                                                text-xs
                                                sm:text-sm
                                                px-2
                                                py-1
                                                whitespace-nowrap
                                            "
                                        >
                                            <span className="
                                                text-yellow-400
                                            ">
                                                ★
                                            </span>

                                            {Number(
                                                profile.average_rating
                                            ).toFixed(
                                                1
                                            )}
                                        </div>
                                    )}

                                {/* VERIFIED */}

                                {isVerified && (
                                    <div
                                        className="
                                            absolute
                                            bottom-0
                                            right-0
                                            w-6
                                            h-6
                                            sm:w-7
                                            sm:h-7
                                            rounded-full
                                            bg-green-500
                                            border-4
                                            border-white
                                            flex
                                            items-center
                                            justify-center
                                        "
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="3"
                                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M5 12l4 4L19 7"
                                            />
                                        </svg>
                                    </div>
                                )}

                            </div>

                            <div className="min-w-0">

                                <h3 className="
                                    truncate
                                    text-lg
                                    sm:text-xl
                                    font-bold
                                ">
                                    {profile.full_name}
                                </h3>

                                <p className="
                                    text-gray-500
                                ">
                                    Student
                                </p>

                                {profile.total_ratings >
                                    0 && (
                                    <p className="
                                        text-sm
                                        text-gray-600
                                        mt-1
                                        flex
                                        items-center
                                        gap-1
                                        flex-wrap
                                    ">
                                        <span className="
                                            text-yellow-400
                                        ">
                                            ★
                                        </span>

                                        <span className="
                                            font-semibold
                                        ">
                                            {Number(
                                                profile.average_rating
                                            ).toFixed(
                                                1
                                            )}
                                        </span>

                                        <span className="
                                            text-gray-400
                                        ">
                                            (
                                            {
                                                profile.total_ratings
                                            }{" "}
                                            review
                                            {profile.total_ratings ===
                                            1
                                                ? ""
                                                : "s"}
                                            )
                                        </span>
                                    </p>
                                )}

                                <span
                                    className={`
                                        inline-block
                                        mt-2
                                        px-3
                                        py-1
                                        rounded-full
                                        text-xs
                                        sm:text-sm
                                        ${
                                            isVerified
                                                ? "bg-green-100 text-green-700"
                                                : profile.verification_status ===
                                                  "Pending Verification"
                                                ? "bg-yellow-100 text-yellow-700"
                                                : "bg-red-100 text-red-700"
                                        }
                                    `}
                                >
                                    {profile.verification_status ||
                                        "Not Verified"}
                                </span>

                            </div>

                        </div>

                        {/* INFORMATION */}

                        <div className="px-4 pb-5 sm:px-6 sm:pb-6">

                            <div
                                className="
                                    grid
                                    grid-cols-1
                                    sm:grid-cols-2
                                    gap-3
                                    sm:gap-4
                                "
                            >

                                <div
                                    className="
                                        bg-slate-50
                                        rounded-xl
                                        p-4
                                    "
                                >
                                    <p className="
                                        text-sm
                                        text-gray-500
                                    ">
                                        University
                                    </p>

                                    <p className="
                                        font-semibold
                                        mt-1
                                        wrap-break-words
                                    ">
                                        {profile.university ||
                                            "Not provided"}
                                    </p>
                                </div>

                                <div
                                    className="
                                        bg-slate-50
                                        rounded-xl
                                        p-4
                                    "
                                >
                                    <p className="
                                        text-sm
                                        text-gray-500
                                    ">
                                        Department
                                    </p>

                                    <p className="
                                        font-semibold
                                        mt-1
                                        wrap-break-words
                                    ">
                                        {profile.department ||
                                            "Not provided"}
                                    </p>
                                </div>

                                <div
                                    className="
                                        bg-slate-50
                                        rounded-xl
                                        p-4
                                    "
                                >
                                    <p className="
                                        text-sm
                                        text-gray-500
                                    ">
                                        Level
                                    </p>

                                    <p className="
                                        font-semibold
                                        mt-1
                                        wrap-break-words
                                    ">
                                        {profile.level ||
                                            "Not provided"}
                                    </p>
                                </div>

                                <div
                                    className="
                                        bg-slate-50
                                        rounded-xl
                                        p-4
                                    "
                                >
                                    <p className="
                                        text-sm
                                        text-gray-500
                                    ">
                                        Verification
                                    </p>

                                    <div className="
                                        flex
                                        items-center
                                        gap-2
                                        mt-1
                                    ">

                                        {isVerified && (
                                            <div
                                                className="
                                                    w-5
                                                    h-5
                                                    rounded-full
                                                    bg-green-500
                                                    flex
                                                    items-center
                                                    justify-center
                                                    shrink-0
                                                "
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="white"
                                                    strokeWidth="3"
                                                    className="w-3 h-3"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M5 12l4 4L19 7"
                                                    />
                                                </svg>
                                            </div>
                                        )}

                                        <p
                                            className={`
                                                font-semibold
                                                wrap-break-words
                                                ${
                                                    isVerified
                                                        ? "text-green-600"
                                                        : "text-gray-600"
                                                }
                                            `}
                                        >
                                            {profile.verification_status ||
                                                "Not Verified"}
                                        </p>

                                    </div>
                                </div>

                                {/* SKILLS */}

                                <div
                                    className="
                                        sm:col-span-2
                                        bg-slate-50
                                        rounded-xl
                                        p-4
                                    "
                                >
                                    <p className="
                                        text-sm
                                        text-gray-500
                                    ">
                                        Skills
                                    </p>

                                    <p className="
                                        mt-1
                                        wrap-break-words
                                    ">
                                        {profile.skills ||
                                            "No skills provided"}
                                    </p>
                                </div>

                                {/* BIO */}

                                <div
                                    className="
                                        sm:col-span-2
                                        bg-slate-50
                                        rounded-xl
                                        p-4
                                    "
                                >
                                    <p className="
                                        text-sm
                                        text-gray-500
                                    ">
                                        Bio
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-gray-700
                                            whitespace-pre-wrap
                                            wrap-break-words
                                        "
                                    >
                                        {profile.bio ||
                                            "No bio provided"}
                                    </p>
                                </div>

                            </div>

                            {/* ================================================= */}
                            {/* REVIEW BUTTON */}
                            {/* ================================================= */}

                            <button
                                type="button"
                                onClick={() =>
                                    setShowReviews(
                                        true
                                    )
                                }
                                className="
                                    w-full
                                    mt-5
                                    border
                                    border-blue-200
                                    bg-blue-50
                                    text-blue-700
                                    px-5
                                    py-3
                                    rounded-xl
                                    font-semibold
                                    hover:bg-blue-100
                                    active:bg-blue-100
                                    transition
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                "
                            >
                                <span className="
                                    text-yellow-400
                                    text-lg
                                ">
                                    ★
                                </span>

                                Reviews & Ratings

                                <span>
                                    ({totalReviews})
                                </span>
                            </button>

                        </div>

                        {/* EXISTING REVIEWS PREVIEW */}

                        <div className="
                            px-4
                            pb-5
                            sm:px-6
                            sm:pb-6
                        ">

                            <h3 className="
                                text-base
                                sm:text-lg
                                font-bold
                                text-gray-900
                                mb-3
                            ">
                                Reviews
                            </h3>

                            {loadingReviews ? (

                                <p className="
                                    text-sm
                                    text-gray-500
                                ">
                                    Loading reviews...
                                </p>

                            ) : writtenReviews.length === 0 ? (

                                <div className="
                                    bg-slate-50
                                    rounded-xl
                                    p-6
                                    text-center
                                ">
                                    <p className="
                                        text-gray-500
                                        text-sm
                                    ">
                                        No reviews yet.
                                    </p>
                                </div>

                            ) : (

                                <div className="
                                    space-y-4
                                ">

                                    {writtenReviews
                                        .slice(0, 3)
                                        .map(
                                            (
                                                item
                                            ) => (

                                                <div
                                                    key={
                                                        item.id
                                                    }
                                                    className="
                                                        border
                                                        rounded-xl
                                                        p-4
                                                    "
                                                >

                                                    <div className="
                                                        flex
                                                        items-start
                                                        gap-3
                                                    ">

                                                        <div
                                                            className="
                                                                w-10
                                                                h-10
                                                                rounded-full
                                                                bg-gray-500
                                                                text-white
                                                                flex
                                                                items-center
                                                                justify-center
                                                                font-semibold
                                                                text-sm
                                                                shrink-0
                                                            "
                                                        >
                                                            {getInitials(
                                                                item.client_name
                                                            )}
                                                        </div>

                                                        <div className="
                                                            flex-1
                                                            min-w-0
                                                        ">

                                                            <div className="
                                                                flex
                                                                flex-wrap
                                                                items-center
                                                                justify-between
                                                                gap-1
                                                                sm:gap-3
                                                            ">

                                                                <p className="
                                                                    truncate
                                                                    font-semibold
                                                                    text-gray-900
                                                                ">
                                                                    {
                                                                        item.client_name
                                                                    }
                                                                </p>

                                                                <p className="
                                                                    text-xs
                                                                    text-gray-400
                                                                    shrink-0
                                                                ">
                                                                    {formatReviewDate(
                                                                        item.created_at
                                                                    )}
                                                                </p>

                                                            </div>

                                                            <div className="
                                                                flex
                                                                gap-0.5
                                                                mt-1
                                                            ">

                                                                {[
                                                                    1,
                                                                    2,
                                                                    3,
                                                                    4,
                                                                    5,
                                                                ].map(
                                                                    (
                                                                        star
                                                                    ) => (
                                                                        <span
                                                                            key={
                                                                                star
                                                                            }
                                                                            className={
                                                                                star <=
                                                                                item.rating
                                                                                    ? "text-yellow-400"
                                                                                    : "text-gray-300"
                                                                            }
                                                                        >
                                                                            ★
                                                                        </span>
                                                                    )
                                                                )}

                                                            </div>

                                                            {item.review && (
                                                                <p className="
                                                                    text-sm
                                                                    text-gray-700
                                                                    mt-2
                                                                    wrap-break-words
                                                                ">
                                                                    {
                                                                        item.review
                                                                    }
                                                                </p>
                                                            )}

                                                        </div>

                                                    </div>

                                                </div>

                                            )
                                        )}

                                    {writtenReviews.length >
                                        3 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowReviews(
                                                    true
                                                )
                                            }
                                            className="
                                                w-full
                                                text-blue-600
                                                font-semibold
                                                text-sm
                                                py-2
                                                hover:text-blue-800
                                                active:text-blue-800
                                            "
                                        >
                                            View all{" "}
                                            {
                                                writtenReviews.length
                                            }{" "}
                                            reviews →
                                        </button>
                                    )}

                                </div>

                            )}

                        </div>

                    </div>
                )}

                {/* ================================================= */}
                {/* FOOTER */}
                {/* ================================================= */}

                <div
                    className="
                        px-4
                        py-3
                        sm:px-6
                        sm:py-4
                        border-t
                        flex
                        justify-end
                        shrink-0
                        bg-white
                    "
                >
                    <button
                        onClick={onClose}
                        className="
                            w-full
                            sm:w-auto
                            bg-gray-900
                            text-white
                            px-6
                            py-2.5
                            rounded-xl
                            hover:bg-gray-800
                            active:bg-gray-800
                        "
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}