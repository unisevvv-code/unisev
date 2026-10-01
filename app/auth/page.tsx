"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TERMS = [
  {
    title: "1. Acceptance of Terms",
    body: "By creating a UniSeV account, you agree to these Terms and Conditions. If you do not agree, you may not use the platform.",
  },
  {
    title: "2. About UniSeV",
    body: "UniSeV is a marketplace that connects university students with clients who need tasks or services completed.",
  },
  {
    title: "3. User Responsibilities",
    body: "Users must provide accurate information, keep their login details secure, communicate respectfully, and use UniSeV lawfully.",
  },
  {
    title: "4. Tasks and Services",
    body: "Clients are responsible for providing accurate task information and agreed payments. Students are responsible for completing accepted tasks as agreed.",
  },
  {
    title: "5. Payments",
    body: "Payments, fees, wallets, and escrow transactions are subject to the payment methods and rules supported by UniSeV.",
  },
  {
    title: "6. Prohibited Activities",
    body: "Users must not use UniSeV for illegal activities, fraud, harassment, scams, or activities that could harm other users or the platform.",
  },
  {
    title: "7. Account Suspension",
    body: "UniSeV may restrict or suspend accounts that violate these Terms or misuse the platform.",
  },
  {
    title: "8. Privacy",
    body: "User information will be handled according to UniSeV's privacy practices and applicable laws.",
  },
  {
    title: "9. Changes to Terms",
    body: "UniSeV may update these Terms when necessary. Users will be responsible for reviewing updated Terms.",
  },
  {
    title: "10. Acceptance",
    body: "By checking the agreement box and creating an account, the user confirms that they have read and accepted these Terms and Conditions.",
  },
];

export default function AuthPage() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  // Put the cursor in the email field on load and when switching modes
  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passwordValid = Object.values(passwordChecks).every(Boolean);

  async function handleSignUp() {
    if (!passwordValid) {
      alert("Your password does not meet all the requirements.");
      return;
    }

    if (!agreed) {
      alert("You must agree to the UniSeV Terms and Conditions to create an account.");
      return;
    }

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

    } catch (err: unknown) {
  alert(err instanceof Error ? err.message : "Something went wrong");
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

    } catch (err: unknown) {
  alert(err instanceof Error ? err.message : "Something went wrong");
} finally {
      setLoading(false);
    }
  }

  const requirement = (met: boolean, label: string) => (
    <li className={met ? "text-green-600" : "text-gray-500"}>
      {met ? "✓" : "○"} {label}
    </li>
  );

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-6">

      <div className="bg-white p-6 sm:p-8 rounded-xl shadow w-full max-w-105 space-y-4">

        <h1 className="text-2xl font-bold text-center">
          {mode === "signup" ? "Create Account" : "Login"}
        </h1>

        <input
          ref={emailRef}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full border p-3 rounded caret-black text-base"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full border p-3 rounded caret-black text-base"
        />

        {mode === "signup" && (
          <>
            <ul className="text-xs space-y-1">
              {requirement(passwordChecks.length, "At least 8 characters")}
              {requirement(passwordChecks.uppercase, "At least one uppercase letter (A–Z)")}
              {requirement(passwordChecks.lowercase, "At least one lowercase letter (a–z)")}
              {requirement(passwordChecks.number, "At least one number (0–9)")}
              {requirement(passwordChecks.special, "At least one special character (@, #, $, %, !)")}
            </ul>

            <div className="flex items-start gap-2 text-sm">
              <input
                id="agree-terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              <span>
                <label htmlFor="agree-terms">I agree to the UniSeV </label>
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-blue-600 underline"
                >
                  Terms and Conditions
                </button>
              </span>
            </div>
          </>
        )}

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

      {/* TERMS MODAL */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow w-full max-w-140 max-h-[85dvh] flex flex-col">
            <div className="p-4 sm:p-6 border-b">
              <h2 className="text-lg sm:text-xl font-bold">UniSeV Terms and Conditions</h2>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm">
              {TERMS.map((section) => (
                <div key={section.title}>
                  <h3 className="font-semibold">{section.title}</h3>
                  <p className="text-gray-700">{section.body}</p>
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-6 border-t flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="w-full border py-3 rounded"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreed(true);
                  setShowTerms(false);
                }}
                className="w-full bg-black text-white py-3 rounded"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
  
}