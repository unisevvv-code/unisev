"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleSignUp() {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      if (!data.user) {
        alert("Could not create account");
        return;
      }

      alert("Account created successfully");

      // Send NEW users to onboarding
      router.push("/onboarding");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
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
          {mode === "signup" ? "Create Account" : "Login"}
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full border p-3 rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full border p-3 rounded"
        />

        <button
          onClick={mode==="signup" ? handleSignUp : handleLogin}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded"
        >
          {loading
            ? "Loading..."
            : mode==="signup"
            ? "Sign Up"
            : "Login"}
        </button>

        <button
          onClick={() =>
            setMode(mode==="signup" ? "login":"signup")
          }
          className="w-full text-blue-600 text-sm"
        >
          {mode==="signup"
            ? "Already have an account? Login"
            : "Don't have an account? Sign up"}
        </button>

      </div>

    </main>
  );
}