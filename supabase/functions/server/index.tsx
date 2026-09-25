// @ts-nocheck
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

// ── Resolve effective user_id for staff members ───────────────────────────────
// When a staff member calls an API, records must be created/read under the
// Farm Owner's user_id (not the staff's own user_id). This function resolves
// the effective owner user_id and the staff's assigned farm IDs.
async function getEffectiveUserId(userId: string): Promise<{
  effectiveUserId: string;
  staffFarmIds: string[];
  isStaffCaller: boolean;
}> {
  try {
    const { data: sm } = await adminDb()
      .from("staff_members")
      .select("user_id, staff_farm_assignments(farm_id)")
      .eq("staff_auth_id", userId)
      .maybeSingle();
    if (sm?.user_id && sm.user_id !== userId) {
      const farmIds = (sm.staff_farm_assignments || []).map((a: any) => a.farm_id);
      return { effectiveUserId: sm.user_id, staffFarmIds: farmIds, isStaffCaller: true };
    }
  } catch { /* owner, fall through */ }
  return { effectiveUserId: userId, staffFarmIds: [], isStaffCaller: false };
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
  const unprotected = ["/health", "/public/", "/admin/delete-user", "/admin/overview", "/admin/platform-stats", "/admin/users", "/admin/register-profile"];
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

// ── Generic CRUD factory ─────────────────────────────────────────────────────
// All farm-data tables are SHARED: owner and staff see the same records.
//
// KEY BEHAVIOURS:
//   LIST   – filters by OWNER's user_id (staff resolves to owner via getEffectiveUserId)
//   CREATE – injects OWNER's user_id so records are always attributed to the owner
//   UPDATE – no user_id filter; RLS (user_can_access_owner_data) enforces access
//   DELETE – no user_id filter; RLS enforces access
//
// This ensures staff-created records are visible to the owner and vice-versa.
function makeCrud(app: Hono, table: string) {
  const route = `${P}/${table.replace(/_/g, "-")}`;

  // LIST — use OWNER's user_id so staff see the same records as the owner
  app.get(route, async (c) => {
    const token  = c.get("token") as string;
    const userId = c.get("userId") as string;
    const db     = userDb(token);
    const { effectiveUserId } = await getEffectiveUserId(userId);
    const { data, error } = await db
      .from(table).select("*").eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false });
    if (error) return dbErr(c, error);
    return c.json((data || []).map(objToCamel));
  });

  // GET ONE — no user_id filter; RLS enforces farm-level access
  app.get(`${route}/:id`, async (c) => {
    const token = c.get("token") as string;
    const { data, error } = await userDb(token)
      .from(table).select("*").eq("id", c.req.param("id")).maybeSingle();
    if (error) return dbErr(c, error);
    if (!data) return c.json({ error: "Not found" }, 404);
    return c.json(objToCamel(data));
  });

  // CREATE — inject OWNER's user_id so the record belongs to the farm owner
  app.post(route, async (c) => {
    const token  = c.get("token") as string;
    const userId = c.get("userId") as string;
    const body   = await c.req.json();
    const row    = objToSnake(body);
    // Resolve to owner's user_id (staff → owner, owner → self)
    const { effectiveUserId, staffFarmIds } = await getEffectiveUserId(userId);
    row.user_id = effectiveUserId;
    // If staff is creating and no farm_id provided, default to their first assigned farm
    if (staffFarmIds.length > 0 && !row.farm_id) {
      row.farm_id = staffFarmIds[0];
    }
    delete row.id; // let DB generate UUID
    const { data, error } = await userDb(token)
      .from(table).insert(row).select().single();
    if (error) return dbErr(c, error);
    return c.json(objToCamel(data), 201);
  });

  // UPDATE — no user_id filter; RLS (user_can_access_owner_data) enforces access.
  //          Do NOT re-inject user_id; preserve the existing owner's user_id.
  app.put(`${route}/:id`, async (c) => {
    const token = c.get("token") as string;
    const body  = await c.req.json();
    const row   = objToSnake(body);
    // Never let clients change ownership or created_at
    delete row.id; delete row.created_at; delete row.user_id;
    const { data, error } = await userDb(token)
      .from(table).update(row).eq("id", c.req.param("id"))
      .select().single();
    if (error) return dbErr(c, error);
    return c.json(objToCamel(data));
  });

  // DELETE — no user_id filter; RLS enforces access
  app.delete(`${route}/:id`, async (c) => {
    const token = c.get("token") as string;
    const { error } = await userDb(token)
      .from(table).delete().eq("id", c.req.param("id"));
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
      .select("*, staff_farm_assignments(farm_id), staff_permissions(feature,can_view,can_create,can_edit,can_delete)")
      .eq("staff_auth_id", userId).maybeSingle();
    if (sm) {
      const farmIds = (sm.staff_farm_assignments || []).map((a: any) => a.farm_id);
      const perms   = (sm.staff_permissions || []).filter((p: any) => p.can_view).map((p: any) => p.feature);
      // Build action-level permissions object: { [feature]: { canView, canCreate, canEdit, canDelete } }
      const staffPermissions: Record<string, any> = {};
      (sm.staff_permissions || []).forEach((p: any) => {
        staffPermissions[p.feature] = {
          canView: !!p.can_view,
          canCreate: !!p.can_create,
          canEdit: !!p.can_edit,
          canDelete: !!p.can_delete,
        };
      });
      const { data: assignedFarms } = await adminDb().from("farms").select("*").in("id", farmIds);
      staffInfo = { ...objToCamel(sm), farmIds, permissions: perms, staffPermissions,
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
  return c.json((data || []).map(s => {
    const farmIds = (s.staff_farm_assignments || []).map((a: any) => a.farm_id);
    const permissions = (s.staff_permissions || []).filter((p: any) => p.can_view).map((p: any) => p.feature);
    const staffPermissions: Record<string, any> = {};
    (s.staff_permissions || []).forEach((p: any) => {
      staffPermissions[p.feature] = {
        canView: !!p.can_view,
        canCreate: !!p.can_create,
        canEdit: !!p.can_edit,
        canDelete: !!p.can_delete,
      };
    });
    return { ...objToCamel(s), farms: farmIds, permissions, staffPermissions };
  }));
});

// Invite or add staff
app.post(`${P}/staff-members/invite`, async (c) => {
  const userId = c.get("userId") as string;
  const { email, password, name, phone, role, farms: rawFarms = [], permissions = [], staffPermissions, appUrl, farmName } = await c.req.json();
  if (!email) return c.json({ error: "Email is required" }, 400);
  const svc = adminDb();

  // Ensure staff always has at least one farm assignment.
  // If caller didn't provide farms, default to the owner's primary (first) farm.
  let farms: string[] = Array.isArray(rawFarms) && rawFarms.length > 0 ? rawFarms : [];
  if (farms.length === 0) {
    try {
      const { data: ownerFarms } = await svc.from("farms").select("id").eq("user_id", userId).order("created_at").limit(1);
      if (ownerFarms && ownerFarms.length > 0) {
        farms = [ownerFarms[0].id];
      }
    } catch { /* ignore, proceed without default farm */ }
  }

  let staffAuthId: string | null = null;
  let inviteError = null;
  const baseAppUrl = (appUrl || "https://pondtora.site").replace(/\/+$/, "");
  const redirectTo = `${baseAppUrl}/create-password`;

  if (SVC_KEY()) {
    // Always send an invite email so the staff member can verify their account.
    // inviteUserByEmail creates the auth user (if new) and sends the invite email.
    const { data: inviteData, error: ie } = await svc.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name || email.split("@")[0],
        owner_id: userId,
        role: "staff",
        farm_name: farmName || "",
        permissions,
        farms,
      },
      redirectTo,
    });

    if (ie) {
      if (ie.message.includes("already registered") || ie.message.includes("already exists")) {
        // User already exists — find them and send a recovery email so they receive the email with the link
        const { data: listData } = await svc.auth.admin.listUsers();
        const existing = (listData?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (existing) {
          staffAuthId = existing.id;
        }
        await svc.auth.resetPasswordForEmail(email, { redirectTo }).catch(() => {});
      } else {
        inviteError = ie.message;
      }
    } else if (inviteData?.user) {
      staffAuthId = inviteData.user.id;
    }

    // If a password was also provided, set it so the staff can log in immediately
    // without waiting for the email link, while still receiving the invite email.
    if (password && staffAuthId) {
      try {
        await svc.auth.admin.updateUserById(staffAuthId, {
          password,
          user_metadata: {
            name: name || email.split("@")[0],
            role: "staff",
            owner_id: userId,
            farm_name: farmName || "",
            permissions,
            farms,
          },
        });
      } catch (e: any) {
        console.warn("Could not set staff password:", e?.message);
      }
    }
  } else {
    inviteError = "SUPABASE_SERVICE_ROLE_KEY not set — invite email could not be sent.";
  }

  // Upsert staff_members record
  const { data: sm, error: smErr } = await svc
    .from("staff_members")
    .upsert({
      user_id: userId,
      name: name || email.split("@")[0],
      email,
      phone: phone || "",
      role: role || "General Staff",
      status: "Pending",
      joined_date: new Date().toISOString(),
      ...(staffAuthId ? { staff_auth_id: staffAuthId } : {}),
    }, { onConflict: "user_id,email" })
    .select().single();
  if (smErr) return dbErr(c, smErr);

  // Update auth user metadata with the real staff_id now that we have it
  if (staffAuthId && sm?.id) {
    try {
      await svc.auth.admin.updateUserById(staffAuthId, {
        user_metadata: {
          name: name || email.split("@")[0],
          role: "staff",
          owner_id: userId,
          staff_id: sm.id,
          farm_name: farmName || "",
          permissions,
          farms,
        },
      });
    } catch {}
  }

  if (staffAuthId) {
    try {
      await svc.from("user_profiles").upsert({
        id: staffAuthId,
        name: name || email.split("@")[0],
        email,
        phone: phone || "",
        role: "staff",
        status: "Pending",
      });
    } catch {}
  }

  // Create invitation record (status: pending until they click the link)
  try {
    await svc.from("staff_invitations").insert({
      email, invited_by: userId, staff_id: sm.id, status: "pending",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch {}

  // Farm assignments
  if (farms.length > 0) {
    await svc.from("staff_farm_assignments").delete().eq("staff_id", sm.id);
    await svc.from("staff_farm_assignments").insert(
      farms.map((fid: string) => ({ staff_id: sm.id, farm_id: fid, assigned_by: userId }))
    );
  }

  // Permissions
  const staffPermsInput = staffPermissions;
  if (permissions.length > 0) {
    await svc.from("staff_permissions").delete().eq("staff_id", sm.id);
    await svc.from("staff_permissions").insert(
      permissions.map((feat: string) => {
        const custom = staffPermsInput?.[feat];
        return {
          staff_id: sm.id,
          feature: feat,
          can_view: custom ? (custom.canView ?? true) : true,
          can_create: custom ? Boolean(custom.canCreate) : false,
          can_edit: custom ? Boolean(custom.canEdit) : false,
          can_delete: custom ? Boolean(custom.canDelete) : false,
        };
      })
    );
  }

  return c.json({
    success: true,
    staffMember: { ...objToCamel(sm), farms, permissions, ...(staffAuthId ? { staffAuthId } : {}) },
    inviteError,
  }, 201);
});

// Resend staff invitation email
app.post(`${P}/staff-members/resend-invite`, async (c) => {
  const userId = c.get("userId") as string;
  const { email, appUrl, staffId } = await c.req.json();
  if (!email) return c.json({ error: "Email is required" }, 400);
  const svc = adminDb();
  const cleanEmail = email.trim().toLowerCase();
  const baseAppUrl = (appUrl || "https://pondtora.site").replace(/\/+$/, "");
  const redirectTo = `${baseAppUrl}/create-password`;

  let emailSent = false;
  let emailError: string | null = null;

  try {
    const { error: resetErr } = await svc.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });
    if (!resetErr) {
      emailSent = true;
    } else {
      const { data: inviteData, error: ie } = await svc.auth.admin.inviteUserByEmail(cleanEmail, {
        redirectTo,
      });
      if (!ie && inviteData?.user) {
        emailSent = true;
      } else {
        emailError = resetErr.message || ie?.message || null;
      }
    }
  } catch (err: any) {
    emailError = err?.message || String(err);
  }

  try {
    if (staffId) {
      await svc.from("staff_invitations").upsert({
        staff_id: staffId,
        email: cleanEmail,
        invited_by: userId || null,
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "staff_id" });
    }
  } catch {}

  return c.json({ success: emailSent, emailSent, emailError });
});

// Update staff password
app.post(`${P}/staff-members/:id/password`, async (c) => {
  const userId = c.get("userId") as string;
  const { password } = await c.req.json();
  if (!password || password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);
  const svc = adminDb();
  const { data: sm } = await svc.from("staff_members").select("staff_auth_id").eq("id", c.req.param("id")).eq("user_id", userId).maybeSingle();
  if (sm?.staff_auth_id && SVC_KEY()) {
    const { error } = await svc.auth.admin.updateUserById(sm.staff_auth_id, { password });
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true });
  }
  return c.json({ success: false, error: "Staff auth account not found" }, 404);
});

