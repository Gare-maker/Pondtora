import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

const memoryStorage: Record<string, string> = {};

export const safeAuthStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("[AuthStorage] localStorage read failed, using fallback:", e);
    }
    return memoryStorage[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn("[AuthStorage] localStorage write failed, using fallback:", e);
    }
    memoryStorage[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn("[AuthStorage] localStorage remove failed, using fallback:", e);
    }
    delete memoryStorage[key];
  },
};

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "pondtora_auth",
      storage: safeAuthStorage,
    },
  }
);

export async function getAuthToken(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  } catch {
    return "";
  }
}

export async function getAuthUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the canonical application URL.
 * Defaults to the production domain (https://www.pondtora.com) or VITE_APP_URL.
 * If running on localhost or loopback, it returns the production domain
 * (https://www.pondtora.com) so that links sent via email (password reset, staff invitations,
 * account verification, assessments) always link to the live domain.
 */
export function getAppUrl(): string {
  const envUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) as string | undefined;
  const canonicalDomain = (envUrl && envUrl.trim()) || "https://www.pondtora.com";

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

