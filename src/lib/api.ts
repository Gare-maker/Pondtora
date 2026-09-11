import { supabase, getAuthToken, getAuthUserId } from "./supabase";
import type {
  Farm, UserProfile, Pond, StockEvent, FeedItem, FeedingRecord,
  BagOpenLog, FeedRemainingLog, Expense, Revenue, MortalityEntry,
  TreatmentRecord, StaffMember, Report, Customer, PriceGroup,
  Invoice, InvSettings,
} from "../app/types";
import { INIT_K, INIT_C } from "../app/data";

// ── Helpers for UUID & Case Conversion ────────────────────────────────────────

const isUuid = (id?: string): boolean =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

function getPersistedIdMap(): Map<string, string> {
  try {
    const raw = localStorage.getItem("pondtora_id_map");
    if (raw) return new Map(JSON.parse(raw));
  } catch {}
  return new Map();
}
const idMap = getPersistedIdMap();

export function toUuid(id?: string): string {
  if (!id || typeof id !== "string") return crypto.randomUUID();
  const trimmed = id.trim();
  if (isUuid(trimmed)) return trimmed;
  if (idMap.has(trimmed)) return idMap.get(trimmed)!;
  const generated = crypto.randomUUID();
  idMap.set(trimmed, generated);
  try {
    localStorage.setItem("pondtora_id_map", JSON.stringify(Array.from(idMap.entries())));
  } catch {}
  return generated;
}

export function toValidDbDate(d: any, defaultYear = new Date().getFullYear()): string | null {
  if (!d || d === "—" || typeof d !== "string" || d.trim() === "") return null;
  const str = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const parts = str.split(" ");
  if (parts.length === 2) {
    const mIdx = monthNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
    const day = parseInt(parts[1], 10);
    if (mIdx !== -1 && !isNaN(day) && day >= 1 && day <= 31) {
      const mm = String(mIdx + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${defaultYear}-${mm}-${dd}`;
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return null;
}

export function isSameDate(d1?: string | null, d2?: string | null): boolean {
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  const n1 = toValidDbDate(d1) || d1;
  const n2 = toValidDbDate(d2) || d2;
  return n1 === n2;
}

export function formatDisplayDate(d: any): string {
  if (!d || d === "—") return "—";
  const valid = toValidDbDate(d);
  if (valid) {
    const [, m, day] = valid.split("-").map(Number);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[m - 1]} ${day}`;
  }
  return String(d);
}

const toSnake = (s: string) => s.replace(/([A-Z])/g, "_$1").toLowerCase();
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// Custom field mappings
const SNAKE_MAP: Record<string, string> = {
  desc: "description",
  group: "group_key",
  originalDesc: "original_description",
};
const CAMEL_MAP: Record<string, string> = {
  description: "desc",
  group_key: "group",
  original_description: "originalDesc",
};

const DATE_FIELDS = new Set(["date", "purchase_date", "stocking_date", "cleared_date", "invoice_date", "due_date"]);

const TABLE_ALLOWED_COLUMNS: Record<string, Set<string>> = {
  feeding_records: new Set([
    "id", "user_id", "farm_id", "date", "month", "year", "pond", "brand", "size",
    "morning", "evening", "total", "recorded_by", "morning_time", "evening_time",
    "created_by", "created_by_id", "created_at"
  ]),
  ponds: new Set([
    "id", "user_id", "farm_id", "name", "type", "species", "size_m2", "initial_stock",
    "current_count", "avg_weight", "stocking_date", "stock_month", "total_cost",
    "status", "notes", "default_pellet", "category", "max_kg_by_pallet", "supplier",
    "transfer_note", "length_ft", "width_ft", "created_at"
  ]),
  expenses: new Set([
    "id", "user_id", "farm_id", "category", "amount", "date", "month", "year",
    "pond", "description", "fish_stock", "created_by", "created_by_id",
    "original_description", "edit_history", "created_at"
  ]),
  revenues: new Set([
    "id", "user_id", "farm_id", "source", "amount", "date", "month", "year",
    "notes", "original_notes", "pond", "stock_batch", "fish_stock",
    "created_by", "created_by_id", "edit_history", "created_at"
  ]),
  feed_inventory: new Set([
    "id", "user_id", "farm_id", "brand", "size", "bags", "weight_per_bag",
    "total_kg", "cost_per_bag", "supplier", "purchase_date", "month", "created_at"
  ]),
  bag_open_logs: new Set([
    "id", "user_id", "farm_id", "date", "month", "year", "brand", "size",
    "kg_per_bag", "bags_opened", "total_kg", "fish_stock", "created_at"
  ]),
  feed_remaining_logs: new Set([
    "id", "user_id", "farm_id", "brand", "size", "fish_stock", "remaining_kg", "date", "created_at"
  ]),
  stock_events: new Set([
    "id", "user_id", "pond_id", "farm_id", "pond_name", "date", "species",
    "count", "avg_weight", "cost", "sale_price", "type", "from_pond", "cleared_date", "supplier", "created_at"
  ]),
  mortality_entries: new Set([
    "id", "user_id", "pond_id", "farm_id", "date", "count", "cause", "notes", "created_at"
  ]),
  treatment_records: new Set([
    "id", "user_id", "pond_id", "farm_id", "date", "cause", "medicine", "remarks", "created_at"
  ]),
  farms: new Set([
    "id", "user_id", "name", "city", "state", "country", "created_at", "updated_at"
  ]),
};

export function objToSnake(obj: Record<string, any>, userId?: string, table?: string): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const key = SNAKE_MAP[k] || toSnake(k);
    out[key] = v;
  }
  if (userId && isUuid(userId)) {
    out["user_id"] = userId;
  } else if (!out["user_id"] || !isUuid(out["user_id"])) {
    delete out["user_id"];
  }

  // Normalize date fields to valid ISO date
  for (const [k, v] of Object.entries(out)) {
    if (DATE_FIELDS.has(k) && v) {
      const valid = toValidDbDate(v);
      if (valid) out[k] = valid;
    }
  }

  if (out["id"]) {
    out["id"] = toUuid(out["id"]);
  }
  if (out["farm_id"] !== undefined) {
    const fid = typeof out["farm_id"] === "string" ? out["farm_id"].trim() : "";
    if (!fid || fid === "—" || fid === "default" || !isUuid(fid)) {
      delete out["farm_id"];
    } else {
      out["farm_id"] = fid;
    }
  }
  if (out["pond_id"] !== undefined) {
    const pid = typeof out["pond_id"] === "string" ? out["pond_id"].trim() : "";
    if (!pid || pid === "—" || pid === "default") {
      delete out["pond_id"];
    } else {
      out["pond_id"] = toUuid(pid);
    }
  }

  // Whitelist columns if table definition exists to prevent Postgres schema rejection
  if (table && TABLE_ALLOWED_COLUMNS[table]) {
    const allowed = TABLE_ALLOWED_COLUMNS[table];
    for (const k of Object.keys(out)) {
      if (!allowed.has(k)) {
        delete out[k];
      }
    }
  }

  return out;
}