app.put(`${P}/staff-members/:id`, async (c) => {
  const userId = c.get("userId") as string;
  const { farms, permissions, staffPermissions, ...rest } = await c.req.json();
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
      permissions.map((feat: string) => {
        const custom = staffPermissions?.[feat];
        return {
          staff_id: data.id,
          feature: feat,
          can_view: custom ? (custom.canView ?? true) : true,
          can_create: custom ? Boolean(custom.canCreate) : false,
          can_edit: custom ? Boolean(custom.canEdit) : false,
          can_delete: custom ? Boolean(custom.canDelete) : false,
        };
      })
    );
  }
  return c.json({ ...objToCamel(data), farms: farms ?? [], permissions: permissions ?? [], staffPermissions: staffPermissions ?? {} });
});

app.delete(`${P}/staff-members/:id`, async (c) => {
  const userId = c.get("userId") as string;
  const { error } = await adminDb()
    .from("staff_members").delete().eq("id", c.req.param("id")).eq("user_id", userId);
  if (error) return dbErr(c, error);
  return c.json({ success: true });
});

// ── Admin: full platform overview, farm operations & registered users ─────────
app.get(`${P}/admin/overview`, async (c) => {
  const db = adminDb();
  try {
    const [profilesRes, staffRes, farmsRes, pondsRes, revRes, expRes, invRes, feedRecRes, feedInvRes] = await Promise.all([
      db.from("user_profiles").select("*").order("created_at", { ascending: false }),
      db.from("staff_members").select("*").order("created_at", { ascending: false }),
      db.from("farms").select("*").order("created_at", { ascending: false }),
      db.from("ponds").select("*").order("created_at", { ascending: false }),
      db.from("revenues").select("id, amount, date, user_id, farm_id"),
      db.from("expenses").select("id, amount, date, user_id, farm_id"),
      db.from("invoices").select("id, total, status, user_id, farm_id, created_at"),
      db.from("feeding_records").select("id, kg_fed, date, user_id, farm_id"),
      db.from("feed_inventory").select("id, bags_remaining, kg_per_bag, user_id, farm_id"),
    ]);

    const rawProfiles = profilesRes.data || [];
    const rawStaff = staffRes.data || [];
    const rawFarms = farmsRes.data || [];
    const rawPonds = pondsRes.data || [];
    const rawRevs = revRes.data || [];
    const rawExps = expRes.data || [];
    const rawInvs = invRes.data || [];
    const rawFeedRecs = feedRecRes.data || [];
    const rawFeedInvs = feedInvRes.data || [];

    // Calculate aggregated platform operations metrics
    const totalPlatformRevenue = rawRevs.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
    const totalPlatformExpenses = rawExps.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
    const totalInvoicesValue = rawInvs.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
    const paidInvoicesValue = rawInvs.filter((i: any) => i.status === "Paid").reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
    const totalFishStocked = rawPonds.reduce((s: number, p: any) => s + (Number(p.current_count ?? p.initial_stock) || 0), 0);
    const totalFeedConsumedKg = rawFeedRecs.reduce((s: number, f: any) => s + (Number(f.kg_fed) || 0), 0);
    const totalBagsInStock = rawFeedInvs.reduce((s: number, b: any) => s + (Number(b.bags_remaining) || 0), 0);

    const users = rawProfiles.map((p: any) => {
      const userFarms = rawFarms.filter((f: any) => f.user_id === p.id);
      const userFarmIds = new Set(userFarms.map((f: any) => f.id));
      const userPonds = rawPonds.filter((pd: any) => pd.user_id === p.id || (pd.farm_id && userFarmIds.has(pd.farm_id)));
      const userStaff = rawStaff.filter((sm: any) => sm.user_id === p.id);
      const userInvs = rawInvs.filter((i: any) => i.user_id === p.id);
      const userRevs = rawRevs.filter((r: any) => r.user_id === p.id);
      const userExps = rawExps.filter((e: any) => e.user_id === p.id);

      return {
        id: p.id,
        name: p.name || (p.email ? p.email.split("@")[0] : "Farmer"),
        email: p.email || "",
        farmName: p.farm_name || userFarms[0]?.name || "Primary Farm",
        phone: p.phone || "",
        city: p.city || "Lagos",
        state: p.state || "Lagos",
        country: p.country || "Nigeria",
        role: p.role || "owner",
        activePlan: p.active_plan || "Starter",
        trialStartDate: p.trial_start_date ? String(p.trial_start_date).slice(0, 10) : (p.created_at ? String(p.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10)),
        billingFrequency: "monthly",
        subscriptionAmount: null,
        hasPaid: Boolean(p.paystack_reference || p.last_payment_date),
        subscriptionStatus: "Trial",
        subscriptionStart: null,
        subscriptionExpiry: null,
        accountStatus: p.status === "Suspended" ? "Suspended" : "Active",
        freeAccess: false,
        farmCount: userFarms.length || 1,
        pondCount: userPonds.length || 0,
        staffCount: userStaff.length || 0,
        totalFishStocked: userPonds.reduce((s: number, pd: any) => s + (Number(pd.current_count ?? pd.initial_stock) || 0), 0),
        totalRevenue: userRevs.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0),
        totalExpenses: userExps.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0),
        invoicesCount: userInvs.length,
        paystackReference: p.paystack_reference || null,
        lastPaymentDate: p.last_payment_date || null,
        createdAt: p.created_at ? String(p.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
      };
    });

    return c.json({
      success: true,
      users,
      stats: {
        totalUsers: users.length,
        totalFarms: rawFarms.length,
        totalPonds: rawPonds.length,
        totalFishStocked,
        totalFeedConsumedKg,
        totalBagsInStock,
        totalPlatformRevenue,
        totalPlatformExpenses,
        netPlatformProfit: totalPlatformRevenue - totalPlatformExpenses,
        totalInvoicesValue,
        paidInvoicesValue,
        totalInvoicesCount: rawInvs.length,
        totalStaffMembers: rawStaff.length,
      },
      farms: rawFarms.map(objToCamel),
      ponds: rawPonds.map(objToCamel),
      staff: rawStaff.map(objToCamel),
    });
  } catch (err: any) {
    return dbErr(c, err);
  }
});

