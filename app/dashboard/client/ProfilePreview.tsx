"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ClientProfilePreviewProps {
    clientId: string;
    onClose: () => void;
}

interface ClientProfile {
    full_name: string;
    bio: string;
}

export default function ClientProfilePreview({
    clientId,
    onClose,
}: ClientProfilePreviewProps) {

    const [profile, setProfile] =
        useState<ClientProfile | null>(null);

    const [loading, setLoading] =
        useState(true);

    const loadProfile = useCallback(async () => {

        setLoading(true);

        const { data, error } =
            await supabase
                .from("profiles")
                .select(`
                    full_name,
                    bio
                `)
                .eq("id", clientId)
                .single();

        if (error) {

            console.log(
                "CLIENT PROFILE ERROR:",
                error
            );

            setProfile(null);
            setLoading(false);

            return;
        }

        setProfile(data);
        setLoading(false);
    }, [clientId]);

    useEffect(() => {
        // Initial fetch on mount/clientId change; loadProfile sets the
        // loading flag before its first await so it can show a spinner
        // while the request is in flight (see
        // https://github.com/react/react/issues/34743).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProfile();

        // lock background scroll while the sheet/modal is open
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [clientId, loadProfile]);

    if (loading) {

        return (
            <div
                className="
                    fixed
                    inset-0
                    bg-black/40
                    flex
                    items-center
                    justify-center
                    z-50
                    p-4
                "
            >

                <div
                    className="
                        bg-white
                        rounded-2xl
                        p-6
                        sm:p-8
                        shadow-xl
                        text-sm
                        sm:text-base
                    "
                >
                    Loading profile...
                </div>

            </div>
        );
    }

    if (!profile) {

        return (
            <div
                className="
                    fixed
                    inset-0
                    bg-black/40
                    flex
                    items-end
                    sm:items-center
                    justify-center
                    z-50
                "
                onClick={onClose}
            >

                <div
                    className="
                        bg-white
                        w-full
                        sm:w-auto
                        rounded-t-2xl
                        sm:rounded-2xl
                        p-6
                        sm:p-8
                        shadow-2xl
                        pb-[calc(env(safe-area-inset-bottom)+1.5rem)]
                        sm:pb-8
                    "
                    onClick={(e) =>
                        e.stopPropagation()
                    }
                >

                    <p className="text-sm sm:text-base">
                        Unable to load client profile.
                    </p>

                    <button
                        onClick={onClose}
                        className="
                            mt-4
                            w-full
                            sm:w-auto
                            min-h-11
                            bg-gray-800
                            text-white
                            px-5
                            py-2.5
                            rounded-xl
                        "
                    >
                        Close
                    </button>

                </div>

            </div>
        );
    }

    const initials =
        profile.full_name
            ?.split(" ")
            .filter(Boolean)
            .map((word) => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "CL";

    return (

        <div
            className="
                fixed
                inset-0
                bg-black/40
                flex
                items-end
                sm:items-center
                justify-center
                z-50
            "
            onClick={onClose}
        >

            <div
                className="
                    bg-white
                    w-full
                    sm:max-w-md
                    rounded-t-2xl
                    sm:rounded-2xl
                    shadow-2xl
                    overflow-hidden
                    max-h-[90vh]
                    sm:max-h-[85vh]
                    flex
                    flex-col
                "
                onClick={(e) =>
                    e.stopPropagation()
                }
            >

                {/* drag handle, mobile only */}
                <div className="flex sm:hidden justify-center pt-2 pb-1">
                    <div className="w-10 h-1.5 rounded-full bg-gray-300" />
                </div>

                {/* HEADER */}

                <div
                    className="
                        px-4
                        sm:px-6
                        py-3
                        sm:py-4
                        border-b
                        flex
                        items-center
                        justify-between
                        shrink-0
                    "
                >

                    <h2 className="text-lg sm:text-xl font-bold">
                        Client Profile
                    </h2>

                    <button
                        onClick={onClose}
                        className="
                            w-11
                            h-11
                            sm:w-9
                            sm:h-9
                            flex
                            items-center
                            justify-center
                            rounded-full
                            hover:bg-gray-100
                            active:bg-gray-200
                            text-gray-500
                            text-xl
                        "
                        aria-label="Close"
                    >
                        ×
                    </button>

                </div>

                {/* SCROLLABLE BODY */}
                <div className="overflow-y-auto">

                    {/* PROFILE HEADER */}

                    <div
                        className="
                            px-4
                            sm:px-6
                            py-5
                            sm:py-6
                            flex
                            items-center
                            gap-4
                            sm:gap-5
                        "
                    >

                        <div
                            className="
                                w-16
                                h-16
                                sm:w-20
                                sm:h-20
                                rounded-full
                                bg-blue-600
                                text-white
                                flex
                                items-center
                                justify-center
                                text-xl
                                sm:text-2xl
                                font-bold
                                shrink-0
                            "
                        >
                            {initials}
                        </div>

                        <div className="min-w-0">

                            <h3
                                className="
                                    text-lg
                                    sm:text-xl
                                    font-bold
                                    truncate
                                "
                            >
                                {profile.full_name}
                            </h3>

                            <p className="text-sm sm:text-base text-gray-500">
                                Client
                            </p>

                        </div>

                    </div>


                    {/* BIO */}

                    <div className="px-4 sm:px-6 pb-6">

                        <div
                            className="
                                bg-slate-50
                                rounded-xl
                                p-4
                            "
                        >

                            <p className="text-sm text-gray-500">
                                Bio
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    sm:text-base
                                    text-gray-700
                                    whitespace-pre-wrap
                                    wrap-break-word
                                "
                            >
                                {profile.bio ||
                                    "No bio provided"}
                            </p>

                        </div>

                    </div>

                </div>


                {/* FOOTER */}

                <div
                    className="
                        px-4
                        sm:px-6
                        py-3
                        sm:py-4
                        border-t
                        flex
                        justify-end
                        shrink-0
                        pb-[calc(env(safe-area-inset-bottom)+0.75rem)]
                        sm:pb-4
                    "
                >

                    <button
                        onClick={onClose}
                        className="
                            w-full
                            sm:w-auto
                            min-h-11
                            bg-gray-900
                            text-white
                            px-6
                            py-2.5
                            rounded-xl
                            hover:bg-gray-800
                            active:bg-gray-950
                        "
                    >
                        Close
                    </button>

                </div>

            </div>

        </div>
    );
}