"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
    ClipboardList,
    Users,
    Wallet as WalletIcon,
    MessageSquare,
    CheckCircle2,
    FilePlus,
    ShieldCheck,
    GraduationCap,
    Zap,
    Activity,
    ChevronRight,
} from "lucide-react";

import Header from "./Header";
import Sidebar from "./Sidebar";
import PostTask from "./PostTask";
import MyTasks from "./MyTasks";
import MessagesPage from "./MessagesPage";
import ApplicationsPage from "./ApplicationsPage";
import Wallet from "./Wallet";
import ClientProfile from "./Profile";

type Task = {
    id: string;
    client_id: string;
    title: string;
    description: string;
    category: string;
    recommended_price: number | null;
    expected_day: number | null;
    expected_month: string | null;
    attachments: string[];
    status: string;
    task_type?: string;
    max_participants?: number;
    current_participants?: number;
    reward_per_participant?: number;
    duration_minutes?: number;
    created_at: string;
};

type RecentActivityItem = {
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    iconType: string;
    created_at: string;
};

type ApplicationActivityRow = {
    id: string;
    status: string;
    created_at: string;
    // Supabase infers a `!inner` join as an array of the related rows
    // (even though this query only ever produces one), so this has to
    // match that shape rather than a single object.
    tasks: {
        title: string;
        client_id: string;
    }[] | null;
};

type WalletTransactionRow = {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    created_at: string;
};

