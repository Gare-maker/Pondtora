import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const P = "/make-server-1da59a07";

const app = new Hono();
app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const SUPABASE_URL = () => Deno.env.get("SUPABASE_URL")!;
const ANON_KEY    = () => Deno.env.get("SUPABASE_ANON_KEY")!;
const SVC_KEY     = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Service-role client — only for admin operations, staff invitations, and cross-user queries
// Falls back to anon key if service role not set (admin features will be limited)
const adminDb = () => createClient(
  SUPABASE_URL(),
  SVC_KEY() || ANON_KEY(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// User client — enforces RLS via the caller's JWT
function userDb(token: string) {
  return createClient(SUPABASE_URL(), ANON_KEY(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── camelCase ↔ snake_case ────────────────────────────────────────────────────
const toSnake = (s: string) => s.replace(/([A-Z])/g, "_$1").toLowerCase();
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
function objToSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = toSnake(k);
    // Map 'desc' → 'description' (used in expenses)
    out[key === "desc" ? "description" : key] = v;
  }
  return out;
}
function objToCamel(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = toCamel(k);
    // Map 'description' → 'desc' (expenses use 'desc' in frontend)
    out[key === "description" ? "desc" : key] = v;
  }
  return out;
}

function dbErr(c: any, error: any, status = 500) {
  console.error(error);
  return c.json({ error: error?.message ?? String(error) }, status);
}

// ── Auth middleware ───────────────────────────────────────────────────────────
app.use(`${P}/*`, async (c, next) => {
  const path = c.req.path;
  const unprotected = ["/health", "/public/"];
  if (unprotected.some(u => path.includes(u))) return next();

  const token = c.req.header("Authorization")?.replace("Bearer ", "") ?? "";
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const { data: { user }, error } = await adminDb().auth.getUser(token);
  if (error || !user) return c.json({ error: "Unauthorized" }, 401);

  c.set("user", user);
  c.set("userId", user.id);
  c.set("token", token);
  return next();
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get(`${P}/health`, (c) => c.json({ status: "ok", version: "2.1" }));

// ── Setup: returns DDL SQL for manual run (Admin only) ────────────────────────
app.get(`${P}/setup`, async (c) => {
  const userId = c.get("userId") as string;
  const { data: profile } = await adminDb()
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "superadmin") {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  return c.json({ sql: FULL_DDL });
});

// ── Auto-setup: creates tables via direct SQL execution (Admin only) ──────────
app.post(`${P}/auto-setup`, async (c) => {
  const userId = c.get("userId") as string;
  const { data: profile } = await adminDb()
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "superadmin") {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  const supabase = adminDb();
  if (!SVC_KEY()) {
    return c.json({ success: false, needsManual: true, sql: FULL_DDL,
      error: "SUPABASE_SERVICE_ROLE_KEY not set. Run the SQL manually." });
  }
  // Split DDL into individual statements and execute each
  const statements = FULL_DDL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith("--"));

  const errors: string[] = [];
  for (const stmt of statements) {
    const full = stmt.endsWith(";") ? stmt : stmt + ";";
    try {
      const { error } = await supabase.rpc("exec_sql", { sql: full });
      if (error && !error.message.includes("already exists") && !error.message.includes("duplicate")) {
        errors.push(error.message.substring(0, 200));
      }
    } catch { /* ignore */ }
  }
  return c.json({ success: true, errors: errors.length ? errors : undefined });
});

// ── Generic CRUD factory — uses userDb(token) so RLS enforces access ──────────
function makeCrud(app: Hono, table: string) {
  const route = `${P}/${table.replace(/_/g, "-")}`;

  // LIST — filtered by user_id via RLS
  app.get(route, async (c) => {
    const token = c.get("token") as string;
    const userId = c.get("userId") as string;
    const db = userDb(token);
    const { data, error } = await db
      .from(table).select("*").eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return dbErr(c, error);
    return c.json((data || []).map(objToCamel));
  });

  // GET ONE
  app.get(`${route}/:id`, async (c) => {
    const token = c.get("token") as string;
    const { data, error } = await userDb(token)
      .from(table).select("*").eq("id", c.req.param("id")).maybeSingle();
    if (error) return dbErr(c, error);
    if (!data) return c.json({ error: "Not found" }, 404);
    return c.json(objToCamel(data));
  });

  // CREATE — user_id injected server-side, RLS WITH CHECK enforces ownership
  app.post(route, async (c) => {
    const token  = c.get("token") as string;
    const userId = c.get("userId") as string;
    const body   = await c.req.json();
    const row    = objToSnake(body);
    row.user_id  = userId;
    delete row.id; // let DB generate UUID
    const { data, error } = await userDb(token)
      .from(table).insert(row).select().single();
    if (error) return dbErr(c, error);
    return c.json(objToCamel(data), 201);
  });

  // UPDATE — scoped by user_id + RLS
  app.put(`${route}/:id`, async (c) => {
    const token  = c.get("token") as string;
    const userId = c.get("userId") as string;
    const body   = await c.req.json();
    const row    = objToSnake(body);
    delete row.id; delete row.created_at; delete row.user_id;
    const { data, error } = await userDb(token)
      .from(table).update(row).eq("id", c.req.param("id")).eq("user_id", userId)
      .select().single();
    if (error) return dbErr(c, error);
    return c.json(objToCamel(data));
  });

  // DELETE — scoped by user_id + RLS
  app.delete(`${route}/:id`, async (c) => {
    const token  = c.get("token") as string;
    const userId = c.get("userId") as string;
    const { error } = await userDb(token)
      .from(table).delete().eq("id", c.req.param("id")).eq("user_id", userId);
    if (error) return dbErr(c, error);
    return c.json({ success: true });
  });
}

// ── Me: profile + farms + staff info ─────────────────────────────────────────
app.get(`${P}/me`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const db     = userDb(token);
  const [profileRes, farmsRes] = await Promise.all([
    db.from("user_profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("farms").select("*").eq("user_id", userId).order("created_at"),
  ]);
  const profile = profileRes.data ? objToCamel(profileRes.data) : null;
  let staffInfo = null;
  if (!profile || profile.role === "staff") {
    const { data: sm } = await adminDb().from("staff_members")
      .select("*, staff_farm_assignments(farm_id), staff_permissions(feature,can_view)")
      .eq("staff_auth_id", userId).maybeSingle();
    if (sm) {
      const farmIds = (sm.staff_farm_assignments || []).map((a: any) => a.farm_id);
      const perms   = (sm.staff_permissions || []).filter((p: any) => p.can_view).map((p: any) => p.feature);
      const { data: assignedFarms } = await adminDb().from("farms").select("*").in("id", farmIds);
      staffInfo = { ...objToCamel(sm), farmIds, permissions: perms,
        assignedFarms: (assignedFarms || []).map(objToCamel), ownerId: sm.user_id };
    }
  }
  return c.json({ profile, farms: (farmsRes.data || []).map(objToCamel), staffInfo, isStaff: !!staffInfo });
});

// ── Profile update ────────────────────────────────────────────────────────────
app.put(`${P}/profile`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const body   = await c.req.json();
  const row    = objToSnake(body);
  delete row.id; delete row.created_at;
  const { data, error } = await userDb(token)
    .from("user_profiles").update(row).eq("id", userId).select().single();
  if (error) return dbErr(c, error);
  return c.json(objToCamel(data));
});

app.put(`${P}/profile/plan`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const { plan, trialStartDate } = await c.req.json();
  const update: any = {};
  if (plan !== undefined) update.active_plan = plan;
  if (trialStartDate !== undefined) update.trial_start_date = trialStartDate;
  const { data, error } = await userDb(token)
    .from("user_profiles").update(update).eq("id", userId).select().single();
  if (error) return dbErr(c, error);
  return c.json(objToCamel(data));
});

// ── Farms ─────────────────────────────────────────────────────────────────────
app.get(`${P}/farms`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const { data: owned } = await userDb(token).from("farms").select("*").eq("user_id", userId).order("created_at");
  if (owned?.length) return c.json(owned.map(objToCamel));
  // Staff: get assigned farms
  const { data: sm } = await adminDb().from("staff_members").select("id").eq("staff_auth_id", userId).maybeSingle();
  if (sm) {
    const { data: asgn } = await adminDb().from("staff_farm_assignments").select("farm_id").eq("staff_id", sm.id);
    if (asgn?.length) {
      const ids = asgn.map((a: any) => a.farm_id);
      const { data: farms } = await adminDb().from("farms").select("*").in("id", ids);
      return c.json((farms || []).map(objToCamel));
    }
  }
  return c.json([]);
});

