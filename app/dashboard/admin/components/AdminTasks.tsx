"use client";

interface Task {
    id?: string;
    title?: string;
    description?: string;
    category?: string;
    status?: string;
    recommended_price?: number;
    price?: number;
    budget?: number;
    asking_price?: number;
    expected_completion_date?: string;
    created_at?: string;

    // Multi Task fields (null/undefined on single tasks)
    task_type?: string | null;
    max_participants?: number | null;
    current_participants?: number | null;
    reward_per_participant?: number | null;
    duration_minutes?: number | null;
}

interface AdminTasksProps {
    tasks: Task[];
}

export default function AdminTasks({
    tasks,
}: AdminTasksProps) {

    function isMultiTask(task: Task) {
        return task.task_type === "multi";
    }

    function getAmount(task: Task) {
        if (isMultiTask(task)) {
            return task.reward_per_participant ?? 0;
        }

        return (
            task.recommended_price ??
            task.price ??
            task.budget ??
            task.asking_price ??
            0
        );
    }

    function statusClasses(status?: string) {
        return status === "completed"
            ? "bg-purple-100 text-purple-700"
            : status === "assigned"
            ? "bg-green-100 text-green-700"
            : status === "cancelled"
            ? "bg-red-100 text-red-700"
            : "bg-blue-100 text-blue-700";
    }

    const visibleTasks = tasks.filter(
        (task) => task.status !== "closed"
    );

    return (
        <div className="px-3 sm:px-0 space-y-6">

            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Tasks
                </h1>

                <p className="text-slate-500 mt-1 text-sm sm:text-base">
                    Monitor tasks across the UniSeV platform.
                </p>
            </div>

            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">

                {visibleTasks.length === 0 ? (

                    <div className="p-8 text-center">
                        <p className="text-slate-500">
                            No tasks found.
                        </p>
                    </div>

                ) : (

                    <>

                        {/* MOBILE: CARD LIST */}

                        <div className="md:hidden divide-y">

                            {visibleTasks.map((task) => {

                                const multi = isMultiTask(task);

                                return (
                                    <div
                                        key={task.id}
                                        className="p-4"
                                    >

                                        <div className="flex items-start justify-between gap-3">

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold text-slate-900">
                                                        {task.title || "Untitled Task"}
                                                    </p>

                                                    {multi && (
                                                        <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                                                            Multi Task
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                    {task.description || "No description"}
                                                </p>
                                            </div>

                                            <span
                                                className={`
                                                    shrink-0
                                                    inline-flex
                                                    px-3
                                                    py-1
                                                    rounded-full
                                                    text-xs
                                                    font-semibold
                                                    ${statusClasses(task.status)}
                                                `}
                                            >
                                                {task.status || "Unknown"}
                                            </span>

                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">

                                            <div>
                                                <p className="text-xs text-slate-400">
                                                    Category
                                                </p>
                                                <p className="text-sm text-slate-700 mt-0.5">
                                                    {task.category || "Not specified"}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">
                                                    {multi ? "Reward / Student" : "Amount"}
                                                </p>
                                                <p className="font-semibold text-green-600 mt-0.5">
                                                    ${Number(getAmount(task)).toFixed(2)}
                                                </p>
                                            </div>

                                        </div>

                                        <div className="mt-3">
                                            <p className="text-xs text-slate-400">
                                                {multi ? "Duration" : "Completion Date"}
                                            </p>
                                            <p className="text-sm text-slate-700 mt-0.5">
                                                {multi
                                                    ? `${task.duration_minutes ?? "-"} min`
                                                    : task.expected_completion_date || "Not specified"}
                                            </p>
                                        </div>

                                        {multi && (
                                            <div className="mt-3">
                                                <p className="text-xs text-slate-400">
                                                    Participants
                                                </p>
                                                <p className="text-sm text-slate-700 mt-0.5">
                                                    {task.current_participants ?? 0}
                                                    {task.max_participants !== null &&
                                                    task.max_participants !== undefined
                                                        ? `/${task.max_participants}`
                                                        : ""}
                                                </p>
                                            </div>
                                        )}

                                    </div>
                                );
                            })}

                        </div>


                        {/* DESKTOP / TABLET: TABLE */}

                        <div className="hidden md:block overflow-x-auto">

                            <table className="w-full">

                                <thead className="bg-slate-50 border-b">

                                    <tr>

                                        <th className="text-left p-4 text-sm font-semibold">
                                            Task
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold">
                                            Category
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold">
                                            Amount
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold">
                                            Timeline
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold">
                                            Participants
                                        </th>

                                        <th className="text-left p-4 text-sm font-semibold">
                                            Status
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {visibleTasks.map((task) => {

                                        const multi = isMultiTask(task);

                                        return (
                                            <tr
                                                key={task.id}
                                                className="border-b last:border-b-0 hover:bg-slate-50"
                                            >

                                                <td className="p-4">

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-slate-900">
                                                            {task.title || "Untitled Task"}
                                                        </p>

                                                        {multi && (
                                                            <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                                                                Multi Task
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-slate-500 mt-1 max-w-md truncate">
                                                        {task.description || "No description"}
                                                    </p>

                                                </td>

                                                <td className="p-4 text-sm text-slate-600">
                                                    {task.category || "Not specified"}
                                                </td>

                                                <td className="p-4">

                                                    <span className="font-semibold text-green-600">
                                                        ${Number(getAmount(task)).toFixed(2)}
                                                    </span>

                                                    {multi && (
                                                        <span className="block text-[11px] text-slate-400 mt-0.5">
                                                            per student
                                                        </span>
                                                    )}

                                                </td>

                                                <td className="p-4 text-sm text-slate-600">
                                                    {multi
                                                        ? `${task.duration_minutes ?? "-"} min`
                                                        : task.expected_completion_date || "Not specified"}
                                                </td>

                                                <td className="p-4 text-sm text-slate-600">
                                                    {multi ? (
                                                        <>
                                                            {task.current_participants ?? 0}
                                                            {task.max_participants !== null &&
                                                            task.max_participants !== undefined
                                                                ? `/${task.max_participants}`
                                                                : ""}
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>

                                                <td className="p-4">

                                                    <span
                                                        className={`
                                                            inline-flex
                                                            px-3
                                                            py-1
                                                            rounded-full
                                                            text-xs
                                                            font-semibold
                                                            ${statusClasses(task.status)}
                                                        `}
                                                    >
                                                        {task.status || "Unknown"}
                                                    </span>

                                                </td>

                                            </tr>
                                        );
                                    })}

                                </tbody>

                            </table>

                        </div>

                    </>

                )}

            </div>

        </div>
    );
}