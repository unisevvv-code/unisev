"use client";

interface ClientProfileData {
    bio: string;
}

interface ClientProfileProps {
    name: string;
    setName: (name: string) => void;
    profile: ClientProfileData;
    setProfile: React.Dispatch<React.SetStateAction<ClientProfileData>>;
    saveProfile: () => void;
}

export default function ClientProfile({
    name,
    setName,
    profile,
    setProfile,
    saveProfile,
}: ClientProfileProps) {

    const initials =
        name
            ?.split(" ")
            .filter(Boolean)
            .map((word) => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "CL";

    return (
        <div className="max-w-5xl">

            {/* PAGE TITLE */}
            <div className="mb-8">

                <h2 className="text-3xl font-bold text-gray-900">
                    Client Profile
                </h2>

                <p className="text-gray-500 mt-1">
                    Manage your profile information
                </p>

            </div>


            {/* PROFILE CARD */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

                <div className="p-8">

                    <div className="grid grid-cols-[280px_1fr] gap-10">


                        {/* LEFT PROFILE SECTION */}
                        <div className="flex flex-col items-center text-center">

                            {/* AVATAR */}
                            <div
                                className="
                                    w-32
                                    h-32
                                    rounded-full
                                    bg-blue-600
                                    text-white
                                    flex
                                    items-center
                                    justify-center
                                    text-4xl
                                    font-bold
                                    shadow-sm
                                "
                            >
                                {initials}
                            </div>


                            {/* NAME */}
                            <input
                                value={name}
                                onChange={(e) =>
                                    setName(e.target.value)
                                }
                                placeholder="Client name"
                                className="
                                    mt-5
                                    w-full
                                    text-center
                                    text-xl
                                    font-bold
                                    bg-transparent
                                    border-b
                                    border-transparent
                                    focus:border-gray-300
                                    outline-none
                                    pb-1
                                "
                            />


                            {/* ROLE */}
                            <p className="text-gray-500 mt-1">
                                Client
                            </p>

                        </div>


                        {/* RIGHT EDITING SECTION */}
                        <div>

                            <h3 className="text-lg font-semibold text-gray-900 mb-5">
                                Profile Information
                            </h3>


                            {/* BIO */}
                            <div>

                                <label className="text-sm font-medium text-gray-700 block mb-2">
                                    Bio
                                </label>

                                <textarea
                                    value={profile.bio}
                                    onChange={(e) =>
                                        setProfile({
                                            ...profile,
                                            bio: e.target.value,
                                        })
                                    }
                                    rows={7}
                                    placeholder="Tell students a bit about yourself or your organization..."
                                    className="
                                        w-full
                                        border
                                        border-gray-200
                                        rounded-xl
                                        p-4
                                        resize-none
                                        outline-none
                                        focus:ring-2
                                        focus:ring-blue-100
                                        focus:border-blue-500
                                    "
                                />

                            </div>


                            {/* SAVE */}
                            <div className="flex justify-end mt-5">

                                <div className="flex justify-center mt-5">
  <button
    onClick={saveProfile}
    className="
      bg-blue-600
      text-white
      px-8
      py-2.5
      rounded-xl
      font-semibold
      hover:bg-blue-700
      transition
    "
  >
    Save Profile
  </button>
</div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}