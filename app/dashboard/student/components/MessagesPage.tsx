"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import ClientProfilePreview from "../../client/ProfilePreview";

// ==========================================
// TYPES
// ==========================================

interface Profile {
  full_name: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  read: boolean;
  created_at: string;
  profiles?: Profile;
  receiver_profile?: Profile;
}

interface ChatEntry extends Message {
  otherId: string;
  otherName: string;
  unreadCount: number;
}

interface SignedUrlResult {
  path: string | null;
  signedUrl: string;
  error?: string | null;
}

export default function MessagesPage() {
  const [allMessages, setAllMessages] =
    useState<Message[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [chatList, setChatList] =
    useState<ChatEntry[]>([]);

  const [selectedChat, setSelectedChat] =
    useState<ChatEntry | null>(null);

  const [newMessage, setNewMessage] =
    useState("");

  const [messageFile, setMessageFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [fileUrls, setFileUrls] =
    useState<Record<string, string>>({});

  // Tracks which file_paths we've already requested a signed URL
  // for, so the fetch effect doesn't need `fileUrls` itself as a
  // dependency (that would re-trigger every time a URL resolves).
  const fetchedPathsRef =
    useRef<Set<string>>(new Set());

  const [showEmoji, setShowEmoji] =
    useState(false);

  const EMOJIS = [
    "😀", "😂", "😍", "😊", "😉", "😢", "😭", "😡",
    "👍", "👎", "🙏", "👏", "🎉", "❤️", "🔥", "💯",
    "😴", "🤔", "😎", "🥳", "😱", "🤝", "👋", "✅",
  ];

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [showProfile, setShowProfile] =
    useState(false);

  // MOBILE VIEW STATE
  // On small screens the list and the open conversation can't both
  // fit side by side, so only one is shown at a time. Tapping a
  // chat switches to the conversation view; the back arrow in the
  // conversation header switches back to the list. Has no effect
  // from the sm breakpoint up, where both panes show together.
  const [showChatOnMobile, setShowChatOnMobile] =
    useState(false);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  const selectedRef =
    useRef<ChatEntry | null>(null);

  const messagesContainerRef =
    useRef<HTMLDivElement>(null);

  const shouldAutoScroll =
    useRef(true);

  useEffect(() => {
    loadMessages();

    const interval = setInterval(
      loadMessages,
      3000
    );

    return () =>
      clearInterval(interval);
  }, []);

  useEffect(() => {
    selectedRef.current =
      selectedChat;
  }, [selectedChat]);

  // If the open chat disappears (e.g. its task just got marked
  // complete and it dropped out of chatList), fall back to the
  // list view on mobile instead of showing an empty conversation.
  useEffect(() => {
    if (!selectedChat) {
      setShowChatOnMobile(false);
    }
  }, [selectedChat]);

  useEffect(() => {
    const container =
      messagesContainerRef.current;

    if (!container) return;

    const handleScroll = () => {
      const distance =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight;

      shouldAutoScroll.current =
        distance < 100;
    };

    container.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      container.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  useEffect(() => {
    if (
      shouldAutoScroll.current
    ) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Generate signed download URLs for any file attachments we haven't
  // fetched yet (private bucket, so we can't just use a public URL).
  useEffect(() => {
    const paths = messages
      .filter(
        (m) =>
          m.file_path &&
          !fetchedPathsRef.current.has(m.file_path)
      )
      .map((m) => m.file_path as string);

    if (paths.length === 0) return;

    paths.forEach((p) =>
      fetchedPathsRef.current.add(p)
    );

    supabase.storage
      .from("chat-files")
      .createSignedUrls(paths, 60 * 60)
      .then(({ data, error }) => {
        if (error) {
          console.log(error);
          return;
        }

        const next: Record<string, string> = {};

        (data as SignedUrlResult[] | null)?.forEach((item) => {
          if (item.signedUrl && item.path) {
            next[item.path] = item.signedUrl;
          }
        });

        setFileUrls((prev) => ({
          ...prev,
          ...next,
        }));
      });
  }, [messages]);

 async function loadMessages() {
    try {
      const { data: userData } =
        await supabase.auth.getUser();

      if (!userData?.user) return;

      const myId =
        userData.user.id;

      setCurrentUserId(myId);

      const {
        data,
        error,
      } = await supabase
        .from("messages")
        .select(`
          *,
          profiles!messages_sender_id_fkey(
            full_name
          ),
          receiver_profile:profiles!messages_receiver_id_fkey(
            full_name
          )
        `)
        .or(
          `sender_id.eq.${myId},receiver_id.eq.${myId}`
        )
        .order("created_at", {
          ascending: true,
        });

      if (error) {
        console.log(error);
        return;
      }

      const all = (data as unknown as Message[]) || [];

      setAllMessages(all);

      // -----------------------------------------------------
      // ACTIVE TASK CHECK
      //
      // Only clients this student currently has an accepted
      // (not yet completed) task with should still show up as
      // a conversation. Once a task is confirmed complete, the
      // application's status moves past 'accepted', and that
      // client drops out of activeClientIds below.
      // -----------------------------------------------------

      const {
        data: activeApplications,
        error: activeError,
      } = await supabase
        .from("applications")
        .select("id, status, tasks!inner(client_id)")
        .eq("student_id", myId)
        .eq("status", "accepted");

      if (activeError) {
        console.log(
          "ACTIVE APPLICATIONS ERROR:",
          activeError
        );
      }

      const activeClientIds = new Set(
        (activeApplications || []).map(
          (app: any) => app.tasks?.client_id
        )
      );

      const chatMap = new Map<string, ChatEntry>();

      all.forEach((msg) => {
        const otherId =
          msg.sender_id === myId
            ? msg.receiver_id
            : msg.sender_id;

        const existing =
          chatMap.get(otherId);

        const isUnreadIncoming =
          msg.receiver_id === myId &&
          !msg.read;

        chatMap.set(otherId, {
          ...msg,
          otherId,
          otherName:
            msg.sender_id === myId
              ? msg.receiver_profile?.full_name || "Client"
              : msg.profiles?.full_name ||
                "Client",
          unreadCount:
            (existing?.unreadCount || 0) +
            (isUnreadIncoming ? 1 : 0),
        });
      });

      // Only keep conversations with a client we currently have
      // an active (accepted, not-yet-completed) task with.
      const chats =
        Array.from(
          chatMap.values()
        ).filter((chat) =>
          activeClientIds.has(chat.otherId)
        );

      setChatList(chats);

      if (
        !selectedRef.current &&
        chats.length
      ) {
        setSelectedChat(chats[0]);
      } else if (
        selectedRef.current &&
        !chats.some(
          (c) => c.otherId === selectedRef.current?.otherId
        )
      ) {
        // The currently-open chat's task just got completed —
        // close it out along with removing it from the list.
        setSelectedChat(chats[0] || null);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function markAsRead(otherId: string) {
    if (!currentUserId || !otherId) return;

    // Optimistically clear locally so the badge disappears instantly
    setAllMessages((prev) =>
      prev.map((msg) =>
        msg.sender_id === otherId &&
        msg.receiver_id === currentUserId &&
        !msg.read
          ? { ...msg, read: true }
          : msg
      )
    );

    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", otherId)
      .eq("receiver_id", currentUserId)
      .eq("read", false);

    if (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (!selectedChat) return;

    const filtered =
      allMessages.filter(
        (msg) => {
          const otherId =
            msg.sender_id ===
            currentUserId
              ? msg.receiver_id
              : msg.sender_id;

          return (
            otherId ===
            selectedChat.otherId
          );
        }
      );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(filtered);
  }, [
    selectedChat,
    allMessages,
    currentUserId,
  ]);

  // Whenever the visible thread contains unread incoming messages
  // (either because we just opened it, or a new one arrived while
  // it was already open), mark them as read.
  useEffect(() => {
    if (!selectedChat) return;

    const hasUnread = messages.some(
      (msg) =>
        msg.receiver_id === currentUserId &&
        !msg.read
    );

    if (hasUnread) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      markAsRead(selectedChat.otherId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, selectedChat, currentUserId]);

  async function sendMessage() {
    if (
      (!newMessage.trim() && !messageFile) ||
      !selectedChat
    ) {
      return;
    }

    let filePath: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    if (messageFile) {
      setUploading(true);

      // Both participants' IDs go in the folder name so the storage
      // policy can check "is this user one of the two in this chat".
      const conversationKey = [
        currentUserId,
        selectedChat.otherId,
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

    await supabase
      .from("messages")
      .insert({
        sender_id:
          currentUserId,
        receiver_id:
          selectedChat.otherId,
        message:
          newMessage,
        file_path: filePath,
        file_name: fileName,
        file_type: fileType,
      });

    setNewMessage("");
    setMessageFile(null);

    loadMessages();
  }

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
        bg-white
        rounded-xl
        shadow
        h-full
        flex
        overflow-hidden
      "
    >

      {/*
        CHAT LIST
        Full width on mobile, fixed 288px sidebar from sm up.
        Hidden on mobile once a conversation is open.
      */}
      <div
        className={`
          w-full
          border-r
          overflow-y-auto
          sm:block
          sm:w-72
          ${showChatOnMobile ? "hidden" : "block"}
        `}
      >

        {chatList.map(
          (chat) => (
            <div
              key={chat.otherId}
              onClick={() => {
                setSelectedChat(chat);
                setShowChatOnMobile(true);
              }}
              className={`
                p-4
                border-b
                cursor-pointer
                hover:bg-gray-100
                flex
                items-center
                justify-between
                gap-2
                ${
                  selectedChat?.otherId ===
                  chat.otherId
                    ? "bg-gray-100"
                    : ""
                }
              `}
            >

              <div className="flex items-center gap-3 min-w-0 flex-1">

                <div
                  className="
                    w-10
                    h-10
                    rounded-full
                    bg-blue-600
                    text-white
                    flex
                    items-center
                    justify-center
                    font-semibold
                    text-sm
                    shrink-0
                  "
                >
                  {getInitials(chat.otherName)}
                </div>

                <div className="min-w-0 flex-1">

                  <p className="font-bold">
                    {chat.otherName}
                  </p>

                  <p
                    className={`
                      text-sm
                      truncate
                      ${
                        chat.unreadCount > 0
                          ? "text-black font-semibold"
                          : "text-gray-500"
                      }
                    `}
                  >
                    {chat.message}
                  </p>

                </div>

              </div>

              {chat.unreadCount > 0 && (
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
                  {chat.unreadCount}
                </span>
              )}

            </div>
          )
        )}

      </div>

      {/*
        CONVERSATION PANE
        Hidden on mobile until a chat is selected; always visible
        from sm up (the classic two-pane layout).
      */}
      <div
        className={`
          flex-1
          flex-col
          overflow-hidden
          sm:flex
          ${showChatOnMobile ? "flex" : "hidden"}
        `}
      >

        <div
          className="
            border-b
            p-3
            sm:p-4
            flex
            items-center
            gap-2
            sm:gap-3
          "
        >

          {/* BACK TO LIST — mobile only */}
          <button
            type="button"
            onClick={() => setShowChatOnMobile(false)}
            className="
              sm:hidden
              -ml-1
              w-8
              h-8
              shrink-0
              flex
              items-center
              justify-center
              rounded-full
              text-xl
              hover:bg-gray-100
            "
            aria-label="Back to conversations"
          >
            ‹
          </button>

          <div
            onClick={() => {
              if (selectedChat) setShowProfile(true);
            }}
            className="
              flex-1
              min-w-0
              flex
              items-center
              gap-3
              cursor-pointer
              hover:bg-gray-50
              rounded-lg
              -m-1
              p-1
            "
          >

            <div
              className="
                w-10
                h-10
                rounded-full
                bg-blue-600
                text-white
                flex
                items-center
                justify-center
                font-semibold
                text-sm
                shrink-0
              "
            >
              {getInitials(selectedChat?.otherName || "")}
            </div>

            <p className="font-bold truncate">
              {selectedChat?.otherName || "Chat"}
            </p>

          </div>

        </div>

        <div
          ref={messagesContainerRef}
          className="
            flex-1
            overflow-y-auto
            p-3
            sm:p-5
            bg-gray-100
          "
        >

          {messages.map(
            (msg) => {
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
                  className={`
                    flex
                    mb-2
                    ${
                      mine
                        ? "justify-end"
                        : "justify-start"
                    }
                  `}
                >

                  <div
                    className={`
                      max-w-[85%]
                      sm:max-w-[70%]
                      p-3
                      rounded-2xl
                      ${
                        mine
                          ? "bg-green-100"
                          : "bg-white"
                      }
                    `}
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fileUrl}
                              alt={msg.file_name || "attachment"}
                              className="max-w-full sm:max-w-55 rounded-xl mb-1"
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
                      <div
                        className={
                          isEmojiOnly(msg.message)
                            ? "text-4xl leading-normal"
                            : "break-words"
                        }
                      >
                        {msg.message}
                      </div>
                    )}

                  </div>

                </div>
              );
            }
          )}

          <div ref={bottomRef} />

        </div>

        <div
          className="
            bg-white
            p-3
            sm:p-4
            border-t
          "
        >

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
              bg-white
              border
              rounded-[30px]
              shadow-md
              px-2
              sm:px-3
              py-2
              flex
              items-end
              gap-1
              sm:gap-2
              w-full
              relative
            "
          >

            <label
              className="
                w-10
                h-10
                sm:w-11
                sm:h-11
                rounded-full
                border-2
                cursor-pointer
                flex
                items-center
                justify-center
                text-2xl
                font-medium
                hover:bg-gray-100
                shrink-0
                transition-all
              "
            >

              <span className="-mt-0.5">
                +
              </span>

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
                w-10
                h-10
                sm:w-11
                sm:h-11
                rounded-full
                border-2
                cursor-pointer
                flex
                items-center
                justify-center
                text-xl
                hover:bg-gray-100
                shrink-0
                transition-all
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
                  max-w-[calc(100vw-2.5rem)]
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
              rows={1}
              value={newMessage}
              placeholder="Type a message..."
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
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="
                flex-1
                min-w-0
                resize-none
                outline-none
                bg-transparent
                max-h-32
                py-2
                overflow-y-auto
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

    {showProfile && selectedChat && (
      <ClientProfilePreview
        clientId={selectedChat.otherId}
        onClose={() => setShowProfile(false)}
      />
    )}
    </>
  );
}