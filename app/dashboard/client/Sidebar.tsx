"use client";

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
    name: string;
    logout: () => void;
    // Drawer open/close is now owned by the parent page (ClientDashboard)
    // so the single hamburger button lives in Header, matching the
    // student dashboard's layout — no more separate white toolbar here.
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({
    activePage,
    setActivePage,
    name,
    logout,
    isOpen,
    onClose,
}: SidebarProps) {

    const initials =
        name
            ?.split(" ")
            .filter(Boolean)
            .map((word) => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "CL";

    function go(page: string) {
        setActivePage(page);
        onClose(); // close drawer after nav on mobile
    }

    const navItems = [
        { key: "dashboard", label: "Dashboard" },
        { key: "post", label: "Post Task" },
        { key: "mytasks", label: "My Tasks" },
        { key: "messages", label: "Messages" },
        { key: "requests", label: "Applications" },
        { key: "wallet", label: "Wallet" },
    ];

    return (
        <>
            {/* BACKDROP, mobile only, shown when drawer open */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 z-40"
                    onClick={onClose}
                />
            )}

            {/* SIDEBAR / DRAWER */}
            <aside
                className={`
                    fixed
                    lg:static
                    top-0
                    left-0
                    z-50
                    lg:z-auto
                    w-72
                    lg:w-64
                    h-full
                    lg:h-auto
                    lg:min-h-[calc(100vh-80px)]
                    bg-white
                    border-r
                    flex
                    flex-col
                    transition-transform
                    duration-300
                    ease-in-out
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    lg:translate-x-0
                `}
            >

                {/* DRAWER HEADER, mobile only */}
                <div className="lg:hidden flex items-center justify-between p-4 border-b">
                    <span className="font-bold text-lg">Menu</span>
                    <button
                        onClick={onClose}
                        className="
                            w-10
                            h-10
                            flex
                            items-center
                            justify-center
                            rounded-full
                            hover:bg-gray-100
                            active:bg-gray-200
                            text-gray-500
                            text-xl
                        "
                        aria-label="Close menu"
                    >
                        ×
                    </button>
                </div>

                {/* MAIN NAVIGATION */}
                <div className="p-4 overflow-y-auto">

                    {navItems.map((item) => (
                        <div
                            key={item.key}
                            onClick={() => go(item.key)}
                            className={`px-4 py-3 mt-1 first:mt-0 rounded-xl cursor-pointer ${
                                activePage === item.key
                                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                                    : "hover:bg-gray-50 active:bg-gray-100"
                            }`}
                        >
                            {item.label}
                        </div>
                    ))}

                </div>


                {/* PUSH PROFILE TO BOTTOM */}
                <div className="mt-auto border-t p-4">

                    {/* PROFILE BUTTON */}
                    <button
                        onClick={() => go("profile")}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${
                            activePage === "profile"
                                ? "bg-indigo-50"
                                : "hover:bg-gray-50 active:bg-gray-100"
                        }`}
                    >

                        {/* AVATAR */}
                        <div
                            className="
                                w-10
                                h-10
                                rounded-full
                                bg-blue-600
                                text-white
                                flex
                                items-center
                                justify-center
                                font-bold
                                shrink-0
                            "
                        >
                            {initials}
                        </div>


                        {/* NAME */}
                        <div className="min-w-0 flex-1">

                            <p className="font-semibold text-sm truncate">
                                {name || "Client"}
                            </p>

                            <p className="text-xs text-gray-500">
                                Client
                            </p>

                        </div>

                    </button>


                    {/* LOGOUT */}
                    <button
                        onClick={logout}
                        className="
                            w-full
                            mt-3
                            py-2.5
                            rounded-xl
                            text-sm
                            text-red-500
                            hover:bg-red-50
                            active:bg-red-100
                            transition
                        "
                    >
                        Logout
                    </button>

                </div>

            </aside>
        </>
    );
}