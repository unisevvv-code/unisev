import {
    ClipboardList,
    Users,
    ShieldCheck,
    MessageSquare,
    CheckCircle2,
    Wallet as WalletIcon,
    GraduationCap,
} from "lucide-react";

// About UniSeV + "How it works". No props or data needed, so it can be
// dropped into the landing page, a dashboard, or its own page:
//
//   import HowItWorks from "@/components/HowItWorks";
//   <HowItWorks />

const STEPS = [
    {
        icon: ClipboardList,
        tone: "bg-blue-50 text-blue-600",
        title: "A client posts a task",
        text: "Describe what you need, pick a category and set a price. Students can see it straight away.",
    },
    {
        icon: Users,
        tone: "bg-purple-50 text-purple-600",
        title: "Students apply",
        text: "Interested students apply, and can suggest their own price. You review them and pick the best fit.",
    },
    {
        icon: ShieldCheck,
        tone: "bg-green-50 text-green-600",
        title: "The client accepts and pays into escrow",
        text: "Once you accept a student, the payment is held safely in escrow. The student gets paid only when the work is done.",
    },
    {
        icon: MessageSquare,
        tone: "bg-orange-50 text-orange-500",
        title: "Client and student communicate",
        text: "Messaging is open while there is an active task between the two of you. When there's no active task, the conversation closes.",
    },
    {
        icon: GraduationCap,
        tone: "bg-indigo-50 text-indigo-600",
        title: "The student does the work",
        text: "The student completes the task and tells the client it is ready for review.",
    },
    {
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-600",
        title: "The client confirms and payment is released",
        text: "85% goes to the student and 15% is UniSeV's platform fee. If the client doesn't respond, the payment is released automatically after 48 hours.",
    },
    {
        icon: WalletIcon,
        tone: "bg-yellow-50 text-yellow-600",
        title: "The student withdraws",
        text: "Earnings sit in the student's wallet and can be withdrawn to mobile money or a bank account.",
    },
];

export default function HowItWorks() {
    return (
        <section className="max-w-5xl px-3 sm:px-0">

            {/* ABOUT */}

            <div className="relative overflow-hidden bg-linear-to-br from-white to-green-50 border rounded-2xl p-5 sm:p-8">

                <svg
                    className="absolute bottom-0 right-0 w-1/2 sm:w-2/3 h-28 sm:h-40 text-green-100/70 pointer-events-none"
                    viewBox="0 0 400 150"
                    preserveAspectRatio="none"
                    fill="none"
                >
                    <path
                        d="M0,120 C80,60 160,140 240,90 C300,55 340,90 400,40 L400,150 L0,150 Z"
                        fill="currentColor"
                    />
                </svg>

                <div className="relative max-w-2xl">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        About UniSeV
                    </h2>

                    <p className="mt-3 text-gray-600">
                        UniSeV is a student-powered marketplace. Clients get tasks
                        done by capable students, and students earn money from their
                        skills. Every payment is protected by escrow, so both sides
                        can work with confidence.
                    </p>
                </div>

            </div>


            {/* STEPS */}

            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-8">
                How it works
            </h3>

            <ol className="mt-4 space-y-3">

                {STEPS.map((step, index) => {
                    const Icon = step.icon;

                    return (
                        <li
                            key={step.title}
                            className="flex items-start gap-4 bg-white border rounded-2xl p-4 sm:p-5"
                        >

                            <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${step.tone}`}>
                                <Icon className="w-5 h-5" />
                            </div>

                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-400">
                                    STEP {index + 1}
                                </p>

                                <p className="font-semibold text-gray-900 mt-0.5">
                                    {step.title}
                                </p>

                                <p className="text-sm text-gray-600 mt-1">
                                    {step.text}
                                </p>
                            </div>

                        </li>
                    );
                })}

            </ol>

        </section>
    );
}