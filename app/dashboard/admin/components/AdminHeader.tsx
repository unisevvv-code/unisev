"use client";

import Image from "next/image";

interface AdminHeaderProps {
    title: string;
    description?: string;
    onMenuClick: () => void;
}

export default function AdminHeader({
    title,
    description,
    onMenuClick,
}: AdminHeaderProps) {
    return (
        <header className="h-16 sm:h-20 bg-black border-b border-gray-800 px-4 sm:px-6 md:px-8 flex justify-between items-center">

            {/* LEFT: MOBILE MENU + LOGO/TITLE */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">

                <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                    className="
                        md:hidden
                        -ml-1
                        w-9 h-9
                        shrink-0
                        rounded-full
                        flex items-center justify-center
                        text-white
                        hover:bg-gray-800
                        transition
                    "
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="white" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                    </svg>
                </button>

                <Image
                    src="/unisev-logo.png"
                    alt="UniSeV"
                    width={140}
                    height={50}
                    className="hidden sm:block h-10 w-auto object-contain"
                />

                <div className="min-w-0">
                    <h1 className="text-base sm:text-xl font-bold text-white truncate">
                        {title}
                    </h1>
                    {description && (
                        <p className="hidden sm:block text-xs text-gray-400 truncate">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {/* RIGHT: AVATAR */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <span className="hidden sm:block text-sm font-semibold text-white">
                    Administrator
                </span>

                <div className="relative">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        A
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-black" />
                </div>
            </div>

        </header>
    );
}