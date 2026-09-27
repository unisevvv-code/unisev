"use client";

import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
    return (
        <button
            onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
            Logout
        </button>
    );
}