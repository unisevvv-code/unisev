import "server-only";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

// Identify the logged-in user from the Bearer token the browser sends.
export async function getUserFromRequest(req: Request) {
    const header = req.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;

    return data.user;
}