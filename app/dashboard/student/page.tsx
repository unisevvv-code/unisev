"use client";

import { useEffect, useRef, useState } from "react";
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
    ClipboardList,
    XCircle,
    HelpCircle,
    Mail,
    Copy,
    Check,
} from "lucide-react";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import BrowseTasks, { type ApplyResult } from "./components/BrowseTasks";
import MyTasks from "./components/MyTasks";
import Profile from "./components/Profile";
import MessagesPage from "./components/MessagesPage";
import Wallet from "./components/Wallet";
import StudentProfilePreview from "./components/StudentProfilePreview";
import HowItWorks from "@/components/HowItWorks";
import { getGreeting } from "@/lib/greeting";

// Official UniSeV support address (used by the Contact Support quick action)
const SUPPORT_EMAIL = "unisevvv@gmail.com";

// A message shown in an in-page dialog (replaces the old alert() popups,
// which display the site address, e.g. "xyz.vercel.app says")
type NoticeState = {
    type: "success" | "error";
    title: string;
    message: string;
};

// ==========================================
// TYPES
// ==========================================

interface Task {
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
    // null for task events (applied / accepted / ...), which have no
    // amount of their own and show a label instead.
    amount: number | null;
    positive: boolean;
    status: string;
    created_at: string;

    // Only set on task events
    taskTone?: "blue" | "green" | "orange" | "red" | "purple";
    taskLabel?: string;
}