app.post(`${P}/farms`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const body   = await c.req.json();
  const { data, error } = await userDb(token)
    .from("farms").insert({ ...objToSnake(body), user_id: userId }).select().single();
  if (error) return dbErr(c, error);
  return c.json(objToCamel(data), 201);
});

app.put(`${P}/farms/:id`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const row    = objToSnake(await c.req.json());
  delete row.id; delete row.user_id; delete row.created_at;
  const { data, error } = await userDb(token)
    .from("farms").update(row).eq("id", c.req.param("id")).eq("user_id", userId).select().single();
  if (error) return dbErr(c, error);
  return c.json(objToCamel(data));
});

app.delete(`${P}/farms/:id`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const { error } = await userDb(token)
    .from("farms").delete().eq("id", c.req.param("id")).eq("user_id", userId);
  if (error) return dbErr(c, error);
  return c.json({ success: true });
});

// ── Staff ─────────────────────────────────────────────────────────────────────
app.get(`${P}/staff-members`, async (c) => {
  const userId = c.get("userId") as string;
  const { data, error } = await adminDb()
    .from("staff_members")
    .select("*, staff_farm_assignments(farm_id), staff_permissions(feature,can_view,can_create,can_edit,can_delete)")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) return dbErr(c, error);
  return c.json((data || []).map(s => ({
    ...objToCamel(s),
    farms: (s.staff_farm_assignments || []).map((a: any) => a.farm_id),
    permissions: (s.staff_permissions || []).filter((p: any) => p.can_view).map((p: any) => p.feature),
  })));
});

