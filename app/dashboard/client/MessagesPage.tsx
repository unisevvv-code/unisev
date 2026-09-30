"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Image from "next/image";

import { supabase } from "@/lib/supabase";
import StudentProfilePreview from "../student/components/StudentProfilePreview";

type Conversation = {
    userId: string;
    name: string;
    averageRating: number | null;
    totalRatings: number;
    lastMessage: string;
    lastCreatedAt: string;
    unreadCount: number;
};

type Profile = {
    full_name: string | null;
    average_rating: number | null;
    total_ratings: number | null;
};

type Message = {
    id: string;
    sender_id: string;
    receiver_id: string;
    message: string;
    created_at: string;
    read: boolean;
    file_path: string | null;
    file_name: string | null;
    file_type: string | null;
    sender_profile: Profile | null;
    receiver_profile: Profile | null;
};

export default function MessagesPage() {

    const [allMessages, setAllMessages] =
        useState<Message[]>([]);

    const [conversations, setConversations] =
        useState<Conversation[]>([]);

    const [selectedUserId, setSelectedUserId] =
        useState<string | null>(null);

    const [newMessage, setNewMessage] =
        useState("");

    const [messageFile, setMessageFile] =
        useState<File | null>(null);

    const [uploading, setUploading] =
        useState(false);

    const [fileUrls, setFileUrls] =
        useState<Record<string, string>>({});

    const [showEmoji, setShowEmoji] =
        useState(false);

    const EMOJIS = [
        "😀", "😂", "😍", "😊", "😉", "😢", "😭", "😡",
        "👍", "👎", "🙏", "👏", "🎉", "❤️", "🔥", "💯",
        "😴", "🤔", "😎", "🥳", "😱", "🤝", "👋", "✅",
    ];

    const [currentUserId, setCurrentUserId] =
        useState("");

    const [firstLoad, setFirstLoad] =
        useState(true);

    const [showProfile, setShowProfile] =
        useState(false);

    // Mobile-only: the list/chat panes share one column on narrow
    // screens, so this tracks which one is currently visible. Desktop
    // always shows both regardless of this flag.
    const [mobileShowChat, setMobileShowChat] =
        useState(false);

    const textareaRef =
        useRef<HTMLTextAreaElement>(null);

    const messagesEndRef =
        useRef<HTMLDivElement>(null);

    // Tracks how many messages we last scrolled for, per conversation,
    // so polling doesn't re-trigger a scroll when nothing new arrived.
    const lastCountRef =
        useRef<{ userId: string | null; count: number }>({
            userId: null,
            count: 0,
        });

    // Tracks which file paths we've already requested a signed URL for,
    // so the signed-url effect doesn't need `fileUrls` in its deps
    // (which would otherwise re-trigger itself every time it runs).
    const fetchedPathsRef =
        useRef<Set<string>>(new Set());

    const loadMessages = useCallback(async () => {

        const { data: userData } =
            await supabase.auth.getUser();

        if (!userData.user)
            return;

        const myId = userData.user.id;
        setCurrentUserId(myId);

        const { data, error } =
            await supabase
                .from("messages")
                .select(`
                    *,
                    sender_profile:profiles!messages_sender_id_fkey(
                        full_name,
                        average_rating,
                        total_ratings
                    ),
                    receiver_profile:profiles!messages_receiver_id_fkey(
                        full_name,
                        average_rating,
                        total_ratings
                    )
                `)
                .or(
                    `sender_id.eq.${myId},receiver_id.eq.${myId}`
                )
                .order(
                    "created_at",
                    {
                        ascending: true,
                    }
                );

        if (error) {
            console.log(error);
            return;
        }

        const msgs: Message[] = data || [];
        setAllMessages(msgs);

        // -----------------------------------------------------
        // ACTIVE TASK CHECK
        //
        // Only students this client currently has an accepted
        // (not yet completed) task with should still show up as
        // a conversation. Once a task is confirmed complete, the
        // application's status moves past 'accepted', and that
        // student drops out of activeStudentIds below.
        // -----------------------------------------------------

        const {
            data: activeApplications,
            error: activeError,
        } = await supabase
            .from("applications")
            .select("id, status, student_id, tasks!inner(client_id)")
            .eq("tasks.client_id", myId)
            .eq("status", "accepted");

        if (activeError) {
            console.log(
                "ACTIVE APPLICATIONS ERROR:",
                activeError
            );
        }

        const activeStudentIds = new Set(
            (activeApplications || []).map(
                (app: { student_id: string }) => app.student_id
            )
        );

        // Group messages by "the other participant" to build the conversation list
        const convoMap = new Map<string, Conversation>();

        for (const msg of msgs) {

            const otherId =
                msg.sender_id === myId
                    ? msg.receiver_id
                    : msg.sender_id;

            if (!otherId) continue;

            const otherProfile =
                msg.sender_id === myId
                    ? msg.receiver_profile
                    : msg.sender_profile;

            const otherName =
                otherProfile?.full_name;

            const existing = convoMap.get(otherId);

            const isUnreadIncoming =
                msg.receiver_id === myId && !msg.read;

            convoMap.set(otherId, {
                userId: otherId,
                name: otherName || "Unknown",
                averageRating:
                    otherProfile?.average_rating ?? null,
                totalRatings:
                    otherProfile?.total_ratings || 0,
                lastMessage: msg.message,
                lastCreatedAt: msg.created_at,
                unreadCount:
                    (existing?.unreadCount || 0) +
                    (isUnreadIncoming ? 1 : 0),
            });
        }

        // Only keep conversations with a student we currently
        // have an active (accepted, not-yet-completed) task with.
        const convoList = Array.from(convoMap.values())
            .filter((convo) => activeStudentIds.has(convo.userId))
            .sort(
                (a, b) =>
                    new Date(b.lastCreatedAt).getTime() -
                    new Date(a.lastCreatedAt).getTime()
            );

        setConversations(convoList);

        // Auto-select the most recent conversation if nothing is selected yet,
        // or fall to a different one if the previously selected chat's task
        // just got completed and dropped out of the list.
        setSelectedUserId((prev) => {
            if (prev && convoList.some((c) => c.userId === prev)) {
                return prev;
            }
            return convoList[0]?.userId || null;
        });
    }, []);

    const markAsRead = useCallback(async (otherUserId: string) => {

        if (!currentUserId || !otherUserId) return;

        // Optimistically clear locally so the badge disappears instantly
        setAllMessages((prev) =>
            prev.map((msg) =>
                msg.sender_id === otherUserId &&
                msg.receiver_id === currentUserId &&
                !msg.read
                    ? { ...msg, read: true }
                    : msg
            )
        );

        const { error } =
            await supabase
                .from("messages")
                .update({ read: true })
                .eq("sender_id", otherUserId)
                .eq("receiver_id", currentUserId)
                .eq("read", false);

        if (error) {
            console.log(error);
        }
    }, [currentUserId]);

    // Messages belonging to the currently selected conversation.
    const selectedMessages = useMemo(() => {

        if (!selectedUserId) return [];

        return allMessages.filter(
            (msg) =>
                (msg.sender_id === currentUserId &&
                    msg.receiver_id === selectedUserId) ||
                (msg.sender_id === selectedUserId &&
                    msg.receiver_id === currentUserId)
        );

    }, [allMessages, selectedUserId, currentUserId]);

    useEffect(() => {

        // loadMessages sets state only after its internal awaits resolve —
        // not synchronously in this effect body. react-hooks/set-state-in-effect
        // currently flags this "fetch on mount" pattern as a false positive
        // (see https://github.com/react/react/issues/34743).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadMessages();

        const interval =
            setInterval(() => {
                loadMessages();
            }, 2000);

        return () =>
            clearInterval(interval);

    }, [loadMessages]);

    // Scroll to bottom only when switching conversations or when a
    // genuinely new message shows up in the currently selected chat.
    useEffect(() => {

        const current = selectedMessages;

        const switchedConversation =
            lastCountRef.current.userId !== selectedUserId;

        const hasNewMessage =
            current.length > lastCountRef.current.count;

        if (
            current.length > 0 &&
            (switchedConversation || hasNewMessage)
        ) {

            messagesEndRef.current?.scrollIntoView({
                behavior: firstLoad || switchedConversation
                    ? "auto"
                    : "smooth",
            });

            setFirstLoad(false);
        }

        // Already viewing this conversation and a new message just came in
        if (
            !switchedConversation &&
            hasNewMessage &&
            selectedUserId
        ) {
            markAsRead(selectedUserId);
        }

        lastCountRef.current = {
            userId: selectedUserId,
            count: current.length,
        };

    }, [selectedUserId, selectedMessages, firstLoad, markAsRead]);

    // Whenever the selected conversation changes, clear its unread messages
    useEffect(() => {

        if (selectedUserId) {
            // Same false positive as above — markAsRead's setState calls
            // happen after its internal await, not synchronously here.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            markAsRead(selectedUserId);
        }

    }, [selectedUserId, markAsRead]);

    // Generate signed download URLs for any file attachments we haven't
    // fetched yet (private bucket, so we can't just use a public URL).
    useEffect(() => {

        const paths = selectedMessages
            .filter(
                (m) =>
                    m.file_path && !fetchedPathsRef.current.has(m.file_path)
            )
            .map((m) => m.file_path as string);

        if (paths.length === 0) return;

        paths.forEach((p) => fetchedPathsRef.current.add(p));

        supabase.storage
            .from("chat-files")
            .createSignedUrls(paths, 60 * 60)
            .then(({ data, error }) => {
                if (error) {
                    console.log(error);
                    return;
                }

                const next: Record<string, string> = {};

                data?.forEach((item) => {
                    if (item.signedUrl && item.path) {
                        next[item.path] = item.signedUrl;
                    }
                });

                setFileUrls((prev) => ({
                    ...prev,
                    ...next,
                }));
            });

    }, [selectedMessages]);

    async function sendMessage() {

        const { data: userData } =
            await supabase.auth.getUser();

        if (
            !userData.user ||
            (!newMessage.trim() && !messageFile) ||
            !selectedUserId
        )
            return;

        let filePath: string | null = null;
        let fileName: string | null = null;
        let fileType: string | null = null;

        if (messageFile) {
            setUploading(true);

            // Both participants' IDs go in the folder name so the storage
            // policy can check "is this user one of the two in this chat".
            const conversationKey = [
                userData.user.id,
                selectedUserId,
            ]
                .sort()
                .join("_");

            const path = `${conversationKey}/${Date.now()}-${messageFile.name}`;

            const { error: uploadError } =
                await supabase.storage
                    .from("chat-files")
                    .upload(path, messageFile);

            setUploading(false);

            if (uploadError) {
                console.log(uploadError);
                return;
            }

            filePath = path;
            fileName = messageFile.name;
            fileType = messageFile.type;
        }

        const { data, error } =
            await supabase
                .from("messages")
                .insert({
                    sender_id:
                        userData.user.id,

                    receiver_id:
                        selectedUserId,

                    message:
                        newMessage,

                    file_path: filePath,
                    file_name: fileName,
                    file_type: fileType,
                })
                .select(`
                    *,
                    sender_profile:profiles!messages_sender_id_fkey(
                        full_name,
                        average_rating,
                        total_ratings
                    ),
                    receiver_profile:profiles!messages_receiver_id_fkey(
                        full_name,
                        average_rating,
                        total_ratings
                    )
                `);

        if (error) {
            console.log(error);
            return;
        }

        setAllMessages((prev) => [
            ...prev,
            ...((data as Message[]) || []),
        ]);

        setNewMessage("");
        setMessageFile(null);

        if (textareaRef.current) {
            textareaRef.current.style.height =
                "24px";
        }
    }

    const selectedConversation = conversations.find(
        (c) => c.userId === selectedUserId
    );

    function getInitials(name: string) {
        return (
            name
                ?.split(" ")
                .filter(Boolean)
                .map((word) => word[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "?"
        );
    }

    function isEmojiOnly(text: string) {
        if (!text) return false;
        const stripped = text.trim();
        if (!stripped) return false;
        return /^(\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+$/u.test(
            stripped
        );
    }

    return (
        <>
        <div
            className="
                flex
                h-[calc(100dvh-4rem)]
                bg-white
                shadow
                sm:h-175
                sm:rounded-xl
            "
        >

            {/* Conversation list — full-width pane on mobile until a chat
                is opened, fixed 288px sidebar from sm: up */}
            <div
                className={`
                    ${mobileShowChat ? "hidden" : "flex"}
                    w-full
                    flex-col
                    overflow-y-auto
                    sm:flex
                    sm:w-72
                    sm:border-r
                `}
            >

                {conversations.map((convo) => {

                    const hasRating =
                        convo.totalRatings > 0 &&
                        convo.averageRating !== null;

                    return (

                    <button
                        key={convo.userId}
                        onClick={() => {
                            setSelectedUserId(convo.userId);
                            setShowProfile(false);
                            setMobileShowChat(true);
                        }}
                        className={`w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-50 ${
                            convo.userId === selectedUserId
                                ? "bg-gray-100"
                                : ""
                        }`}
                    >

                        <div className="relative shrink-0">

                            <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                                {getInitials(convo.name)}
                            </div>

                            {hasRating && (
                                <div
                                    className="
                                        absolute
                                        -top-1.5
                                        -right-1.5
                                        rounded-full
                                        bg-white
                                        border
                                        border-gray-200
                                        shadow
                                        flex
                                        items-center
                                        gap-0.5
                                        font-bold
                                        text-gray-900
                                        text-[10px]
                                        px-1
                                        py-0.5
                                        whitespace-nowrap
                                    "
                                    title={`${convo.totalRatings} rating${
                                        convo.totalRatings === 1 ? "" : "s"
                                    }`}
                                >
                                    <span className="text-yellow-400">★</span>
                                    {Number(convo.averageRating).toFixed(1)}
                                </div>
                            )}

                        </div>

                        <div className="min-w-0 flex-1">

                            <p className="font-semibold truncate">
                                {convo.name}
                            </p>

                            <p
                                className={`text-xs truncate ${
                                    convo.unreadCount > 0
                                        ? "text-black font-semibold"
                                        : "text-gray-500"
                                }`}
                            >
                                {convo.lastMessage}
                            </p>

                        </div>

                        {convo.unreadCount > 0 && (
                            <span
                                className="
                                    shrink-0
                                    min-w-5
                                    h-5
                                    px-1.5
                                    rounded-full
                                    bg-green-500
                                    text-white
                                    text-xs
                                    font-semibold
                                    flex
                                    items-center
                                    justify-center
                                "
                            >
                                {convo.unreadCount}
                            </span>
                        )}

                    </button>
                    );
                })}

                {conversations.length === 0 && (
                    <p className="p-4 text-sm text-gray-500">
                        No conversations yet
                    </p>
                )}

            </div>

            {/* Chat panel — hidden on mobile until a conversation is
                opened, always visible alongside the list from sm: up */}
            <div
                className={`
                    ${mobileShowChat ? "flex" : "hidden"}
                    w-full
                    min-w-0
                    flex-col
                    sm:flex
                    sm:flex-1
                `}
            >

                <div className="w-full border-b flex items-center gap-1 sm:gap-3 p-2 sm:p-4">

                    {/* BACK — mobile only, returns to the conversation list */}
                    <button
                        type="button"
                        onClick={() => setMobileShowChat(false)}
                        className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            text-gray-600
                            hover:bg-gray-100
                            active:bg-gray-100
                            sm:hidden
                        "
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (selectedUserId) setShowProfile(true);
                        }}
                        className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer hover:bg-gray-50 active:bg-gray-50 text-left rounded-lg p-1"
                    >

                        <div className="relative shrink-0">

                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                                {getInitials(selectedConversation?.name || "")}
                            </div>

                            {selectedConversation &&
                                selectedConversation.totalRatings > 0 &&
                                selectedConversation.averageRating !== null && (
                                    <div
                                        className="
                                            absolute
                                            -top-2
                                            -right-2
                                            rounded-full
                                            bg-white
                                            border
                                            border-gray-200
                                            shadow
                                            flex
                                            items-center
                                            gap-0.5
                                            font-bold
                                            text-gray-900
                                            text-[11px]
                                            px-1.5
                                            py-0.5
                                            whitespace-nowrap
                                        "
                                        title={`${selectedConversation.totalRatings} rating${
                                            selectedConversation.totalRatings === 1
                                                ? ""
                                                : "s"
                                        }`}
                                    >
                                        <span className="text-yellow-400">★</span>
                                        {Number(
                                            selectedConversation.averageRating
                                        ).toFixed(1)}
                                    </div>
                                )}

                        </div>

                        <div className="min-w-0">

                            <h2 className="font-bold truncate">
                                {selectedConversation?.name || "Chat"}
                            </h2>

                            <p className="text-sm text-green-500">
                                Online
                            </p>

                        </div>

                    </button>

                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-gray-100">

                    {selectedMessages.map((msg) => {

                        const mine =
                            msg.sender_id ===
                            currentUserId;

                        const isImage =
                            msg.file_type?.startsWith("image/");

                        const fileUrl =
                            msg.file_path
                                ? fileUrls[msg.file_path]
                                : null;

                        return (
                            <div
                                key={msg.id}
                                className={`flex mb-4 ${
                                    mine
                                        ? "justify-end"
                                        : "justify-start"
                                }`}
                            >

                                <div
                                    className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl ${
                                        mine
                                            ? "bg-green-100"
                                            : "bg-white"
                                    }`}
                                >

                                    {msg.file_path && (
                                        isImage ? (
                                            fileUrl ? (
                                                <a
                                                    href={fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download={msg.file_name || undefined}
                                                >
                                                    <Image
                                                        src={fileUrl}
                                                        alt={msg.file_name || "attachment"}
                                                        width={220}
                                                        height={220}
                                                        unoptimized
                                                        className="max-w-55 w-full h-auto rounded-xl mb-1 object-contain"
                                                    />
                                                </a>
                                            ) : (
                                                <p className="text-sm text-gray-400 mb-1">
                                                    Loading image...
                                                </p>
                                            )
                                        ) : (
                                            <a
                                                href={fileUrl || undefined}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={msg.file_name || undefined}
                                                className="
                                                    flex
                                                    items-center
                                                    gap-2
                                                    bg-gray-50
                                                    border
                                                    rounded-xl
                                                    px-3
                                                    py-2
                                                    mb-1
                                                    hover:bg-gray-100
                                                "
                                            >
                                                <span>📎</span>
                                                <span className="text-sm underline truncate">
                                                    {msg.file_name || "Download file"}
                                                </span>
                                            </a>
                                        )
                                    )}

                                    {msg.message && (
                                        <p
                                            className={
                                                isEmojiOnly(msg.message)
                                                    ? "text-4xl leading-normal"
                                                    : "wrap-break-words"
                                            }
                                        >
                                            {msg.message}
                                        </p>
                                    )}

                                </div>

                            </div>
                        );

                    })}

                    <div ref={messagesEndRef} />

                </div>

                <div className="p-2 sm:p-3 border-t bg-white">

                    {messageFile && (
                        <div
                            className="
                                flex
                                items-center
                                gap-2
                                bg-gray-100
                                rounded-xl
                                px-3
                                py-2
                                mb-2
                                text-sm
                            "
                        >
                            <span>📎</span>
                            <span className="truncate flex-1">
                                {messageFile.name}
                            </span>
                            <button
                                onClick={() =>
                                    setMessageFile(null)
                                }
                                className="text-gray-500 hover:text-gray-800"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <div
                        className="
                            w-full
                            border
                            rounded-[28px]
                            px-3
                            py-2
                            sm:px-4
                            flex
                            items-center
                            gap-2
                            sm:gap-3
                            relative
                        "
                    >

                        <label
                            className="
                                cursor-pointer
                                text-2xl
                                text-gray-500
                                pb-1
                                shrink-0
                            "
                        >

                            +

                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {

                                    if (!e.target.files)
                                        return;

                                    setMessageFile(
                                        e.target.files[0]
                                    );

                                }}
                            />

                        </label>

                        <button
                            type="button"
                            onClick={() =>
                                setShowEmoji((prev) => !prev)
                            }
                            className="
                                cursor-pointer
                                text-xl
                                text-gray-500
                                shrink-0
                            "
                        >
                            🙂
                        </button>

                        {showEmoji && (
                            <div
                                className="
                                    absolute
                                    bottom-14
                                    left-0
                                    right-2
                                    sm:right-auto
                                    bg-white
                                    border
                                    rounded-2xl
                                    shadow-lg
                                    p-3
                                    grid
                                    grid-cols-6
                                    sm:grid-cols-8
                                    gap-1
                                    z-10
                                "
                            >
                                {EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                            setNewMessage(
                                                (prev) => prev + emoji
                                            );
                                            setShowEmoji(false);
                                        }}
                                        className="
                                            text-xl
                                            hover:bg-gray-100
                                            rounded-lg
                                            p-1
                                        "
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}

                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            placeholder="Type a message..."
                            rows={1}
                            onChange={(e) => {

                                setNewMessage(
                                    e.target.value
                                );

                                e.target.style.height =
                                    "24px";

                                e.target.style.height =
                                    e.target.scrollHeight +
                                    "px";

                            }}
                            
                            className="
                                flex-1
                                min-w-0
                                resize-none
                                outline-none
                                bg-transparent
                                text-sm
                                max-h-32
                                overflow-auto
                            "
                        />

                        <button
                            onClick={sendMessage}
                            disabled={uploading}
                            className="
                                w-9
                                h-9
                                rounded-full
                                bg-black
                                text-white
                                flex
                                items-center
                                justify-center
                                shrink-0
                                hover:opacity-90
                                transition
                                disabled:opacity-50
                            "
                        >

                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 5l7 7-1.4 1.4-4.6-4.6V19h-2V8.8l-4.6 4.6L5 12z" />
                            </svg>

                        </button>

                    </div>

                </div>

            </div>

        </div>

        {showProfile && selectedUserId && (
            <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowProfile(false)}
            >
                <StudentProfilePreview
                    studentId={selectedUserId}
                    onClose={() => setShowProfile(false)}
                />
            </div>
        )}
        </>
    );
}