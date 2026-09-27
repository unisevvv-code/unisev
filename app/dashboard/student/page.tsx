"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
    ShieldCheck,
    ClipboardCheck,
    Wallet as WalletIcon,
    CheckCircle2,
    Star,
    Search,
    MessageSquare,
    ChevronRight,
    Clock,
    BarChart3,
    Trophy,
} from "lucide-react";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import BrowseTasks from "./components/BrowseTasks";
import MyTasks from "./components/MyTasks";
import Profile from "./components/Profile";
import MessagesPage from "./components/MessagesPage";
import Wallet from "./components/Wallet";
import StudentProfilePreview from "./components/StudentProfilePreview";

// ==========================================
// TYPES
// ==========================================

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    budget?: number;
    deadline?: string;
    created_at?: string;
    [key: string]: unknown;
}

interface Application {
    id: string;
    status: string;
    student_id: string;
    task_id: string;
    asking_price?: number | null;
    created_at: string;
    tasks?: Task;
    [key: string]: unknown;
}

interface ActivityItem {
    id: string;
    title: string;
    subtitle: string;
    amount: number;
    positive: boolean;
    status: string;
    created_at: string;
}

interface WalletTransactionRow {
    id: string;
    amount: number;
    type: string;
    status: string;
    description: string | null;
    created_at: string;
}

interface EscrowPaymentRow {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    tasks?: { title: string };
}