// ── Admin: list all users ────────────────────────────────────────────────────
app.get(`${P}/admin/users`, async (c) => {
  const db = adminDb();
  try {
    const { data, error } = await db.from("user_profiles").select("*").order("created_at", { ascending: false });
    if (error) return dbErr(c, error);
    return c.json((data || []).map(objToCamel));
  } catch (err: any) {
    return dbErr(c, err);
  }
});

// ── Admin: register user profile backup (service role) ───────────────────────
app.post(`${P}/admin/register-profile`, async (c) => {
  const db = adminDb();
  try {
    const body = await c.req.json();
    const { userId, name, farmName, city, state, country, email, phone, activePlan, trialStartDate } = body;
    if (!userId || !email) return c.json({ error: "userId and email are required" }, 400);

    const cleanEmail = email.trim().toLowerCase();
    const { data: prof, error: profErr } = await db.from("user_profiles").upsert({
      id: userId,
      name: name || cleanEmail.split("@")[0],
      farm_name: farmName || "Primary Farm",
      city: city || "Lagos",
      state: state || "Lagos",
      country: country || "Nigeria",
      email: cleanEmail,
      phone: phone || "",
      active_plan: activePlan || "Starter",
      trial_start_date: trialStartDate || new Date().toISOString(),
      role: "owner",
      status: "Active",
      updated_at: new Date().toISOString(),
    }).select().single();

    if (profErr) console.warn("Admin register-profile user_profiles upsert error:", profErr);

    if (farmName) {
      await db.from("farms").insert({
        user_id: userId,
        name: farmName,
        city: city || "Lagos",
        state: state || "Lagos",
        country: country || "Nigeria",
      });
    }

    return c.json({ success: true, profile: objToCamel(prof || {}) });
  } catch (err: any) {
    return dbErr(c, err);
  }
});

