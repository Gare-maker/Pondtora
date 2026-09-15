import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "pondtora_auth",
    },
  }
);

export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export async function getAuthUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Returns the canonical application URL.
 * Defaults to the production domain (https://pondtora.site) or VITE_APP_URL.
 * If running on localhost or loopback, it ALWAYS returns the production domain
 * (https://pondtora.site) so that links sent via email (password reset, staff invitations,
 * account verification, assessments) always link to the live domain and never to localhost.
 */
export function getAppUrl(): string {
  const envUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) as string | undefined;
  const canonicalDomain = (envUrl && envUrl.trim()) || "https://pondtora.site";

  if (typeof window === "undefined") {
    return canonicalDomain.replace(/\/+$/, "");
  }

  const hostname = window.location.hostname.toLowerCase();
  // If in local development or loopback, always use the real production domain for outbound email links:
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.")
  ) {
    return canonicalDomain.replace(/\/+$/, "");
  }

  // If running on a live hosted domain:
  return window.location.origin.replace(/\/+$/, "");
}

