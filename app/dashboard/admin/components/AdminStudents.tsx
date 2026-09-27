"use client";

interface Student {
    id: string;
    full_name?: string;
    university?: string;
    student_id?: string;
    phone?: string;
    department?: string;
    level?: string;
    verification_status?: string;
    created_at?: string;
}

interface AdminStudentsProps {
    students: Student[];
}

export default function AdminStudents({
    students,
}: AdminStudentsProps) {

    return (
        <div className="px-3 sm:px-0 space-y-6">

            {/* HEADER */}

            <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Students
                </h2>

                <p className="text-slate-500 mt-2 text-sm sm:text-base">
                    View students registered on the UniSeV platform.
                </p>
            </div>

            {/* STUDENT COUNT */}

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

                <p className="
                    text-3xl
                    font-bold
                    text-blue-600
                    mt-2
                ">
                    {students.length}
                </p>
            </div>

            {/* STUDENTS */}

            {students.length === 0 ? (

                <div className="
                    bg-white
                    border
                    rounded-2xl
                    p-8
                    text-center
                ">
                    <p className="text-slate-500">
                        No students found.
                    </p>
                </div>

            ) : (

                <>

                    {/* MOBILE: CARD LIST */}

                    <div className="md:hidden space-y-3">

                        {students.map((student) => (

                            <div
                                key={student.id}
                                className="
                                    bg-white
                                    border
                                    rounded-2xl
                                    shadow-sm
                                    p-4
                                "
                            >

                                <div className="flex items-start justify-between gap-3">

                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900 truncate">
                                            {student.full_name || "Not provided"}
                                        </p>

                                        <p className="text-sm text-slate-500 mt-0.5">
                                            {student.phone || "No phone"}
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
                                            ${
                                                student.verification_status === "Verified"
                                                    ? "bg-green-50 text-green-600"
                                                    : "bg-orange-50 text-orange-600"
                                            }
                                        `}
                                    >
                                        {student.verification_status || "Not Verified"}
                                    </span>

                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            University
                                        </p>
                                        <p className="text-sm text-slate-700 mt-0.5">
                                            {student.university || "Not provided"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Student ID
                                        </p>
                                        <p className="text-sm text-slate-700 mt-0.5">
                                            {student.student_id || "Not provided"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Department
                                        </p>
                                        <p className="text-sm text-slate-700 mt-0.5">
                                            {student.department || "Not provided"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Level
                                        </p>
                                        <p className="text-sm text-slate-700 mt-0.5">
                                            {student.level || "Not provided"}
                                        </p>
                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>


                    {/* DESKTOP / TABLET: TABLE */}

                    <div className="
                        hidden
                        md:block
                        bg-white
                        border
                        rounded-2xl
                        shadow-sm
                        overflow-hidden
                    ">

                        <div className="overflow-x-auto">

                            <table className="w-full">

                                <thead className="
                                    bg-slate-50
                                    border-b
                                ">

                                    <tr>

                                        <th className="
                                            text-left
                                            px-6
                                            py-4
                                            text-sm
                                            font-semibold
                                            text-slate-600
                                        ">
                                            Student
                                        </th>

                                        <th className="
                                            text-left
                                            px-6
                                            py-4
                                            text-sm
                                            font-semibold
                                            text-slate-600
                                        ">
                                            University
                                        </th>

                                        <th className="
                                            text-left
                                            px-6
                                            py-4
                                            text-sm
                                            font-semibold
                                            text-slate-600
                                        ">
                                            Student ID
                                        </th>

                                        <th className="
                                            text-left
                                            px-6
                                            py-4
                                            text-sm
                                            font-semibold
                                            text-slate-600
                                        ">
                                            Department
                                        </th>

                                        <th className="
                                            text-left
                                            px-6
                                            py-4
                                            text-sm
                                            font-semibold
                                            text-slate-600
                                        ">
                                            Level
                                        </th>

                                        <th className="
                                            text-left
                                            px-6
                                            py-4
                                            text-sm
                                            font-semibold
                                            text-slate-600
                                        ">
                                            Status
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {students.map(
                                        (student) => (

                                            <tr
                                                key={student.id}
                                                className="
                                                    border-b
                                                    last:border-b-0
                                                    hover:bg-slate-50
                                                "
                                            >

                                                <td className="px-6 py-4">

                                                    <div>
                                                        <p className="
                                                            font-semibold
                                                            text-slate-900
                                                        ">
                                                            {student.full_name ||
                                                                "Not provided"}
                                                        </p>

                                                        <p className="
                                                            text-sm
                                                            text-slate-500
                                                            mt-1
                                                        ">
                                                            {student.phone ||
                                                                "No phone"}
                                                        </p>
                                                    </div>

                                                </td>

                                                <td className="
                                                    px-6
                                                    py-4
                                                    text-sm
                                                    text-slate-600
                                                ">
                                                    {student.university ||
                                                        "Not provided"}
                                                </td>

                                                <td className="
                                                    px-6
                                                    py-4
                                                    text-sm
                                                    text-slate-600
                                                ">
                                                    {student.student_id ||
                                                        "Not provided"}
                                                </td>

                                                <td className="
                                                    px-6
                                                    py-4
                                                    text-sm
                                                    text-slate-600
                                                ">
                                                    {student.department ||
                                                        "Not provided"}
                                                </td>

                                                <td className="
                                                    px-6
                                                    py-4
                                                    text-sm
                                                    text-slate-600
                                                ">
                                                    {student.level ||
                                                        "Not provided"}
                                                </td>

                                                <td className="px-6 py-4">

                                                    <span
                                                        className={`
                                                            inline-flex
                                                            px-3
                                                            py-1
                                                            rounded-full
                                                            text-xs
                                                            font-semibold
                                                            ${
                                                                student.verification_status === "Verified"
                                                                    ? "bg-green-50 text-green-600"
                                                                    : "bg-orange-50 text-orange-600"
                                                            }
                                                        `}
                                                    >
                                                        {student.verification_status ||
                                                            "Not Verified"}
                                                    </span>

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </>

            )}

        </div>
    );
}