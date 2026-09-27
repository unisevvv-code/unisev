"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Onboarding() {
    const [role, setRole] = useState<"client" | "student" | null>(null);
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    async function saveProfile() {
        try {
            setLoading(true);

            if (!role) {
                alert("Please select a role");
                return;
            }

            if (!fullName.trim()) {
                alert("Please enter your full name");
                return;
            }

            const { data } = await supabase.auth.getUser();

            if (!data.user) {
                alert("No user found. Please login again.");
                return;
            }

            const { error } = await supabase.from("profiles").insert({
                id: data.user.id,
                email: data.user.email,
                role,
                full_name: fullName,
            });

            if (error) {
                alert(error.message);
                return;
            }

            router.push("/dashboard");

        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100">

            <div className="bg-white p-8 rounded-xl shadow w-[420px] space-y-4">

                <h1 className="text-2xl font-bold text-center">
                    Complete Profile
                </h1>

                {/* NAME */}
                <input
                    className="w-full border p-3 rounded"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />

                {/* ROLE */}
                <button
                    onClick={() => setRole("client")}
                    className={`w-full p-3 border rounded ${role === "client" ? "bg-black text-white" : ""
                        }`}
                >
                    Client
                </button>

                <button
                    onClick={() => setRole("student")}
                    className={`w-full p-3 border rounded ${role === "student" ? "bg-black text-white" : ""
                        }`}
                >
                    Student
                </button>

                {/* SUBMIT */}
                <button
                    onClick={saveProfile}
                    disabled={loading}
                    className="w-full bg-black text-white py-3 rounded"
                >
                    {loading ? "Saving..." : "Continue"}
                </button>

            </div>

        </main>
    );
}