// Invite staff
app.post(`${P}/staff-members/invite`, async (c) => {
  const userId = c.get("userId") as string;
  const { email, name, phone, role, farms = [], permissions = [], appUrl } = await c.req.json();
  if (!email) return c.json({ error: "Email is required" }, 400);
  const svc = adminDb();

  // Upsert staff_members record (no password field — passwords are Supabase Auth only)
  const { data: sm, error: smErr } = await svc
    .from("staff_members")
    .upsert({ user_id: userId, name: name || email.split("@")[0], email,
      phone: phone || "", role: role || "General Staff", status: "Pending",
      joined_date: new Date().toISOString() }, { onConflict: "user_id,email" })
    .select().single();
  if (smErr) return dbErr(c, smErr);

  // Create invitation record
  await svc.from("staff_invitations").insert({
    email, invited_by: userId, staff_id: sm.id, status: "pending",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Farm assignments
  if (farms.length > 0) {
    await svc.from("staff_farm_assignments").delete().eq("staff_id", sm.id);
    await svc.from("staff_farm_assignments").insert(
      farms.map((fid: string) => ({ staff_id: sm.id, farm_id: fid, assigned_by: userId }))
    );
  }

  // Permissions
  if (permissions.length > 0) {
    await svc.from("staff_permissions").delete().eq("staff_id", sm.id);
    await svc.from("staff_permissions").insert(
      permissions.map((feat: string) => ({
        staff_id: sm.id, feature: feat,
        can_view: true, can_create: true, can_edit: true, can_delete: false,
      }))
    );
  }

  // Send invite email (requires service role key)
  let inviteError = null;
  if (SVC_KEY()) {
    const redirectTo = `${appUrl || "https://pondtora.app"}?type=invite`;
    const { error: ie } = await svc.auth.admin.inviteUserByEmail(email, {
      data: { owner_id: userId, role: "staff", staff_id: sm.id },
      redirectTo,
    });
    if (ie && !ie.message.includes("already registered") && !ie.message.includes("already exists")) {
      inviteError = ie.message;
    }
  } else {
    inviteError = "SUPABASE_SERVICE_ROLE_KEY not set — invite email could not be sent.";
  }

  return c.json({
    success: true,
    staffMember: { ...objToCamel(sm), farms, permissions },
    inviteError,
  }, 201);
});

app.put(`${P}/staff-members/:id`, async (c) => {
  const userId = c.get("userId") as string;
  const { farms, permissions, ...rest } = await c.req.json();
  const row = objToSnake(rest);
  delete row.id; delete row.user_id; delete row.created_at;
  const svc = adminDb();
  const { data, error } = await svc
    .from("staff_members").update(row).eq("id", c.req.param("id")).eq("user_id", userId).select().single();
  if (error) return dbErr(c, error);
  if (farms !== undefined) {
    await svc.from("staff_farm_assignments").delete().eq("staff_id", data.id);
    if (farms.length > 0) await svc.from("staff_farm_assignments").insert(
      farms.map((fid: string) => ({ staff_id: data.id, farm_id: fid, assigned_by: userId }))
    );
  }
  if (permissions !== undefined) {
    await svc.from("staff_permissions").delete().eq("staff_id", data.id);
    if (permissions.length > 0) await svc.from("staff_permissions").insert(
      permissions.map((feat: string) => ({
        staff_id: data.id, feature: feat, can_view: true, can_create: true, can_edit: true, can_delete: false,
      }))
    );
  }
  return c.json({ ...objToCamel(data), farms: farms ?? [], permissions: permissions ?? [] });
});

app.delete(`${P}/staff-members/:id`, async (c) => {
  const userId = c.get("userId") as string;
  const { error } = await adminDb()
    .from("staff_members").delete().eq("id", c.req.param("id")).eq("user_id", userId);
  if (error) return dbErr(c, error);
  return c.json({ success: true });
});

// ── Admin: list all users (requires admin role in user_profiles) ───────────────
app.get(`${P}/admin/users`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  // Verify caller is an admin
  const { data: me } = await userDb(token).from("user_profiles").select("role").eq("id", userId).maybeSingle();
  if (me?.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  const { data, error } = await adminDb().from("user_profiles").select("*").order("created_at", { ascending: false });
  if (error) return dbErr(c, error);
  return c.json((data || []).map(objToCamel));
});

// ── Admin: update user plan/status ─────────────────────────────────────────────
app.put(`${P}/admin/users/:id`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const { data: me } = await userDb(token).from("user_profiles").select("role").eq("id", userId).maybeSingle();
  if (me?.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  const allowed = ["active_plan", "status", "trial_start_date"];
  const row: any = {};
  for (const k of allowed) { if (objToSnake(body)[k] !== undefined) row[k] = objToSnake(body)[k]; }
  if (!Object.keys(row).length) return c.json({ error: "No valid fields" }, 400);
  const { data, error } = await adminDb()
    .from("user_profiles").update(row).eq("id", c.req.param("id")).select().single();
  if (error) return dbErr(c, error);
  return c.json(objToCamel(data));
});

// ── Invoice settings ──────────────────────────────────────────────────────────
app.get(`${P}/invoice-settings`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const { data, error } = await userDb(token).from("invoice_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) return dbErr(c, error);
  return c.json(data ? objToCamel(data) : null);
});

app.put(`${P}/invoice-settings`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const row    = { ...objToSnake(await c.req.json()), user_id: userId };
  delete row.created_at;
  const { data, error } = await userDb(token)
    .from("invoice_settings").upsert(row, { onConflict: "user_id" }).select().single();
  if (error) return dbErr(c, error);
  return c.json(objToCamel(data));
});

// ── Public assessment (no auth) ───────────────────────────────────────────────
app.get(`${P}/public/questions/:type/:ownerId`, async (c) => {
  const table = c.req.param("type") === "knowledge" ? "knowledge_questions" : "compatibility_questions";
  const { data, error } = await adminDb()
    .from(table).select("*").eq("user_id", c.req.param("ownerId")).order("created_at", { ascending: true });
  if (error) return dbErr(c, error);
  return c.json((data || []).map(objToCamel));
});

app.post(`${P}/public/results/:type/:ownerId`, async (c) => {
  const table = c.req.param("type") === "knowledge" ? "knowledge_results" : "compatibility_results";
  const row   = { ...objToSnake(await c.req.json()), user_id: c.req.param("ownerId") };
  delete row.id;
  const { data, error } = await adminDb().from(table).insert(row).select().single();
  if (error) return dbErr(c, error);
  return c.json(objToCamel(data), 201);
});

// ── Bulk load all data ────────────────────────────────────────────────────────
app.get(`${P}/all`, async (c) => {
  const userId = c.get("userId") as string;
  const token  = c.get("token") as string;
  const svc    = adminDb();

  // Probe: check tables exist
  const { error: probe } = await userDb(token).from("user_profiles").select("id").eq("id", userId).limit(1);
  if (probe?.message?.includes("does not exist") || probe?.message?.includes("PGRST205")) {
    return c.json({ needsSetup: true, sql: FULL_DDL });
  }

  const { data: profile } = await svc.from("user_profiles").select("*").eq("id", userId).maybeSingle();
  let ownerUserId  = userId;
  let staffFarmIds: string[] = [];
  let staffInfo: any = null;

  if (profile?.role === "staff") {
    const { data: sm } = await svc
      .from("staff_members")
      .select("*, staff_farm_assignments(farm_id), staff_permissions(feature,can_view)")
      .eq("staff_auth_id", userId).maybeSingle();
    if (sm) {
      ownerUserId  = sm.user_id;
      staffFarmIds = (sm.staff_farm_assignments || []).map((a: any) => a.farm_id);
      const perms  = (sm.staff_permissions || []).filter((p: any) => p.can_view).map((p: any) => p.feature);
      staffInfo = { id: sm.id, name: sm.name, email: sm.email, role: sm.role,
        farms: staffFarmIds, permissions: perms, ownerId: ownerUserId };
    }
  }

  const isFarmFiltered = profile?.role === "staff" && staffFarmIds.length > 0;

  async function fetch(table: string, farmCol?: string) {
    let q = svc.from(table).select("*").eq("user_id", ownerUserId);
    if (isFarmFiltered && farmCol) q = q.in(farmCol, staffFarmIds);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) console.warn(`Error loading ${table}:`, error.message);
    return (data || []).map(objToCamel);
  }

  const [
    farms, profiles, ponds, stock, inventory,
    feeding, bags, remain, expenses, revenues,
    mortality, treatment, staffList, reports,
    customers, prices, invoices, kQ, cQ, kR, cR,
  ] = await Promise.all([
    fetch("farms"),
    fetch("user_profiles"),
    fetch("ponds", "farm_id"),
    fetch("stock_events"),
    fetch("feed_inventory", "farm_id"),
    fetch("feeding_records", "farm_id"),
    fetch("bag_open_logs", "farm_id"),
    fetch("feed_remaining_logs", "farm_id"),
    fetch("expenses", "farm_id"),
    fetch("revenues", "farm_id"),
    fetch("mortality_entries", "farm_id"),
    fetch("treatment_records", "farm_id"),
    fetch("staff_members"),
    fetch("reports", "farm_id"),
    fetch("customers", "farm_id"),
    fetch("price_groups"),
    fetch("invoices", "farm_id"),
    fetch("knowledge_questions"),
    fetch("compatibility_questions"),
    fetch("knowledge_results"),
    fetch("compatibility_results"),
  ]);

  const { data: invSettings } = await svc.from("invoice_settings").select("*").eq("user_id", ownerUserId).maybeSingle();

  // Enrich staff with their assignments + permissions
  const staffWithDetails = await Promise.all(
    (staffList as any[]).map(async (s: any) => {
      const [{ data: fa }, { data: fp }] = await Promise.all([
        svc.from("staff_farm_assignments").select("farm_id").eq("staff_id", s.id),
        svc.from("staff_permissions").select("feature").eq("staff_id", s.id).eq("can_view", true),
      ]);
      return { ...s, farms: (fa || []).map((a: any) => a.farmId), permissions: (fp || []).map((p: any) => p.feature) };
    })
  );

  const visibleFarms = isFarmFiltered
    ? (farms as any[]).filter((f: any) => staffFarmIds.includes(f.id))
    : farms;

  return c.json({
    needsSetup: false,
    farms: visibleFarms, userProfiles: profiles, ponds, stockEvents: stock,
    feedInventory: inventory, feedingRecords: feeding, bagOpenLogs: bags,
    feedRemainingLogs: remain, expenses, revenues, mortalityEntries: mortality,
    treatmentRecords: treatment, staffMembers: staffWithDetails, reports,
    customers, priceGroups: prices, invoices,
    knowledgeQuestions: kQ, compatibilityQuestions: cQ,
    knowledgeResults: kR, compatibilityResults: cR,
    invoiceSettings: invSettings ? objToCamel(invSettings) : null,
    staffInfo, isStaff: !!staffInfo,
  });
});

