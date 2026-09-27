"use client";

interface AdminSidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
    logout: () => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminSidebar({
    activePage,
    setActivePage,
    logout,
    isOpen,
    onClose,
}: AdminSidebarProps) {

    const menuItems = [
        { id: "dashboard", label: "Dashboard" },
        { id: "verifications", label: "Student Verification" },
        { id: "students", label: "Students" },
        { id: "tasks", label: "Tasks" },
        { id: "payments", label: "Payments" },
        { id: "wallet", label: "Admin Wallet" },
    ];

    function handleSelect(pageId: string) {
        setActivePage(pageId);
        onClose();
    }

    return (
        <>
            {/* BACKDROP, mobile only, shown when drawer open */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="md:hidden fixed inset-0 z-40 bg-black/50"
                />
            )}

            {/* SIDEBAR / DRAWER */}
            <aside
                className={`
                    w-64
                    min-h-screen
                    bg-white
                    text-slate-900
                    flex
                    flex-col
                    border-r
                    border-slate-200

                    fixed
                    md:static
                    inset-y-0
                    left-0
                    z-50
                    md:z-auto

                    transition-transform
                    duration-200
                    ease-in-out

                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    md:translate-x-0
                `}
            >

                {/* ADMIN BRAND */}
                <div className="px-6 py-7 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            UniSeV
                        </h1>

                        <p className="text-xs text-slate-500 mt-1">
                            Administration Panel
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Close menu"
                        className="
                            md:hidden
                            w-9
                            h-9
                            rounded-lg
                            flex
                            items-center
                            justify-center
                            text-slate-500
                            hover:bg-slate-100
                        "
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-5 h-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* MENU */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">

                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() =>
                                handleSelect(item.id)
                            }
                            className={`
                                w-full
                                text-left
                                px-4
                                py-3
                                rounded-xl
                                transition
                                ${
                                    activePage === item.id
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }
                            `}
                        >
                            {item.label}
                        </button>
                    ))}

                </nav>

                {/* ADMIN ACCOUNT */}
                <div className="border-t border-slate-200 p-4">

                    <div className="flex items-center gap-3 p-3 mb-3">

                        <div
                            className="
                                w-10
                                h-10
                                rounded-full
                                bg-blue-600
                                flex
                                items-center
                                justify-center
                                font-bold
                                text-white
                                shrink-0
                            "
                        >
                            A
                        </div>

                        <div className="min-w-0">

                            <p className="font-semibold text-sm truncate">
                                Administrator
                            </p>

                            <p className="text-xs text-slate-500">
                                Admin
                            </p>

                        </div>

                    </div>

                    {/* LOGOUT */}
                    <button
                        onClick={logout}
                        className="
                            w-full
                            px-4
                            py-3
                            rounded-xl
                            text-red-500
                            hover:bg-red-50
                            transition
                            text-left
                        "
                    >
                        Logout
                    </button>

                </div>

            </aside>

        </>
    );
}