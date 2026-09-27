"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";
import AdminOverview from "./components/AdminOverview";
import AdminWallet from "./components/AdminWallet";
import AdminStudents from "./components/AdminStudents";
import AdminTasks from "./components/AdminTasks";
import AdminPayments from "./components/AdminPayments";

export default function AdminDashboard() {
    const router = useRouter();

    const [activePage, setActivePage] =
        useState("dashboard");

    // Controls the mobile sidebar drawer. Owned by the page so the
    // single hamburger button (in AdminHeader) can open the drawer
    // that lives in AdminSidebar, matching the client dashboard's
    // Header/Sidebar pattern.
    const [sidebarOpen, setSidebarOpen] =
        useState(false);

    const [students, setStudents] =
        useState<any[]>([]);

    const [allStudents, setAllStudents] =
        useState<any[]>([]);

    const [tasksList, setTasksList] =
        useState<any[]>([]);

    const [paymentsList, setPaymentsList] =
        useState<any[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [totalRevenue, setTotalRevenue] =
        useState(0);

    const [lastMonthRevenue, setLastMonthRevenue] =
        useState(0);

    const [thisMonthRevenue, setThisMonthRevenue] =
        useState(0);

    const [balance, setBalance] =
        useState(0);

    const [totalStudents, setTotalStudents] =
        useState(0);

    const [totalClients, setTotalClients] =
        useState(0);

    const [activeTasks, setActiveTasks] =
        useState(0);

    const [completedTasks, setCompletedTasks] =
        useState(0);

    const [pendingVerifications, setPendingVerifications] =
        useState(0);

    const [walletTransactions, setWalletTransactions] =
        useState<any[]>([]);

    // ==================================================
    // ADMIN CHECK
    // ==================================================

    useEffect(() => {
        checkAdmin();
    }, []);

    async function checkAdmin() {
        setLoading(true);

        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user) {
            router.push("/auth");
            return;
        }

        const { data, error } =
            await supabase
                .from("profiles")
                .select("role")
                .eq("id", userData.user.id)
                .single();

        console.log("Admin Profile:", data);

        if (error || data?.role !== "admin") {
            router.push("/dashboard/student");
            return;
        }

        await Promise.all([
            loadStudents(),
            loadOverview(),
            loadAllStudents(),
            loadTasksList(),
            loadPayments(),
        ]);

        setLoading(false);
    }

    // ==================================================
    // LOAD ADMIN OVERVIEW
    // ==================================================

    async function loadOverview() {
        // ----------------------------------------------
        // TOTAL STUDENTS
        // ----------------------------------------------

        const {
            count: studentsCount,
            error: studentsError,
        } = await supabase
            .from("profiles")
            .select("*", {
                count: "exact",
                head: true,
            })
            .eq("role", "student");

        if (studentsError) {
            console.log(
                "STUDENT COUNT ERROR:",
                studentsError
            );
        }

        setTotalStudents(
            studentsCount || 0
        );

        // ----------------------------------------------
        // TOTAL CLIENTS
        // ----------------------------------------------

        const {
            count: clientsCount,
            error: clientsError,
        } = await supabase
            .from("profiles")
            .select("*", {
                count: "exact",
                head: true,
            })
            .eq("role", "client");

        if (clientsError) {
            console.log(
                "CLIENT COUNT ERROR:",
                clientsError
            );
        }

        setTotalClients(
            clientsCount || 0
        );

        // ----------------------------------------------
        // ACTIVE TASKS
        // ----------------------------------------------

        const {
            count: activeTaskCount,
            error: activeTaskError,
        } = await supabase
            .from("tasks")
            .select("*", {
                count: "exact",
                head: true,
            })
            .eq("status", "assigned");

        if (activeTaskError) {
            console.log(
                "ACTIVE TASK COUNT ERROR:",
                activeTaskError
            );
        }

        setActiveTasks(
            activeTaskCount || 0
        );

        // ----------------------------------------------
        // COMPLETED TASKS
        // ----------------------------------------------

        const {
            count: completedTaskCount,
            error: completedTaskError,
        } = await supabase
            .from("tasks")
            .select("*", {
                count: "exact",
                head: true,
            })
            .eq("status", "completed");

        if (completedTaskError) {
            console.log(
                "COMPLETED TASK COUNT ERROR:",
                completedTaskError
            );
        }

        setCompletedTasks(
            completedTaskCount || 0
        );

        // ----------------------------------------------
        // PENDING VERIFICATIONS
        // ----------------------------------------------

        const {
            count: verificationCount,
            error: verificationError,
        } = await supabase
            .from("student_verifications")
            .select("*", {
                count: "exact",
                head: true,
            })
            .eq("status", "Pending");

        if (verificationError) {
            console.log(
                "VERIFICATION COUNT ERROR:",
                verificationError
            );
        }

        setPendingVerifications(
            verificationCount || 0
        );

        // ----------------------------------------------
        // ESCROW PAYMENTS
        // ----------------------------------------------

        const {
            data: payments,
            error: paymentError,
        } = await supabase
            .from("escrow_payments")
            .select(`
                id,
                task_id,
                amount,
                status,
                released_at
            `)
            .eq("status", "released")
            .order("released_at", {
                ascending: false,
            });

        if (paymentError) {
            console.log(
                "ESCROW PAYMENT ERROR:",
                paymentError
            );

            return;
        }

        const releasedPayments =
            payments || [];

        setWalletTransactions(
            releasedPayments
        );

        // ----------------------------------------------
        // TOTAL REVENUE
        //
        // UniSeV keeps 15%.
        // ----------------------------------------------

        const total =
            releasedPayments.reduce(
                (
                    sum: number,
                    payment: any
                ) => {
                    const amount =
                        Number(
                            payment.amount
                        ) || 0;

                    return (
                        sum +
                        amount * 0.15
                    );
                },
                0
            );

        setTotalRevenue(total);

        // ----------------------------------------------
        // ADMIN BALANCE
        //
        // For now, the admin balance is
        // the accumulated UniSeV 15% revenue.
        // ----------------------------------------------

        setBalance(total);

        // ----------------------------------------------
        // DATE INFORMATION
        // ----------------------------------------------

        const now = new Date();

        const currentYear =
            now.getFullYear();

        const currentMonth =
            now.getMonth();

        const previousMonthDate =
            new Date(
                currentYear,
                currentMonth - 1,
                1
            );

        const previousMonth =
            previousMonthDate.getMonth();

        const previousMonthYear =
            previousMonthDate.getFullYear();

        // ----------------------------------------------
        // THIS MONTH
        // ----------------------------------------------

        const thisMonth =
            releasedPayments.reduce(
                (
                    sum: number,
                    payment: any
                ) => {
                    if (
                        !payment.released_at
                    ) {
                        return sum;
                    }

                    const date =
                        new Date(
                            payment.released_at
                        );

                    if (
                        date.getFullYear() ===
                            currentYear &&
                        date.getMonth() ===
                            currentMonth
                    ) {
                        return (
                            sum +
                            (Number(
                                payment.amount
                            ) || 0) *
                                0.15
                        );
                    }

                    return sum;
                },
                0
            );

        setThisMonthRevenue(
            thisMonth
        );

        // ----------------------------------------------
        // LAST MONTH
        // ----------------------------------------------

        const lastMonth =
            releasedPayments.reduce(
                (
                    sum: number,
                    payment: any
                ) => {
                    if (
                        !payment.released_at
                    ) {
                        return sum;
                    }

                    const date =
                        new Date(
                            payment.released_at
                        );

                    if (
                        date.getFullYear() ===
                            previousMonthYear &&
                        date.getMonth() ===
                            previousMonth
                    ) {
                        return (
                            sum +
                            (Number(
                                payment.amount
                            ) || 0) *
                                0.15
                        );
                    }

                    return sum;
                },
                0
            );

        setLastMonthRevenue(
            lastMonth
        );
    }

    // ==================================================
    // LOAD STUDENT VERIFICATIONS (pending queue)
    // ==================================================

    async function loadStudents() {
        const {
            data: verifications,
            error: verificationError,
        } = await supabase
            .from("student_verifications")
            .select("*")
            .eq("status", "Pending");

        if (verificationError) {
            console.log(
                "Verification Error:",
                verificationError
            );

            setStudents([]);

            return;
        }

        if (
            !verifications ||
            verifications.length === 0
        ) {
            setStudents([]);

            return;
        }

        const userIds =
            verifications.map(
                (verification) =>
                    verification.user_id
            );

        const {
            data: profiles,
            error: profileError,
        } = await supabase
            .from("profiles")
            .select(`
                id,
                full_name,
                university,
                student_id,
                phone,
                department,
                level,
                bio,
                skills
            `)
            .in("id", userIds);

        if (profileError) {
            console.log(
                "Profile Error:",
                profileError
            );

            setStudents([]);

            return;
        }

        const combinedStudents =
            verifications.map(
                (verification) => {
                    const profile =
                        profiles?.find(
                            (profile) =>
                                profile.id ===
                                verification.user_id
                        );

                    return {
                        ...verification,

                        full_name:
                            profile?.full_name ||
                            "Not provided",

                        university:
                            profile?.university ||
                            "Not provided",

                        student_id:
                            profile?.student_id ||
                            "Not provided",

                        phone:
                            profile?.phone ||
                            "Not provided",

                        department:
                            profile?.department ||
                            "Not provided",

                        level:
                            profile?.level ||
                            "Not provided",

                        bio:
                            profile?.bio ||
                            "Not provided",

                        skills:
                            profile?.skills ||
                            "Not provided",
                    };
                }
            );

        setStudents(
            combinedStudents
        );
    }

    // ==================================================
    // LOAD ALL STUDENTS (for the Students tab)
    // ==================================================

    async function loadAllStudents() {
        const {
            data: profiles,
            error: profileError,
        } = await supabase
            .from("profiles")
            .select(`
                id,
                full_name,
                university,
                student_id,
                phone,
                department,
                level,
                verification_status,
                created_at
            `)
            .eq("role", "student")
            .order("created_at", {
                ascending: false,
            });

        if (profileError) {
            console.log(
                "ALL STUDENTS ERROR:",
                profileError
            );

            setAllStudents([]);

            return;
        }

        setAllStudents(
            profiles || []
        );
    }

    // ==================================================
    // LOAD TASKS (for the Tasks tab)
    // ==================================================

    async function loadTasksList() {
        const {
            data: tasksData,
            error: tasksError,
        } = await supabase
            .from("tasks")
            .select("*")
            .order("created_at", {
                ascending: false,
            });

        if (tasksError) {
            console.log(
                "TASKS LIST ERROR:",
                tasksError
            );

            setTasksList([]);

            return;
        }

        setTasksList(
            tasksData || []
        );
    }

    // ==================================================
    // LOAD PAYMENTS (for the Payments tab)
    // ==================================================

    async function loadPayments() {
        const {
            data: paymentsData,
            error: paymentsError,
        } = await supabase
            .from("escrow_payments")
            .select("*")
            .order("created_at", {
                ascending: false,
            });

        if (paymentsError) {
            console.log(
                "PAYMENTS LIST ERROR:",
                paymentsError
            );

            setPaymentsList([]);

            return;
        }

        const payments =
            paymentsData || [];

        if (payments.length === 0) {
            setPaymentsList([]);

            return;
        }

        const taskIds = payments
            .map(
                (payment: any) =>
                    payment.task_id
            )
            .filter(Boolean);

        const {
            data: tasksData,
            error: tasksError,
        } = await supabase
            .from("tasks")
            .select(`
                id,
                title,
                category,
                created_at
            `)
            .in("id", taskIds);

        if (tasksError) {
            console.log(
                "PAYMENTS TASKS ERROR:",
                tasksError
            );
        }

        const profileIds = payments
            .flatMap(
                (payment: any) => [
                    payment.client_id,
                    payment.student_id,
                ]
            )
            .filter(Boolean);

        const {
            data: profilesData,
            error: profilesError,
        } = await supabase
            .from("profiles")
            .select(`
                id,
                full_name
            `)
            .in("id", profileIds);

        if (profilesError) {
            console.log(
                "PAYMENTS PROFILES ERROR:",
                profilesError
            );
        }

        const combinedPayments =
            payments.map(
                (payment: any) => {
                    const task =
                        tasksData?.find(
                            (task) =>
                                task.id ===
                                payment.task_id
                        );

                    const client =
                        profilesData?.find(
                            (profile) =>
                                profile.id ===
                                payment.client_id
                        );

                    const student =
                        profilesData?.find(
                            (profile) =>
                                profile.id ===
                                payment.student_id
                        );

                    return {
                        ...payment,

                        task_title:
                            task?.title ||
                            null,

                        task_category:
                            task?.category ||
                            null,

                        task_created_at:
                            task?.created_at ||
                            null,

                        client_name:
                            client?.full_name ||
                            null,

                        student_name:
                            student?.full_name ||
                            null,
                    };
                }
            );

        setPaymentsList(
            combinedPayments
        );
    }

    async function approveStudent(
        id: string,
        userId: string
    ) {
        const {
            error: verificationError,
        } = await supabase
            .from("student_verifications")
            .update({
                status: "Approved",
            })
            .eq("id", id);

        if (verificationError) {
            console.log(
                "VERIFICATION UPDATE ERROR:",
                verificationError
            );

            alert(
                "Could not approve verification: " +
                    verificationError.message
            );

            return;
        }

        const {
            error: profileError,
        } = await supabase
            .from("profiles")
            .update({
                verification_status:
                    "Verified",
            })
            .eq("id", userId);

        if (profileError) {
            console.log(
                "PROFILE UPDATE ERROR:",
                profileError
            );

            alert(
                "Could not update student profile: " +
                    profileError.message
            );

            return;
        }

        alert(
            "Student approved successfully"
        );

        await loadStudents();
        await loadOverview();
        await loadAllStudents();
    }

    // ==================================================
    // REJECT STUDENT
    // ==================================================

    async function rejectStudent(
        id: string,
        userId: string
    ) {
        const {
            error: verificationError,
        } = await supabase
            .from("student_verifications")
            .update({
                status: "Rejected",
            })
            .eq("id", id);

        if (verificationError) {
            alert(
                verificationError.message
            );

            return;
        }

        const {
            error: profileError,
        } = await supabase
            .from("profiles")
            .update({
                verification_status:
                    "Not Verified",
            })
            .eq("id", userId);

        if (profileError) {
            alert(
                profileError.message
            );

            return;
        }

        alert(
            "Student verification rejected"
        );

        await loadStudents();
        await loadOverview();
        await loadAllStudents();
    }

    // ==================================================
    // LOGOUT
    // ==================================================

    async function logout() {
        await supabase.auth.signOut();

        router.replace("/auth");
    }

    // ==================================================
    // PAGE TITLE
    // ==================================================

    function getPageTitle() {
        switch (activePage) {
            case "verifications":
                return {
                    title: "Student Verification",
                    description:
                        "Review and manage student verification requests.",
                };

            case "students":
                return {
                    title: "Students",
                    description:
                        "Manage registered UniSeV students.",
                };

            case "tasks":
                return {
                    title: "Tasks",
                    description:
                        "Monitor tasks across the UniSeV platform.",
                };

            case "payments":
                return {
                    title: "Payments",
                    description:
                        "Monitor payments and escrow transactions.",
                };

            case "wallet":
                return {
                    title: "Admin Wallet",
                    description:
                        "Monitor UniSeV revenue and wallet balance.",
                };

            default:
                return {
                    title: "Dashboard",
                    description:
                        "Overview of the UniSeV platform.",
                };
        }
    }

    // ==================================================
    // CONTENT
    // ==================================================

    function renderContent() {
        switch (activePage) {
            case "verifications":
                return (
                    <div className="space-y-5">

                        {students.length === 0 ? (
                            <div className="bg-white border rounded-2xl p-8">
                                <p className="text-slate-500">
                                    No pending verifications.
                                </p>
                            </div>
                        ) : (
                            students.map(
                                (student) => (
                                    <div
                                        key={student.id}
                                        className="
                                            bg-white
                                            border
                                            rounded-2xl
                                            p-6
                                            shadow-sm
                                        "
                                    >

                                        <div className="flex justify-between gap-8">

                                            <div>
                                                <h2 className="text-xl font-bold text-slate-900">
                                                    {student.full_name}
                                                </h2>

                                                <div className="mt-4 space-y-1 text-sm text-slate-600">

                                                    <p>
                                                        University:{" "}
                                                        {student.university}
                                                    </p>

                                                    <p>
                                                        Student ID:{" "}
                                                        {student.student_id}
                                                    </p>

                                                    <p>
                                                        Department:{" "}
                                                        {student.department}
                                                    </p>

                                                    <p>
                                                        Level:{" "}
                                                        {student.level}
                                                    </p>

                                                    <p>
                                                        Phone:{" "}
                                                        {student.phone}
                                                    </p>

                                                    <p>
                                                        Status:{" "}
                                                        <span className="font-semibold text-orange-500">
                                                            {student.status}
                                                        </span>
                                                    </p>

                                                </div>

                                                {student.document_url && (
                                                    <a
                                                        href={
                                                            student.document_url
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="
                                                            inline-block
                                                            mt-4
                                                            text-blue-600
                                                            underline
                                                            text-sm
                                                        "
                                                    >
                                                        View Verification Document
                                                    </a>
                                                )}

                                            </div>

                                            <div className="flex items-start gap-3">

                                                <button
                                                    onClick={() =>
                                                        approveStudent(
                                                            student.id,
                                                            student.user_id
                                                        )
                                                    }
                                                    className="
                                                        bg-green-600
                                                        hover:bg-green-700
                                                        text-white
                                                        px-5
                                                        py-2.5
                                                        rounded-xl
                                                        font-semibold
                                                    "
                                                >
                                                    Approve
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        rejectStudent(
                                                            student.id,
                                                            student.user_id
                                                        )
                                                    }
                                                    className="
                                                        bg-red-600
                                                        hover:bg-red-700
                                                        text-white
                                                        px-5
                                                        py-2.5
                                                        rounded-xl
                                                        font-semibold
                                                    "
                                                >
                                                    Reject
                                                </button>

                                            </div>

                                        </div>

                                    </div>
                                )
                            )
                        )}

                    </div>
                );

            case "wallet":
                return (
                    <AdminWallet
                        totalRevenue={totalRevenue}
                        lastMonthRevenue={lastMonthRevenue}
                        thisMonthRevenue={thisMonthRevenue}
                        balance={balance}
                        transactions={walletTransactions}
                    />
                );

            case "students":
                return (
                    <AdminStudents
                        students={allStudents}
                    />
                );

            case "tasks":
                return (
                    <AdminTasks
                        tasks={tasksList}
                    />
                );

            case "payments":
                return (
                    <AdminPayments
                        payments={paymentsList}
                    />
                );

            default:
                return (
                    <AdminOverview
                        totalRevenue={totalRevenue}
                        lastMonthRevenue={lastMonthRevenue}
                        thisMonthRevenue={thisMonthRevenue}
                        balance={balance}
                        totalStudents={totalStudents}
                        totalClients={totalClients}
                        activeTasks={activeTasks}
                        completedTasks={completedTasks}
                        pendingVerifications={
                            pendingVerifications
                        }
                    />
                );
        }
    }

    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {
        return (
            <div className="
                min-h-screen
                bg-slate-50
                flex
                items-center
                justify-center
            ">
                <p className="text-slate-500">
                    Loading admin dashboard...
                </p>
            </div>
        );
    }

    const pageTitle =
        getPageTitle();

    // ==================================================
    // ADMIN LAYOUT
    // ==================================================

    return (
        <main className="
            min-h-screen
            bg-slate-50
            flex
        ">

            <AdminSidebar
                activePage={activePage}
                setActivePage={setActivePage}
                logout={logout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex-1 min-w-0">

                <AdminHeader
                    title={pageTitle.title}
                    description={
                        pageTitle.description
                    }
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <section className="
                    p-8
                    overflow-y-auto
                ">
                    {renderContent()}
                </section>

            </div>

        </main>
    );
}