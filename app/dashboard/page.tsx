"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardRouter() {
    const router = useRouter();

    useEffect(() => {
        async function routeUser() {
            const { data: userData } = await supabase.auth.getUser();

            if (!userData.user) {
                router.replace("/auth");
                return;
            }

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", userData.user.id)
                .single();

            if (error || !profile) {
                router.replace("/onboarding");
                return;
            }

            if (profile.role === "client") {
                router.replace("/dashboard/client");
            } else {
                router.replace("/dashboard/student");
            }
        }

        routeUser();
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
}