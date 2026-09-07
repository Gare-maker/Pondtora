/* Supabase Project Configuration */

export const projectId =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PROJECT_ID) ||
  "fegtvgfkxueorybefthj";

export const publicAnonKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  "sb_publishable_A0ZzIUTY3KIIOE4ZFhELsQ_9eepyJue";