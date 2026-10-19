// Greeting shown at the top of the client and student dashboards.
//  - first time on a new account: a proper welcome
//  - after that: friendly variations that change from day to day

type Role = "client" | "student";

function timeOfDay(): string {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

function dayNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);

    return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

export function getGreeting(
    fullName: string,
    isFirstVisit: boolean,
    role: Role
): { title: string; subtitle: string } {
    const first = fullName.trim().split(/\s+/)[0] || "there";

    if (isFirstVisit) {
        return {
            title: `Welcome to UniSeV, ${first}! 🎉`,
            subtitle:
                role === "client"
                    ? "Your account is ready. Post your first task and let talented students help you."
                    : "Your account is ready. Browse open tasks and land your first job.",
        };
    }

    const titles = [
        `${timeOfDay()}, ${first} 👋`,
        `Welcome back, ${first} 👋`,
        `Good to see you again, ${first} 🙌`,
        `Hey ${first}, ready for today? 🚀`,
        `${timeOfDay()}, ${first} ☀️`,
    ];

    const subtitles =
        role === "client"
            ? [
                  "Here's what's happening with your tasks today.",
                  "Check in on your tasks and applications.",
                  "Your tasks are in good hands with UniSeV.",
                  "See what students have been up to on your tasks.",
              ]
            : [
                  "Here's your UniSev activity at a glance.",
                  "New tasks may be waiting for you. Have a look!",
                  "Keep going, every task builds your reputation.",
                  "Check your applications and earnings at a glance.",
              ];

    const day = dayNumber();

    return {
        title: titles[day % titles.length],
        subtitle: subtitles[(day * 3) % subtitles.length],
    };
}