export function objToCamel<T = any>(obj: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = CAMEL_MAP[k] || toCamel(k);
    out[key] = v;
  }
  return out as T;
}

// ── Local Storage Cache Backup (User-Scoped) ─────────────────────────────────
function getUserCacheKey(userId?: string): string {
  return userId ? `pondtora_${userId}_cache` : "pondtora_anon_cache";
}

function getLocalCache(userId?: string): any {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getUserCacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalCache(data: any, userId?: string) {
  if (!userId) return;
  try {
    const current = getLocalCache(userId) || {};
    localStorage.setItem(getUserCacheKey(userId), JSON.stringify({ ...current, ...data }));
  } catch (e) {
    console.warn("Failed to update localStorage cache", e);
  }
}

// ── Supabase Auth helpers (frontend) ─────────────────────────────────────────
export const auth = {
  signUp: async (opts: {
    email: string;
    password: string;
    name?: string;
    farmName?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    currencySymbol?: string;
    currencyCode?: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: {
        data: {
          name: opts.name ?? opts.email.split("@")[0],
          farm_name: opts.farmName ?? "My Farm",
          city: opts.city ?? "",
          state: opts.state ?? "",
          country: opts.country ?? "Nigeria",
          phone: opts.phone ?? "",
          currency_symbol: opts.currencySymbol ?? "₦",
          currency_code: opts.currencyCode ?? "NGN",
          role: "owner",
          trial_start_date: new Date().toISOString(),
        },
      },
    });
    if (error) throw error;
    return data;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith("pondtora_")) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?type=recovery`,
    });
    if (error) throw error;
  },

  acceptInvite: async (accessToken: string, password: string) => {
    const { data, error } = await supabase.auth.exchangeCodeForSession(accessToken);
    if (error) {
      const { data: ud, error: ue } = await supabase.auth.updateUser({ password });
      if (ue) throw ue;
      return ud;
    }
    const { data: ud, error: ue } = await supabase.auth.updateUser({ password });
    if (ue) throw ue;
    return ud;
  },

  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(callback),
};

// ── Generic Table Operations ──────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const uid = await getAuthUserId();
  if (uid && isUuid(uid)) return uid;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id && isUuid(user.id)) return user.id;
  } catch {}
  return "";
}

async function dbList<T>(table: string, cacheKey?: string): Promise<T[]> {
  const userId = await getUserId();
  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    const items = (data || []).map(r => objToCamel<T>(r));
    if (cacheKey && userId) saveLocalCache({ [cacheKey]: items }, userId);
    return items;
  } catch (err) {
    console.warn(`Error fetching ${table}:`, err);
    if (cacheKey && userId) {
      const cached = getLocalCache(userId);
      if (cached && cached[cacheKey]) return cached[cacheKey];
    }
    return [];
  }
}

async function dbInsert<T extends { id?: string }>(table: string, item: T, cacheKey?: string): Promise<T> {
  const userId = await getUserId();
  const snake = objToSnake(item as any, userId, table);
  if (!snake.id) snake.id = crypto.randomUUID();

  // Optimistically update local cache scoped to current user
  if (cacheKey && userId) {
    const cached = getLocalCache(userId) || {};
    const list = cached[cacheKey] || [];
    saveLocalCache({ [cacheKey]: [item, ...list.filter((x: any) => x.id !== item.id)] }, userId);
  }

  try {
    const { data, error } = await supabase.from(table).upsert(snake).select().single();
    if (error) {
      console.error(`Supabase upsert into ${table} failed:`, error.message);
      throw error;
    }
    return objToCamel<T>(data);
  } catch (e) {
    console.error(`Failed to insert into ${table}:`, e);
    throw e;
  }
}

async function dbUpdate<T extends { id?: string }>(table: string, item: T, cacheKey?: string): Promise<T> {
  const userId = await getUserId();
  const snake = objToSnake(item as any, userId, table);
  const targetId = snake.id || (item.id ? toUuid(item.id) : undefined);

  // Update local cache scoped to current user
  if (cacheKey && userId) {
    const cached = getLocalCache(userId) || {};
    const list = cached[cacheKey] || [];
    saveLocalCache({ [cacheKey]: list.map((x: any) => (x.id === item.id ? { ...x, ...item } : x)) }, userId);
  }

  try {
    if (targetId) {
      const { data, error } = await supabase.from(table).update(snake).eq("id", targetId).select().single();
      if (error) {
        console.error(`Supabase update in ${table} failed:`, error.message);
        throw error;
      }
      return objToCamel<T>(data);
    }
    return item;
  } catch (e) {
    console.error(`Failed to update ${table}:`, e);
    throw e;
  }
}

async function dbDelete(table: string, id: string, cacheKey?: string): Promise<{ success: boolean }> {
  const targetId = isUuid(id) ? id : idMap.get(id) || id;

  // Update local cache
  if (cacheKey) {
    const cached = getLocalCache() || {};
    const list = cached[cacheKey] || [];
    saveLocalCache({ [cacheKey]: list.filter((x: any) => x.id !== id) });
  }

  try {
    const { error } = await supabase.from(table).delete().eq("id", targetId);
    if (error) console.warn(`Supabase delete from ${table} failed:`, error.message);
    return { success: !error };
  } catch (e) {
    console.warn(`Failed to delete from ${table}:`, e);
    return { success: false };
  }
}

// ── Main API Client ───────────────────────────────────────────────────────────

export const api = {
  setup: async () => ({ sql: "" }),
  autoSetup: async () => ({ success: true }),

  me: async () => {
    const userId = await getUserId();
    if (!userId) return { profile: null, farms: [], staffInfo: null, isStaff: false };

    const [profRes, farmsRes, staffRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("farms").select("*").eq("user_id", userId),
      supabase.from("staff_members").select("*").eq("staff_auth_id", userId).maybeSingle(),
    ]);

    const profile = profRes.data ? objToCamel<UserProfile>(profRes.data) : null;
    let farms = (farmsRes.data || []).map(f => objToCamel<Farm>(f));
    const isStaff = !!staffRes.data;

    // If staff member with assigned farms, fetch assigned farms
    if (isStaff && staffRes.data?.farms && farms.length === 0) {
      const { data: allFarms } = await supabase.from("farms").select("*");
      farms = (allFarms || []).filter((f: any) => staffRes.data.farms.includes(f.id)).map(f => objToCamel<Farm>(f));
    }

    return { profile, farms, staffInfo: staffRes.data || null, isStaff };
  },

  // Bulk load all user data from Supabase directly
  loadAll: async () => {
    const userId = await getUserId();
    if (!userId) {
      return {
        needsSetup: false,
        farms: [], userProfiles: [], ponds: [], stockEvents: [],
        feedInventory: [], feedingRecords: [], bagOpenLogs: [], feedRemainingLogs: [],
        expenses: [], revenues: [], mortalityEntries: [], treatmentRecords: [],
        staffMembers: [], reports: [], customers: [], priceGroups: [],
        invoices: [], invoiceSettings: null, knowledgeQuestions: [],
        compatibilityQuestions: [], knowledgeResults: [], compatibilityResults: [],
        staffInfo: null, isStaff: false,
      };
    }
    const cached = getLocalCache(userId);

    try {
      // Safe query helper: individual catch handlers ensure a single failure doesn't abort all data loading
      const safeQuery = async (queryPromise: PromiseLike<any>) => {
        try {
          const res = await queryPromise;
          return res.error ? { data: null, error: res.error } : res;
        } catch (e) {
          return { data: null, error: e };
        }
      };

      const [
        farmsRes, profilesRes, pondsRes, stockRes, invRes, feedRes,
        bagRes, remainRes, expRes, revRes, mortRes, treatRes,
        staffRes, repRes, custRes, pgRes, invsRes, setRes,
        kqRes, cqRes, krRes, crRes
      ] = await Promise.all([
        safeQuery(supabase.from("farms").select("*").eq("user_id", userId).order("created_at", { ascending: true })),
        safeQuery(supabase.from("user_profiles").select("*").eq("id", userId)),
        safeQuery(supabase.from("ponds").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("stock_events").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("feed_inventory").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("feeding_records").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("bag_open_logs").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("feed_remaining_logs").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("expenses").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("revenues").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("mortality_entries").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("treatment_records").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("staff_members").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("reports").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("customers").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("price_groups").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("invoices").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("invoice_settings").select("*").eq("user_id", userId).maybeSingle()),
        safeQuery(supabase.from("knowledge_questions").select("*")),
        safeQuery(supabase.from("compatibility_questions").select("*")),
        safeQuery(supabase.from("knowledge_results").select("*").eq("user_id", userId)),
        safeQuery(supabase.from("compatibility_results").select("*").eq("user_id", userId)),
      ]);

      let farms = (farmsRes.data || []).map((r: any) => objToCamel<Farm>(r));

      // If user is staff with assigned farms, include those assigned farms
      const staffMember = (staffRes.data || []).find((s: any) => s.staff_auth_id === userId);
      if (staffMember?.farms && staffMember.farms.length > 0) {
        const { data: assignedFarms } = await safeQuery(
          supabase.from("farms").select("*").in("id", staffMember.farms)
        );
        if (assignedFarms) {
          const farmMap = new Map(farms.map(f => [f.id, f]));
          for (const af of assignedFarms) {
            const camel = objToCamel<Farm>(af);
            farmMap.set(camel.id, camel);
          }
          farms = Array.from(farmMap.values());
        }
      }

      const result = {
        needsSetup: false,
        farms,
        userProfiles: (profilesRes.data || []).map((r: any) => objToCamel<UserProfile>(r)),
        ponds: (pondsRes.data || []).map((r: any) => objToCamel<Pond>(r)),
        stockEvents: (stockRes.data || []).map((r: any) => objToCamel<StockEvent>(r)),
        feedInventory: (invRes.data || []).map((r: any) => objToCamel<FeedItem>(r)),
        feedingRecords: (feedRes.data || []).map((r: any) => objToCamel<FeedingRecord>(r)),
        bagOpenLogs: (bagRes.data || []).map((r: any) => objToCamel<BagOpenLog>(r)),
        feedRemainingLogs: (remainRes.data || []).map((r: any) => objToCamel<FeedRemainingLog>(r)),
        expenses: (expRes.data || []).map((r: any) => objToCamel<Expense>(r)),
        revenues: (revRes.data || []).map((r: any) => objToCamel<Revenue>(r)),
        mortalityEntries: (mortRes.data || []).map((r: any) => objToCamel<MortalityEntry>(r)),
        treatmentRecords: (treatRes.data || []).map((r: any) => objToCamel<TreatmentRecord>(r)),
        staffMembers: (staffRes.data || []).map((r: any) => objToCamel<StaffMember>(r)),
        reports: (repRes.data || []).map((r: any) => objToCamel<Report>(r)),
        customers: (custRes.data || []).map((r: any) => objToCamel<Customer>(r)),
        priceGroups: (pgRes.data || []).map((r: any) => objToCamel<PriceGroup>(r)),
        invoices: (invsRes.data || []).map((r: any) => objToCamel<Invoice>(r)),
        invoiceSettings: setRes.data ? objToCamel<InvSettings>(setRes.data) : null,
        knowledgeQuestions: (kqRes.data || []).map((r: any) => objToCamel(r)),
        compatibilityQuestions: (cqRes.data || []).map((r: any) => objToCamel(r)),
        knowledgeResults: (krRes.data || []).map((r: any) => objToCamel(r)),
        compatibilityResults: (crRes.data || []).map((r: any) => objToCamel(r)),
        staffInfo: staffMember || null,
        isStaff: !!staffMember,
      };

      // Save to user-scoped cache as backup
      saveLocalCache(result, userId);
      return result;
    } catch (err) {
      console.warn("Direct Supabase loadAll failed, returning cache if available:", err);
      if (cached) return cached;
      throw err;
    }
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  profile: {
    update: async (p: Partial<UserProfile>) => {
      const userId = await getUserId();
      if (!userId) return p as UserProfile;
      const snake = objToSnake(p as any);
      const { data } = await supabase.from("user_profiles").update(snake).eq("id", userId).select().single();
      return data ? objToCamel<UserProfile>(data) : (p as UserProfile);
    },
    updatePlan: async (plan: string, trialStartDate?: string) => {
      const userId = await getUserId();
      if (!userId) return {} as UserProfile;
      const payload: any = { active_plan: plan };
      if (trialStartDate) payload.trial_start_date = trialStartDate;
      const { data } = await supabase.from("user_profiles").update(payload).eq("id", userId).select().single();
      return data ? objToCamel<UserProfile>(data) : ({} as UserProfile);
    },
  },

  // ── Farms ──────────────────────────────────────────────────────────────────
  farms: {
    list: () => dbList<Farm>("farms", "farms"),
    create: (f: Partial<Farm>) => dbInsert<Farm>("farms", f as Farm, "farms"),
    update: (f: Farm) => dbUpdate<Farm>("farms", f, "farms"),
    remove: (id: string) => dbDelete("farms", id, "farms"),
    syncActiveFarm: async (farmId: string) => {
      try {
        await supabase.auth.updateUser({ data: { active_farm_id: farmId } });
      } catch (err) {
        console.warn("Failed to sync active_farm_id to auth metadata:", err);
      }
    },
  },

  // ── Staff ──────────────────────────────────────────────────────────────────
  staff: {
    list: () => dbList<StaffMember>("staff_members", "staffMembers"),
    invite: async (opts: {
      email: string;
      name?: string;
      phone?: string;
      role?: string;
      farms?: string[];
      permissions?: string[];
      appUrl?: string;
    }) => {
      const userId = await getUserId();
      const staffMember: StaffMember = {
        id: crypto.randomUUID(),
        name: opts.name || opts.email.split("@")[0],
        email: opts.email.trim().toLowerCase(),
        phone: opts.phone || "",
        role: opts.role || "General Staff",
        status: "Pending",
        joinedDate: new Date().toISOString(),
        permissions: opts.permissions || [],
        farms: opts.farms || [],
      };
      await dbInsert<StaffMember>("staff_members", staffMember, "staffMembers");

      const appUrl = opts.appUrl || window.location.origin;
      const redirectTo = `${appUrl}?type=invite`;
      const inviteLink = `${appUrl}?type=invite&email=${encodeURIComponent(staffMember.email)}`;
      let emailSent = false;
      let emailError: string | null = null;

      try {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: staffMember.email,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              name: staffMember.name,
              role: "staff",
              owner_id: userId,
            },
          },
        });
        if (otpErr) {
          console.warn("Supabase signInWithOtp invite failed, trying reset password fallback:", otpErr.message);
          emailError = otpErr.message;
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(staffMember.email, { redirectTo });
          if (!resetErr) emailSent = true;
        } else {
          emailSent = true;
        }
      } catch (err: any) {
        console.warn("Invite email dispatch error:", err);
        emailError = err?.message || String(err);
      }

      return { success: true, staffMember, invitation: null, emailSent, emailError, inviteLink };
    },
    update: (s: StaffMember) => dbUpdate<StaffMember>("staff_members", s, "staffMembers"),
    remove: (id: string) => dbDelete("staff_members", id, "staffMembers"),
  },

  // ── Ponds ──────────────────────────────────────────────────────────────────
  ponds: {
    list: () => dbList<Pond>("ponds", "ponds"),
    create: async (p: Partial<Pond>) => {
      const dbPond: any = { ...p };
      if (p.sizeM2 !== undefined) dbPond.sizeM2 = parseFloat(String(p.sizeM2)) || 0;
      if (p.stockingDate && p.stockingDate !== "—") {
        const d = toValidDbDate(p.stockingDate);
        if (d) dbPond.stockingDate = d;
      }

      // Validate duplicate pond name (case-insensitive) for the user & farm
      const userId = await getUserId();
      if (p.name && p.name.trim() && userId) {
        const trimmedName = p.name.trim();
        let q = supabase
          .from("ponds")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", trimmedName);
        if (p.farmId && isUuid(p.farmId)) {
          q = q.eq("farm_id", p.farmId);
        }
        const { data: existing, error: checkErr } = await q;
        if (!checkErr && existing && existing.length > 0) {
          throw new Error(`A pond named "${trimmedName}" already exists in this farm.`);
        }
      }

      return dbInsert<Pond>("ponds", dbPond as Pond, "ponds");
    },
    update: async (p: Pond) => {
      const dbPond: any = { ...p };
      if (p.sizeM2 !== undefined) dbPond.sizeM2 = parseFloat(String(p.sizeM2)) || 0;
      if (p.stockingDate && p.stockingDate !== "—") {
        const d = toValidDbDate(p.stockingDate);
        if (d) dbPond.stockingDate = d;
      }

      // Check duplicate name on update if changed
      const userId = await getUserId();
      if (p.name && p.name.trim() && userId) {
        const trimmedName = p.name.trim();
        const targetId = isUuid(p.id) ? p.id : idMap.get(p.id) || p.id;
        let q = supabase
          .from("ponds")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", trimmedName)
          .neq("id", targetId);
        if (p.farmId && isUuid(p.farmId)) {
          q = q.eq("farm_id", p.farmId);
        }
        const { data: existing, error: checkErr } = await q;
        if (!checkErr && existing && existing.length > 0) {
          throw new Error(`A pond named "${trimmedName}" already exists in this farm.`);
        }
      }

      return dbInsert<Pond>("ponds", dbPond as Pond, "ponds");
    },
    remove: (id: string) => dbDelete("ponds", id, "ponds"),
  },

  // ── Stock events ───────────────────────────────────────────────────────────
  stockEvents: {
    list: () => dbList<StockEvent>("stock_events", "stockEvents"),
    create: (e: Partial<StockEvent>) => {
      const dbEvent: any = { ...e };
      if (e.date) {
        const d = toValidDbDate(e.date);
        if (d) dbEvent.date = d;
      }
      return dbInsert<StockEvent>("stock_events", dbEvent as StockEvent, "stockEvents");
    },
    update: (e: StockEvent) => dbUpdate<StockEvent>("stock_events", e, "stockEvents"),
    remove: (id: string) => dbDelete("stock_events", id, "stockEvents"),
  },

  // ── Feed inventory ─────────────────────────────────────────────────────────
  inventory: {
    list: () => dbList<FeedItem>("feed_inventory", "feedInventory"),
    create: (i: Partial<FeedItem>) => {
      const dbInv: any = { ...i };
      if (i.purchaseDate) {
        const d = toValidDbDate(i.purchaseDate);
        if (d) dbInv.purchaseDate = d;
      }
      return dbInsert<FeedItem>("feed_inventory", dbInv as FeedItem, "feedInventory");
    },
    update: (i: FeedItem) => dbUpdate<FeedItem>("feed_inventory", i, "feedInventory"),
    remove: (id: string) => dbDelete("feed_inventory", id, "feedInventory"),
  },

  // ── Feeding records ────────────────────────────────────────────────────────
  feeding: {
    list: () => dbList<FeedingRecord>("feeding_records", "feedingRecords"),
    create: async (r: Partial<FeedingRecord>) => {
      const dbRec: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRec.date = d;
      }
      return dbInsert<FeedingRecord>("feeding_records", dbRec as FeedingRecord, "feedingRecords");
    },
    update: async (r: FeedingRecord) => {
      const dbRec: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRec.date = d;
      }
      return dbUpdate<FeedingRecord>("feeding_records", dbRec, "feedingRecords");
    },
    remove: (id: string) => dbDelete("feeding_records", id, "feedingRecords"),
  },

  // ── Bag open logs ──────────────────────────────────────────────────────────
  bagLogs: {
    list: () => dbList<BagOpenLog>("bag_open_logs", "bagOpenLogs"),
    create: (b: Partial<BagOpenLog>) => {
      const dbBag: any = { ...b };
      if (b.date) {
        const d = toValidDbDate(b.date);
        if (d) dbBag.date = d;
      }
      return dbInsert<BagOpenLog>("bag_open_logs", dbBag as BagOpenLog, "bagOpenLogs");
    },
    update: (b: BagOpenLog) => {
      const dbBag: any = { ...b };
      if (b.date) {
        const d = toValidDbDate(b.date);
        if (d) dbBag.date = d;
      }
      return dbUpdate<BagOpenLog>("bag_open_logs", dbBag as BagOpenLog, "bagOpenLogs");
    },
    remove: (id: string) => dbDelete("bag_open_logs", id, "bagOpenLogs"),
  },

  // ── Feed remaining logs ────────────────────────────────────────────────────
  remainLogs: {
    list: () => dbList<FeedRemainingLog>("feed_remaining_logs", "feedRemainingLogs"),
    create: (r: Partial<FeedRemainingLog>) => {
      const dbRem: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRem.date = d;
      }
      return dbInsert<FeedRemainingLog>("feed_remaining_logs", dbRem as FeedRemainingLog, "feedRemainingLogs");
    },
    update: (r: FeedRemainingLog) => {
      const dbRem: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRem.date = d;
      }
      return dbUpdate<FeedRemainingLog>("feed_remaining_logs", dbRem as FeedRemainingLog, "feedRemainingLogs");
    },
    remove: (id: string) => dbDelete("feed_remaining_logs", id, "feedRemainingLogs"),
  },

  // ── Expenses ───────────────────────────────────────────────────────────────
  expenses: {
    list: () => dbList<Expense>("expenses", "expenses"),
    create: (e: Partial<Expense>) => {
      const dbExp: any = { ...e };
      if (e.date) {
        const d = toValidDbDate(e.date);
        if (d) dbExp.date = d;
      }
      return dbInsert<Expense>("expenses", dbExp as Expense, "expenses");
    },
    update: (e: Expense) => dbUpdate<Expense>("expenses", e, "expenses"),
    remove: (id: string) => dbDelete("expenses", id, "expenses"),
  },

  // ── Revenues ───────────────────────────────────────────────────────────────
  revenues: {
    list: () => dbList<Revenue>("revenues", "revenues"),
    create: (r: Partial<Revenue>) => {
      const dbRev: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRev.date = d;
      }
      return dbInsert<Revenue>("revenues", dbRev as Revenue, "revenues");
    },
    update: (r: Revenue) => dbUpdate<Revenue>("revenues", r, "revenues"),
    remove: (id: string) => dbDelete("revenues", id, "revenues"),
  },

  // ── Mortality entries ──────────────────────────────────────────────────────
  mortality: {
    list: () => dbList<MortalityEntry>("mortality_entries", "mortalityEntries"),
    create: (m: Partial<MortalityEntry>) => {
      const dbMort: any = { ...m };
      if (m.date) {
        const d = toValidDbDate(m.date);
        if (d) dbMort.date = d;
      }
      return dbInsert<MortalityEntry>("mortality_entries", dbMort as MortalityEntry, "mortalityEntries");
    },
    update: (m: MortalityEntry) => dbUpdate<MortalityEntry>("mortality_entries", m, "mortalityEntries"),
    remove: (id: string) => dbDelete("mortality_entries", id, "mortalityEntries"),
  },

  // ── Treatment records ──────────────────────────────────────────────────────
  treatments: {
    list: () => dbList<TreatmentRecord>("treatment_records", "treatmentRecords"),
    create: (t: Partial<TreatmentRecord>) => {
      const dbTr: any = { ...t };
      if (t.date) {
        const d = toValidDbDate(t.date);
        if (d) dbTr.date = d;
      }
      return dbInsert<TreatmentRecord>("treatment_records", dbTr as TreatmentRecord, "treatmentRecords");
    },
    update: (t: TreatmentRecord) => dbUpdate<TreatmentRecord>("treatment_records", t, "treatmentRecords"),
    remove: (id: string) => dbDelete("treatment_records", id, "treatmentRecords"),
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  reports: {
    list: () => dbList<Report>("reports", "reports"),
    create: (r: Partial<Report>) => {
      const dbRep: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRep.date = d;
      }
      return dbInsert<Report>("reports", dbRep as Report, "reports");
    },
    update: (r: Report) => dbUpdate<Report>("reports", r, "reports"),
    remove: (id: string) => dbDelete("reports", id, "reports"),
  },

  // ── Customers ──────────────────────────────────────────────────────────────
  customers: {
    list: () => dbList<Customer>("customers", "customers"),
    create: (c: Partial<Customer>) => dbInsert<Customer>("customers", c as Customer, "customers"),
    update: (c: Customer) => dbUpdate<Customer>("customers", c, "customers"),
    remove: (id: string) => dbDelete("customers", id, "customers"),
  },

  // ── Price groups ───────────────────────────────────────────────────────────
  priceGroups: {
    list: () => dbList<PriceGroup>("price_groups", "priceGroups"),
    create: (g: Partial<PriceGroup>) => dbInsert<PriceGroup>("price_groups", g as PriceGroup, "priceGroups"),
    update: (g: PriceGroup) => dbUpdate<PriceGroup>("price_groups", g, "priceGroups"),
    remove: (id: string) => dbDelete("price_groups", id, "priceGroups"),
  },

  // ── Invoices ───────────────────────────────────────────────────────────────
  invoices: {
    list: () => dbList<Invoice>("invoices", "invoices"),
    create: (i: Partial<Invoice>) => {
      const dbInv: any = { ...i };
      if (i.invoiceDate) {
        const d = toValidDbDate(i.invoiceDate);
        if (d) dbInv.invoiceDate = d;
      }
      if (i.dueDate) {
        const d = toValidDbDate(i.dueDate);
        if (d) dbInv.dueDate = d;
      }
      return dbInsert<Invoice>("invoices", dbInv as Invoice, "invoices");
    },
    update: (i: Invoice) => dbUpdate<Invoice>("invoices", i, "invoices"),
    remove: (id: string) => dbDelete("invoices", id, "invoices"),
  },

  // ── Invoice settings ───────────────────────────────────────────────────────
  invSettings: {
    get: async () => {
      try {
        const userId = await getUserId();
        if (!userId) return null;
        const { data } = await supabase.from("invoice_settings").select("*").eq("user_id", userId).maybeSingle();
        return data ? objToCamel<InvSettings>(data) : null;
      } catch (e) {
        console.warn("Failed to get invoice settings", e);
        return null;
      }
    },
    update: async (s: Partial<InvSettings>) => {
      const userId = await getUserId();
      const snake = objToSnake(s as any, userId);
      const { data } = await supabase.from("invoice_settings").upsert(snake).select().single();
      return data ? objToCamel<InvSettings>(data) : (s as InvSettings);
    },
  },

  // ── Knowledge questions ────────────────────────────────────────────────────
  kQuestions: {
    list: () => dbList<any>("knowledge_questions", "knowledgeQuestions"),
    create: (q: any) => dbInsert<any>("knowledge_questions", q, "knowledgeQuestions"),
    update: (q: any) => dbUpdate<any>("knowledge_questions", q, "knowledgeQuestions"),
    remove: (id: string) => dbDelete("knowledge_questions", id, "knowledgeQuestions"),
  },

  // ── Compatibility questions ────────────────────────────────────────────────
  cQuestions: {
    list: () => dbList<any>("compatibility_questions", "compatibilityQuestions"),
    create: (q: any) => dbInsert<any>("compatibility_questions", q, "compatibilityQuestions"),
    update: (q: any) => dbUpdate<any>("compatibility_questions", q, "compatibilityQuestions"),
    remove: (id: string) => dbDelete("compatibility_questions", id, "compatibilityQuestions"),
  },

  // ── Knowledge results ──────────────────────────────────────────────────────
  kResults: {
    list: () => dbList<any>("knowledge_results", "knowledgeResults"),
    create: (r: any) => dbInsert<any>("knowledge_results", r, "knowledgeResults"),
    remove: (id: string) => dbDelete("knowledge_results", id, "knowledgeResults"),
  },

  // ── Compatibility results ──────────────────────────────────────────────────
  cResults: {
    list: () => dbList<any>("compatibility_results", "compatibilityResults"),
    create: (r: any) => dbInsert<any>("compatibility_results", r, "compatibilityResults"),
    remove: (id: string) => dbDelete("compatibility_results", id, "compatibilityResults"),
  },

  // ── Public assessment (no auth) ────────────────────────────────────────────
  public: {
    getQuestions: async (type: "knowledge" | "compatibility", ownerId: string) => {
      if (!ownerId || typeof ownerId !== "string" || ownerId.trim() === "") {
        throw new Error("Invalid assessment link: missing organisation ID.");
      }
      const cleanOwnerId = ownerId.trim();
      const table = type === "knowledge" ? "knowledge_questions" : "compatibility_questions";
      
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("user_id", cleanOwnerId)
          .order("created_at", { ascending: true });

        if (error) {
          console.warn(`Supabase public ${table} query notice:`, error.message);
        }

        if (data && data.length > 0) {
          return data.map(r => objToCamel(r));
        }

        // Check if owner profile exists or ownerId is valid UUID
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("id, farm_name")
          .eq("id", cleanOwnerId)
          .maybeSingle();

        if (prof || isUuid(cleanOwnerId)) {
          // Return standard questions so public link loads seamlessly even before custom questions are added
          return (type === "knowledge" ? INIT_K : INIT_C) as any[];
        }

        throw new Error("Invalid or expired assessment link. This assessment is no longer available.");
      } catch (err: any) {
        if (err.message && err.message.includes("Invalid")) throw err;
        return (type === "knowledge" ? INIT_K : INIT_C) as any[];
      }
    },
    submitResult: async (type: "knowledge" | "compatibility", ownerId: string, result: any) => {
      if (!ownerId) throw new Error("Missing organisation ID for submission");
      const cleanOwnerId = ownerId.trim();
      const table = type === "knowledge" ? "knowledge_results" : "compatibility_results";
      const snake = objToSnake(result, cleanOwnerId);
      if (!snake.id) snake.id = crypto.randomUUID();
      snake.user_id = cleanOwnerId;

      const { data, error } = await supabase.from(table).insert(snake).select().single();
      if (error) {
        console.error("Public submit result error:", error);
        throw new Error(error.message || "Failed to submit assessment results");
      }
      return data ? objToCamel(data) : result;
    },
  },
};
