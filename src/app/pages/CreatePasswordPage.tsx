import React, { useState, useEffect } from "react";
import { UserPlus, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, ShieldCheck, UserCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import pondtoraLogo from "../../imports/loo-2.svg";
import { supabase } from "../../lib/supabase";
import type { UserProfile } from "../types";

interface CreatePasswordPageProps {
  onSuccess?: (profile: UserProfile) => void;
  onGoToLogin?: () => void;
}

export default function CreatePasswordPage({ onSuccess, onGoToLogin }: CreatePasswordPageProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [farmName, setFarmName] = useState<string>("");
  const [role, setRole] = useState<string>("Staff Member");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

    // 1. Check for error parameters in URL (e.g. otp_expired, access_denied)
    const errorDesc = searchParams.get("error_description") || hashParams.get("error_description");
    const errCode = searchParams.get("error_code") || hashParams.get("error_code") || searchParams.get("error") || hashParams.get("error");

    if (errorDesc || errCode) {
      setIsExpired(true);
      const decoded = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, " ")) : "This invitation link is invalid or has expired.";
      setErrorMessage(decoded);
      return;
    }

    // 2. Query param email
    const paramEmail = searchParams.get("email") || hashParams.get("email");
    if (paramEmail) {
      setUserEmail(paramEmail);
      if (!name) {
        setName(paramEmail.split("@")[0]);
      }
    }

    const activateStaff = async (u: any) => {
      const email = (u?.email || "").trim().toLowerCase();
      if (!email) return;
      try {
        await supabase
          .from("staff_members")
          .update({
            status: "Active",
            staff_auth_id: u.id,
          })
          .or(`staff_auth_id.eq.${u.id},email.ilike.${email}`);
      } catch {}
      try {
        await supabase.from("staff_invitations").update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        }).ilike("email", email);
      } catch {}
      try {
        await supabase.from("user_profiles").upsert({
          id: u.id,
          email,
          name: u.user_metadata?.name || email.split("@")[0],
          role: "staff",
          status: "Active",
        });
      } catch {}
    };

    // 3. Inspect active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const meta = u.user_metadata ?? {};
        if (u.email) setUserEmail(u.email);
        if (meta.name) setName(meta.name);
        else if (u.email && !name) setName(u.email.split("@")[0]);
        if (meta.farm_name) setFarmName(meta.farm_name);
        if (meta.role) setRole(meta.role);
        activateStaff(u);
      }
    });

    // 4. Listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = session.user;
        const meta = u.user_metadata ?? {};
        if (u.email) setUserEmail(u.email);
        if (meta.name) setName(meta.name);
        if (meta.farm_name) setFarmName(meta.farm_name);
        if (meta.role) setRole(meta.role);
        setIsExpired(false);
        setErrorMessage(null);
        activateStaff(u);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setErrorMessage("Please fill in both password fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please check and try again.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;
      const cleanEmail = (userEmail || session?.user?.email || "").trim().toLowerCase();

      if (session) {
        // Update password and name in Supabase Auth
        const updateData = name.trim()
          ? { password, data: { name: name.trim() } }
          : { password };

        const { data: updated, error } = await supabase.auth.updateUser(updateData);
        if (error) throw error;
        user = updated.user || session.user;
      } else {
        if (!cleanEmail) {
          throw new Error("Email address not found. Please click the sign-in link or contact your farm administrator.");
        }
        // Try sign in with this password
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInData?.user) {
          user = signInData.user;
        } else {
          // If signIn failed, try signUp with this password
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                name: name.trim() || cleanEmail.split("@")[0],
                role: "staff",
              },
            },
          });
          if (signUpData?.user) {
            user = signUpData.user;
          } else {
            throw signInErr || signUpErr || new Error("Could not authenticate. Please try signing in on the main login screen.");
          }
        }
      }

      if (!user) {
        throw new Error("Unable to establish staff session. Please sign in directly on the login page.");
      }

      const meta = user.user_metadata ?? {};

      // Mark staff member status as Active in the database and link staff_auth_id
      let staffPerms: string[] = meta.permissions || [];
      let staffOwnerId: string = meta.owner_id || "";
      let staffFarms: string[] = meta.farms || [];
      let staffRole: string = meta.role || "staff";

      try {
        const { data: staffRow } = await supabase
          .from("staff_members")
          .select("id, name, role, permissions, farms, user_id")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (staffRow) {
          if (staffRow.permissions && staffRow.permissions.length > 0) staffPerms = staffRow.permissions;
          if (staffRow.user_id) staffOwnerId = staffRow.user_id;
          if (staffRow.farms && staffRow.farms.length > 0) staffFarms = staffRow.farms;
          if (staffRow.role) staffRole = staffRow.role;

          await supabase
            .from("staff_members")
            .update({
              status: "Active",
              name: name.trim() || meta.name,
              staff_auth_id: user.id,
            })
            .eq("id", staffRow.id);
        }

        await supabase.from("user_profiles").upsert({
          id: user.id,
          name: name.trim() || meta.name || cleanEmail.split("@")[0],
          email: cleanEmail,
          role: "staff",
          status: "Active",
        });
      } catch (err) {
        console.warn("Could not mark staff as Active in staff_members table:", err);
      }

      setIsSuccess(true);
      toast.success("Welcome to Pondtora! Your account has been activated.");

      // Clean the URL
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }

      const profile: UserProfile = {
        id: user.id,
        name: name.trim() || meta.name || cleanEmail.split("@")[0] || "Staff",
        farmName: meta.farm_name ?? farmName ?? "",
        city: meta.city ?? "",
        state: meta.state ?? "",
        country: meta.country ?? "Nigeria",
        email: cleanEmail,
        phone: meta.phone ?? "",
        currencySymbol: meta.currency_symbol ?? "₦",
        currencyCode: meta.currency_code ?? "NGN",
        role: "staff",
        permissions: staffPerms,
        ownerId: staffOwnerId,
        farms: staffFarms,
      };

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(profile);
        } else if (onGoToLogin) {
          onGoToLogin();
        } else {
          window.location.href = "/";
        }
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || "Failed to set password. The invitation link may have expired.";
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("session")) {
        setIsExpired(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasLength = password.length >= 6;
  const hasMatch = password.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 text-white font-['Barlow',sans-serif]">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <img src={pondtoraLogo} alt="Pondtora" className="h-8 w-auto object-contain" />
          <span className="text-xl font-extrabold font-['Barlow_Condensed',sans-serif] tracking-wider text-white">
            Pondtora
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (onGoToLogin) onGoToLogin();
            else window.location.href = "/";
          }}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Sign In
        </button>
      </header>

      {/* Main Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header Icon */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <UserPlus size={26} />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles size={12} />
              <span>Staff Invitation</span>
            </div>
            <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-white">
              {isExpired ? "Invitation Link Expired" : isSuccess ? "Account Activated!" : "Accept Staff Invitation"}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isExpired
                ? "This staff invitation link is invalid or has already been used."
                : isSuccess
                ? "Your password is created and your account is ready. Entering farm dashboard..."
                : userEmail
                ? `You have been invited to join ${farmName ? `"${farmName}"` : "a farm"} on Pondtora as a ${role}. Set a password to complete your account.`
                : "Set a password to complete your staff account setup."}
            </p>
          </div>

          {/* Success State */}
          {isSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
              <UserCheck size={36} className="text-emerald-400 mx-auto animate-bounce" />
              <p className="text-sm font-semibold text-emerald-200">
                Welcome aboard, {name}!
              </p>
              <p className="text-xs text-slate-400">
                Redirecting to your farm dashboard...
              </p>
            </div>
          )}

          {/* Expired / Invalid Invitation State */}
          {isExpired && !isSuccess && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200 leading-relaxed">
                  {errorMessage || "Invitation link is invalid or has expired. Please contact your farm administrator to send you a new staff invitation link."}
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 text-center space-y-2">
                <p className="text-xs text-slate-300">
                  Already have your account credentials set up?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onGoToLogin) onGoToLogin();
                    else window.location.href = "/";
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors border border-slate-600"
                >
                  Go to Sign In
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {!isExpired && !isSuccess && (
            <form onSubmit={handleCreatePassword} className="space-y-4">
              {errorMessage && (
                <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200">{errorMessage}</p>
                </div>
              )}

              {/* Email badge (read-only) */}
              {userEmail && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Invited email:</span>
                  <span className="font-semibold text-emerald-300 font-mono">{userEmail}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Okon"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Create Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Checklist */}
              <div className="bg-slate-800/60 rounded-xl p-3 space-y-1.5 border border-slate-700/50 text-[11px]">
                <div className={`flex items-center gap-2 ${hasLength ? "text-emerald-400" : "text-slate-400"}`}>
                  <ShieldCheck size={13} className={hasLength ? "text-emerald-400" : "text-slate-500"} />
                  <span>At least 6 characters</span>
                </div>
                <div className={`flex items-center gap-2 ${hasMatch ? "text-emerald-400" : "text-slate-400"}`}>
                  <CheckCircle2 size={13} className={hasMatch ? "text-emerald-400" : "text-slate-500"} />
                  <span>Passwords match</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-900/30"
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Activate Account & Enter Farm</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Back Link */}
          <div className="pt-2 text-center border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (onGoToLogin) onGoToLogin();
                else window.location.href = "/";
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-600">
        © 2026 Pondtora · Fish Farm Management System
      </footer>
    </div>
  );
}
