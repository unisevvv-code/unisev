"use client";

import { useRef, useState } from "react";
import {
    SquarePen,
    HelpCircle,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    UploadCloud,
    LayoutGrid,
    Calendar,
    RotateCcw,
    Send,
    Lightbulb,
    CheckCircle2,
    Eye,
    FileText,
    Award,
    GraduationCap,
    Wallet as WalletIcon,
    X,
    Users,
    UserPlus,
    DollarSign,
} from "lucide-react";

interface PostTaskProps {
    files: File[];
    setFiles: (files: File[]) => void;

    title: string;
    setTitle: (value: string) => void;

    description: string;
    setDescription: (value: string) => void;

    category: string;
    setCategory: (value: string) => void;

    recommendedPrice: string;
    setRecommendedPrice: (value: string) => void;

    expectedDay: string;
    setExpectedDay: (value: string) => void;

    expectedMonth: string;
    setExpectedMonth: (value: string) => void;

    createTask: () => void;
    createMultiTask: (data: {
        title: string;
        description: string;
        category: string;
        participants: string;
        rewardPerParticipant: string;
        durationMinutes: string;
        files: File[];
    }) => Promise<boolean>;

    // True while a create request (single or multi) is in flight.
    // Used to disable the submit buttons and block double-submits.
    isSubmitting: boolean;
}

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 2000;

/**
 * Lucide icons don't accept a `title` prop (their props are
 * Omit<LucideProps, "ref">, which has no `title`), so the native tooltip
 * lives on a wrapping span instead. The span also carries the accessible
 * name, and the icon itself is hidden from assistive tech.
 */
function HelpTip({ text }: { text: string }) {
    return (
        <span
            title={text}
            role="img"
            aria-label={text}
            className="flex items-center"
        >
            <HelpCircle className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </span>
    );
}