interface ApplicationActivityRow {
    id: string;
    status: string;
    created_at: string;
    tasks:
        | { title: string; status?: string | null }
        | { title: string; status?: string | null }[]
        | null;
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

// ==========================================
// DISPLAY MAPPER — MyTasks
//
// MyTasks.tsx declares its own local Task type where
// `recommended_price`, `expected_day`, and `expected_month` are
// `undefined`-only (no `null`), while this file's Task type allows
// `null` for those (to match what BrowseTasks expects instead).
// This mapper bridges the two right before handing data to MyTasks.
// ==========================================

interface MyTaskDisplayTask {
    id?: string;
    title?: string;
    category?: string;
    description?: string;
    recommended_price?: number;
    expected_day?: string | number;
    expected_month?: string | number;
    attachments?: string[];
    task_type?: string | null;
    max_participants?: number | null;
    current_participants?: number | null;
    reward_per_participant?: number | null;
    duration_minutes?: number | null;
}

interface MyTaskDisplay {
    id: string;
    status?: string;
    client_status?: string;
    completion_requested_at?: string | null;
    asking_price?: number | string | null;
    tasks?: MyTaskDisplayTask;
}

function toDisplayMyTask(app: Application): MyTaskDisplay {
    const task = app.tasks;

    return {
        id: app.id,
        status: app.status,
        client_status: app.client_status as string | undefined,
        completion_requested_at:
            (app.completion_requested_at as
                | string
                | null
                | undefined) ?? null,
        asking_price: app.asking_price ?? null,
        tasks: task
            ? {
                  id: task.id,
                  title: task.title,
                  category: task.category,
                  description: task.description,
                  recommended_price:
                      task.recommended_price ?? undefined,
                  expected_day:
                      task.expected_day ?? undefined,
                  expected_month:
                      task.expected_month ?? undefined,
                  attachments:
                      task.attachments as
                          | string[]
                          | undefined,
                  task_type: task.task_type,
                  max_participants: task.max_participants,
                  current_participants:
                      task.current_participants,
                  reward_per_participant:
                      task.reward_per_participant,
                  duration_minutes: task.duration_minutes,
              }
            : undefined,
    };
}


export default function StudentDashboard() {
    const router = useRouter();

    const [verificationFile, setVerificationFile] =
        useState<File | null>(null);

    const [askingPrices, setAskingPrices] =
        useState<Record<string, string>>({});

    const [name, setName] = useState("Student");

    // true only the very first time a new account opens the dashboard
    const [isFirstVisit, setIsFirstVisit] = useState(false);

    const [currentUserId, setCurrentUserId] =
        useState("");

    // The page shown inside the dashboard. Changing it also adds a
    // browser-history entry (see setActivePage below), so the phone's
    // Back button goes to the previous dashboard page instead of
    // leaving the app.
    const [activePage, setActivePageState] =
        useState("dashboard");

    function setActivePage(page: string) {
        if (page === activePage) return;

        window.history.pushState({ page }, "");
        setActivePageState(page);
    }

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

    // In-page message dialog
    const [notice, setNotice] = useState<NoticeState | null>(null);

    // "Copied" feedback for the Contact Support quick action
    const [supportEmailCopied, setSupportEmailCopied] =
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
    // task that just got assigned to someone else (or cancelled by its
    // client) disappears without needing a full page reload.
    useEffect(() => {
        if (activePage === "browse") {
            getTasks();
        }

        // Same for My Tasks, so tasks the client cancelled drop out
        // of the list when the student opens it
        if (activePage === "mytasks") {
            getMyTasks();
        }

        // Refresh the feed whenever the overview is shown again
        if (activePage === "dashboard") {
            getRecentActivity();
        }
    }, [activePage]);

    // Phone / browser Back button: show the dashboard page that was open
    // before. The first entry has no saved page, so it means "dashboard".
    useEffect(() => {
        function handlePopState(event: PopStateEvent) {
            setActivePageState(event.state?.page ?? "dashboard");
            setMobileNavOpen(false);
        }

        window.addEventListener("popstate", handlePopState);

        return () =>
            window.removeEventListener("popstate", handlePopState);
    }, []);

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

            // First time on a new account: show the welcome once, then
            // remember it so later visits get the normal greetings.
            if (data.welcomed === false) {
                setIsFirstVisit(true);

                await supabase
                    .from("profiles")
                    .update({ welcomed: true })
                    .eq("id", userData.user.id);
            }

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

    // Blocks a second save while one is still running (double clicks),
    // so the verification can never be submitted twice at once.
    const savingProfileRef = useRef(false);

    async function saveProfile() {
        if (savingProfileRef.current) return;

        savingProfileRef.current = true;

        try {
            await saveProfileInner();
        } finally {
            savingProfileRef.current = false;
        }
    }

    async function saveProfileInner() {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) return;

        // Verification can only be submitted once: while it is pending
        // review, or after it has been approved, no new document is accepted.
        const verificationLocked =
            profile.verification_status === "Pending Verification" ||
            profile.verification_status === "Verified";

        if (verificationFile && verificationLocked) {
            setVerificationFile(null);

            setNotice({
                type: "error",
                title: "Already submitted",
                message:
                    profile.verification_status === "Verified"
                        ? "Your account is already verified."
                        : "Your verification is already being reviewed. You can't submit it again.",
            });

            return;
        }

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

                setNotice({
                    type: "error",
                    title: "Upload failed",
                    message: uploadError.message,
                });

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

                    skills:
                        profile.skills,

                    // Verification fields are only touched when a new
                    // document is actually being submitted. Before, every
                    // plain save wiped the stored document and date.
                    ...(verificationFile
                        ? {
                              verification_document:
                                  verificationDocument,
                              verification_status:
                                  "Pending Verification",
                              verification_submitted_at:
                                  new Date(),
                          }
                        : {}),
                })
                .eq(
                    "id",
                    userData.user.id
                );

        if (error) {
            setNotice({
                type: "error",
                title: "Could not save profile",
                message: error.message,
            });
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
                setNotice({
                    type: "error",
                    title: "Verification failed",
                    message: verificationError.message,
                });

                return;
            }
        }

        setProfile({
            ...profile,

            verification_document:
                verificationFile
                    ? verificationDocument
                    : profile.verification_document,

            verification_status:
                verificationFile
                    ? "Pending Verification"
                    : profile.verification_status,
        });

        // Clear the chosen file so pressing Save again can't resubmit it
        setVerificationFile(null);

        setNotice({
            type: "success",
            title: "Profile saved",
            message: verificationFile
                ? "Your profile has been updated and your ID has been submitted for verification."
                : "Your profile has been updated successfully.",
        });
    }

    // ==========================================
    // GET OPEN TASKS
    //
    // Only tasks with status "open" are loaded, so cancelled tasks
    // never appear in Browse Tasks.
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
    //
    // Applications on tasks the client has cancelled are left out.
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

        const activeApplications = (
            (data as unknown as Application[]) || []
        ).filter(
            (application) =>
                application.tasks?.status !== "cancelled"
        );

        setMyTasks(activeApplications);
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
                            transaction.type === "release" ||
                            transaction.type === "earning"
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
                            transaction.type === "earning" ||
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

        // ------------------------------------------
        // Task events: applied, accepted, declined,
        // completed (from this student's applications).
        // Applications on cancelled tasks are left out.
        // ------------------------------------------

        const {
            data: applicationData,
            error: applicationError,
        } = await supabase
            .from("applications")
            .select("id, status, created_at, tasks(title, status)")
            .eq("student_id", userId)
            .order("created_at", { ascending: false })
            .limit(10);

        let taskItems: ActivityItem[] = [];

        if (applicationError) {
            console.log(
                "RECENT ACTIVITY (applications) ERROR:",
                applicationError
            );
        } else {
            taskItems = (
                (applicationData as unknown as ApplicationActivityRow[]) || []
            )
                .filter((application) => {
                    const task = Array.isArray(application.tasks)
                        ? application.tasks[0]
                        : application.tasks;

                    return task?.status !== "cancelled";
                })
                .map((application): ActivityItem => {
                const task = Array.isArray(application.tasks)
                    ? application.tasks[0]
                    : application.tasks;

                const status = (application.status || "pending").toLowerCase();

                const base = {
                    id: `app-${application.id}`,
                    subtitle: task?.title || "",
                    amount: null,
                    positive: true,
                    status,
                    created_at: application.created_at,
                };

                if (status === "accepted") {
                    return {
                        ...base,
                        title: "Application accepted",
                        taskTone: "green",
                        taskLabel: "Accepted",
                    };
                }

                if (status === "completed") {
                    return {
                        ...base,
                        title: "Task completed",
                        taskTone: "purple",
                        taskLabel: "Completed",
                    };
                }

                if (status === "rejected" || status === "declined") {
                    return {
                        ...base,
                        title: "Application declined",
                        taskTone: "red",
                        taskLabel: "Declined",
                    };
                }

                return {
                    ...base,
                    title: "Applied for task",
                    taskTone: "blue",
                    taskLabel: "Applied",
                };
            });
        }

        const merged = [...transactionItems, ...escrowItems, ...taskItems]
            .sort(
                (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
            )
            .slice(0, 6);

        setRecentActivity(merged);
    }

    // ==========================================
    // APPLY FOR TASK
    //
    // Checks the task is still open first, so a student on a stale
    // Browse Tasks page can't apply to a task the client has since
    // cancelled (or that was assigned to someone else).
    //
    // Returns an ApplyResult instead of calling alert(), so
    // BrowseTasks can show the message in its own in-page dialog.
    // ==========================================

    async function applyTask(
        taskId: string,
        askingPrice?: string
    ): Promise<ApplyResult> {
        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) {
            return {
                status: "error",
                message: "Please log in again to apply.",
            };
        }

        const { data: taskData, error: taskError } =
            await supabase
                .from("tasks")
                .select("status")
                .eq("id", taskId)
                .single();

        if (taskError || !taskData) {
            await getTasks();

            return {
                status: "error",
                message: "This task could not be found.",
            };
        }

        if (taskData.status !== "open") {
            await getTasks();

            return {
                status: "error",
                message: "This task is no longer available.",
            };
        }

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
            if (error.message.startsWith("TASK_CANCELLED")) {
                await getTasks();
            }

            // 23505 = unique violation (already applied)
            if (error.code === "23505") {
                return {
                    status: "already_applied",
                    message:
                        "You have already applied for this task.",
                };
            }

            return {
                status: "error",
                message: error.message.replace(
                    /^[A-Z_]+:\s*/,
                    ""
                ),
            };
        }

        await getMyTasks();

        await getStudentStats();

        await getRecentActivity();

        return {
            status: "applied",
            message: "Your application has been submitted.",
        };
    }

    // ==========================================
    // COPY SUPPORT EMAIL
    //
    // Fallback for devices with no mail app set up: copies the
    // support address so the student can paste it anywhere.
    // ==========================================

    async function copySupportEmail() {
        try {
            await navigator.clipboard.writeText(SUPPORT_EMAIL);

            setSupportEmailCopied(true);

            setTimeout(
                () => setSupportEmailCopied(false),
                2000
            );
        } catch {
            setNotice({
                type: "success",
                title: "Support email",
                message: SUPPORT_EMAIL,
            });
        }
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
                        appliedTaskIds={myTasks.map(
                            (application) =>
                                application.task_id
                        )}
                    />
                );

            // --------------------------------------
            // MY TASKS
            // --------------------------------------

            case "mytasks":
                return (
                    <MyTasks
                        myTasks={myTasks.map(
                            toDisplayMyTask
                        )}
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
            // HOW IT WORKS
            // --------------------------------------

            case "howitworks":
                return <HowItWorks />;

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
                                    {getGreeting(name, isFirstVisit, "student").title}
                                </h1>

                                <p className="mt-2 text-gray-500 text-sm sm:text-base">
                                    {getGreeting(name, isFirstVisit, "student").subtitle}
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
                                                            item.taskTone
                                                                ? {
                                                                      blue: "bg-blue-50 text-blue-600",
                                                                      green: "bg-green-50 text-green-600",
                                                                      orange: "bg-orange-50 text-orange-500",
                                                                      red: "bg-red-50 text-red-500",
                                                                      purple: "bg-purple-50 text-purple-600",
                                                                  }[item.taskTone]
                                                                : item.status === "pending"
                                                                  ? "bg-orange-50 text-orange-500"
                                                                  : "bg-green-50 text-green-600"
                                                        }
                                                    `}>
                                                        {item.taskTone === "red" ? (
                                                            <XCircle className="w-4 h-4" />
                                                        ) : item.taskTone === "blue" ? (
                                                            <ClipboardList className="w-4 h-4" />
                                                        ) : item.taskTone ? (
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        ) : item.status === "pending" ? (
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

                                                    {item.amount === null ? (
                                                        <span className={`inline-block text-xs font-semibold rounded-full px-3 py-1 ${
                                                            {
                                                                blue: "bg-blue-50 text-blue-600",
                                                                green: "bg-green-50 text-green-600",
                                                                orange: "bg-orange-50 text-orange-600",
                                                                red: "bg-red-50 text-red-600",
                                                                purple: "bg-purple-50 text-purple-600",
                                                            }[item.taskTone || "blue"]
                                                        }`}>
                                                            {item.taskLabel}
                                                        </span>
                                                    ) : (
                                                        <p className={`font-bold ${item.positive ? "text-green-600" : "text-gray-700"}`}>
                                                            {item.positive ? "+" : "-"}${Number(item.amount).toFixed(2)}
                                                        </p>
                                                    )}

                                                    {item.amount !== null && item.status === "pending" && (
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

                                    <button
                                        onClick={() => setActivePage("howitworks")}
                                        className="w-full flex items-center gap-3 text-left border rounded-xl p-3 hover:bg-gray-50 transition"
                                    >
                                        <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <HelpCircle className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900">How UniSeV Works</p>
                                            <p className="text-sm text-gray-500">Learn how tasks, payments and messaging work</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    </button>

                                    {/* CONTACT SUPPORT */}
                                    <div className="w-full flex items-center gap-3 border rounded-xl p-3 hover:bg-gray-50 transition">

                                        <a
                                            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("UniSeV Support Request")}`}
                                            className="flex flex-1 min-w-0 items-center gap-3 text-left"
                                        >
                                            <div className="w-10 h-10 shrink-0 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900">Contact Support</p>
                                                <p className="text-sm text-gray-500 truncate">{SUPPORT_EMAIL}</p>
                                            </div>
                                        </a>

                                        <button
                                            type="button"
                                            onClick={copySupportEmail}
                                            aria-label="Copy support email"
                                            title={supportEmailCopied ? "Copied" : "Copy email"}
                                            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                                        >
                                            {supportEmailCopied ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </button>

                                    </div>

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

            {/* MESSAGE DIALOG (replaces the old alert() popups) */}

            {notice && (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onClick={() => setNotice(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-7"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3
                            className={`text-lg sm:text-xl font-bold ${
                                notice.type === "success"
                                    ? "text-green-700"
                                    : "text-red-600"
                            }`}
                        >
                            {notice.title}
                        </h3>

                        <p className="mt-4 text-sm sm:text-base text-gray-600 wrap-break-words">
                            {notice.message}
                        </p>

                        <div className="mt-7 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setNotice(null)}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 active:bg-gray-800"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}