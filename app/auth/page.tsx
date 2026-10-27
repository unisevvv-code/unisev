"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// A section is made of blocks: a plain string is a normal paragraph,
// { bold } is an emphasised paragraph, { bullets } is a bullet list.
type TermsBlock = string | { bold: string } | { bullets: string[] };

interface TermsSection {
  title: string;
  blocks: TermsBlock[];
}

const TERMS_EFFECTIVE_DATE = "October 27, 2026";

const TERMS_INTRO: string[] = [
  "By creating an account, accessing, or using UniSeV, you agree to these Terms and Conditions. If you do not agree, you must not use the platform.",
  "UniSeV is a student-focused marketplace that connects clients who need tasks or services completed with students who offer those services. These Terms govern your access to and use of UniSeV, including your account, task listings, applications, communications, payments, withdrawals, and other platform features.",
];

const TERMS: TermsSection[] = [
  {
    title: "1. Eligibility and Account Responsibility",
    blocks: [
      "Users must provide accurate, complete, and up-to-date information when creating and maintaining an account. Users must not impersonate another person, submit false identity information, or create accounts for fraudulent purposes.",
      "You are responsible for maintaining the confidentiality of your login credentials and for activities conducted through your account. UniSeV may request identity verification where necessary for security, trust, legal compliance, or payment processing.",
    ],
  },
  {
    title: "2. Platform Use and User Conduct",
    blocks: [
      "Users must use UniSeV lawfully, honestly, and respectfully. Prohibited activities include fraud, scams, harassment, threats, discrimination, impersonation, submitting misleading task descriptions, manipulating reviews, exploiting platform features, and any activity that threatens the safety or security of other users.",
      "Users must not post tasks that involve illegal activities, academic dishonesty, or services prohibited by UniSeV policies or applicable law.",
    ],
  },
  {
    title: "3. All Payments and Transactions Must Remain on UniSeV",
    blocks: [
      {
        bold: "All payments for tasks, services, and other arrangements initiated through UniSeV must be made and processed through the official UniSeV platform and its authorized payment channels.",
      },
      "Users must not request, encourage, accept, or make off-platform payments for work arranged through UniSeV. This includes attempts to move payments to personal bank accounts, mobile money accounts, external wallets, or other payment services to avoid UniSeV's payment process or applicable fees.",
      "Users must not use UniSeV to connect with another user and then bypass the platform to complete or pay for the agreed task privately.",
      "Where UniSeV provides an escrow or payment-holding feature, the funds will be handled according to the applicable payment terms and the status of the transaction. Users must follow the platform's payment, task-completion, approval, refund, and dispute procedures.",
      "UniSeV will not necessarily be able to verify, recover, or resolve payments made outside its authorized systems. Users who transact off-platform may lose access to payment records, dispute assistance, or other protections available through UniSeV, since UniSeV does not support these.",
    ],
  },
  {
    title: "4. Tasks, Agreements, and Service Delivery",
    blocks: [
      "Clients are responsible for providing clear task descriptions, reasonable requirements, accurate deadlines, and any agreed payment amount. Students are responsible for applying for tasks honestly, completing accepted work to the agreed specifications, communicating professionally, and meeting agreed deadlines.",
      "Users must not accept tasks they have no reasonable intention or ability to complete. Neither party may intentionally misrepresent completed work, withhold relevant information, or manipulate task completion and approval procedures.",
      "Any additional work, changes to the scope of a task, or changes to the agreed price must be communicated and agreed upon through UniSeV.",
    ],
  },
  {
    title: "5. Platform Fees, Wallets, Deposits, and Withdrawals",
    blocks: [
      "Applicable fees, minimum transaction amounts, withdrawal requirements, processing times, and other payment conditions will be communicated through the platform or relevant payment interface where applicable.",
      "Wallet balances displayed on UniSeV are subject to the platform's transaction records, verification procedures, payment-provider confirmations, and applicable terms.",
      "Users must provide accurate payment details and comply with any identity verification or other requirements necessary to process transactions.",
      "UniSeV may delay, reject, reverse, or investigate a transaction where reasonably necessary to address suspected fraud, a payment-provider restriction, a disputed transaction, a security concern, or a legal obligation. Any handling of funds will remain subject to applicable law and the relevant payment-provider rules.",
    ],
  },
  {
    title: "6. Disputes, Refunds, and Complaints",
    blocks: [
      "Users should raise task-related disputes, payment issues, suspected fraud, or complaints through the official UniSeV support or dispute-resolution channels.",
      "Where available, UniSeV may review relevant task details, communications, payment records, and submitted evidence to help determine an appropriate resolution under its policies and applicable law.",
      "Users must provide truthful information and cooperate reasonably with investigations. UniSeV does not guarantee a particular outcome in every dispute.",
    ],
  },
  {
    title: "7. Account Suspension and Permanent Banning",
    blocks: [
      "UniSeV reserves the right to investigate suspected violations and, where reasonably justified, issue warnings, restrict features, suspend accounts, cancel task access, withhold or delay transactions where legally and contractually permitted, or permanently ban users.",
      "Conduct that may result in suspension or permanent banning includes, but is not limited to:",
      {
        bullets: [
          "Making, requesting, or accepting off-platform payments for tasks arranged through UniSeV.",
          "Attempting to bypass UniSeV's payment system, transaction fees, or applicable platform procedures.",
          "Using the platform to commit fraud, scam users, or facilitate illegal activity.",
          "Providing false identity or payment information.",
          "Harassing, threatening, exploiting, or defrauding other users.",
          "Manipulating task listings, reviews, payments, disputes, or account-verification systems.",
          "Repeatedly violating these Terms or refusing to comply with legitimate platform requirements.",
        ],
      },
      {
        bold: "Off-platform payment violations may result in immediate account suspension or permanent banning, depending on the seriousness and circumstances of the violation. UniSeV may take further action where required by law or necessary to protect users and the platform.",
      },
      "Where appropriate and legally permissible, UniSeV may provide an opportunity to respond to a suspension or decision. Account enforcement does not automatically eliminate legitimate outstanding payment obligations or users' rights under applicable law.",
    ],
  },
  {
    title: "8. Privacy and Personal Information",
    blocks: [
      "Users must respect other users' privacy and must not misuse, disclose, sell, or collect personal information obtained through UniSeV without proper authorization or a lawful basis.",
      "Personal information will be handled in accordance with UniSeV's Privacy Policy and applicable data-protection laws.",
    ],
  },
  {
    title: "9. Intellectual Property and Platform Security",
    blocks: [
      "UniSeV's branding, website design, software, logos, and other platform materials are protected by applicable intellectual-property laws, except where otherwise stated.",
      "Users must not copy, reverse-engineer, interfere with, exploit vulnerabilities in, or attempt unauthorized access to UniSeV's systems. Users retain any rights they lawfully hold in content they submit, subject to the permissions necessary for UniSeV to operate and provide its services.",
    ],
  },
  {
    title: "10. Platform Availability and Limitation of Responsibility",
    blocks: [
      "UniSeV may update, modify, suspend, or discontinue features as reasonably necessary for maintenance, security, business operations, or legal compliance.",
      "To the extent permitted by applicable law, UniSeV is not responsible for losses arising from a user's dishonest conduct, inaccurate information, failure to perform an agreed task, unauthorized off-platform transactions, or interruptions caused by third-party payment providers or services.",
      "UniSeV does not guarantee that every task will be completed, every client will find a suitable student, or every transaction will be free from delay or dispute. Nothing in these Terms excludes liability or consumer rights that cannot lawfully be excluded.",
    ],
  },
  {
    title: "11. Changes to These Terms",
    blocks: [
      "UniSeV may update these Terms from time to time. Material changes will be communicated through appropriate platform notices or other reasonable means where required. Continued use of UniSeV after changes take effect constitutes acceptance of the updated Terms to the extent permitted by applicable law. If you disagree with a change, you must stop using the affected services.",
    ],
  },
  {
    title: "12. Applicable Law",
    blocks: [
      "These Terms are subject to the laws of Ghana and any other mandatory laws applicable to the relevant user or transaction. Nothing in these Terms removes any legal rights that users may have under applicable law.",
    ],
  },
  {
    title: "13. Contact and Support",
    blocks: [
      "Questions, complaints, payment disputes, and reports of violations should be submitted through UniSeV's official support channels.",
      "By creating an account or continuing to use UniSeV, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.",
    ],
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
              <p className="mt-1 text-xs text-gray-500">
                Effective date: {TERMS_EFFECTIVE_DATE}
              </p>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm">
              {/* INTRO */}
              <div className="space-y-2">
                {TERMS_INTRO.map((paragraph, i) => (
                  <p key={i} className="text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* SECTIONS */}
              {TERMS.map((section) => (
                <div key={section.title}>
                  <h3 className="font-semibold">{section.title}</h3>

                  <div className="mt-1 space-y-2">
                    {section.blocks.map((block, i) => {
                      if (typeof block === "string") {
                        return (
                          <p key={i} className="text-gray-700">
                            {block}
                          </p>
                        );
                      }

                      if ("bold" in block) {
                        return (
                          <p key={i} className="font-semibold text-gray-900">
                            {block.bold}
                          </p>
                        );
                      }

                      return (
                        <ul
                          key={i}
                          className="list-disc pl-5 space-y-1 text-gray-700"
                        >
                          {block.bullets.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      );
                    })}
                  </div>
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