export default function PostTask({
    files,
    setFiles,
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    recommendedPrice,
    setRecommendedPrice,
    expectedDay,
    setExpectedDay,
    expectedMonth,
    setExpectedMonth,
    createTask,
    createMultiTask,
    isSubmitting,
}: PostTaskProps) {
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const multiFileInputRef = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [taskType, setTaskType] = useState<"single" | "multi">("single");

    // Multi-task state
    const [multiTitle, setMultiTitle] = useState("");
    const [multiDescription, setMultiDescription] = useState("");
    const [multiCategory, setMultiCategory] = useState("");
    const [participants, setParticipants] = useState("5");
    const [rewardPerParticipant, setRewardPerParticipant] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("");
    const [multiFiles, setMultiFiles] = useState<File[]>([]);
    const [isMultiDragging, setIsMultiDragging] = useState(false);

    const categories = [
        { name: "Data Entry", price: 10 },
        { name: "Virtual Assistant", price: 12 },
        { name: "Transcription", price: 10 },
        { name: "Translation", price: 15 },
        { name: "Proofreading", price: 10 },
        { name: "Content Writing", price: 20 },
        { name: "Copywriting", price: 35 },
        { name: "Resume Writing", price: 25 },
        { name: "Scholarship Application Assistance", price: 25 },
        { name: "Logo Design", price: 25 },
        { name: "Flyer/Poster Design", price: 20 },
        { name: "Illustration", price: 35 },
        { name: "Video Editing", price: 25 },
        { name: "Short Videos/Reels", price: 15 },
        { name: "Voice Over", price: 20 },
        { name: "Audio Editing", price: 15 },
        { name: "Social Media Management", price: 35 },
        { name: "SEO Audit", price: 35 },
        { name: "Email Marketing", price: 30 },
        { name: "Lead Generation", price: 20 },
        { name: "Market Research", price: 35 },
        { name: "Bookkeeping", price: 35 },
        { name: "Business Plan Writing", price: 75 },
        { name: "Online Tutoring", price: 10 },
        { name: "CAD Design", price: 50 },
        { name: "3D Modeling", price: 35 },
        { name: "Web Design", price: 50 },
        { name: "Landing Page Development", price: 75 },
        { name: "Website Development", price: 150 },
        { name: "WordPress Website", price: 100 },
        { name: "Front-End Development", price: 100 },
        { name: "Back-End Development", price: 150 },
        { name: "Full-Stack Development", price: 500 },
        { name: "E-commerce Store", price: 200 },
        { name: "Mobile App Development", price: 700 },
        { name: "API Development", price: 100 },
        { name: "Bug Fixing", price: 25 },
        { name: "Database Setup", price: 75 },
        { name: "Cloud Setup", price: 150 },
        { name: "AI Chatbot Development", price: 250 },
        { name: "Machine Learning Project", price: 350 },
        { name: "Data Analysis", price: 50 },
        { name: "Dashboard Creation", price: 75 },
        { name: "Arduino Project", price: 50 },
        { name: "IoT Project", price: 75 },
        { name: "Cybersecurity Audit", price: 200 },
        { name: "Others", price: 0 },
    ];

    const multiCategories = [
        { name: "AI Training", price: 5 },
        { name: "App Testing", price: 5 },
        { name: "Web Testing", price: 5 },
        { name: "Survey", price: 5 },
        { name: "Data Collection", price: 5 },
        { name: "Data Annotation", price: 5 },
        { name: "Image Annotation", price: 5 },
        { name: "Content Evaluation", price: 5 },
        { name: "Product Testing", price: 5 },
        { name: "User Research", price: 5 },
        { name: "Market Research", price: 5 },
        { name: "Others", price: 0 },
    ];

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

    const totalMultiBudget =
        (Number(participants) || 0) * (Number(rewardPerParticipant) || 0);

    function wrapSelection(before: string, after: string = before) {
        const textarea = descriptionRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = description.slice(start, end);

        const newValue =
            description.slice(0, start) +
            before +
            selected +
            after +
            description.slice(end);

        setDescription(newValue.slice(0, DESCRIPTION_MAX));

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + before.length,
                start + before.length + selected.length
            );
        });
    }

    function prefixLines(prefix: string) {
        const textarea = descriptionRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const lineStart = description.lastIndexOf("\n", start - 1) + 1;
        let lineEnd = description.indexOf("\n", end);
        if (lineEnd === -1) lineEnd = description.length;

        const selectedLines = description.slice(lineStart, lineEnd);

        const prefixed = selectedLines
            .split("\n")
            .map((line) => (line ? prefix + line : line))
            .join("\n");

        const newValue =
            description.slice(0, lineStart) +
            prefixed +
            description.slice(lineEnd);

        setDescription(newValue.slice(0, DESCRIPTION_MAX));

        requestAnimationFrame(() => textarea.focus());
    }

    function addFiles(newFiles: FileList | File[]) {
        setFiles([...files, ...Array.from(newFiles)]);
    }

    function removeFile(index: number) {
        setFiles(files.filter((_, i) => i !== index));
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files?.length) {
            addFiles(e.dataTransfer.files);
        }
    }

    function addMultiFiles(newFiles: FileList | File[]) {
        setMultiFiles([...multiFiles, ...Array.from(newFiles)]);
    }

    function removeMultiFile(index: number) {
        setMultiFiles(multiFiles.filter((_, i) => i !== index));
    }

    function handleMultiDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsMultiDragging(false);

        if (e.dataTransfer.files?.length) {
            addMultiFiles(e.dataTransfer.files);
        }
    }

    function clearForm() {
        setTitle("");
        setDescription("");
        setCategory("");
        setRecommendedPrice("");
        setExpectedDay("");
        setExpectedMonth("");
        setFiles([]);
    }

    function clearMultiForm() {
        setMultiTitle("");
        setMultiDescription("");
        setMultiCategory("");
        setParticipants("5");
        setRewardPerParticipant("");
        setDurationMinutes("");
        setMultiFiles([]);
    }

    async function handleMultiCreate() {
        if (isSubmitting) return;

        if (
            !multiTitle.trim() ||
            !multiDescription.trim() ||
            !multiCategory ||
            !participants ||
            !rewardPerParticipant ||
            !durationMinutes
        ) {
            alert("Please complete all required Multi Task fields.");
            return;
        }

        const created = await createMultiTask({
            title: multiTitle,
            description: multiDescription,
            category: multiCategory,
            participants,
            rewardPerParticipant,
            durationMinutes,
            files: multiFiles,
        });

        if (created) {
            clearMultiForm();
        }
    }

    return (
        <div className="max-w-6xl">
            {/* HEADER */}
            <div className="flex items-start justify-between gap-3 flex-wrap sm:items-center sm:gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center sm:w-11 sm:h-11">
                        {taskType === "single" ? (
                            <SquarePen className="w-5 h-5" />
                        ) : (
                            <Users className="w-5 h-5" />
                        )}
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                            {taskType === "single"
                                ? "Post Task"
                                : "Post a Multi Task"}
                        </h2>

                        <p className="text-gray-500 text-sm mt-0.5">
                            {taskType === "single"
                                ? "Create a task and let verified university students handle it for you."
                                : "Create one task that can be completed by multiple students."}
                        </p>
                    </div>
                </div>

                {/* TASK TYPE TOGGLE */}
                <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setTaskType("single")}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition sm:px-4 ${
                            taskType === "single"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <SquarePen className="w-3.5 h-3.5" />
                        Single
                    </button>

                    <button
                        type="button"
                        onClick={() => setTaskType("multi")}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition sm:px-4 ${
                            taskType === "multi"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Multi
                    </button>
                </div>
            </div>

            {/* =========================================================
                MULTI TASK
            ========================================================== */}
            {taskType === "multi" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5 sm:gap-6 sm:mt-6">
                    {/* MAIN MULTI TASK FORM */}
                    <div className="lg:col-span-2 bg-white border rounded-2xl p-4 sm:p-6">
                        {/* TITLE */}
                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-gray-900">
                                Task Title{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <HelpTip text="A short, specific title helps students understand your task." />
                        </div>

                        <input
                            value={multiTitle}
                            onChange={(e) =>
                                setMultiTitle(
                                    e.target.value.slice(0, TITLE_MAX)
                                )
                            }
                            maxLength={TITLE_MAX}
                            placeholder="e.g. Test our new mobile application"
                            className="w-full border rounded-xl p-3 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <p className="text-right text-xs text-gray-400 mt-1">
                            {multiTitle.length}/{TITLE_MAX}
                        </p>

                        {/* DESCRIPTION */}
                        <div className="flex items-center gap-1.5 mt-4">
                            <label className="font-semibold text-gray-900">
                                Description{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <HelpTip text="Explain exactly what every participant needs to do." />
                        </div>

                        <textarea
                            value={multiDescription}
                            onChange={(e) =>
                                setMultiDescription(
                                    e.target.value.slice(
                                        0,
                                        DESCRIPTION_MAX
                                    )
                                )
                            }
                            maxLength={DESCRIPTION_MAX}
                            placeholder="Describe the task, instructions, requirements, what each participant should submit, and any important information..."
                            className="w-full border rounded-xl p-3 mt-2 h-36 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none sm:h-40"
                        />

                        <p className="text-right text-xs text-gray-400 mt-1">
                            {multiDescription.length}/{DESCRIPTION_MAX}
                        </p>

                        {/* CATEGORY */}
                        <div className="flex items-center gap-1.5 mt-5">
                            <label className="font-semibold text-gray-900">
                                Category{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <HelpTip text="Choose the category that best describes the task." />
                        </div>

                        <div className="flex items-center border rounded-xl mt-2 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                            <span className="pl-3 pr-2 text-blue-500 flex items-center shrink-0">
                                <LayoutGrid className="w-4 h-4" />
                            </span>

                            <select
                                value={multiCategory}
                                onChange={(e) => {
                                    setMultiCategory(e.target.value);
                                }}
                                className="w-full py-3 pr-3 bg-transparent appearance-none focus:outline-none"
                            >
                                <option value="">Select Category</option>

                                {multiCategories.map((cat) => (
                                    <option
                                        key={cat.name}
                                        value={cat.name}
                                    >
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* AMOUNT PER STUDENT + PARTICIPANTS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <label className="font-semibold text-gray-900">
                                        Amount Per Student{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <HelpTip text="Each student receives this amount for completing their assigned slot." />
                                </div>

                                <div className="flex items-center border rounded-xl mt-2 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                    <span className="pl-3 pr-2 text-green-600">
                                        <DollarSign className="w-4 h-4" />
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={rewardPerParticipant}
                                        onChange={(e) =>
                                            setRewardPerParticipant(
                                                e.target.value
                                            )
                                        }
                                        placeholder="5.00"
                                        className="w-full py-3 pr-3 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-1.5">
                                    <label className="font-semibold text-gray-900">
                                        Number of Participants{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <HelpTip text="How many students can complete this task independently?" />
                                </div>

                                <div className="flex items-center border rounded-xl mt-2 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                    <span className="pl-3 pr-2 text-blue-500">
                                        <UserPlus className="w-4 h-4" />
                                    </span>

                                    <input
                                        type="number"
                                        min="1"
                                        max="10000"
                                        value={participants}
                                        onChange={(e) =>
                                            setParticipants(e.target.value)
                                        }
                                        className="w-full py-3 pr-3 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* TOTAL BUDGET */}
                        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">
                                        Total Budget
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Participants × amount per student
                                    </p>
                                </div>

                                <p className="text-xl font-bold text-blue-600 sm:text-2xl">
                                    ${totalMultiBudget.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* DURATION */}
                        <div className="flex items-center gap-1.5 mt-5">
                            <label className="font-semibold text-gray-900">
                                Duration{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <HelpTip text="How long each participant has to complete their slot, in minutes." />
                        </div>

                        <div className="flex items-center border rounded-xl mt-2 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                            <span className="pl-3 pr-2 text-blue-500 flex items-center shrink-0">
                                <Calendar className="w-4 h-4" />
                            </span>

                            <input
                                type="number"
                                min="1"
                                value={durationMinutes}
                                onChange={(e) =>
                                    setDurationMinutes(e.target.value)
                                }
                                placeholder="e.g. 30"
                                className="w-full py-3 pr-3 focus:outline-none"
                            />

                            <span className="pr-3 text-sm text-gray-400 shrink-0">
                                minutes
                            </span>
                        </div>

                        {/* UPLOAD FILES */}
                        <div className="flex items-center gap-1.5 mt-5">
                            <label className="font-semibold text-gray-900">
                                Upload Files{" "}
                                <span className="text-gray-400 font-normal">
                                    (Optional)
                                </span>
                            </label>

                            <HelpTip text="Attach instructions, reference material, screenshots, or other files." />
                        </div>

                        <div
                            onClick={() =>
                                multiFileInputRef.current?.click()
                            }
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsMultiDragging(true);
                            }}
                            onDragLeave={() => setIsMultiDragging(false)}
                            onDrop={handleMultiDrop}
                            className={`mt-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition sm:p-8 ${
                                isMultiDragging
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                            <UploadCloud className="w-8 h-8 text-blue-500 mx-auto" />

                            <p className="font-semibold text-gray-900 mt-2">
                                Click to upload files{" "}
                                <span className="font-normal text-gray-500">
                                    or drag and drop
                                </span>
                            </p>

                            <p className="text-sm text-gray-400 mt-1">
                                PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                            </p>

                            <input
                                ref={multiFileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (!e.target.files) return;

                                    addMultiFiles(e.target.files);
                                    e.target.value = "";
                                }}
                            />
                        </div>

                        {multiFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {multiFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between text-sm bg-gray-50 border rounded-lg px-3 py-2"
                                    >
                                        <span className="text-gray-600 truncate">
                                            📎 {file.name}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeMultiFile(index)
                                            }
                                            className="text-gray-400 hover:text-red-500 shrink-0 ml-2"
                                            title="Remove file"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MULTI TASK SIDEBAR */}
                    <div className="space-y-4 sm:space-y-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-5">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 shrink-0 rounded-lg bg-white text-blue-600 flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>

                                <h3 className="font-bold text-gray-900">
                                    How Multi Task Works
                                </h3>
                            </div>

                            <div className="mt-4 space-y-4">
                                {[
                                    "Set the number of students needed",
                                    "Set the reward each student receives",
                                    "Students claim available slots",
                                    "Each student completes their own slot",
                                    "Payment is handled per completed slot",
                                ].map((step, index) => (
                                    <div
                                        key={step}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="w-7 h-7 shrink-0 rounded-full bg-white text-blue-600 flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </div>

                                        <p className="text-sm text-gray-700 pt-1">
                                            {step}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border rounded-2xl p-4 sm:p-5">
                            <div className="flex items-center gap-2">
                                <Eye className="w-5 h-5 text-gray-500" />
                                <h3 className="font-bold text-gray-900">
                                    Task Preview
                                </h3>
                            </div>

                            {multiTitle || multiDescription ? (
                                <div className="mt-4 border rounded-xl p-4">
                                    {multiTitle && (
                                        <p className="font-semibold text-gray-900">
                                            {multiTitle}
                                        </p>
                                    )}

                                    {multiDescription && (
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-4 whitespace-pre-wrap">
                                            {multiDescription}
                                        </p>
                                    )}

                                    {multiCategory && (
                                        <span className="inline-block mt-3 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-2.5 py-1">
                                            {multiCategory}
                                        </span>
                                    )}

                                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                        <span className="text-xs text-gray-500">
                                            {participants} participants
                                        </span>

                                        <span className="text-sm font-bold text-blue-600">
                                            ${totalMultiBudget.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 border border-dashed rounded-xl p-6 text-center">
                                    <FileText className="w-8 h-8 text-gray-300 mx-auto" />

                                    <p className="text-sm font-semibold text-gray-600 mt-2">
                                        Your task details will appear here
                                    </p>

                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Fill the form to see a preview
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white border rounded-2xl p-4 sm:p-5">
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-orange-500" />
                                <h3 className="font-bold text-gray-900">
                                    Good for Multi Tasks
                                </h3>
                            </div>

                            <div className="mt-4 space-y-4">
                                {[
                                    [
                                        "AI Training",
                                        "Collect multiple independent responses or ratings",
                                    ],
                                    [
                                        "App Testing",
                                        "Have several students test the same app",
                                    ],
                                    [
                                        "Web Testing",
                                        "Get feedback from multiple users",
                                    ],
                                    [
                                        "Surveys & Data Collection",
                                        "Collect responses from many participants",
                                    ],
                                ].map(([heading, text]) => (
                                    <div
                                        key={heading}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="w-9 h-9 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>

                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {heading}
                                            </p>

                                            <p className="text-xs text-gray-500">
                                                {text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="bg-white border rounded-2xl p-4 sm:p-5">
                            <h3 className="font-bold text-gray-900">
                                Ready to Post?
                            </h3>

                            <p className="text-xs text-gray-500 mt-1">
                                Double-check the details above before
                                publishing your multi task.
                            </p>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <button
                                    type="button"
                                    onClick={clearMultiForm}
                                    disabled={isSubmitting}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Clear
                                </button>

                                <button
                                    type="button"
                                    onClick={handleMultiCreate}
                                    disabled={isSubmitting}
                                    className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSubmitting
                                        ? "Creating..."
                                        : "Create Multi Task"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* =========================================================
                   SINGLE TASK
                ========================================================== */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5 sm:gap-6 sm:mt-6">
                    {/* MAIN FORM */}
                    <div className="lg:col-span-2 bg-white border rounded-2xl p-4 sm:p-6">
                        {/* TASK TITLE */}
                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-gray-900">
                                Task Title{" "}
                                <span className="text-red-500">*</span>
                            </label>

                            <HelpTip text="A short, specific title helps students understand your task at a glance." />
                        </div>

                        <input
                            value={title}
                            onChange={(e) =>
                                setTitle(e.target.value.slice(0, TITLE_MAX))
                            }
                            maxLength={TITLE_MAX}
                            placeholder="e.g. Write a 5-page research on Climate Change"
                            className="w-full border rounded-xl p-3 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <p className="text-right text-xs text-gray-400 mt-1">
                            {title.length}/{TITLE_MAX}
                        </p>

                        {/* DESCRIPTION */}
                        <div className="flex items-center gap-1.5 mt-4">
                            <label className="font-semibold text-gray-900">
                                Description{" "}
                                <span className="text-red-500">*</span>
                            </label>

                            <HelpTip text="Include instructions, requirements, and anything a student needs to get started." />
                        </div>

                        <div className="border rounded-xl mt-2 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                            <div className="flex items-center gap-1 flex-wrap border-b bg-gray-50 px-2 py-2 sm:px-3">
                                <button
                                    type="button"
                                    onClick={() => wrapSelection("**")}
                                    className="p-2 rounded hover:bg-gray-200 text-gray-600"
                                    title="Bold"
                                >
                                    <Bold className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => wrapSelection("_")}
                                    className="p-2 rounded hover:bg-gray-200 text-gray-600"
                                    title="Italic"
                                >
                                    <Italic className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        wrapSelection("<u>", "</u>")
                                    }
                                    className="p-2 rounded hover:bg-gray-200 text-gray-600"
                                    title="Underline"
                                >
                                    <Underline className="w-4 h-4" />
                                </button>

                                <span className="w-px h-5 bg-gray-300 mx-1" />

                                <button
                                    type="button"
                                    onClick={() => prefixLines("- ")}
                                    className="p-2 rounded hover:bg-gray-200 text-gray-600"
                                    title="Bulleted list"
                                >
                                    <List className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => prefixLines("1. ")}
                                    className="p-2 rounded hover:bg-gray-200 text-gray-600"
                                    title="Numbered list"
                                >
                                    <ListOrdered className="w-4 h-4" />
                                </button>
                            </div>

                            <textarea
                                ref={descriptionRef}
                                value={description}
                                onChange={(e) =>
                                    setDescription(
                                        e.target.value.slice(
                                            0,
                                            DESCRIPTION_MAX
                                        )
                                    )
                                }
                                maxLength={DESCRIPTION_MAX}
                                placeholder="Provide clear details about what you need. Include instructions, requirements and any other important information..."
                                className="w-full p-3 h-32 focus:outline-none resize-none sm:h-36"
                            />

                            <p className="text-right text-xs text-gray-400 px-3 pb-2">
                                {description.length}/{DESCRIPTION_MAX}
                            </p>
                        </div>

                        {/* UPLOAD FILES */}
                        <div className="flex items-center gap-1.5 mt-5">
                            <label className="font-semibold text-gray-900">
                                Upload Files{" "}
                                <span className="text-gray-400 font-normal">
                                    (Optional)
                                </span>
                            </label>

                            <HelpTip text="Attach reference material, briefs, or examples — up to 10MB per file." />
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            className={`mt-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition sm:p-8 ${
                                isDragging
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                            <UploadCloud className="w-8 h-8 text-blue-500 mx-auto" />

                            <p className="font-semibold text-gray-900 mt-2">
                                Click to upload files{" "}
                                <span className="font-normal text-gray-500">
                                    or drag and drop
                                </span>
                            </p>

                            <p className="text-sm text-gray-400 mt-1">
                                PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (!e.target.files) return;

                                    addFiles(e.target.files);
                                    e.target.value = "";
                                }}
                            />
                        </div>

                        {files.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {files.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between text-sm bg-gray-50 border rounded-lg px-3 py-2"
                                    >
                                        <span className="text-gray-600 truncate">
                                            📎 {file.name}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="text-gray-400 hover:text-red-500 shrink-0 ml-2"
                                            title="Remove file"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* CATEGORY */}
                        <div className="flex items-center gap-1.5 mt-5">
                            <label className="font-semibold text-gray-900">
                                Category{" "}
                                <span className="text-red-500">*</span>
                            </label>

                            <HelpTip text="Choosing the right category helps the right students find your task." />
                        </div>

                        <div className="flex items-center border rounded-xl mt-2 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                            <span className="pl-3 pr-2 text-blue-500 flex items-center shrink-0">
                                <LayoutGrid className="w-4 h-4" />
                            </span>

                            <select
                                value={category}
                                onChange={(e) => {
                                    const selected = categories.find(
                                        (c) => c.name === e.target.value
                                    );

                                    setCategory(e.target.value);

                                    setRecommendedPrice(
                                        selected
                                            ? String(selected.price)
                                            : ""
                                    );
                                }}
                                className="w-full py-3 pr-3 bg-transparent appearance-none focus:outline-none"
                            >
                                <option value="">Select Category</option>

                                {categories.map((cat) => (
                                    <option
                                        key={cat.name}
                                        value={cat.name}
                                    >
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {category && category !== "Others" && (
                            <div className="border rounded-xl p-3 mt-3 bg-gray-50 text-sm">
                                Recommended Price: ${recommendedPrice}
                            </div>
                        )}

                        {/* EXPECTED COMPLETION DATE */}
                        <div className="flex items-center gap-1.5 mt-5">
                            <label className="font-semibold text-gray-900">
                                Expected Completion Date{" "}
                                <span className="text-red-500">*</span>
                            </label>

                            <HelpTip text="Give students a realistic deadline for the task." />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Completion Day
                                </p>

                                <div className="flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                    <span className="pl-3 pr-2 text-blue-500 flex items-center shrink-0">
                                        <Calendar className="w-4 h-4" />
                                    </span>

                                    <select
                                        value={expectedDay}
                                        onChange={(e) =>
                                            setExpectedDay(e.target.value)
                                        }
                                        className="w-full py-3 pr-3 bg-transparent appearance-none focus:outline-none"
                                    >
                                        <option value="">
                                            Select day
                                        </option>

                                        {days.map((day) => (
                                            <option key={day} value={day}>
                                                {day}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Completion Month
                                </p>

                                <div className="flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                    <span className="pl-3 pr-2 text-blue-500 flex items-center shrink-0">
                                        <Calendar className="w-4 h-4" />
                                    </span>

                                    <select
                                        value={expectedMonth}
                                        onChange={(e) =>
                                            setExpectedMonth(e.target.value)
                                        }
                                        className="w-full py-3 pr-3 bg-transparent appearance-none focus:outline-none"
                                    >
                                        <option value="">
                                            Select month
                                        </option>

                                        {months.map((month) => (
                                            <option
                                                key={month}
                                                value={month}
                                            >
                                                {month}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SIDEBAR */}
                    <div className="space-y-4 sm:space-y-6">
                        {/* POSTING TIPS */}
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-5">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 shrink-0 rounded-lg bg-white text-blue-600 flex items-center justify-center">
                                    <Lightbulb className="w-5 h-5" />
                                </div>

                                <h3 className="font-bold text-gray-900">
                                    Posting Tips
                                </h3>
                            </div>

                            <ul className="mt-4 space-y-2.5">
                                {[
                                    "Be clear and specific",
                                    "Add all important requirements",
                                    "Attach reference files if available",
                                    "Choose the right category",
                                    "Set a realistic completion date",
                                ].map((tip) => (
                                    <li
                                        key={tip}
                                        className="flex items-start gap-2 text-sm text-gray-700"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* TASK PREVIEW */}
                        <div className="bg-white border rounded-2xl p-4 sm:p-5">
                            <div className="flex items-center gap-2">
                                <Eye className="w-5 h-5 text-gray-500" />
                                <h3 className="font-bold text-gray-900">
                                    Task Preview
                                </h3>
                            </div>

                            {title || description ? (
                                <div className="mt-4 border rounded-xl p-4">
                                    {title && (
                                        <p className="font-semibold text-gray-900">
                                            {title}
                                        </p>
                                    )}

                                    {description && (
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-4 whitespace-pre-wrap">
                                            {description}
                                        </p>
                                    )}

                                    {category && (
                                        <span className="inline-block mt-3 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-2.5 py-1">
                                            {category}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-4 border border-dashed rounded-xl p-6 text-center">
                                    <FileText className="w-8 h-8 text-gray-300 mx-auto" />

                                    <p className="text-sm font-semibold text-gray-600 mt-2">
                                        Your task details will appear here
                                    </p>

                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Fill the form to see a preview
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* WHY POST ON UNISEV */}
                        <div className="bg-white border rounded-2xl p-4 sm:p-5">
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-orange-500" />
                                <h3 className="font-bold text-gray-900">
                                    Why Post on UniSeV?
                                </h3>
                            </div>

                            <div className="mt-4 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 shrink-0 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                        <GraduationCap className="w-5 h-5" />
                                    </div>

                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">
                                            Verified Students
                                        </p>

                                        <p className="text-xs text-gray-500">
                                            Work with qualified university
                                            students
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>

                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">
                                            Quality Work
                                        </p>

                                        <p className="text-xs text-gray-500">
                                            Get professional, reliable results
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 shrink-0 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                                        <WalletIcon className="w-5 h-5" />
                                    </div>

                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">
                                            Secure Payments
                                        </p>

                                        <p className="text-xs text-gray-500">
                                            Safe and transparent transactions
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="bg-white border rounded-2xl p-4 sm:p-5">
                            <h3 className="font-bold text-gray-900">
                                Ready to Post?
                            </h3>

                            <p className="text-xs text-gray-500 mt-1">
                                Double-check the details above before
                                publishing your task.
                            </p>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <button
                                    type="button"
                                    onClick={clearForm}
                                    disabled={isSubmitting}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Clear
                                </button>

                                <button
                                    type="button"
                                    onClick={createTask}
                                    disabled={isSubmitting}
                                    className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSubmitting ? "Posting..." : "Post Task"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}