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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  // Put the cursor in the email field on load and when switching modes
  useEffect(() => {
    emailRef.current?.focus();
  }, [mode, awaitingConfirmation]);

  // When the user lands here from the confirmation email link,
  // show the login form with a friendly message
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);

    const fromConfirmationLink =
      hash.includes("access_token") ||
      hash.includes("type=signup") ||
      params.has("code");

    if (!fromConfirmationLink) return;

    const timer = setTimeout(() => {
      setMode("login");
      setNotice("Email confirmed! Please log in to continue.");
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passwordValid = Object.values(passwordChecks).every(Boolean);

  async function handleSignUp() {
    setErrorMessage("");

    if (!passwordValid) {
      setErrorMessage("Your password does not meet all the requirements.");
      return;
    }

    if (!agreed) {
      setErrorMessage("You must agree to the UniSeV Terms and Conditions to create an account.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Confirmation link brings the user back to this page
          // (localhost in development, unisev.vercel.app in production)
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data.user) {
        setErrorMessage("Could not create account");
        return;
      }

      // Email confirmation is on: no session yet, so show the waiting screen
      if (!data.session) {
        setAwaitingConfirmation(true);
        return;
      }

      // Session exists (confirmation off): send NEW users to onboarding.
      // replace() (not push) so the Back button doesn't return to sign in.
      router.replace("/onboarding");

    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setErrorMessage("");

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Users who have not finished their profile (name + client/student)
      // go to onboarding first. If the check fails, fall back to the dashboard.
      // replace() (not push) so the Back button doesn't return to sign in.
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profileError && (!profile || !profile.role)) {
          router.replace("/onboarding");
          return;
        }
      } catch {
        // ignore and continue to dashboard
      }

      router.replace("/dashboard");

    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const requirement = (met: boolean, label: string) => (
    <li className={met ? "text-green-600" : "text-gray-500"}>
      {met ? "✓" : "○"} {label}
    </li>
  );

  // Link that opens the user's inbox, based on their email provider
  function getInboxUrl(address: string) {
    const domain = address.split("@")[1]?.toLowerCase() ?? "";

    if (domain === "gmail.com" || domain === "googlemail.com") {
      return "https://mail.google.com/mail/u/0/#inbox";
    }
    if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) {
      return "https://outlook.live.com/mail/0/inbox";
    }
    if (domain.startsWith("yahoo.")) {
      return "https://mail.yahoo.com/";
    }
    if (domain === "icloud.com" || domain === "me.com") {
      return "https://www.icloud.com/mail";
    }

    // Unknown provider: open the default mail app
    return "mailto:";
  }

  // WAITING FOR EMAIL CONFIRMATION SCREEN
  if (awaitingConfirmation) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-6">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow w-full max-w-105 space-y-4 text-center">
          <h1 className="text-2xl font-bold">Waiting for email confirmation</h1>

          <p className="text-sm text-gray-700">
            We sent a confirmation link to <strong>{email}</strong>. Open your
            email and click the link to confirm your account.
          </p>

          <p className="text-xs text-gray-500">
            Can&apos;t find it? Check your spam folder.
          </p>

          <a
            href={getInboxUrl(email)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded"
          >
            Open my email
          </a>

          <button
            onClick={() => {
              setAwaitingConfirmation(false);
              setMode("login");
              setPassword("");
              setShowPassword(false);
              setErrorMessage("");
              setNotice("After confirming your email, log in below.");
            }}
            className="w-full text-blue-600 text-sm"
          >
            Already confirmed? Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-6">

      <div className="bg-white p-6 sm:p-8 rounded-xl shadow w-full max-w-105 space-y-4">

        <h1 className="text-2xl font-bold text-center">
          {mode === "signup" ? "Create Account" : "Login"}
        </h1>

        {notice && mode === "login" && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3 text-center">
            {notice}
          </p>
        )}

        <input
          ref={emailRef}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full border p-3 rounded caret-black text-base"
        />

        {/* Password field with show/hide eye */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="w-full border p-3 pr-12 rounded caret-black text-base"
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-800"
          >
            {showPassword ? (
              // Eye with a slash: password is visible, click to hide
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              // Open eye: password is hidden, click to show
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

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

        {errorMessage && (
          <p
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3"
          >
            {errorMessage}
          </p>
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
          onClick={() => {
            setMode(mode==="signup" ? "login":"signup");
            setShowPassword(false);
            setErrorMessage("");
          }}
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