// ── Admin: update user plan/status ─────────────────────────────────────────────
app.put(`${P}/admin/users/:id`, async (c) => {
  const body = await c.req.json();
  const allowed = ["active_plan", "status", "trial_start_date", "role", "name", "farm_name", "phone", "city", "state", "country"];
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
  const row: any = { ...objToSnake(await c.req.json()), user_id: userId };
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
  const row: any = { ...objToSnake(await c.req.json()), user_id: c.req.param("ownerId") };
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
      .select("*, staff_farm_assignments(farm_id), staff_permissions(feature,can_view,can_create,can_edit,can_delete)")
      .eq("staff_auth_id", userId).maybeSingle();
    if (sm) {
      ownerUserId  = sm.user_id;
      staffFarmIds = (sm.staff_farm_assignments || []).map((a: any) => a.farm_id);
      const perms  = (sm.staff_permissions || []).filter((p: any) => p.can_view).map((p: any) => p.feature);
      // Build action-level permissions map
      const staffPermissions: Record<string, any> = {};
      (sm.staff_permissions || []).forEach((p: any) => {
        staffPermissions[p.feature] = {
          canView: !!p.can_view,
          canCreate: !!p.can_create,
          canEdit: !!p.can_edit,
          canDelete: !!p.can_delete,
        };
      });
      staffInfo = { id: sm.id, name: sm.name, email: sm.email, role: sm.role,
        farms: staffFarmIds, permissions: perms, staffPermissions, ownerId: ownerUserId };
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
    investors, investments, investmentPayments, pondReports,
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
    fetch("investors"),
    fetch("investments", "farm_id"),
    fetch("investment_payments", "farm_id"),
    fetch("pond_reports", "farm_id"),
  ]);

  const { data: invSettings } = await svc.from("invoice_settings").select("*").eq("user_id", ownerUserId).maybeSingle();

  // Enrich staff members with farm assignments + full action-level permissions.
  // FIX: use a.farm_id (snake_case from Supabase) not a.farmId (camelCase bug).
  const staffWithDetails = await Promise.all(
    (staffList as any[]).map(async (s: any) => {
      const [{ data: fa }, { data: fp }] = await Promise.all([
        svc.from("staff_farm_assignments").select("farm_id").eq("staff_id", s.id),
        svc.from("staff_permissions").select("feature,can_view,can_create,can_edit,can_delete").eq("staff_id", s.id),
      ]);
      const farmIds = (fa || []).map((a: any) => a.farm_id);  // FIX: was a.farmId
      const perms   = (fp || []).filter((p: any) => p.can_view).map((p: any) => p.feature);
      const staffPermissions: Record<string, any> = {};
      (fp || []).forEach((p: any) => {
        staffPermissions[p.feature] = {
          canView: !!p.can_view, canCreate: !!p.can_create,
          canEdit: !!p.can_edit, canDelete: !!p.can_delete,
        };
      });
      return { ...s, farms: farmIds, permissions: perms, staffPermissions };
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
    investors, investments, investmentPayments, pondReports,
    staffInfo, isStaff: !!staffInfo,
  });
});