export default function StudentDashboard() {
    const router = useRouter();

    const [verificationFile, setVerificationFile] =
        useState<File | null>(null);

    const [askingPrices, setAskingPrices] =
        useState<Record<string, string>>({});

    const [name, setName] = useState("Student");

    const [currentUserId, setCurrentUserId] =
        useState("");

    const [activePage, setActivePage] =
        useState("dashboard");

    // Shared mobile nav state: the hamburger button lives in the
    // (dark) Header, but the drawer it opens is rendered by Sidebar.
    // Lifting the state here keeps both in sync.
    const [mobileNavOpen, setMobileNavOpen] =
        useState(false);

    const [profile, setProfile] = useState({
        phone: "",
        university: "",
        department: "",
        level: "",
        student_id: "",
        bio: "",
        skills: "",
        verification_status: "Not Verified",
        verification_document: "",
    });

    const [myTasks, setMyTasks] =
        useState<Application[]>([]);

    const [tasks, setTasks] =
        useState<Task[]>([]);

    // ==========================================
    // STUDENT DASHBOARD STATISTICS
    // ==========================================

    const [activeTaskCount, setActiveTaskCount] =
        useState(0);

    const [completedTaskCount, setCompletedTaskCount] =
        useState(0);

    const [rating, setRating] =
        useState(0);

    const [walletBalance, setWalletBalance] =
        useState(0);

    // Popup showing the student's own Reviews & Ratings screen,
    // opened directly from the Rating stat card.
    const [showRatingsPopup, setShowRatingsPopup] =
        useState(false);

    // Recent Activity feed shown on the dashboard. Merged from
    // wallet_transactions (releases/withdrawals/deposits) and
    // pending escrow_payments ("Escrow funded" entries). Adjust
    // the mapping in getRecentActivity() if your table/column
    // names differ.
    const [recentActivity, setRecentActivity] =
        useState<ActivityItem[]>([]);

    // ==========================================
    // INITIAL LOAD
    // ==========================================

    useEffect(() => {
        getProfile();
        getProfileDetails();
        getTasks();
        getMyTasks();
        getStudentStats();
        getWalletBalance();
        getRecentActivity();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refetch open tasks whenever the Browse Tasks tab is opened, so a
    // task that just got assigned to someone else disappears without
    // needing a full page reload.
    useEffect(() => {
        if (activePage === "browse") {
            getTasks();
        }
    }, [activePage]);

    // ==========================================
    // GET PROFILE
    // ==========================================

    async function getProfile() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) {
            router.replace("/auth");
            return;
        }

        setCurrentUserId(userData.user.id);

        const { data } =
            await supabase
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    userData.user.id
                )
                .single();

        if (data) {
            setName(
                data.full_name ||
                "Student"
            );

            setProfile({
                phone: data.phone || "",
                university:
                    data.university || "",
                department:
                    data.department || "",
                level:
                    data.level || "",
                student_id:
                    data.student_id || "",
                bio:
                    data.bio || "",
                skills:
                    data.skills || "",
                verification_status:
                    data.verification_status ||
                    "Not Verified",
                verification_document:
                    data.verification_document ||
                    "",
            });
        }
    }

    // ==========================================
    // GET PROFILE DETAILS
    // ==========================================

    async function getProfileDetails() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        const { data, error } =
            await supabase
                .from("profiles")
                .select(`
                    phone,
                    university,
                    department,
                    level,
                    student_id,
                    bio,
                    verification_status,
                    verification_document
                `)
                .eq(
                    "id",
                    userData.user.id
                )
                .single();

        if (error) {
            console.log(error);
            return;
        }

        if (data) {
            setProfile((previous) => ({
                phone:
                    data.phone || "",
                university:
                    data.university || "",
                department:
                    data.department || "",
                level:
                    data.level || "",
                student_id:
                    data.student_id || "",
                bio:
                    data.bio || "",
                skills:
                    previous.skills,
                verification_status:
                    data.verification_status ||
                    "Not Verified",
                verification_document:
                    data.verification_document ||
                    "",
            }));
        }
    }

    // ==========================================
    // SAVE PROFILE
    // ==========================================

    async function saveProfile() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        let verificationDocument = "";

        console.log(
            "AUTH USER ID:",
            userData.user.id
        );

        console.log(
            "VERIFICATION USER ID:",
            userData.user.id
        );

        console.log(
            "VERIFICATION DOCUMENT:",
            verificationDocument
        );

        if (verificationFile) {
            const fileName =
                `${Date.now()}-${verificationFile.name}`;

            const { error: uploadError } =
                await supabase.storage
                    .from(
                        "verification_documents"
                    )
                    .upload(
                        fileName,
                        verificationFile
                    );

            if (uploadError) {
                console.log(
                    uploadError
                );

                alert(
                    uploadError.message
                );

                return;
            }

            const {
                data: publicUrl,
            } =
                supabase.storage
                    .from(
                        "verification_documents"
                    )
                    .getPublicUrl(
                        fileName
                    );

            verificationDocument =
                publicUrl.publicUrl;

            console.log(
                "Verification URL:",
                verificationDocument
            );
        }

        const { error } =
            await supabase
                .from("profiles")
                .update({
                    phone:
                        profile.phone,

                    university:
                        profile.university,

                    department:
                        profile.department,

                    level:
                        profile.level,

                    student_id:
                        profile.student_id,

                    bio:
                        profile.bio,

                    verification_document:
                        verificationDocument,

                    verification_status:
                        verificationFile
                            ? "Pending Verification"
                            : profile.verification_status,

                    verification_submitted_at:
                        verificationFile
                            ? new Date()
                            : null,
                })
                .eq(
                    "id",
                    userData.user.id
                );

        if (error) {
            alert(error.message);
            return;
        }

        if (verificationFile) {
            const verificationData = {
                user_id:
                    userData.user.id,

                school_name:
                    profile.university,

                document_url:
                    verificationDocument,

                status:
                    "Pending",
            };

            console.log(
                "Inserting:",
                verificationData
            );

            const {
                data,
                error: verificationError,
            } =
                await supabase
                    .from(
                        "student_verifications"
                    )
                    .insert(
                        verificationData
                    )
                    .select();

            console.log(
                "Returned data:",
                data
            );

            console.log(
                "Insert error:",
                verificationError
            );

            if (verificationError) {
                alert(
                    verificationError.message
                );

                return;
            }
        }

        setProfile({
            ...profile,

            verification_document:
                verificationDocument,

            verification_status:
                verificationFile
                    ? "Pending Verification"
                    : profile.verification_status,
        });

        alert(
            "Profile Updated"
        );
    }

    // ==========================================
    // GET OPEN TASKS
    // ==========================================

    async function getTasks() {
        const { data, error } =
            await supabase
                .from("tasks")
                .select("*")
                .eq(
                    "status",
                    "open"
                )
                .order(
                    "created_at",
                    {
                        ascending: false,
                    }
                );

        if (error) {
            console.log(error);
            return;
        }

        setTasks((data as Task[]) || []);
    }

    // ==========================================
    // GET MY APPLICATIONS / TASKS
    // ==========================================

    async function getMyTasks() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        const {
            data,
            error,
        } =
            await supabase
                .from("applications")
                .select(`
                    *,
                    tasks(*)
                `)
                .eq(
                    "student_id",
                    userData.user.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false,
                    }
                );

        console.log(
            "MY TASKS:",
            data
        );

        if (error) {
            console.log(error);
            return;
        }

        setMyTasks((data as unknown as Application[]) || []);
    }

    // ==========================================
    // GET STUDENT STATISTICS
    // ==========================================

    async function getStudentStats() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        // ------------------------------------------
        // GET STUDENT'S TASKS
        // ------------------------------------------

        const {
            data: applications,
            error: applicationsError,
        } =
            await supabase
                .from("applications")
                .select(`
                    status,
                    tasks (
                        status
                    )
                `)
                .eq(
                    "student_id",
                    userData.user.id
                );

        if (applicationsError) {
            console.log(
                "STUDENT STATS ERROR:",
                applicationsError
            );

            return;
        }

        let active = 0;
        let completed = 0;

        (applications as unknown as Application[] | null)?.forEach(
            (application) => {

                const taskStatus =
                    application.tasks?.status;

                // Task currently assigned
                if (
                    taskStatus ===
                    "assigned"
                ) {
                    active++;
                }

                // Task completed
                if (
                    taskStatus ===
                    "completed"
                ) {
                    completed++;
                }
            }
        );

        setActiveTaskCount(active);

        setCompletedTaskCount(
            completed
        );

        // ------------------------------------------
        // GET STUDENT RATINGS
        // ------------------------------------------

        const {
            data: ratings,
            error: ratingError,
        } =
            await supabase
                .from(
                    "student_ratings"
                )
                .select(
                    "rating"
                )
                .eq(
                    "student_id",
                    userData.user.id
                );

        if (ratingError) {
            console.log(
                "RATING ERROR:",
                ratingError
            );

            return;
        }

        if (
            ratings &&
            ratings.length > 0
        ) {
            const total =
                ratings.reduce(
                    (
                        sum: number,
                        item: { rating: number }
                    ) =>
                        sum +
                        item.rating,
                    0
                );

            const average =
                total /
                ratings.length;

            setRating(
                Number(
                    average.toFixed(1)
                )
            );
        } else {
            setRating(0);
        }
    }

    // ==========================================
    // GET WALLET BALANCE
    // ==========================================

    async function getWalletBalance() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        const { data, error } =
            await supabase
                .from("wallets")
                .select("balance")
                .eq(
                    "user_id",
                    userData.user.id
                )
                .single();

        if (error) {
            console.log(
                "WALLET BALANCE ERROR:",
                error
            );

            return;
        }

        setWalletBalance(
            Number(data?.balance || 0)
        );
    }

    // ==========================================
    // GET RECENT ACTIVITY (dashboard feed)
    //
    // Merges wallet_transactions (release / withdrawal / deposit)
    // with pending escrow_payments ("Escrow funded"), sorted by
    // date, capped at 5. This mirrors what the Wallet page reads,
    // so the two stay consistent. If escrow_payments doesn't have
    // a tasks(title) relation in your schema, drop that select
    // and the subtitle will just fall back to empty.
    // ==========================================

    async function getRecentActivity() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        const userId = userData.user.id;

        const { data: walletData } =
            await supabase
                .from("wallets")
                .select("id")
                .eq("user_id", userId)
                .single();

        let transactionItems: ActivityItem[] = [];

        if (walletData) {
            const {
                data: transactionData,
                error: transactionError,
            } = await supabase
                .from("wallet_transactions")
                .select(
                    "id, amount, type, status, description, created_at"
                )
                .eq("wallet_id", walletData.id)
                .order("created_at", { ascending: false })
                .limit(5);

            if (transactionError) {
                console.log(
                    "RECENT ACTIVITY (transactions) ERROR:",
                    transactionError
                );
            } else {
                transactionItems = (
                    (transactionData as unknown as WalletTransactionRow[]) || []
                ).map(
                    (transaction) => ({
                        id: `txn-${transaction.id}`,
                        title:
                            transaction.type === "release"
                                ? "Payment released"
                                : transaction.type === "withdrawal"
                                ? "Withdrawal"
                                : transaction.type === "deposit"
                                ? "Deposit"
                                : transaction.type,
                        subtitle: transaction.description || "",
                        amount: Number(transaction.amount),
                        positive:
                            transaction.type === "release" ||
                            transaction.type === "deposit",
                        status: transaction.status,
                        created_at: transaction.created_at,
                    })
                );
            }
        }

        const { data: escrowData, error: escrowError } =
            await supabase
                .from("escrow_payments")
                .select("id, amount, status, created_at, tasks(title)")
                .eq("student_id", userId)
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(5);

        let escrowItems: ActivityItem[] = [];

        if (escrowError) {
            console.log(
                "RECENT ACTIVITY (escrow) ERROR:",
                escrowError
            );
        } else {
            escrowItems = (
                (escrowData as unknown as EscrowPaymentRow[]) || []
            ).map((escrow) => ({
                id: `escrow-${escrow.id}`,
                title: "Escrow funded",
                subtitle: escrow.tasks?.title || "",
                amount: Number(escrow.amount) * 0.85,
                positive: true,
                status: "pending",
                created_at: escrow.created_at,
            }));
        }

        const merged = [...transactionItems, ...escrowItems]
            .sort(
                (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
            )
            .slice(0, 5);

        setRecentActivity(merged);
    }

    // ==========================================
    // APPLY FOR TASK
    // ==========================================

    async function applyTask(
        taskId: string,
        askingPrice?: string
    ) {
        console.log("APPLY CALLED WITH:", taskId, askingPrice);

        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        const { error } =
            await supabase
                .from(
                    "applications"
                )
                .insert({
                    task_id:
                        taskId,

                    student_id:
                        userData.user.id,

                    asking_price:
                        askingPrice && Number(askingPrice) > 0
                            ? Number(askingPrice)
                            : null,
                });

        if (error) {
            alert(error.message);
            return;
        }

        alert(
            "Applied successfully"
        );

        await getMyTasks();

        await getStudentStats();
    }

    // ==========================================
    // LOGOUT
    // ==========================================

    async function logout() {
        await supabase.auth.signOut();

        router.replace("/auth");
    }

    // ==========================================
    // DERIVED — PERFORMANCE
    // ==========================================

    const successRate =
        completedTaskCount + activeTaskCount > 0
            ? Math.round(
                  (completedTaskCount /
                      (completedTaskCount + activeTaskCount)) *
                      100
              )
            : 0;

    // ==========================================
    // PAGE CONTENT
    // ==========================================

    function renderContent() {
        switch (activePage) {

            // --------------------------------------
            // BROWSE TASKS
            // --------------------------------------

            case "browse":
                return (
                    <BrowseTasks
                        tasks={tasks}
                        askingPrices={
                            askingPrices
                        }
                        setAskingPrices={
                            setAskingPrices
                        }
                        applyTask={
                            applyTask
                        }
                    />
                );

            // --------------------------------------
            // MY TASKS
            // --------------------------------------

            case "mytasks":
                return (
                    <MyTasks
                        myTasks={
                            myTasks
                        }
                    />
                );

            // --------------------------------------
            // MESSAGES
            // --------------------------------------

            case "messages":
                return (
                    <MessagesPage />
                );

            // --------------------------------------
            // WALLET
            // --------------------------------------

            case "wallet":
                return <Wallet />;

            // --------------------------------------
            // PROFILE
            // --------------------------------------

            case "profile":
                return (
                    <Profile
                        studentId={currentUserId}
                        name={name}
                        profile={
                            profile
                        }
                        setProfile={
                            setProfile
                        }
                        verificationFile={
                            verificationFile
                        }
                        setVerificationFile={
                            setVerificationFile
                        }
                        saveProfile={
                            saveProfile
                        }
                    />
                );

            // --------------------------------------
            // DASHBOARD
            // --------------------------------------

            default:
                return (
                    <>

                        {/* HEADER ROW */}

                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                            <div>

                                <h1 className="text-2xl sm:text-3xl font-bold">
                                    Welcome back,{" "}
                                    {name} 👋
                                </h1>

                                <p className="mt-2 text-gray-500 text-sm sm:text-base">
                                    Here&apos;s your UniSev activity at a glance.
                                </p>

                            </div>

                            <div className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3 w-full sm:w-auto">

                                <div className="w-9 h-9 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>

                                <div className="min-w-0">

                                    <p className="text-sm font-semibold text-gray-900">
                                        Account Status
                                    </p>

                                    <p className="text-sm text-green-600 flex items-center gap-1.5 truncate">
                                        {profile.verification_status}
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* STAT CARDS */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-6 sm:mt-8">

                            {/* ACTIVE TASKS */}
                            <div
                                onClick={() => setActivePage("mytasks")}
                                className="relative overflow-hidden bg-white rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <ClipboardCheck className="w-5 h-5" />
                                </div>

                                <h2 className="text-2xl font-bold text-blue-600 mt-4">
                                    {
                                        myTasks.filter(
                                            (item) =>
                                                item.status?.toLowerCase() === "accepted"
                                        ).length
                                    }
                                </h2>

                                <p className="text-gray-500 text-sm mt-1">Active Tasks</p>
                                 
                                <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
                            </div>

                            {/* EARNINGS */}

                            <div
                                onClick={() => setActivePage("wallet")}
                                className="relative overflow-hidden bg-white rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition"
                            >
                                <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                    <WalletIcon className="w-5 h-5" />
                                </div>

                                <h2 className="text-2xl font-bold text-green-600 mt-4">
                                    ${walletBalance.toFixed(2)}
                                </h2>

                                <p className="text-gray-500 text-sm mt-1">Total Earnings</p>
                                 

                                <span className="absolute bottom-0 left-0 right-0 h-1 bg-green-500" />
                            </div>

                            {/* COMPLETED TASKS */}

                            <div
                                onClick={() => setActivePage("mytasks")}
                                className="relative overflow-hidden bg-white rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition"
                            >
                                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>

                                <h2 className="text-2xl font-bold text-purple-600 mt-4">
                                    {
                                        myTasks.filter(
                                            (item) =>
                                                item.status?.toLowerCase() === "completed"
                                        ).length
                                    }
                                </h2>

                                <p className="text-gray-500 text-sm mt-1">Completed Tasks</p>
                                
                                <span className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
                            </div>

                            {/* RATING */}

                            <div
                                onClick={() => setShowRatingsPopup(true)}
                                className="relative overflow-hidden bg-white rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition"
                            >

                                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                                    <Star className="w-5 h-5" />
                                </div>

                                <h2 className="text-2xl font-bold text-orange-600 mt-4 flex items-center gap-1.5">
                                    {rating.toFixed(1)}
                                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                </h2>

                                <p className="text-gray-500 text-sm mt-1">Rating</p>
                                 

                                <span className="absolute bottom-0 left-0 right-0 h-1 bg-orange-400" />
                            </div>

                        </div>


                        {/* RECENT ACTIVITY + QUICK ACTIONS */}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

                            {/* RECENT ACTIVITY */}

                            <div className="lg:col-span-2 bg-white border rounded-2xl p-5 sm:p-6">

                                <div className="flex items-center justify-between">

                                    <h3 className="text-lg font-bold text-gray-900">
                                        Recent Activity
                                    </h3>

                                    <button
                                        onClick={() => setActivePage("wallet")}
                                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        View all
                                        <ChevronRight className="w-4 h-4" />
                                    </button>

                                </div>

                                {recentActivity.length === 0 ? (

                                    <div className="mt-6 border border-dashed rounded-xl p-8 text-center">
                                        <p className="text-gray-500">No recent activity yet.</p>
                                    </div>

                                ) : (

                                    <div className="mt-4 divide-y">

                                        {recentActivity.map((item) => (

                                            <div
                                                key={item.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-4"
                                            >

                                                <div className="flex items-center gap-3 min-w-0">

                                                    <div className={`
                                                        w-9
                                                        h-9
                                                        shrink-0
                                                        rounded-full
                                                        flex
                                                        items-center
                                                        justify-center
                                                        ${
                                                            item.status === "pending"
                                                                ? "bg-orange-50 text-orange-500"
                                                                : "bg-green-50 text-green-600"
                                                        }
                                                    `}>
                                                        {item.status === "pending" ? (
                                                            <Clock className="w-4 h-4" />
                                                        ) : (
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">

                                                        <p className="font-semibold text-gray-900 truncate">
                                                            {item.title}
                                                        </p>

                                                        <div className="flex items-center flex-wrap gap-2 mt-0.5">

                                                            {item.subtitle && (
                                                                <p className="text-sm text-gray-500 uppercase truncate">
                                                                    {item.subtitle}
                                                                </p>
                                                            )}

                                                            <span className="text-gray-300">•</span>

                                                            <p className="text-sm text-gray-500 whitespace-nowrap">
                                                                {new Date(item.created_at).toLocaleDateString(
                                                                    "en-US",
                                                                    { year: "numeric", month: "short", day: "numeric" }
                                                                )}
                                                            </p>

                                                        </div>

                                                    </div>

                                                </div>

                                                <div className="text-left sm:text-right shrink-0 pl-12 sm:pl-0">

                                                    <p className={`font-bold ${item.positive ? "text-green-600" : "text-gray-700"}`}>
                                                        {item.positive ? "+" : "-"}${Number(item.amount).toFixed(2)}
                                                    </p>

                                                    {item.status === "pending" && (
                                                        <span className="inline-block mt-1 text-xs font-semibold text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">
                                                            Pending
                                                        </span>
                                                    )}

                                                </div>

                                            </div>

                                        ))}

                                    </div>

                                )}

                            </div>


                            {/* QUICK ACTIONS */}

                            <div className="bg-white border rounded-2xl p-5 sm:p-6">

                                <h3 className="text-lg font-bold text-gray-900">
                                    Quick Actions
                                </h3>

                                <div className="mt-4 space-y-3">

                                    <button
                                        onClick={() => setActivePage("browse")}
                                        className="w-full flex items-center gap-3 text-left border rounded-xl p-3 hover:bg-gray-50 transition"
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Search className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900">Browse Tasks</p>
                                            <p className="text-sm text-gray-500">Find tasks that match your skills and interests</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    </button>

                                    <button
                                        onClick={() => setActivePage("mytasks")}
                                        className="w-full flex items-center gap-3 text-left border rounded-xl p-3 hover:bg-gray-50 transition"
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                            <ClipboardCheck className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900">My Tasks</p>
                                            <p className="text-sm text-gray-500">View your active and completed tasks</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    </button>

                                    <button
                                        onClick={() => setActivePage("wallet")}
                                        className="w-full flex items-center gap-3 text-left border rounded-xl p-3 hover:bg-gray-50 transition"
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                                            <WalletIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900">Wallet</p>
                                            <p className="text-sm text-gray-500">Check your earnings and transaction history</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    </button>

                                    <button
                                        onClick={() => setActivePage("messages")}
                                        className="w-full flex items-center gap-3 text-left border rounded-xl p-3 hover:bg-gray-50 transition"
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900">Messages</p>
                                            <p className="text-sm text-gray-500">Chat with clients and manage conversations</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    </button>

                                </div>

                            </div>

                        </div>


                        {/* YOUR PERFORMANCE */}

                        <div className="bg-white border rounded-2xl p-5 sm:p-6 mt-6">

                            <h3 className="text-lg font-bold text-gray-900">
                                Your Performance
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 mt-5 items-center">

                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Completed Tasks</p>
                                        <p className="text-xl font-bold text-gray-900">{completedTaskCount}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 shrink-0 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Success Rate</p>
                                        <p className="text-xl font-bold text-gray-900">{successRate}%</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 shrink-0 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                                        <Star className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Average Rating</p>
                                        <p className="text-xl font-bold text-gray-900 flex items-center gap-1">
                                            {rating.toFixed(1)}
                                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 sm:col-span-2 md:col-span-1">
                                    <div className="w-9 h-9 shrink-0 rounded-full bg-white text-blue-600 flex items-center justify-center">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-blue-900">
                                            {completedTaskCount > 0 ? "Great job!" : "Get started!"}
                                        </p>
                                        <p className="text-sm text-blue-800 mt-0.5">
                                            {completedTaskCount > 0
                                                ? "You're doing amazing. Keep up the excellent work!"
                                                : "Browse open tasks to land your first job."}
                                        </p>
                                    </div>
                                </div>

                            </div>

                        </div>

                    </>
                );
        }
    }

    // ==========================================
    // MAIN DASHBOARD
    // ==========================================

    return (
        <main className="min-h-screen bg-slate-50">

            <Header
                name={name}
                verificationStatus={
                    profile.verification_status
                }
                onMenuClick={() => setMobileNavOpen(true)}
            />

            <div className="flex flex-1 h-[calc(100vh-5rem)] overflow-hidden">

                <Sidebar
                    activePage={
                        activePage
                    }
                    setActivePage={
                        setActivePage
                    }
                    logout={
                        logout
                    }
                    name={
                        name
                    }
                    mobileOpen={
                        mobileNavOpen
                    }
                    setMobileOpen={
                        setMobileNavOpen
                    }
                />

                <section className="flex-1 p-4 sm:p-6 lg:p-10 h-full overflow-y-auto">

                    {renderContent()}

                </section>

            </div>

            {/* ================================================= */}
            {/* MY REVIEWS & RATINGS POPUP */}
            {/* ================================================= */}

            {showRatingsPopup && currentUserId && (
                <StudentProfilePreview
                    studentId={currentUserId}
                    onClose={() => setShowRatingsPopup(false)}
                    initialShowReviews={true}
                />
            )}

        </main>
    );
}