// ── Register all CRUD tables ──────────────────────────────────────────────────
makeCrud(app, "ponds");
makeCrud(app, "stock_events");
makeCrud(app, "feed_inventory");
makeCrud(app, "feeding_records");
makeCrud(app, "bag_open_logs");
makeCrud(app, "feed_remaining_logs");
makeCrud(app, "expenses");
makeCrud(app, "revenues");
makeCrud(app, "mortality_entries");
makeCrud(app, "treatment_records");
makeCrud(app, "reports");
makeCrud(app, "customers");
makeCrud(app, "price_groups");
makeCrud(app, "invoices");
makeCrud(app, "knowledge_questions");
makeCrud(app, "compatibility_questions");
makeCrud(app, "knowledge_results");
makeCrud(app, "compatibility_results");

Deno.serve(app.fetch);

// ═══════════════════════════════════════════════════════════════════════════════
// FULL DATABASE DDL — run this in Supabase SQL Editor to initialize the schema
// ═══════════════════════════════════════════════════════════════════════════════
const FULL_DDL = `
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  farm_name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Nigeria',
  email TEXT UNIQUE NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  currency_symbol TEXT NOT NULL DEFAULT '₦',
  currency_code TEXT NOT NULL DEFAULT 'NGN',
  active_plan TEXT,
  trial_start_date TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- farms
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  country TEXT DEFAULT 'Nigeria',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- staff_members (no password column — passwords are Supabase Auth only)
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  staff_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'General Staff',
  status TEXT DEFAULT 'Pending',
  joined_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- staff_invitations
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- staff_farm_assignments
CREATE TABLE IF NOT EXISTS staff_farm_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, farm_id)
);

-- staff_permissions
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, feature)
);

-- ponds
CREATE TABLE IF NOT EXISTS ponds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT, type TEXT, species TEXT,
  size_m2 NUMERIC, initial_stock INTEGER DEFAULT 0,
  current_count INTEGER DEFAULT 0, avg_weight NUMERIC DEFAULT 0,
  stocking_date DATE, stock_month TEXT, total_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active', notes TEXT,
  default_pellet TEXT, category TEXT, max_kg_by_pallet JSONB,
  supplier TEXT, transfer_note TEXT,
  length_ft TEXT, width_ft TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- stock_events
CREATE TABLE IF NOT EXISTS stock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  pond_name TEXT, date DATE, species TEXT,
  count INTEGER, avg_weight NUMERIC, cost NUMERIC, sale_price NUMERIC,
  type TEXT, from_pond TEXT, cleared_date DATE, supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- feed_inventory
CREATE TABLE IF NOT EXISTS feed_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  brand TEXT, size TEXT, bags INTEGER, weight_per_bag NUMERIC,
  total_kg NUMERIC, cost_per_bag NUMERIC, supplier TEXT,
  purchase_date DATE, month TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- feeding_records
CREATE TABLE IF NOT EXISTS feeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  date DATE, month TEXT, year INTEGER,
  pond TEXT, brand TEXT, size TEXT,
  morning NUMERIC, evening NUMERIC, total NUMERIC,
  recorded_by TEXT, morning_time TEXT, evening_time TEXT,
  created_by TEXT, created_by_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bag_open_logs
CREATE TABLE IF NOT EXISTS bag_open_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  date DATE, month TEXT, year INTEGER,
  brand TEXT, size TEXT, kg_per_bag NUMERIC,
  bags_opened INTEGER, total_kg NUMERIC, fish_stock TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- feed_remaining_logs
CREATE TABLE IF NOT EXISTS feed_remaining_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  brand TEXT, size TEXT, fish_stock TEXT, remaining_kg NUMERIC, date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  category TEXT, amount NUMERIC, date DATE, month TEXT, year INTEGER,
  pond TEXT, description TEXT, fish_stock TEXT,
  created_by TEXT, created_by_id TEXT,
  original_description TEXT,
  edit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- revenues
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  source TEXT, amount NUMERIC, date DATE, month TEXT, year INTEGER,
  notes TEXT, original_notes TEXT, pond TEXT, stock_batch TEXT, fish_stock TEXT,
  created_by TEXT, created_by_id TEXT,
  edit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- mortality_entries
CREATE TABLE IF NOT EXISTS mortality_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  date DATE, count INTEGER, cause TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- treatment_records
CREATE TABLE IF NOT EXISTS treatment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  date DATE, cause TEXT, medicine TEXT, remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  title TEXT, content TEXT, type TEXT, author TEXT,
  date DATE, status TEXT DEFAULT 'Open',
  resolved_by TEXT, resolved_date DATE,
  tags JSONB DEFAULT '[]'::jsonb, timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT, phone TEXT, email TEXT, business_name TEXT, address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- price_groups
CREATE TABLE IF NOT EXISTS price_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  group_key TEXT, display_name TEXT, description TEXT,
  price_per_kg NUMERIC, status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  inv_number TEXT, customer JSONB,
  pond TEXT, species TEXT, items JSONB DEFAULT '[]'::jsonb,
  discount_type TEXT, subtotal NUMERIC, discount NUMERIC,
  additional_charges NUMERIC, grand_total NUMERIC,
  amount_paid NUMERIC, outstanding NUMERIC,
  status TEXT, payment_method TEXT,
  invoice_date DATE, due_date DATE, notes TEXT, issued_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoice_settings (singleton per user)
CREATE TABLE IF NOT EXISTS invoice_settings (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_name TEXT, farm_address TEXT, farm_phone TEXT, farm_email TEXT,
  bank_details TEXT, default_notes TEXT, footer_message TEXT,
  tax_rate NUMERIC DEFAULT 0, invoice_prefix TEXT DEFAULT 'INV',
  payment_terms TEXT, updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- knowledge_questions
CREATE TABLE IF NOT EXISTS knowledge_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  text TEXT, category TEXT, options JSONB, correct_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- compatibility_questions
CREATE TABLE IF NOT EXISTS compatibility_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  text TEXT, category TEXT, options JSONB, correct_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- knowledge_results
CREATE TABLE IF NOT EXISTS knowledge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT, email TEXT, phone TEXT, gender TEXT,
  date_taken DATE, time_taken TEXT,
  total_correct INTEGER, total_wrong INTEGER,
  overall_score INTEGER, pass BOOLEAN, category_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- compatibility_results
CREATE TABLE IF NOT EXISTS compatibility_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT, email TEXT, phone TEXT, gender TEXT,
  date_taken DATE, time_taken TEXT,
  category_scores JSONB, overall_score INTEGER, recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON staff_members(staff_auth_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff_members(email);
CREATE INDEX IF NOT EXISTS idx_sfa_staff_id ON staff_farm_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_sfa_farm_id ON staff_farm_assignments(farm_id);
CREATE INDEX IF NOT EXISTS idx_sp_staff_id ON staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_ponds_user_id ON ponds(user_id);
CREATE INDEX IF NOT EXISTS idx_ponds_farm_id ON ponds(farm_id);
CREATE INDEX IF NOT EXISTS idx_stock_user_id ON stock_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_inv_user_id ON feed_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_rec_user_id ON feeding_records(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_revenues_user_id ON revenues(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_farm_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponds ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_open_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_remaining_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortality_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- user_profiles: own row only
DROP POLICY IF EXISTS "own_profile" ON user_profiles;
CREATE POLICY "own_profile" ON user_profiles
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- farms: owner full access
DROP POLICY IF EXISTS "owner_farms" ON farms;
CREATE POLICY "owner_farms" ON farms
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- staff_members: owner manages, staff sees self
DROP POLICY IF EXISTS "owner_staff" ON staff_members;
CREATE POLICY "owner_staff" ON staff_members
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "staff_view_self" ON staff_members;
CREATE POLICY "staff_view_self" ON staff_members
  FOR SELECT USING (auth.uid() = staff_auth_id);

-- staff_invitations
DROP POLICY IF EXISTS "inviter_invitations" ON staff_invitations;
CREATE POLICY "inviter_invitations" ON staff_invitations
  FOR ALL USING (auth.uid() = invited_by) WITH CHECK (auth.uid() = invited_by);

-- staff_farm_assignments
DROP POLICY IF EXISTS "owner_assignments" ON staff_farm_assignments;
CREATE POLICY "owner_assignments" ON staff_farm_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND f.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND f.user_id = auth.uid())
  );

-- staff_permissions
DROP POLICY IF EXISTS "owner_permissions" ON staff_permissions;
CREATE POLICY "owner_permissions" ON staff_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff_members sm WHERE sm.id = staff_permissions.staff_id AND sm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM staff_members sm WHERE sm.id = staff_permissions.staff_id AND sm.user_id = auth.uid())
  );

-- All user-scoped data tables: owner + assigned staff
CREATE OR REPLACE FUNCTION user_can_access_farm(p_farm_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM farms f WHERE f.id = p_farm_id AND f.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM staff_farm_assignments sfa
    JOIN staff_members sm ON sm.id = sfa.staff_id
    WHERE sfa.farm_id = p_farm_id AND sm.staff_auth_id = auth.uid()
  )
$$;

-- Ponds
DROP POLICY IF EXISTS "farm_ponds" ON ponds;
CREATE POLICY "farm_ponds" ON ponds
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Stock events
DROP POLICY IF EXISTS "farm_stock" ON stock_events;
CREATE POLICY "farm_stock" ON stock_events
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feed inventory
DROP POLICY IF EXISTS "farm_feed_inv" ON feed_inventory;
CREATE POLICY "farm_feed_inv" ON feed_inventory
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Feeding records
DROP POLICY IF EXISTS "farm_feeding" ON feeding_records;
CREATE POLICY "farm_feeding" ON feeding_records
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Bag open logs
DROP POLICY IF EXISTS "farm_bags" ON bag_open_logs;
CREATE POLICY "farm_bags" ON bag_open_logs
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Feed remaining logs
DROP POLICY IF EXISTS "farm_remain" ON feed_remaining_logs;
CREATE POLICY "farm_remain" ON feed_remaining_logs
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Expenses
DROP POLICY IF EXISTS "farm_expenses" ON expenses;
CREATE POLICY "farm_expenses" ON expenses
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Revenues
DROP POLICY IF EXISTS "farm_revenues" ON revenues;
CREATE POLICY "farm_revenues" ON revenues
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Mortality
DROP POLICY IF EXISTS "farm_mortality" ON mortality_entries;
CREATE POLICY "farm_mortality" ON mortality_entries
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Treatments
DROP POLICY IF EXISTS "farm_treatment" ON treatment_records;
CREATE POLICY "farm_treatment" ON treatment_records
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Reports
DROP POLICY IF EXISTS "farm_reports" ON reports;
CREATE POLICY "farm_reports" ON reports
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Customers
DROP POLICY IF EXISTS "farm_customers" ON customers;
CREATE POLICY "farm_customers" ON customers
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Price groups
DROP POLICY IF EXISTS "farm_prices" ON price_groups;
CREATE POLICY "farm_prices" ON price_groups
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Invoices
DROP POLICY IF EXISTS "farm_invoices" ON invoices;
CREATE POLICY "farm_invoices" ON invoices
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id))
  WITH CHECK (auth.uid() = user_id);

-- Invoice settings
DROP POLICY IF EXISTS "own_inv_settings" ON invoice_settings;
CREATE POLICY "own_inv_settings" ON invoice_settings
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Knowledge / compatibility
DROP POLICY IF EXISTS "own_kq" ON knowledge_questions;
CREATE POLICY "own_kq" ON knowledge_questions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_cq" ON compatibility_questions;
CREATE POLICY "own_cq" ON compatibility_questions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_kr" ON knowledge_results;
CREATE POLICY "own_kr" ON knowledge_results
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_cr" ON compatibility_results;
CREATE POLICY "own_cr" ON compatibility_results
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-farm trigger: runs on auth.users INSERT, creates user_profiles + farm
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
  v_owner_id UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'owner');

  INSERT INTO user_profiles (
    id, name, farm_name, city, state, country,
    email, phone, currency_symbol, currency_code,
    active_plan, trial_start_date, role, status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'farm_name', 'My Farm'),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'Nigeria'),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'currency_symbol', '₦'),
    COALESCE(NEW.raw_user_meta_data->>'currency_code', 'NGN'),
    NEW.raw_user_meta_data->>'active_plan',
    CASE WHEN (NEW.raw_user_meta_data->>'trial_start_date') IS NOT NULL
         THEN (NEW.raw_user_meta_data->>'trial_start_date')::TIMESTAMPTZ
         ELSE NOW() END,
    v_role,
    'Active'
  ) ON CONFLICT (id) DO NOTHING;

  IF v_role = 'owner' THEN
    INSERT INTO farms (user_id, name, city, state, country) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'farm_name', 'My Farm'),
      COALESCE(NEW.raw_user_meta_data->>'city', ''),
      COALESCE(NEW.raw_user_meta_data->>'state', ''),
      COALESCE(NEW.raw_user_meta_data->>'country', 'Nigeria')
    );
  END IF;

  IF v_role = 'staff' THEN
    v_owner_id := (NEW.raw_user_meta_data->>'owner_id')::UUID;
    IF v_owner_id IS NOT NULL THEN
      UPDATE staff_members SET staff_auth_id = NEW.id, status = 'Active', updated_at = NOW()
        WHERE email = NEW.email AND user_id = v_owner_id;
      UPDATE staff_invitations SET status = 'accepted', accepted_at = NOW()
        WHERE email = NEW.email AND invited_by = v_owner_id AND status = 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`;
