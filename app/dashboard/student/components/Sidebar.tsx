"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  name: string;
  logout: () => void;
  // Mobile drawer open state now lives in the parent (StudentDashboard)
  // so the toggle button can live inside Header instead of floating
  // on its own over the page.
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  activePage,
  setActivePage,
  name,
  logout,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {

  const [studentName, setStudentName] = useState(name || "");
  const [verificationStatus, setVerificationStatus] = useState("");

  async function loadStudentProfile() {
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      console.log("USER ERROR:", userError);
      return;
    }

    const userId = userData.user.id;

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        full_name,
        verification_status
      `)
      .eq("id", userId)
      .single();

    if (error) {
      console.log("SIDEBAR PROFILE ERROR:", error);
      return;
    }

    if (data) {
      setStudentName(data.full_name || name || "Student");
      setVerificationStatus(data.verification_status || "");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudentProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials =
    studentName
      ?.split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "ST";

  const isVerified =
    verificationStatus === "Verified";

  // Navigating to a page also closes the mobile drawer, so tapping
  // a link doesn't leave the overlay open on top of the new page.
  function handleNav(page: string) {
    setActivePage(page);
    setMobileOpen(false);
  }

  return (
    <>

      {/* MOBILE BACKDROP */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="
            fixed
            inset-0
            z-40
            bg-black/40
            lg:hidden
          "
        />
      )}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          w-64
          min-h-screen
          transform
          bg-white
          border-r
          flex
          flex-col
          transition-transform
          duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static
          lg:min-h-[calc(100vh-80px)]
          lg:translate-x-0
        `}
      >

        {/* MOBILE DRAWER CLOSE BUTTON */}
        <div className="flex justify-end p-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              text-xl
              text-gray-500
              hover:bg-gray-100
            "
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        {/* MAIN NAVIGATION */}
        <div className="p-4">

          {/* DASHBOARD */}
          <div
            onClick={() => handleNav("dashboard")}
            className={`px-4 py-3 rounded-xl cursor-pointer ${
              activePage === "dashboard"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "hover:bg-gray-50"
            }`}
          >
            Dashboard
          </div>

          {/* BROWSE TASKS */}
          <div
            onClick={() => handleNav("browse")}
            className={`px-4 py-3 mt-1 rounded-xl cursor-pointer ${
              activePage === "browse"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "hover:bg-gray-50"
            }`}
          >
            Browse Tasks
          </div>

          {/* MY TASKS */}
          <div
            onClick={() => handleNav("mytasks")}
            className={`px-4 py-3 mt-1 rounded-xl cursor-pointer ${
              activePage === "mytasks"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "hover:bg-gray-50"
            }`}
          >
            My Tasks
          </div>

          {/* MESSAGES */}
          <div
            onClick={() => handleNav("messages")}
            className={`px-4 py-3 mt-1 rounded-xl cursor-pointer ${
              activePage === "messages"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "hover:bg-gray-50"
            }`}
          >
            Messages
          </div>

        </div>



          {/* WALLET */}
          <div
            onClick={() => handleNav("wallet")}
            className={`px-4 py-3 mt-1 rounded-xl cursor-pointer ${
              activePage === "wallet"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "hover:bg-gray-50"
            }`}
          >
            Wallet
          </div>




        {/* PROFILE AT BOTTOM */}
        <div className="mt-auto border-t p-4">

          {/* PROFILE BUTTON */}
          <button
            onClick={() => handleNav("profile")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${
              activePage === "profile"
                ? "bg-indigo-50"
                : "hover:bg-gray-50"
            }`}
          >

            {/* AVATAR */}
            <div className="relative shrink-0">

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
                  font-bold
                "
              >
                {initials}
              </div>

              {/* VERIFIED TICK */}
              {isVerified && (
                <div
                  className="
                    absolute
                    -bottom-1
                    -right-1
                    w-4
                    h-4
                    rounded-full
                    bg-green-500
                    border-2
                    border-white
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
                    className="w-2.5 h-2.5"
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
            <div className="min-w-0 flex-1">

              <p className="font-semibold text-sm truncate">
                {studentName || "Student"}
              </p>

              <p className="text-xs text-gray-500">
                Student
              </p>

            </div>

          </button>


          {/* LOGOUT */}
          <button
            onClick={logout}
            className="
              w-full
              mt-3
              py-2.5
              rounded-xl
              text-sm
              text-red-500
              hover:bg-red-50
              transition
            "
          >
            Logout
          </button>

        </div>

      </aside>

    </>
  );
}