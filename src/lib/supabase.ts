import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isCloudConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured()) return null;
  if (typeof window === "undefined") return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // OTP is typed in the app. Magic-link clicks open Safari, not the
          // Home Screen shortcut, so do not complete a session from the URL.
          detectSessionInUrl: false,
        },
      },
    );
  }
  return client;
}
