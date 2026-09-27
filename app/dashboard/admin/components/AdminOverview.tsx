"use client";

interface AdminOverviewProps {
    totalRevenue: number;
    lastMonthRevenue: number;
    thisMonthRevenue: number;
    balance: number;

    totalStudents: number;
    totalClients: number;

    activeTasks: number;
    completedTasks: number;
    pendingVerifications: number;
}

export default function AdminOverview({
    totalRevenue,
    lastMonthRevenue,
    thisMonthRevenue,
    balance,
    totalStudents,
    totalClients,
    activeTasks,
    completedTasks,
    pendingVerifications,
}: AdminOverviewProps) {
    return (
        <div className="px-3 sm:px-0 space-y-10 sm:space-y-16">

            {/* ======================================
                DASHBOARD
            ====================================== */}

            <section>

                <div className="mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                        Dashboard
                    </h2>

                    <p className="text-slate-500 mt-2 text-sm sm:text-base">
                        Overview of UniSeV revenue and wallet activity.
                    </p>
                </div>


                {/* REVENUE CARDS */}

                <div className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    xl:grid-cols-4
                    gap-4
                    sm:gap-6
                ">

                    {/* TOTAL REVENUE */}

                    <div className="
                        bg-white
                        border
                        rounded-2xl
                        p-5
                        sm:p-6
                        shadow-sm
                    ">

                        <p className="text-sm text-slate-500">
                            Total Revenue
                        </p>

                        <h2 className="
                            text-2xl
                            font-bold
                            text-blue-600
                            mt-3
                        ">
                            ${totalRevenue.toFixed(2)}
                        </h2>

                        <p className="
                            text-xs
                            text-slate-400
                            mt-2
                        ">
                            Total UniSeV revenue
                        </p>

                    </div>


                    {/* LAST MONTH */}

                    <div className="
                        bg-white
                        border
                        rounded-2xl
                        p-5
                        sm:p-6
                        shadow-sm
                    ">

                        <p className="text-sm text-slate-500">
                            Last Month
                        </p>

                        <h2 className="
                            text-2xl
                            font-bold
                            text-purple-600
                            mt-3
                        ">
                            ${lastMonthRevenue.toFixed(2)}
                        </h2>

                        <p className="
                            text-xs
                            text-slate-400
                            mt-2
                        ">
                            Revenue from last month
                        </p>

                    </div>


                    {/* THIS MONTH */}

                    <div className="
                        bg-white
                        border
                        rounded-2xl
                        p-5
                        sm:p-6
                        shadow-sm
                    ">

                        <p className="text-sm text-slate-500">
                            This Month
                        </p>

                        <h2 className="
                            text-2xl
                            font-bold
                            text-green-600
                            mt-3
                        ">
                            ${thisMonthRevenue.toFixed(2)}
                        </h2>

                        <p className="
                            text-xs
                            text-slate-400
                            mt-2
                        ">
                            Revenue this month
                        </p>

                    </div>


                    {/* BALANCE */}

                    <div className="
                        bg-white
                        border
                        rounded-2xl
                        p-5
                        sm:p-6
                        shadow-sm
                    ">

                        <p className="text-sm text-slate-500">
                            Wallet Balance
                        </p>

                        <h2 className="
                            text-2xl
                            font-bold
                            text-orange-500
                            mt-3
                        ">
                            ${balance.toFixed(2)}
                        </h2>

                        <p className="
                            text-xs
                            text-slate-400
                            mt-2
                        ">
                            Available admin balance
                        </p>

                    </div>

                </div>

            </section>


            {/* ======================================
                PLATFORM STATISTICS
            ====================================== */}

            <section>

                <div className="
                    mb-6
                    sm:mb-8
                    border-b
                    border-slate-200
                    pb-5
                ">

                    <h2 className="
                        text-xl
                        sm:text-2xl
                        font-bold
                        text-slate-900
                    ">
                        Platform Statistics
                    </h2>

                    <p className="
                        text-slate-500
                        mt-2
                        text-sm
                        sm:text-base
                    ">
                        Current activity across the UniSeV platform.
                    </p>

                </div>


                {/* MAIN STATISTICS */}

                <div className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    xl:grid-cols-4
                    gap-4
                    sm:gap-6
                ">

                    {/* STUDENTS */}

                    <div className="
                        bg-white
                        border
                        rounded-2xl
                        p-5
                        sm:p-6
                        shadow-sm
                    ">

                        <p className="text-sm text-slate-500">
                            Total Students
                        </p>

                        <h2 className="
                            text-3xl
                            font-bold
                            text-blue-600
                            mt-3
                        ">
                            {totalStudents}
                        </h2>

                        <p className="
                            text-xs
                            text-slate-400
                            mt-2
                        ">
                            Registered students
                        </p>

                    </div>


                    {/* CLIENTS */}

                    <div className="
                        bg-white
                        border
                        rounded-2xl
                        p-5
                        sm:p-6
                        shadow-sm
                    ">

                        <p className="text-sm text-slate-500">
                            Total Clients
                        </p>

                        <h2 className="
                            text-3xl
                            font-bold
                            text-indigo-600
                            mt-3
                        ">
                            {totalClients}
                        </h2>

                        <p className="
                            text-xs
                            text-slate-400
                            mt-2
                        ">
                            Registered clients
                        </p>

                    </div>


                    {/* ACTIVE TASKS */}

                    <div className="
                        bg-white
                        border
                        rounded-2xl
                        p-5
                        sm:p-6
                        shadow-sm
                    ">

                        <p className="text-sm text-slate-500">
                            Active Tasks
                        </p>

                        <h2 className="
                            text-3xl
                            font-bold
                            text-green-600
                            mt-3
                        ">
                            {activeTasks}
                        </h2>

                        <p className="
                            text-xs
                            text-slate-400
                            mt-2
                        ">
                            Currently assigned
                        </p>

                    </div>


                    {/* COMPLETED TASKS */}

                    <div className="
                        bg-white
                        border
                        rounded-2xl
                        p-5
                        sm:p-6
                        shadow-sm
                    ">

                        <p className="text-sm text-slate-500">
                            Completed Tasks
                        </p>

                        <h2 className="
                            text-3xl
                            font-bold
                            text-purple-600
                            mt-3
                        ">
                            {completedTasks}
                        </h2>

                        <p className="
                            text-xs
                            text-slate-400
                            mt-2
                        ">
                            Successfully completed
                        </p>

                    </div>

                </div>


                {/* VERIFICATION STATISTICS */}

                <div className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    gap-4
                    sm:gap-6
                    mt-4
                    sm:mt-6
                ">

                    <div className="
                        bg-white
                        border
                        rounded-2xl
                        p-5
                        sm:p-6
                        shadow-sm
                    ">

                        <p className="text-sm text-slate-500">
                            Pending Verifications
                        </p>

                        <h2 className="
                            text-3xl
                            font-bold
                            text-orange-500
                            mt-3
                        ">
                            {pendingVerifications}
                        </h2>

                        <p className="
                            text-xs
                            text-slate-400
                            mt-2
                        ">
                            Students awaiting approval
                        </p>

                    </div>

                </div>

            </section>

        </div>
    );
}