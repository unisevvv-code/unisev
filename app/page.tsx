import { Source_Serif_4, Inter } from "next/font/google";

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export default function Home() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "UniSeV",
    url: "https://unisev.vercel.app",
    description:
      "UniSeV connects students and clients through a marketplace for tasks, services, and opportunities.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />

      <main

      className={`
        ${serif.variable} ${sans.variable}
        min-h-screen
        font-[family-name:var(--font-sans)]
        text-[#14213D]
      `}
      style={{ backgroundColor: "#FBFAF7" }}
    >

      {/* ================================================= */}
      {/* NAVBAR */}
      {/* ================================================= */}

      <nav
        className="
          h-16
          sm:h-20
          bg-[#14213D]
          px-4
          sm:px-10
          flex
          items-center
          justify-between
          gap-3
          shadow-[0_2px_10px_rgba(0,0,0,0.25)]
        "
      >

        <div className="flex items-center shrink-0">
          <img
            src="/unisev-logo.png"
            alt="UniSeV"
            className="h-9 sm:h-14 w-auto object-contain"
          />
        </div>

        <div className="hidden sm:flex items-center gap-8">

          <a
            href="/auth"
            className="
              text-[15px]
              text-white/90
              no-underline
              border-b-2
              border-transparent
              pb-1
              hover:border-[#C98A1B]
              hover:text-white
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-offset-4
              focus-visible:outline-[#C98A1B]
              transition-colors
            "
          >
            Home
          </a>

          <a
            href="/auth"
            className="
              text-[15px]
              text-white/90
              no-underline
              border-b-2
              border-transparent
              pb-1
              hover:border-[#C98A1B]
              hover:text-white
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-offset-4
              focus-visible:outline-[#C98A1B]
              transition-colors
            "
          >
            Browse
          </a>

          <a
            href="/auth"
            className="
              text-[15px]
              text-white/90
              no-underline
              border-b-2
              border-transparent
              pb-1
              hover:border-[#C98A1B]
              hover:text-white
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-offset-4
              focus-visible:outline-[#C98A1B]
              transition-colors
            "
          >
            Post Task
          </a>

        </div>

        <a
          href="/auth"
          className="
            shrink-0
            bg-[#C98A1B]
            hover:bg-[#B87B12]
            text-white
            px-4
            sm:px-5
            py-2
            sm:py-2.5
            rounded-lg
            font-semibold
            no-underline
            text-sm
            sm:text-[15px]
            transition-colors
            focus-visible:outline
            focus-visible:outline-2
            focus-visible:outline-offset-2
            focus-visible:outline-white
          "
        >
          Sign In
        </a>

      </nav>


      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      <section
        className="
          pt-12
          sm:pt-20
          px-4
          sm:px-10
          pb-16
          sm:pb-24
          max-w-[1200px]
          mx-auto
        "
      >

        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-[1.05fr_1fr]
            gap-14
            lg:gap-10
            items-center
          "
        >

          {/* LEFT: COPY */}

          <div>

            <h1
              className="
                font-[family-name:var(--font-serif)]
                text-[2rem]
                sm:text-[3.1rem]
                lg:text-[3.4rem]
                leading-[1.15]
                sm:leading-[1.08]
                font-semibold
                text-[#14213D]
                max-w-[19ch]
                sm:max-w-none
              "
            >
              Student-Powered Marketplace.
            </h1>

            <p
              className="
                mt-6
                text-[17px]
                sm:text-lg
                leading-relaxed
                text-[#4B5566]
                max-w-[46ch]
              "
            >
              Post a task, get matched with a verified student on your
              campus, and pay only when the work is done — from
              problem sets to poster design to data entry.
            </p>

            <div
              className="
                mt-8
                flex
                flex-col
                sm:flex-row
                gap-3
                sm:gap-4
              "
            >

              <a
                href="/auth"
                className="
                  text-center
                  bg-[#C98A1B]
                  hover:bg-[#B87B12]
                  text-white
                  px-7
                  py-3.5
                  rounded-xl
                  font-semibold
                  no-underline
                  transition-colors
                  focus-visible:outline
                  focus-visible:outline-2
                  focus-visible:outline-offset-2
                  focus-visible:outline-[#14213D]
                "
              >
                Browse Tasks
              </a>

              <a
                href="/auth"
                className="
                  text-center
                  bg-[#C98A1B]
                  hover:bg-[#B87B12]
                  text-white
                  px-7
                  py-3.5
                  rounded-xl
                  font-semibold
                  no-underline
                  transition-colors
                  focus-visible:outline
                  focus-visible:outline-2
                  focus-visible:outline-offset-2
                  focus-visible:outline-[#14213D]
                "
              >
                Post a Task
              </a>

            </div>

            <p
              className="
                mt-6
                flex
                items-center
                gap-2
                text-sm
                text-[#5B6472]
              "
            >
              <span className="text-[#1F7A5C]">✓</span>
              Every student is ID-verified, and every payment sits in
              escrow until you approve the work.
            </p>

          </div>


          {/* RIGHT: TASK CARD MOCKUP */}

          <div className="relative h-[300px] sm:h-[340px]">

            {/* BACK CARD */}
            <div
              className="
                absolute
                top-4
                left-6
                sm:left-10
                w-[240px]
                sm:w-[270px]
                rounded-2xl
                bg-white
                border
                border-[#E7E3D8]
                p-5
                rotate-[-7deg]
                opacity-70
                shadow-[0_10px_24px_-8px_rgba(20,33,61,0.15)]
              "
            >
              <span
                className="
                  inline-block
                  text-xs
                  font-semibold
                  px-2.5
                  py-1
                  rounded-full
                  bg-[#F3E8D8]
                  text-[#8A6414]
                "
              >
                Graphic Design
              </span>

              <p className="mt-3 text-sm font-semibold text-[#14213D]">
                Instagram flyer for club event
              </p>

              <p className="mt-2 text-lg font-bold text-[#1F7A5C]">
                $40
              </p>
            </div>

            {/* FRONT CARD */}
            <div
              className="
                absolute
                top-0
                right-0
                sm:right-6
                w-[260px]
                sm:w-[300px]
                rounded-2xl
                bg-white
                border
                border-[#E7E3D8]
                p-6
                rotate-[3deg]
                shadow-[0_18px_36px_-10px_rgba(20,33,61,0.22)]
              "
            >

              <div className="flex items-center justify-between">
                <span
                  className="
                    inline-block
                    text-xs
                    font-semibold
                    px-2.5
                    py-1
                    rounded-full
                    bg-[#E4F0EA]
                    text-[#1F7A5C]
                  "
                >
                  Data Analysis
                </span>

                <span className="text-xs font-medium text-[#5B6472]">
                  Due in 3 days
                </span>
              </div>

              <p className="mt-4 text-[15px] font-semibold text-[#14213D] leading-snug">
                Clean and summarize survey dataset in Excel
              </p>

              <div className="mt-5 flex items-center justify-between">

                <div className="flex items-center gap-2">
                  <div
                    className="
                      w-8
                      h-8
                      rounded-full
                      bg-[#14213D]
                      text-white
                      text-xs
                      font-semibold
                      flex
                      items-center
                      justify-center
                    "
                  >
                    MK
                  </div>
                  <span className="text-xs text-[#5B6472]">
                    ★ 4.9
                  </span>
                </div>

                <p className="text-xl font-bold text-[#1F7A5C]">
                  $65
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* STATS LEDGER */}
      {/* ================================================= */}

      <section className="bg-white border-y border-[#E7E3D8]">

        <div
          className="
            max-w-[1200px]
            mx-auto
            px-4
            sm:px-10
            py-8
            sm:py-10
            grid
            grid-cols-1
            sm:grid-cols-3
            divide-y
            sm:divide-y-0
            sm:divide-x
            divide-[#E7E3D8]
          "
        >

          <div className="py-4 sm:py-0 sm:px-8 first:pl-0 sm:first:pl-0">
            <p className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#14213D]">
              1,200+
            </p>
            <p className="mt-1 text-sm text-[#5B6472]">
              Students verified across campus
            </p>
          </div>

          <div className="py-4 sm:py-0 sm:px-8">
            <p className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#14213D]">
              3,400
            </p>
            <p className="mt-1 text-sm text-[#5B6472]">
              Tasks completed and paid out
            </p>
          </div>

          <div className="py-4 sm:py-0 sm:px-8">
            <p className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#14213D]">
              4.9
            </p>
            <p className="mt-1 text-sm text-[#5B6472]">
              Average rating across completed tasks
            </p>
          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* CORKBOARD FEATURE SECTION */}
      {/* ================================================= */}

      <section
        className="py-20 sm:py-28 px-4 sm:px-10"
        style={{
          backgroundColor: "#E7DCC6",
          backgroundImage:
            "radial-gradient(rgba(20,33,61,0.05) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >

        <div className="max-w-[1100px] mx-auto">

          <h2
            className="
              font-[family-name:var(--font-serif)]
              text-3xl
              sm:text-[2.3rem]
              font-semibold
              text-[#14213D]
              text-center
            "
          >
            Why students and clients stick around
          </h2>

          <div
            className="
              mt-14
              grid
              grid-cols-1
              sm:grid-cols-3
              gap-10
              sm:gap-8
            "
          >

            {/* CARD 1 */}
            <div className="relative rotate-[-2deg]">

              <div
                className="
                  absolute
                  -top-3
                  left-1/2
                  -translate-x-1/2
                  w-3.5
                  h-3.5
                  rounded-full
                  bg-[#C98A1B]
                  border-2
                  border-[#8A6414]
                  shadow-[0_2px_4px_rgba(0,0,0,0.3)]
                  z-10
                "
              />

              <div
                className="
                  bg-[#FBFAF7]
                  rounded-sm
                  p-7
                  shadow-[0_12px_20px_-6px_rgba(20,33,61,0.25)]
                "
              >
                <h3 className="text-lg font-bold text-[#14213D]">
                  Find help fast
                </h3>

                <p className="mt-3 text-[15px] leading-relaxed text-[#4B5566]">
                  Post what you need — coding, design, research,
                  writing — and hear back from a matched student
                  within hours, not days.
                </p>
              </div>

            </div>

            {/* CARD 2 */}
            <div className="relative rotate-[1.5deg] sm:mt-4">

              <div
                className="
                  absolute
                  -top-3
                  left-1/2
                  -translate-x-1/2
                  w-3.5
                  h-3.5
                  rounded-full
                  bg-[#C98A1B]
                  border-2
                  border-[#8A6414]
                  shadow-[0_2px_4px_rgba(0,0,0,0.3)]
                  z-10
                "
              />

              <div
                className="
                  bg-[#FBFAF7]
                  rounded-sm
                  p-7
                  shadow-[0_12px_20px_-6px_rgba(20,33,61,0.25)]
                "
              >
                <h3 className="text-lg font-bold text-[#14213D]">
                  Earn while studying
                </h3>

                <p className="mt-3 text-[15px] leading-relaxed text-[#4B5566]">
                  Set your own price, work around your class schedule,
                  and get paid the moment a task is approved.
                </p>
              </div>

            </div>

            {/* CARD 3 */}
            <div className="relative rotate-[-1deg]">

              <div
                className="
                  absolute
                  -top-3
                  left-1/2
                  -translate-x-1/2
                  w-3.5
                  h-3.5
                  rounded-full
                  bg-[#C98A1B]
                  border-2
                  border-[#8A6414]
                  shadow-[0_2px_4px_rgba(0,0,0,0.3)]
                  z-10
                "
              />

              <div
                className="
                  bg-[#FBFAF7]
                  rounded-sm
                  p-7
                  shadow-[0_12px_20px_-6px_rgba(20,33,61,0.25)]
                "
              >
                <h3 className="text-lg font-bold text-[#14213D]">
                  Built on trust
                </h3>

                <p className="mt-3 text-[15px] leading-relaxed text-[#4B5566]">
                  Every student is ID-verified, every payment is held
                  in escrow, and every task gets rated when it's done.
                </p>
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* CLOSING CTA */}
      {/* ================================================= */}

      <section className="bg-[#14213D] py-16 sm:py-20 px-4 sm:px-10">

        <div className="max-w-[720px] mx-auto text-center">

          <h2
            className="
              font-[family-name:var(--font-serif)]
              text-3xl
              sm:text-4xl
              font-semibold
              text-white
            "
          >
            Ready to get started?
          </h2>

          <p className="mt-4 text-[17px] leading-relaxed text-white/70">
            Whether you need something done or you're ready to earn,
            UniSeV connects you with your own campus community.
          </p>

          <div
            className="
              mt-8
              flex
              flex-col
              sm:flex-row
              justify-center
              gap-3
              sm:gap-4
            "
          >

            <a
              href="/auth"
              className="
                text-center
                bg-[#C98A1B]
                hover:bg-[#B87B12]
                text-white
                px-7
                py-3.5
                rounded-xl
                font-semibold
                no-underline
                transition-colors
                focus-visible:outline
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-white
              "
            >
              Browse Tasks
            </a>

            <a
              href="/auth"
              className="
                text-center
                bg-transparent
                border
                border-white/30
                hover:border-white
                text-white
                px-7
                py-3.5
                rounded-xl
                font-semibold
                no-underline
                transition-colors
                focus-visible:outline
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-white
              "
            >
              Post a Task
            </a>

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <footer className="bg-white border-t border-[#E7E3D8] py-8 px-4 sm:px-10">

        <div
          className="
            max-w-[1200px]
            mx-auto
            flex
            flex-col
            sm:flex-row
            items-center
            justify-between
            gap-4
            text-sm
            text-[#5B6472]
          "
        >
          <img
            src="/unisev-logo.png"
            alt="UniSeV"
            className="h-8 w-auto object-contain"
          />

          <p>© {new Date().getFullYear()} UniSeV. Built for campus communities.</p>
        </div>

      </footer>

          </main>
    </>
  );
}