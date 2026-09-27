"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface HeaderProps {
    name: string;
    verificationStatus: string;
    // Opens the mobile nav drawer, which is owned by Sidebar/the parent
    // page. Keeping the button here (inside the header) instead of a
    // separately-positioned floating button keeps it visually consistent
    // with the rest of the dark header bar.
    onMenuClick: () => void;
}

interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    task_id: string | null;
    application_id: string | null;
    is_read: boolean;
    created_at: string;
}

export default function Header({
    name,
    verificationStatus,
    onMenuClick,
}: HeaderProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    // =========================================================
    // LOAD NOTIFICATIONS
    // =========================================================

    async function loadNotifications() {
        setLoadingNotifications(true);

        const { data: userData, error: userError } =
            await supabase.auth.getUser();

        if (userError || !userData.user) {
            setLoadingNotifications(false);
            return;
        }

        const { data, error } = await supabase
            .from("notifications")
            .select(`
                id,
                user_id,
                type,
                title,
                message,
                task_id,
                application_id,
                is_read,
                created_at
            `)
            .eq("user_id", userData.user.id)
            .order("created_at", {
                ascending: false,
            })
            .limit(20);

        if (error) {
            console.log("NOTIFICATIONS ERROR:", error);
            setLoadingNotifications(false);
            return;
        }

        setNotifications(data || []);
        setLoadingNotifications(false);
    }

    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadNotifications();
    }, []);

       // =========================================================
    // REALTIME NOTIFICATIONS
    // =========================================================

    useEffect(() => {
        let channel: RealtimeChannel | null = null;
        let cancelled = false;

        async function setupRealtime() {
            const { data: userData, error: userError } =
                await supabase.auth.getUser();

            if (userError || !userData.user || cancelled) {
                return;
            }

            const userId = userData.user.id;

            // IMPORTANT:
            // Register the postgres_changes listener BEFORE subscribe()
            const newChannel = supabase
                .channel(
                    `student-notifications-${userId}`
                )
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "notifications",
                        filter: `user_id=eq.${userId}`,
                    },
                    (payload) => {
                        console.log(
                            "NEW NOTIFICATION:",
                            payload
                        );

                        const newNotification =
                            payload.new as Notification;

                        setNotifications((previous) => {
                            // Prevent duplicate notifications
                            // if the same notification is received twice.
                            const alreadyExists =
                                previous.some(
                                    (notification) =>
                                        notification.id ===
                                        newNotification.id
                                );

                            if (alreadyExists) {
                                return previous;
                            }

                            return [
                                newNotification,
                                ...previous,
                            ].slice(0, 20);
                        });
                    }
                );

            if (cancelled) {
                supabase.removeChannel(newChannel);
                return;
            }

            channel = newChannel;

            // Subscribe AFTER .on(...)
            channel.subscribe((status: string) => {
                console.log(
                    "NOTIFICATION REALTIME STATUS:",
                    status
                );
            });
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
    // MARK ONE AS READ
    // =========================================================

    async function markAsRead(
        notificationId: string
    ) {
        const { error } = await supabase
            .from("notifications")
            .update({
                is_read: true,
            })
            .eq("id", notificationId);

        if (error) {
            console.log(
                "MARK NOTIFICATION READ ERROR:",
                error
            );
            return;
        }

        setNotifications((previous) =>
            previous.map((notification) =>
                notification.id === notificationId
                    ? {
                          ...notification,
                          is_read: true,
                      }
                    : notification
            )
        );
    }

    // =========================================================
    // MARK ALL AS READ
    // =========================================================

    async function markAllAsRead() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        const { error } = await supabase
            .from("notifications")
            .update({
                is_read: true,
            })
            .eq("user_id", userData.user.id)
            .eq("is_read", false);

        if (error) {
            console.log(
                "MARK ALL READ ERROR:",
                error
            );
            return;
        }

        setNotifications((previous) =>
            previous.map((notification) => ({
                ...notification,
                is_read: true,
            }))
        );
    }

    // =========================================================
    // FORMAT TIME
    // =========================================================

    function formatNotificationTime(
        dateString: string
    ) {
        const date = new Date(dateString);
        const now = new Date();

        const difference = Math.floor(
            (now.getTime() - date.getTime()) / 1000
        );

        if (difference < 60) {
            return "Just now";
        }

        if (difference < 3600) {
            return `${Math.floor(
                difference / 60
            )}m ago`;
        }

        if (difference < 86400) {
            return `${Math.floor(
                difference / 3600
            )}h ago`;
        }

        if (difference < 604800) {
            return `${Math.floor(
                difference / 86400
            )}d ago`;
        }

        return date.toLocaleDateString();
    }

    // =========================================================
    // UNREAD COUNT
    // =========================================================

    const unreadCount = notifications.filter(
        (notification) => !notification.is_read
    ).length;

    // =========================================================
    // HEADER
    // =========================================================

    return (
       <header className="h-16 sm:h-20 bg-black border-b border-gray-800 px-4 sm:px-6 md:px-8 flex justify-between items-center">

            {/* ================================================= */}
            {/* LEFT: MOBILE MENU BUTTON + LOGO */}
            {/* ================================================= */}

            <div className="flex items-center gap-2 sm:gap-3">

                {/* MOBILE MENU TOGGLE — opens the Sidebar drawer.
                    Only shown below lg, laid out inline with the logo
                    so it sits naturally inside the dark header bar
                    instead of floating separately on top of it. */}
                <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                    className="
                        lg:hidden
                        -ml-1
                        w-9
                        h-9
                        sm:w-10
                        sm:h-10
                        shrink-0
                        rounded-full
                        flex
                        items-center
                        justify-center
                        text-white
                        hover:bg-gray-800
                        transition
                    "
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="white"
                        className="w-5 h-5 sm:w-6 sm:h-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                        />
                    </svg>
                </button>

                <Image
                    src="/unisev-logo.png"
                    alt="UniSeV"
                    width={180}
                    height={64}
                    className="h-10 w-28 sm:h-16 sm:w-45 object-contain"
                />
            </div>

            {/* ================================================= */}
            {/* RIGHT SIDE */}
            {/* ================================================= */}

            <div className="flex items-center gap-2 sm:gap-5">

                {/* ================================================= */}
                {/* NOTIFICATION */}
                {/* ================================================= */}

                <div className="relative">

                    <button
                        type="button"
                        onClick={() =>
                            setShowNotifications(
                                (previous) => !previous
                            )
                        }
                        className="
                            relative
                            w-9
                            h-9
                            sm:w-11
                            sm:h-11
                            rounded-full
                            flex
                            items-center
                            justify-center
                            hover:bg-gray-800
                            transition
                        "
                        title="Notifications"
                    >
                        {/* Bell icon */}

                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.8"
                            stroke="currentColor"
                           className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 0 0-12 0v.75c0 2.516-.26 3.97-1.5 5.022a23.848 23.848 0 0 0 5.454 1.31m4.903 0a23.848 23.848 0 0 1-4.903 0m4.903 0a23.848 23.848 0 1 1-4.903 0M12 21a3.375 3.375 0 0 0 3.375-3.375h-6.75A3.375 3.375 0 0 0 12 21Z"
                            />
                        </svg>

                        {/* Unread number */}

                        {unreadCount > 0 && (
                            <span className="
                                absolute
                                -top-1
                                -right-1
                                min-w-4
                                h-4
                                px-1
                                rounded-full
                                bg-red-500
                                text-white
                                text-[10px]
                                sm:min-w-5
                                sm:h-5
                                sm:text-xs
                                font-bold
                                flex
                                items-center
                                justify-center
                                border-2
                                border-white
                            ">
                                {unreadCount > 9
                                    ? "9+"
                                    : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* ================================================= */}
                    {/* NOTIFICATION DROPDOWN */}
                    {/* ================================================= */}
                    {/*
                        Mobile: fixed panel pinned near the top with side
                        margins, so it can never run off-screen regardless
                        of viewport width.
                        sm and up: reverts to the original anchored
                        dropdown under the bell icon.
                    */}

                    {showNotifications && (
                        <div className="
                            fixed
                            inset-x-3
                            top-17
                            z-50
                            max-h-[75vh]
                            overflow-hidden
                            bg-white
                            border
                            border-gray-200
                            rounded-2xl
                            shadow-2xl
                            sm:absolute
                            sm:inset-x-auto
                            sm:right-0
                            sm:top-14
                            sm:w-96
                            sm:max-h-none
                        ">

                            {/* Dropdown header */}

                            <div className="
                                px-5
                                py-4
                                border-b
                                flex
                                items-center
                                justify-between
                            ">

                                <div>
                                    <h2 className="
                                        font-bold
                                        text-gray-900
                                    ">
                                        Notifications
                                    </h2>

                                    {unreadCount > 0 && (
                                        <p className="
                                            text-xs
                                            text-gray-500
                                            mt-1
                                        ">
                                            {unreadCount} unread
                                        </p>
                                    )}
                                </div>

                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={markAllAsRead}
                                        className="
                                            text-xs
                                            text-blue-600
                                            font-semibold
                                            hover:text-blue-800
                                        "
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            {/* Notification list */}

                            <div className="
                                max-h-[60vh]
                                sm:max-h-96
                                overflow-y-auto
                            ">

                                {loadingNotifications ? (

                                    <div className="
                                        px-5
                                        py-10
                                        text-center
                                        text-gray-500
                                        text-sm
                                    ">
                                        Loading notifications...
                                    </div>

                                ) : notifications.length === 0 ? (

                                    <div className="
                                        px-5
                                        py-10
                                        text-center
                                    ">
                                        <div className="text-4xl mb-3">
                                            🔔
                                        </div>

                                        <p className="
                                            font-semibold
                                            text-gray-700
                                        ">
                                            No notifications
                                        </p>

                                        <p className="
                                            text-sm
                                            text-gray-500
                                            mt-1
                                        ">
                                            You&apos;re all caught up.
                                        </p>
                                    </div>

                                ) : (

                                    notifications.map(
                                        (notification) => (
                                            <button
                                                type="button"
                                                key={
                                                    notification.id
                                                }
                                                onClick={() =>
                                                    markAsRead(
                                                        notification.id
                                                    )
                                                }
                                                className={`
                                                    w-full
                                                    text-left
                                                    px-5
                                                    py-4
                                                    border-b
                                                    hover:bg-gray-50
                                                    transition
                                                    ${
                                                        notification.is_read
                                                            ? "bg-white"
                                                            : "bg-blue-50"
                                                    }
                                                `}
                                            >

                                                <div className="
                                                    flex
                                                    gap-3
                                                ">

                                                    {/* Unread dot */}

                                                    <div className="pt-1.5">

                                                        <div
                                                            className={`
                                                                w-2.5
                                                                h-2.5
                                                                rounded-full
                                                                ${
                                                                    notification.is_read
                                                                        ? "bg-gray-300"
                                                                        : "bg-blue-500"
                                                                }
                                                            `}
                                                        />

                                                    </div>

                                                    {/* Notification content */}

                                                    <div className="flex-1 min-w-0">

                                                        <div className="
                                                            flex
                                                            justify-between
                                                            gap-3
                                                        ">

                                                            <p className="
                                                                font-semibold
                                                                text-sm
                                                                text-gray-900
                                                            ">
                                                                {
                                                                    notification.title
                                                                }
                                                            </p>

                                                            <span className="
                                                                text-[11px]
                                                                text-gray-400
                                                                whitespace-nowrap
                                                            ">
                                                                {
                                                                    formatNotificationTime(
                                                                        notification.created_at
                                                                    )
                                                                }
                                                            </span>

                                                        </div>

                                                        <p className="
                                                            text-sm
                                                            text-gray-600
                                                            mt-1
                                                            leading-5
                                                            wrap-break-words
                                                        ">
                                                            {
                                                                notification.message
                                                            }
                                                        </p>

                                                    </div>

                                                </div>

                                            </button>
                                        )
                                    )
                                )}

                            </div>
                        </div>
                    )}
                </div>

                {/* ================================================= */}
                {/* AVATAR */}
                {/* ================================================= */}

                <div className="relative">

                    <div className="
                        w-9
                        h-9
                        sm:w-10
                        sm:h-10
                        rounded-full
                        bg-blue-600
                        text-white
                        flex
                        items-center
                        justify-center
                        font-bold
                        text-sm
                        sm:text-base
                    ">
                        {name
                            .split(" ")
                            .map(
                                (word) => word[0]
                            )
                            .join("")
                            .toUpperCase()}
                    </div>

                    {/* Verification tick */}

                    {verificationStatus === "Verified" && (
                        <div className="
                            absolute
                            -bottom-1
                            -right-1
                            w-4
                            h-4
                            rounded-full
                            bg-green-500
                            border-2
                            border-white
                            flex
                            items-center
                            justify-center
                        ">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                                className="w-2.5 h-2.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                    )}

                </div>

            </div>

        </header>
    );
}