// ── Admin Delete User endpoint ────────────────────────────────────────────────
app.post(`${P}/admin/delete-user`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { userId, email } = body;
    const svc = adminDb();

    // 1. Delete by user ID from auth.admin
    if (userId) {
      try {
        await svc.auth.admin.deleteUser(userId);
      } catch (e) {
        console.warn("auth.admin.deleteUser failed for userId:", userId, e);
      }
      try {
        await svc.from("user_profiles").delete().eq("id", userId);
        await svc.from("staff_members").delete().eq("id", userId);
        await svc.from("farms").delete().eq("user_id", userId);
      } catch (e) {
        console.warn("Table cleanup failed for userId:", userId, e);
      }
    }

    // 2. Delete by email from auth.admin and tables
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      try {
        const { data: { users } } = await svc.auth.admin.listUsers();
        const matched = (users || []).filter((u: any) => (u.email || "").toLowerCase() === cleanEmail);
        for (const m of matched) {
          try {
            await svc.auth.admin.deleteUser(m.id);
            await svc.from("user_profiles").delete().eq("id", m.id);
            await svc.from("staff_members").delete().eq("id", m.id);
            await svc.from("farms").delete().eq("user_id", m.id);
          } catch {}
        }
      } catch (e) {
        console.warn("auth cleanup by email failed:", email, e);
      }
      try {
        await svc.from("user_profiles").delete().ilike("email", cleanEmail);
        await svc.from("staff_members").delete().ilike("email", cleanEmail);
      } catch {}
    }

    return c.json({ success: true, message: "User deleted completely" });
  } catch (err: any) {
    console.error("delete-user error:", err);
    return c.json({ error: err.message }, 500);
  }
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
makeCrud(app, "investors");
makeCrud(app, "investments");
makeCrud(app, "investment_payments");
// ── Send Investor Certificate & Receipt Email ─────────────────────────────────
app.post(`${P}/investors/send-receipt-email`, async (c) => {
  try {
    const { toEmail, investorName, farmName, subject, htmlContent } = await c.req.json();
    if (!toEmail) return c.json({ error: "Investor recipient email is required" }, 400);

    const cleanEmail = toEmail.trim().toLowerCase();
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      const fromEmail = Deno.env.get("SENDER_EMAIL") || "notifications@pondtora.com";
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${farmName || "Pondtora Farm"} <${fromEmail}>`,
          to: [cleanEmail],
          subject: subject || `Investment Certificate & Official Receipt - ${farmName || "Pondtora Farm"}`,
          html: htmlContent,
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        return c.json({ success: false, error: errJson.message || `Resend API failed with status ${resp.status}` }, 400);
      }
      return c.json({ success: true, message: `Investment receipt certificate successfully sent to ${cleanEmail}` });
    }

    return c.json({
      success: true,
      message: `Email dispatched for ${cleanEmail}. (Configure RESEND_API_KEY in Supabase secrets for direct delivery).`,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || "Failed to send email" }, 500);
  }
});

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

-- platform_settings (global configuration for paystack mode, public keys, system toggles)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_platform_settings" ON platform_settings;
CREATE POLICY "allow_read_platform_settings" ON platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_write_platform_settings" ON platform_settings;
CREATE POLICY "allow_write_platform_settings" ON platform_settings FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
  );
$$;

-- user_profiles: own row OR admin access
DROP POLICY IF EXISTS "own_profile" ON user_profiles;
CREATE POLICY "own_profile" ON user_profiles
  USING (auth.uid() = id OR is_admin()) WITH CHECK (auth.uid() = id OR is_admin());

-- farms: owner full access OR admin access OR assigned staff access
DROP POLICY IF EXISTS "owner_farms" ON farms;
CREATE POLICY "owner_farms" ON farms
  FOR ALL USING (auth.uid() = user_id OR user_can_access_farm(id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- staff_members: owner manages, staff sees self / colleagues on farm
DROP POLICY IF EXISTS "owner_staff" ON staff_members;
CREATE POLICY "owner_staff" ON staff_members
  FOR ALL USING (
    auth.uid() = user_id 
    OR auth.uid() = staff_auth_id 
    OR LOWER(email) = LOWER(COALESCE(auth.jwt()->>'email', '')) 
    OR is_admin()
  ) WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid() = staff_auth_id 
    OR is_admin()
  );
DROP POLICY IF EXISTS "staff_view_self" ON staff_members;
CREATE POLICY "staff_view_self" ON staff_members
  FOR SELECT USING (
    auth.uid() = staff_auth_id 
    OR LOWER(email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
    OR auth.uid() = user_id
    OR is_admin()
  );

-- staff_invitations
DROP POLICY IF EXISTS "inviter_invitations" ON staff_invitations;
CREATE POLICY "inviter_invitations" ON staff_invitations
  FOR ALL USING (auth.uid() = invited_by OR is_admin()) WITH CHECK (auth.uid() = invited_by OR is_admin());

-- staff_farm_assignments
DROP POLICY IF EXISTS "owner_assignments" ON staff_farm_assignments;
CREATE POLICY "owner_assignments" ON staff_farm_assignments
  FOR ALL USING (
    is_admin() OR
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND (f.user_id = auth.uid() OR user_can_access_farm(f.id)))
  ) WITH CHECK (
    is_admin() OR
    EXISTS (SELECT 1 FROM farms f WHERE f.id = staff_farm_assignments.farm_id AND (f.user_id = auth.uid() OR user_can_access_farm(f.id)))
  );

-- staff_permissions
DROP POLICY IF EXISTS "owner_permissions" ON staff_permissions;
CREATE POLICY "owner_permissions" ON staff_permissions
  FOR ALL USING (
    is_admin() OR
    EXISTS (SELECT 1 FROM staff_members sm WHERE sm.id = staff_permissions.staff_id AND (sm.user_id = auth.uid() OR sm.staff_auth_id = auth.uid()))
  ) WITH CHECK (
    is_admin() OR
    EXISTS (SELECT 1 FROM staff_members sm WHERE sm.id = staff_permissions.staff_id AND (sm.user_id = auth.uid() OR sm.staff_auth_id = auth.uid()))
  );

-- Helper function: check if user can access a specific farm
CREATE OR REPLACE FUNCTION user_can_access_farm(p_farm_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- 1. Farm Owner
  SELECT EXISTS (SELECT 1 FROM farms f WHERE f.id = p_farm_id AND f.user_id = auth.uid())
  -- 2. Assigned staff member (by auth UID or by email)
  OR EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE (sm.staff_auth_id = auth.uid() OR LOWER(sm.email) = LOWER(COALESCE(auth.jwt()->>'email', '')))
      AND (
        (sm.farms IS NOT NULL AND sm.farms::text LIKE '%' || p_farm_id::text || '%')
        OR EXISTS (
          SELECT 1 FROM staff_farm_assignments sfa
          WHERE sfa.staff_id = sm.id AND sfa.farm_id = p_farm_id
        )
        OR (
          (sm.farms IS NULL OR sm.farms::text = '[]' OR sm.farms::text = '""')
          AND NOT EXISTS (SELECT 1 FROM staff_farm_assignments sfa WHERE sfa.staff_id = sm.id)
          AND EXISTS (SELECT 1 FROM farms f WHERE f.id = p_farm_id AND f.user_id = sm.user_id)
        )
        OR EXISTS (SELECT 1 FROM farms f WHERE f.id = p_farm_id AND f.user_id = sm.user_id)
      )
  )
  -- 3. Superadmin
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR email = 'edafejesugarec@gmail.com')
  ) OR (
    auth.jwt() ->> 'email' = 'edafejesugarec@gmail.com'
  );
$$;

-- Helper function: check if user can access data scoped to owner/farm
CREATE OR REPLACE FUNCTION user_can_access_owner_data(p_user_id UUID, p_farm_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- 1. Direct match or admin
  SELECT (auth.uid() = p_user_id)
  OR is_admin()
  -- 2. Accessible farm ID
  OR (p_farm_id IS NOT NULL AND user_can_access_farm(p_farm_id))
  -- 3. Caller is staff member of the record's owner
  OR EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE (sm.staff_auth_id = auth.uid() OR LOWER(sm.email) = LOWER(COALESCE(auth.jwt()->>'email', '')))
      AND (sm.user_id = p_user_id OR (p_farm_id IS NOT NULL AND user_can_access_farm(p_farm_id)))
  )
  -- 4. Caller is farm owner and record was created by their staff member
  OR EXISTS (
    SELECT 1 FROM staff_members sm
    WHERE sm.user_id = auth.uid()
      AND (sm.staff_auth_id = p_user_id OR sm.id = p_user_id)
  );
$$;

-- Ponds
DROP POLICY IF EXISTS "farm_ponds" ON ponds;
CREATE POLICY "farm_ponds" ON ponds
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Stock events
DROP POLICY IF EXISTS "farm_stock" ON stock_events;
CREATE POLICY "farm_stock" ON stock_events
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Feed inventory
DROP POLICY IF EXISTS "farm_feed_inv" ON feed_inventory;
CREATE POLICY "farm_feed_inv" ON feed_inventory
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Feeding records
DROP POLICY IF EXISTS "farm_feeding" ON feeding_records;
CREATE POLICY "farm_feeding" ON feeding_records
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Bag open logs
DROP POLICY IF EXISTS "farm_bags" ON bag_open_logs;
CREATE POLICY "farm_bags" ON bag_open_logs
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Feed remaining logs
DROP POLICY IF EXISTS "farm_remain" ON feed_remaining_logs;
CREATE POLICY "farm_remain" ON feed_remaining_logs
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Expenses
DROP POLICY IF EXISTS "farm_expenses" ON expenses;
CREATE POLICY "farm_expenses" ON expenses
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Revenues
DROP POLICY IF EXISTS "farm_revenues" ON revenues;
CREATE POLICY "farm_revenues" ON revenues
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Mortality
DROP POLICY IF EXISTS "farm_mortality" ON mortality_entries;
CREATE POLICY "farm_mortality" ON mortality_entries
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Treatments
DROP POLICY IF EXISTS "farm_treatment" ON treatment_records;
CREATE POLICY "farm_treatment" ON treatment_records
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Reports
DROP POLICY IF EXISTS "farm_reports" ON reports;
CREATE POLICY "farm_reports" ON reports
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Customers
DROP POLICY IF EXISTS "farm_customers" ON customers;
CREATE POLICY "farm_customers" ON customers
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Price groups
DROP POLICY IF EXISTS "farm_prices" ON price_groups;
CREATE POLICY "farm_prices" ON price_groups
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Invoices
DROP POLICY IF EXISTS "farm_invoices" ON invoices;
CREATE POLICY "farm_invoices" ON invoices
  FOR ALL USING (user_can_access_owner_data(user_id, farm_id))
  WITH CHECK (user_can_access_owner_data(user_id, farm_id));

-- Invoice settings
DROP POLICY IF EXISTS "own_inv_settings" ON invoice_settings;
CREATE POLICY "own_inv_settings" ON invoice_settings
  FOR ALL USING (user_can_access_owner_data(user_id, NULL))
  WITH CHECK (user_can_access_owner_data(user_id, NULL));

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

-- ── 16. investors ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 17. investments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE SET NULL,
  fish_stock_id TEXT,
  investment_name TEXT,
  amount_invested NUMERIC NOT NULL DEFAULT 0,
  investor_percentage NUMERIC NOT NULL DEFAULT 0,
  expected_return NUMERIC NOT NULL DEFAULT 0,
  total_amount_due NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'monthly_return',
  duration TEXT,
  duration_months INT,
  number_of_payments INT,
  monthly_return NUMERIC,
  amount_received_by_business NUMERIC,
  total_investor_value NUMERIC,
  principal_repayment TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  maturity_date DATE,
  payment_type TEXT NOT NULL DEFAULT 'one-time',
  payment_frequency TEXT,
  custom_frequency_desc TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 18. investment_payments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  payment_date DATE,
  paid_date DATE,
  payment_period TEXT NOT NULL,
  payment_type TEXT DEFAULT 'Monthly Return',
  amount_due NUMERIC NOT NULL DEFAULT 0,
  scheduled_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Bank Transfer',
  status TEXT NOT NULL DEFAULT 'Pending',
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 19. pond_reports ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pond_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  pond_id UUID REFERENCES ponds(id) ON DELETE CASCADE,
  fish_stock_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue TEXT,
  description TEXT,
  action_taken TEXT,
  notes TEXT,
  treatment_id UUID REFERENCES treatment_records(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investors_user_id ON investors(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_farm_id ON investors(farm_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_investor_id ON investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_farm_id ON investments(farm_id);
CREATE INDEX IF NOT EXISTS idx_investments_pond_id ON investments(pond_id);
CREATE INDEX IF NOT EXISTS idx_investment_payments_user_id ON investment_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_payments_inv_id ON investment_payments(investment_id);
CREATE INDEX IF NOT EXISTS idx_pond_reports_user_id ON pond_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_pond_reports_farm_id ON pond_reports(farm_id);
CREATE INDEX IF NOT EXISTS idx_pond_reports_pond_stock ON pond_reports(pond_id, fish_stock_id);

-- Enable RLS
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pond_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "farm_investors" ON investors;
CREATE POLICY "farm_investors" ON investors
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

DROP POLICY IF EXISTS "farm_investments" ON investments;
CREATE POLICY "farm_investments" ON investments
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());

DROP POLICY IF EXISTS "farm_investment_payments" ON investment_payments;
CREATE POLICY "farm_investment_payments" ON investment_payments
  USING (
    auth.uid() = user_id OR is_admin() OR
    EXISTS (
      SELECT 1 FROM investments i
      WHERE i.id = investment_payments.investment_id
        AND (i.user_id = auth.uid() OR user_can_access_farm(i.farm_id))
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR is_admin() OR
    EXISTS (
      SELECT 1 FROM investments i
      WHERE i.id = investment_payments.investment_id
        AND (i.user_id = auth.uid() OR user_can_access_farm(i.farm_id))
    )
  );

DROP POLICY IF EXISTS "farm_pond_reports" ON pond_reports;
CREATE POLICY "farm_pond_reports" ON pond_reports
  USING (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin())
  WITH CHECK (auth.uid() = user_id OR user_can_access_farm(farm_id) OR is_admin());
`;
