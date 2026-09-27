"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ProfileData {
  phone: string;
  university: string;
  department: string;
  level: string;
  student_id: string;
  bio: string;
  skills: string;
  verification_status: string;
  verification_document: string;
}

interface ProfileProps {
  studentId: string;
  name: string;
  profile: ProfileData;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData>>;
  verificationFile: File | null;
  setVerificationFile: (file: File | null) => void;
  saveProfile: () => void;
}

export default function Profile({
  studentId,
  name,
  profile,
  setProfile,
  verificationFile,
  setVerificationFile,
  saveProfile,
}: ProfileProps) {
  const isVerified =
    profile.verification_status === "Verified";

  // =========================================================
  // RATING (for the avatar badge + summary line)
  // =========================================================

  const [averageRating, setAverageRating] =
    useState<number | null>(null);

  const [totalRatings, setTotalRatings] =
    useState(0);

  async function loadRating() {
    const { data, error } = await supabase
      .from("profiles")
      .select("average_rating, total_ratings")
      .eq("id", studentId)
      .single();

    if (error) {
      console.log("RATING ERROR:", error);
      return;
    }

    setAverageRating(data?.average_rating ?? null);
    setTotalRatings(data?.total_ratings ?? 0);
  }

  useEffect(() => {
    if (!studentId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRating();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const initials =
    name
      ?.split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "ST";

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-5 sm:mb-6">
        Student Profile
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">

        {/* ================= PROFILE CARD ================= */}
        <div className="w-full lg:w-72 lg:shrink-0">

          <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 text-center">

            {/* AVATAR */}
            <div className="relative w-28 h-28 mx-auto">

              <div
                className="
                  w-28
                  h-28
                  rounded-full
                  bg-blue-600
                  text-white
                  flex
                  items-center
                  justify-center
                  text-4xl
                  font-bold
                "
              >
                {initials}
              </div>

              {/* RATING BADGE */}
              {totalRatings > 0 && averageRating !== null && (
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
                    text-sm
                    px-2.5
                    py-1
                    whitespace-nowrap
                  "
                  title={`${totalRatings} rating${
                    totalRatings === 1 ? "" : "s"
                  }`}
                >
                  <span className="text-yellow-400">★</span>
                  {Number(averageRating).toFixed(1)}
                </div>
              )}

              {/* VERIFIED TICK */}
              {isVerified && (
                <div
                  className="
                    absolute
                    bottom-1
                    right-1
                    w-7
                    h-7
                    rounded-full
                    bg-green-500
                    border-4
                    border-slate-50
                    flex
                    items-center
                    justify-center
                  "
                  title="Verified account"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

            </div>

            {/* NAME */}
            <h3 className="mt-4 text-xl font-bold">
              {name}
            </h3>

            <p className="text-gray-500">
              Student
            </p>

            {/* RATING SUMMARY */}
            {totalRatings > 0 && (
              <p className="mt-2 text-sm text-gray-600 flex items-center justify-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className="font-semibold">
                  {Number(averageRating).toFixed(1)}
                </span>
                <span className="text-gray-400">
                  ({totalRatings} review
                  {totalRatings === 1 ? "" : "s"})
                </span>
              </p>
            )}

            {/* VERIFICATION STATUS */}
            <div className="mt-4">
              <span
                className={`
                  px-3
                  py-1
                  rounded-full
                  text-sm
                  ${
                    isVerified
                      ? "bg-green-100 text-green-700"
                      : profile.verification_status ===
                        "Pending Verification"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }
                `}
              >
                {profile.verification_status}
              </span>
            </div>

            {/*
              SAVE BUTTON
              The big top margin visually balances the card against
              the taller form next to it on desktop. On mobile the
              card and form stack instead, so that gap collapses down
              to a normal spacing value.
            */}
            <button
              onClick={saveProfile}
              className="
                mt-8
                w-full
                bg-blue-600
                text-white
                px-6
                py-3
                rounded-xl
                font-semibold
                hover:bg-blue-700
                transition
                lg:mt-32
              "
            >
              Save Profile
            </button>

          </div>

        </div>


        {/* ================= PROFILE INFORMATION ================= */}
        <div className="flex-1 min-w-0">

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* PHONE */}
            <input
              placeholder="Phone Number"
              value={profile.phone}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  phone: e.target.value,
                })
              }
              className="border p-3 rounded-xl w-full"
            />

            {/* UNIVERSITY */}
            <input
              placeholder="University"
              value={profile.university}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  university: e.target.value,
                })
              }
              className="border p-3 rounded-xl w-full"
            />

            {/* DEPARTMENT */}
            <input
              placeholder="Department"
              value={profile.department}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  department: e.target.value,
                })
              }
              className="border p-3 rounded-xl w-full"
            />

            {/* LEVEL */}
            <input
              placeholder="Level"
              value={profile.level}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  level: e.target.value,
                })
              }
              className="border p-3 rounded-xl w-full"
            />

            {/* STUDENT ID */}
            <input
              placeholder="Student ID"
              value={profile.student_id}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  student_id: e.target.value,
                })
              }
              className="border p-3 rounded-xl w-full sm:col-span-2"
            />

            {/* BIO */}
            <textarea
              placeholder="Bio"
              value={profile.bio}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  bio: e.target.value,
                })
              }
              rows={5}
              className="border p-3 rounded-xl w-full sm:col-span-2"
            />

            {/* SKILLS */}
            <div className="sm:col-span-2">

              <label className="font-semibold block mb-2">
                Skills
              </label>

              <input
                placeholder="React, UI Design, Python, Research..."
                value={profile.skills}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    skills: e.target.value,
                  })
                }
                className="border p-3 rounded-xl w-full"
              />

            </div>


            {/* ================= VERIFICATION DOCUMENT ================= */}
            <div className="sm:col-span-2">

              <label className="font-semibold block mb-2">
                Upload Student ID Card
              </label>

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {

                  if (!e.target.files) return;

                  setVerificationFile(
                    e.target.files[0]
                  );

                }}
                className="border p-3 rounded-xl w-full"
              />

              {profile.verification_document && (
                <p className="text-green-600 text-sm mt-2">
                  ✓ Verification document uploaded
                </p>
              )}

              {verificationFile && (
                <p className="text-blue-600 text-sm mt-2 wrap-break-words">
                  Selected: {verificationFile.name}
                </p>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}