export default function ClientDashboard() {
    const router = useRouter();

    const [mounted, setMounted] = useState(false);

    // Owns the mobile drawer's open/closed state. Lifted up here so the
    // single hamburger button (in the black Header bar) and the Sidebar
    // drawer it controls stay in sync — matches the student dashboard's
    // single-header layout instead of Sidebar having its own toolbar.
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [name, setName] = useState("");

    const [profile, setProfile] = useState({
        bio: "",
    });

    const [files, setFiles] = useState<File[]>([]);
    const [activePage, setActivePage] = useState("dashboard");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [recommendedPrice, setRecommendedPrice] = useState("");
    const [expectedDay, setExpectedDay] = useState("");
    const [expectedMonth, setExpectedMonth] = useState("");

    const [tasks, setTasks] = useState<Task[]>([]);
    const [applicationCount, setApplicationCount] = useState(0);

    // Guards against duplicate task creation (e.g. accidental double-click
    // on "Post Task" / "Create Multi Task"). Set true immediately when a
    // create request starts, cleared in a `finally` once it settles.
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Recent Activity feed for the dashboard. Merged from
    // `applications` (on this client's tasks) and `wallet_transactions`
    // (payment releases). Adjust the mapping in getRecentActivity()
    // if your table/column names differ.
    const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

    const getProfile = useCallback(async () => {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) {
            router.replace("/auth");
            return;
        }

        const { data, error } =
            await supabase
                .from("profiles")
                .select("full_name, bio")
                .eq("id", userData.user.id)
                .single();

        if (error) {
            console.log("PROFILE ERROR:", error);
            return;
        }

        if (data) {
            setName(data.full_name || "");

            setProfile({
                bio: data.bio || "",
            });
        }
    }, [router]);

    async function saveProfile() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) {
            router.replace("/auth");
            return;
        }

        const { error } =
            await supabase
                .from("profiles")
                .update({
                    full_name: name,
                    bio: profile.bio,
                })
                .eq("id", userData.user.id);

        if (error) {
            console.log(
                "PROFILE SAVE ERROR:",
                error
            );

            alert(error.message);
            return;
        }

        alert("Profile Updated");

        await getProfile();
    }

    async function getTasks() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        const { data, error } =
            await supabase
                .from("tasks")
                .select("*")
                .eq(
                    "client_id",
                    userData.user.id
                )
                .order("created_at", {
                    ascending: false,
                });

        if (error) {
            console.log(error);
            return;
        }

        if (data) {
            setTasks(data);
        }
    }

    const getApplicationCount = useCallback(async () => {
        let total = 0;

        for (const task of tasks) {
            const { count } =
                await supabase
                    .from("applications")
                    .select("*", {
                        count: "exact",
                        head: true,
                    })
                    .eq(
                        "task_id",
                        task.id
                    )
                    .eq(
                        "status",
                        "pending"
                    );

            total += count || 0;
        }

        setApplicationCount(total);
    }, [tasks]);

    // ==========================================
    // GET RECENT ACTIVITY (dashboard feed)
    // ==========================================

    async function getRecentActivity() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        const userId = userData.user.id;

        // ------------------------------------------
        // Applications on this client's tasks —
        // covers both "new application" (pending) and
        // "application accepted" activity items.
        // ------------------------------------------

        const {
            data: applicationData,
            error: applicationError,
        } = await supabase
            .from("applications")
            .select("id, status, created_at, tasks!inner(title, client_id)")
            .eq("tasks.client_id", userId)
            .order("created_at", { ascending: false })
            .limit(5);

        let applicationItems: RecentActivityItem[] = [];

        if (applicationError) {
            console.log(
                "RECENT ACTIVITY (applications) ERROR:",
                applicationError
            );
        } else {
            applicationItems = (
                (applicationData as ApplicationActivityRow[]) || []
            ).map((app) => ({
                id: `app-${app.id}`,
                title:
                    app.status === "accepted"
                        ? "Application accepted"
                        : "New application received",
                subtitle: app.tasks?.[0]?.title
                    ? `for "${app.tasks[0].title}"`
                    : "",
                badge:
                    app.status === "accepted"
                        ? "Accepted"
                        : "New Application",
                badgeColor:
                    app.status === "accepted" ? "green" : "blue",
                iconType:
                    app.status === "accepted" ? "check" : "clipboard",
                created_at: app.created_at,
            }));
        }

        // ------------------------------------------
        // Payments released to students (from this
        // client's wallet transaction history).
        // ------------------------------------------

        const { data: walletData } = await supabase
            .from("wallets")
            .select("id")
            .eq("user_id", userId)
            .single();

        let paymentItems: RecentActivityItem[] = [];

        if (walletData) {
            const {
                data: transactionData,
                error: transactionError,
            } = await supabase
                .from("wallet_transactions")
                .select("id, amount, type, description, created_at")
                .eq("wallet_id", walletData.id)
                .eq("type", "release")
                .order("created_at", { ascending: false })
                .limit(5);

            if (transactionError) {
                console.log(
                    "RECENT ACTIVITY (payments) ERROR:",
                    transactionError
                );
            } else {
                paymentItems = (
                    (transactionData as WalletTransactionRow[]) || []
                ).map((t) => ({
                    id: `pay-${t.id}`,
                    title: "Payment released to student",
                    subtitle: t.description || "",
                    badge: "Payment",
                    badgeColor: "orange",
                    iconType: "wallet",
                    created_at: t.created_at,
                }));
            }
        }

        const merged = [...applicationItems, ...paymentItems]
            .sort(
                (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
            )
            .slice(0, 5);

        setRecentActivity(merged);
    }

    async function createTask() {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const { data: userData } =
                await supabase.auth.getUser();

            if (!userData.user) return;

            const uploadedUrls: string[] = [];

            for (const file of files) {
                const fileName =
                    `${Date.now()}-${file.name}`;

                const { error: uploadError } =
                    await supabase.storage
                        .from("task-files")
                        .upload(
                            fileName,
                            file
                        );

                if (uploadError) {
                    console.log(uploadError);
                    continue;
                }

                const { data: urlData } =
                    supabase.storage
                        .from("task-files")
                        .getPublicUrl(
                            fileName
                        );

                uploadedUrls.push(
                    urlData.publicUrl
                );
            }

            const { error } =
                await supabase
                    .from("tasks")
                    .insert({
                        client_id:
                            userData.user.id,

                        title,

                        description,

                        category,

                        recommended_price:
                            category === "Others"
                                ? null
                                : Number(
                                    recommendedPrice
                                ),

                        expected_day:
                            Number(expectedDay),

                        expected_month:
                            expectedMonth,

                        attachments:
                            uploadedUrls,

                        status: "open",
                    });

            if (error) {
                alert(error.message);
                return;
            }

            alert("Task created");

            setTitle("");
            setDescription("");
            setCategory("");
            setRecommendedPrice("");
            setExpectedDay("");
            setExpectedMonth("");
            setFiles([]);

            await getTasks();
            await getRecentActivity();

            setActivePage("mytasks");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function createMultiTask(data: {
        title: string;
        description: string;
        category: string;
        participants: string;
        rewardPerParticipant: string;
        durationMinutes: string;
        files: File[];
    }): Promise<boolean> {
        if (isSubmitting) return false;
        setIsSubmitting(true);

        try {
            const { data: userData } =
                await supabase.auth.getUser();

            if (!userData.user) return false;

            const participantCount = Number(data.participants);
            const reward = Number(data.rewardPerParticipant);
            const duration = Number(data.durationMinutes);

            if (
                !Number.isInteger(participantCount) ||
                participantCount < 1 ||
                participantCount > 10000 ||
                !Number.isFinite(reward) ||
                reward <= 0 ||
                !Number.isInteger(duration) ||
                duration < 1
            ) {
                alert(
                    "Please enter valid participants, amount, and duration."
                );
                return false;
            }

            const uploadedUrls: string[] = [];

            for (const file of data.files) {
                const fileName =
                    `${Date.now()}-${file.name}`;

                const { error: uploadError } =
                    await supabase.storage
                        .from("task-files")
                        .upload(
                            fileName,
                            file
                        );

                if (uploadError) {
                    console.log(uploadError);
                    continue;
                }

                const { data: urlData } =
                    supabase.storage
                        .from("task-files")
                        .getPublicUrl(
                            fileName
                        );

                uploadedUrls.push(
                    urlData.publicUrl
                );
            }

            const { error } =
                await supabase
                    .from("tasks")
                    .insert({
                        client_id: userData.user.id,
                        title: data.title.trim(),
                        description: data.description.trim(),
                        category: data.category,
                        recommended_price: null,
                        attachments: uploadedUrls,
                        status: "open",

                        task_type: "multi",
                        max_participants: participantCount,
                        current_participants: 0,
                        reward_per_participant: reward,
                        duration_minutes: duration,
                    });

            if (error) {
                alert(error.message);
                return false;
            }

            alert("Multi Task created");

            await getTasks();
            await getRecentActivity();

            setActivePage("mytasks");

            return true;
        } finally {
            setIsSubmitting(false);
        }
    }

    async function logout() {
        await supabase.auth.signOut();

        router.replace("/auth");
    }

    // ==========================================
    // RELATIVE TIME FORMAT ("2 minutes ago", etc.)
    // ==========================================

    function formatRelativeTime(dateString: string) {
        const now = new Date().getTime();
        const then = new Date(dateString).getTime();
        const diffSeconds = Math.max(
            0,
            Math.floor((now - then) / 1000)
        );

        if (diffSeconds < 60) return "Just now";

        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60)
            return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24)
            return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    }

    useEffect(() => {
        // Mount-flag pattern: setMounted(true) here is intentional (avoids
        // SSR/client render mismatch) rather than syncing external state,
        // so the set-state-in-effect rule's default advice doesn't apply.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);

        getProfile();
        getTasks();
        getRecentActivity();
    }, [getProfile]);

    useEffect(() => {
        if (tasks.length > 0) {
            // getApplicationCount only calls setApplicationCount after its
            // awaited Supabase calls resolve — the lint rule's static
            // analysis flags the call site here anyway since it can see
            // through the useCallback to the eventual setState.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            getApplicationCount();
        } else {
            setApplicationCount(0);
        }
    }, [tasks, getApplicationCount]);

    function renderContent() {
        switch (activePage) {
            case "profile":
                return (
                    <ClientProfile
                        name={name}
                        setName={setName}
                        profile={profile}
                        setProfile={setProfile}
                        saveProfile={saveProfile}
                    />
                );

            case "post":
                return (
                    <PostTask
                        files={files}
                        setFiles={setFiles}

                        title={title}
                        setTitle={setTitle}

                        description={description}
                        setDescription={
                            setDescription
                        }

                        category={category}
                        setCategory={setCategory}

                        recommendedPrice={
                            recommendedPrice
                        }
                        setRecommendedPrice={
                            setRecommendedPrice
                        }

                        expectedDay={
                            expectedDay
                        }
                        setExpectedDay={
                            setExpectedDay
                        }

                        expectedMonth={
                            expectedMonth
                        }
                        setExpectedMonth={
                            setExpectedMonth
                        }

                        createTask={createTask}
                        createMultiTask={createMultiTask}

                        isSubmitting={isSubmitting}
                    />
                );

            case "mytasks":
                return (
                    <MyTasks
                        tasks={tasks}
                    />
                );

            case "messages":
                return <MessagesPage />;

            case "wallet":
                return <Wallet />;

            case "requests":
                return (
                    <ApplicationsPage
                        goToWallet={() => setActivePage("wallet")}
                        goToMyTasks={() => setActivePage("mytasks")}
                    />
                );

            default:
                return (
                    <>

                        {/* HEADER */}

                        <div>

                            <h1 className="text-3xl font-bold">
                                Welcome back,{" "}
                                {name} 👋
                            </h1>

                            <p className="mt-2 text-gray-500">
                                Here&apos;s what&apos;s happening with your tasks today.
                            </p>

                        </div>


                        {/* STAT CARDS */}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">

                            {/* TASKS */}

                            <div
                                onClick={() => setActivePage("mytasks")}
                                className="relative overflow-hidden bg-white rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition"
                            >

                                <div className="flex items-center justify-between">

                                    <div className="flex items-center gap-4">

                                        <div className="w-14 h-14 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <ClipboardList className="w-6 h-6" />
                                        </div>

                                        <div>
                                            <h2 className="text-3xl font-bold text-blue-600">
                                                {tasks.length}
                                            </h2>
                                            <p className="font-semibold text-gray-900">Tasks</p>
                                   
                                        </div>

                                    </div>

                                    <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>

                                </div>

                                <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
                            </div>


                            {/* OPEN APPLICATIONS */}

                            <div
                                onClick={() => setActivePage("requests")}
                                className="relative overflow-hidden bg-white rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition"
                            >

                                <div className="flex items-center justify-between">

                                    <div className="flex items-center gap-4">

                                        <div className="w-14 h-14 shrink-0 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                            <Users className="w-6 h-6" />
                                        </div>

                                        <div>
                                            <h2 className="text-3xl font-bold text-green-600">
                                                {applicationCount}
                                            </h2>
                                            <p className="font-semibold text-gray-900">Open Applications</p>
                                            
                                        </div>

                                    </div>

                                    <div className="w-9 h-9 shrink-0 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>

                                </div>

                                <span className="absolute bottom-0 left-0 right-0 h-1 bg-green-500" />
                            </div>

                        </div>


                        {/* RECENT ACTIVITY + QUICK ACTIONS */}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

                            {/* RECENT ACTIVITY */}

                            <div className="bg-white border rounded-2xl p-6">

                                <div className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-blue-500" />
                                    <h3 className="text-lg font-bold text-gray-900">
                                        Recent Activity
                                    </h3>
                                </div>

                                {recentActivity.length === 0 ? (

                                    <div className="mt-6 border border-dashed rounded-xl p-8 text-center">
                                        <p className="text-gray-500">No recent activity yet.</p>
                                    </div>

                                ) : (

                                    <div className="mt-3 divide-y">

                                        {recentActivity.map((item) => {

                                            const badgeClasses: Record<string, string> = {
                                                blue: "bg-blue-50 text-blue-600",
                                                green: "bg-green-50 text-green-600",
                                                purple: "bg-purple-50 text-purple-600",
                                                orange: "bg-orange-50 text-orange-600",
                                            };

                                            const iconWrapClasses: Record<string, string> = {
                                                clipboard: "bg-blue-50 text-blue-600",
                                                check: "bg-green-50 text-green-600",
                                                message: "bg-purple-50 text-purple-600",
                                                wallet: "bg-orange-50 text-orange-500",
                                            };

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between gap-4 py-4"
                                                >

                                                    <div className="flex items-center gap-3">

                                                        <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${iconWrapClasses[item.iconType] || "bg-gray-100 text-gray-500"}`}>
                                                            {item.iconType === "check" ? (
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            ) : item.iconType === "message" ? (
                                                                <MessageSquare className="w-4 h-4" />
                                                            ) : item.iconType === "wallet" ? (
                                                                <WalletIcon className="w-4 h-4" />
                                                            ) : (
                                                                <ClipboardList className="w-4 h-4" />
                                                            )}
                                                        </div>

                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {item.title}{" "}
                                                                {item.subtitle && (
                                                                    <span className="font-normal text-gray-500">
                                                                        {item.subtitle}
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-sm text-gray-500 mt-0.5">
                                                                {formatRelativeTime(item.created_at)}
                                                            </p>
                                                        </div>

                                                    </div>

                                                    <span className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1 ${badgeClasses[item.badgeColor] || "bg-gray-100 text-gray-600"}`}>
                                                        {item.badge}
                                                    </span>

                                                </div>
                                            );
                                        })}

                                    </div>

                                )}

                            </div>


                            {/* QUICK ACTIONS */}

                            <div className="bg-white border rounded-2xl p-6">

                                <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                    <h3 className="text-lg font-bold text-gray-900">
                                        Quick Actions
                                    </h3>
                                </div>

                                <div className="mt-4 space-y-3">

                                    <button
                                        onClick={() => setActivePage("post")}
                                        className="w-full flex items-center gap-3 text-left border rounded-xl p-3 hover:bg-gray-50 transition"
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <FilePlus className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">Post a New Task</p>
                                            <p className="text-sm text-gray-500">Get help from students</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    </button>

                                    <button
                                        onClick={() => setActivePage("mytasks")}
                                        className="w-full flex items-center gap-3 text-left border rounded-xl p-3 hover:bg-gray-50 transition"
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                                            <ClipboardList className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">Manage My Tasks</p>
                                            <p className="text-sm text-gray-500">View and track your tasks</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    </button>

                                    <button
                                        onClick={() => setActivePage("requests")}
                                        className="w-full flex items-center gap-3 text-left border rounded-xl p-3 hover:bg-gray-50 transition"
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">View Applications</p>
                                            <p className="text-sm text-gray-500">Review student applications</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    </button>

                                    <button
                                        onClick={() => setActivePage("wallet")}
                                        className="w-full flex items-center gap-3 text-left border rounded-xl p-3 hover:bg-gray-50 transition"
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                            <WalletIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">Wallet</p>
                                            <p className="text-sm text-gray-500">Manage your payments</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    </button>

                                </div>

                            </div>

                        </div>


                        {/* TRUST BANNER */}

                        <div className="bg-linear-to-r from-blue-50 to-indigo-50 border rounded-2xl p-6 mt-6 flex items-center gap-4">

                            <div className="w-11 h-11 shrink-0 rounded-full bg-white text-blue-600 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6" />
                            </div>

                            <div className="flex-1">
                                <p className="font-bold text-gray-900">
                                    Secure. Reliable. Student Powered.
                                </p>
                                <p className="text-sm text-gray-600 mt-0.5">
                                    Your tasks are safe with UniSeV.
                                </p>
                            </div>

                            <GraduationCap className="w-10 h-10 text-blue-300 hidden sm:block" />

                        </div>

                    </>
                );
        }
    }

    if (!mounted) {
        return null;
    }

    return (
        <main className="min-h-screen bg-slate-50">

            <Header
                name={name}
                onMenuClick={() => setSidebarOpen(true)}
            />

            <div className="flex flex-1 h-[calc(100vh-5rem)] overflow-hidden">

                <Sidebar
                    activePage={
                        activePage
                    }
                    setActivePage={
                        setActivePage
                    }
                    name={name}
                    logout={logout}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <section className="flex-1 p-10 h-full overflow-y-auto">

                    {renderContent()}

                </section>

            </div>

        </main>
    );
}