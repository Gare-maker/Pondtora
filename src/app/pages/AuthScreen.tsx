import React, { useState, useEffect } from "react";
import { CheckCircle, ChevronLeft, Loader2, AlertCircle, Eye, EyeOff, Mail, Check, Sparkles, Fish, ArrowRight, ShieldCheck, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import pondtoraLogo from "../../imports/loo-2.svg";
import type { UserProfile } from "../types";
import { COUNTRIES, DIAL_CODES, FLAG_EMOJI, COUNTRY_CURRENCIES } from "../data";
import { SearchableCountrySelect } from "../shared";
import { supabase, getAppUrl } from "../../lib/supabase";
import { auth, api } from "../../lib/api";
import { syncUserProfileToAdmin, resolveFullUserProfile } from "../../lib/userSync";
import { captureReferralParam, attachReferralToNewUser, getPendingReferrerCode } from "../../lib/referralStore";

const AIC = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-300 transition";
const LBL = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1";

function AuthLeftPanel() {
  const features = [
    "Manage farm finances",
    "Manage fish stock",
    "Manage feed stock",
    "Record and track daily feeding to monitor feed consumption by each pond",
    "Manage ponds and fish production",
    "Manage staff and permissions",
    "Create and manage customer invoices",
    "Generate reports and analytics",
  ];
  return (
    <div className="hidden lg:flex flex-col justify-between lg:h-screen lg:sticky lg:top-0 p-10 bg-slate-900 border-r border-slate-800 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px),radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-x-16 translate-y-16 pointer-events-none" />
      <div className="flex items-center gap-3 relative z-10">
        <img src={pondtoraLogo} alt="Pondtora" className="h-10 w-auto object-contain shrink-0" />
        <div>
          <p className="text-2xl font-extrabold font-['Barlow_Condensed',sans-serif] leading-none tracking-wide text-white">Pondtora</p>
          <p className="text-xs text-emerald-400 uppercase tracking-widest mt-1 font-semibold">Fish Farm Management System</p>
        </div>
      </div>
      <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
        <h2 className="text-3xl font-extrabold font-['Barlow_Condensed',sans-serif] leading-tight mb-8 text-white">
          Management System for Fish Farmers
        </h2>
        <ul className="space-y-4">
          {features.map(f => (
            <li key={f} className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
              <span className="text-sm text-slate-200 leading-relaxed">{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative z-10 border-t border-slate-800 pt-6">
        <p className="text-xs text-slate-400 font-semibold">© 2026 Pondtora · All rights reserved</p>
      </div>
    </div>
  );
}

type ViewType = "login" | "create" | "forgot" | "terms" | "recovery" | "invite";

function AuthScreen({
  onLogin,
  onSignup,
  onAdmin,
  initialView = "login",
}: {
  onLogin: (profile: UserProfile) => void;
  onSignup: (profile: UserProfile) => void;
  onAdmin?: () => void;
  initialView?: "login" | "create" | "recovery" | "invite";
}) {
  const [view, setView] = useState<ViewType>(initialView);

  // ── Email Verification Popup State ─────────────────────────────────────────
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);

  // ── Login state ────────────────────────────────────────────────────────────
  const [lEmail, setLEmail] = useState("");
  const [lPass, setLPass] = useState("");
  const [lErr, setLErr] = useState("");
  const [lLoading, setLLoading] = useState(false);
  const [showLPass, setShowLPass] = useState(false);

  // ── Resend Confirmation Email State ────────────────────────────────────────
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Create account state ───────────────────────────────────────────────────
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPass, setCPass] = useState("");
  const [cDialC, setCDialC] = useState("Nigeria");
  const [cPhone, setCPhone] = useState("");
  const [cFarm, setCFarm] = useState("");
  const [cCountry, setCCountry] = useState("Nigeria");
  const [cState, setCState] = useState("");
  const [cCity, setCCity] = useState("");
  const [cReferralCode, setCReferralCode] = useState(() => getPendingReferrerCode() || "");
  const [cErr, setCErr] = useState("");
  const [cLoading, setCLoading] = useState(false);
  const [cAgreed, setCAgreed] = useState(false);
  const [showCPass, setShowCPass] = useState(false);
  const [signupSent, setSignupSent] = useState(false);

  // ── Forgot password state ──────────────────────────────────────────────────
  const [fEmail, setFEmail] = useState("");
  const [fSent, setFSent] = useState(false);
  const [fLoading, setFLoading] = useState(false);

  // ── Recovery (set new password after email link) ───────────────────────────
  const [recPass, setRecPass] = useState("");
  const [recConfirm, setRecConfirm] = useState("");
  const [recErr, setRecErr] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [showRecPass, setShowRecPass] = useState(false);
  const [showRecConfirm, setShowRecConfirm] = useState(false);

  // ── Invite (staff sets their own password) ─────────────────────────────────
  const [invPass, setInvPass] = useState("");
  const [invConfirm, setInvConfirm] = useState("");
  const [invErr, setInvErr] = useState("");
  const [invLoading, setInvLoading] = useState(false);
  const [invName, setInvName] = useState("");
  const [showInvPass, setShowInvPass] = useState(false);
  const [showInvConfirm, setShowInvConfirm] = useState(false);
  const [invDone, setInvDone] = useState(false);

  const cur = COUNTRY_CURRENCIES[cCountry] ?? COUNTRY_CURRENCIES["Nigeria"];
  const isCreate = view === "create";

  // Detect URL search/hash for email verification / invite / recovery flows on mount + listen for PASSWORD_RECOVERY
  useEffect(() => {
    captureReferralParam();
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname.toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

      // 1. Check for error parameters returned from Supabase Auth redirects
      const errorDesc = searchParams.get("error_description") || hashParams.get("error_description");
      const errCode = searchParams.get("error_code") || hashParams.get("error_code") || searchParams.get("error") || hashParams.get("error");
      if (errorDesc || errCode) {
        const decoded = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, " ")) : "Verification or access link is invalid or has expired.";
        setVerificationError(decoded);
        setShowVerifiedModal(true);
      }

      // 2. Check query/hash parameters for email verification confirmation
      const isVerified =
        searchParams.get("verified") === "true" ||
        searchParams.get("type") === "signup" ||
        searchParams.get("type") === "email_confirmation" ||
        hashParams.get("type") === "signup" ||
        hashParams.get("type") === "email_confirmation";

      if (isVerified && !errorDesc && !errCode) {
        setShowVerifiedModal(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.email) {
            setVerifiedEmail(session.user.email);
          }
        });
      }

      // 3. Check query/hash parameters or pathname for staff invitation flow
      const isInvite =
        pathname.startsWith("/create-password") ||
        hash.startsWith("#/create-password") ||
        searchParams.get("type") === "invite" ||
        hashParams.get("type") === "invite";

      if (isInvite) {
        setView("invite");
        const paramEmail = searchParams.get("email") || hashParams.get("email");
        if (paramEmail) {
          setUnconfirmedEmail(paramEmail);
        }
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.email) {
            setUnconfirmedEmail(session.user.email);
            if (session.user.user_metadata?.name) {
              setInvName(session.user.user_metadata.name);
            }
          }
        });
      }

      // 4. Check query/hash parameters or pathname for password recovery
      const isRecovery =
        pathname.startsWith("/reset-password") ||
        hash.startsWith("#/reset-password") ||
        searchParams.get("type") === "recovery" ||
        hashParams.get("type") === "recovery";

      if (isRecovery) {
        setView("recovery");
      }

      // 4b. Support PKCE code or token_hash if present in redirect link (only if session not already detected)
      const authCode = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
      const linkType = (searchParams.get("type") || hashParams.get("type")) as any;

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          if (tokenHash && linkType) {
            supabase.auth.verifyOtp({ token_hash: tokenHash, type: linkType }).then(({ error }) => {
              if (!error) {
                if (linkType === "recovery") setView("recovery");
                else if (linkType === "invite") setView("invite");
              }
            });
          } else if (authCode) {
            supabase.auth.exchangeCodeForSession(authCode).then(({ error }) => {
              if (!error) {
                if (linkType === "recovery") setView("recovery");
                else if (linkType === "invite") setView("invite");
              }
            });
          }
        }
      });
    }

    // 5. Supabase Auth state listener for PASSWORD_RECOVERY and SIGNED_IN confirmation
    let subRes: any;
    try {
      subRes = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setView("recovery");
        } else if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
          // If URL indicated verification, track the confirmed email
          const sp = new URLSearchParams(window.location.search);
          const hp = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          if (sp.get("verified") === "true" || sp.get("type") === "signup" || hp.get("type") === "signup") {
            setVerifiedEmail(session.user.email || "");
            setShowVerifiedModal(true);
          }
        }
      });
    } catch {}

    return () => {
      try {
        if (subRes?.data?.subscription?.unsubscribe) {
          subRes.data.subscription.unsubscribe();
        } else if (subRes?.subscription?.unsubscribe) {
          subRes.subscription.unsubscribe();
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendConfirmation = async (emailToResend: string) => {
    const targetEmail = (emailToResend || "").trim().toLowerCase();
    if (!targetEmail || resendCooldown > 0) return;
    setResendingEmail(true);
    setResendSuccess(false);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: `${getAppUrl()}/?verified=true`,
        },
      });
      if (error) throw error;
      setResendSuccess(true);
      setResendCooldown(60);
      toast.success("Confirmation email resent. Please check your inbox.");
    } catch (e: any) {
      const raw = e?.msg || e?.message || "";
      const str = typeof raw === "string" ? raw.trim() : "";
      if (str.toLowerCase().includes("email") || str.toLowerCase().includes("smtp") || str === "{}" || e?.status === 500) {
        toast.error("Unable to resend confirmation email. Your project's email provider encountered an error.");
      } else {
        toast.error(str || "Failed to resend confirmation email.");
      }
    } finally {
      setResendingEmail(false);
    }
  };

  // Always reset scroll to the very top whenever view changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [view]);

  // ── Supabase Login ─────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLErr("");
    setUnconfirmedEmail("");
    if (!lEmail.trim() || !lPass.trim()) { setLErr("Please enter email and password."); return; }
    setLLoading(true);
    try {
      const cleanEmail = lEmail.trim().toLowerCase();
      const data = await auth.signIn(cleanEmail, lPass);
      const user = data.user;
      if (!user) throw new Error("Login failed — no user returned.");

      const profile = await resolveFullUserProfile(user);

      if (profile.status === "Suspended") {
        await supabase.auth.signOut();
        setLErr("This account has been suspended by an administrator. Please contact support.");
        return;
      }

      // Strict enforcement: block login until email is verified, unless user is staff provisioned by an owner
      if (!user.email_confirmed_at && profile.role !== "staff") {
        let isStaffRecord = false;
        try {
          const { data: smRow } = await supabase.from("staff_members").select("id").ilike("email", cleanEmail).maybeSingle();
          if (smRow) isStaffRecord = true;
        } catch {}

        if (!isStaffRecord) {
          await supabase.auth.signOut();
          setLErr("Please confirm your email address before signing in. Check your inbox for the confirmation link.");
          setUnconfirmedEmail(cleanEmail);
          return;
        }
      }

      syncUserProfileToAdmin(profile, profile.activePlan, 1);
      onLogin(profile);
    } catch (err: any) {
      const msg = err?.message ?? "Login failed.";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
        setLErr("Incorrect email or password.");
      } else if (msg.includes("Email not confirmed") || msg.includes("email_not_confirmed")) {
        setLErr("Please confirm your email address before signing in. Check your inbox for the confirmation link.");
        setUnconfirmedEmail(lEmail.trim().toLowerCase());
      } else {
        setLErr(msg);
      }
    } finally {
      setLLoading(false);
    }
  };

  // ── Create Account & Trigger Confirmation Email ──────────────────────────
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCErr("");
    if (!cName.trim() || !cEmail.trim() || !cPass.trim() || !cFarm.trim()) {
      setCErr("Please fill in all required fields.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cEmail.trim())) {
      setCErr("Please enter a valid email address.");
      return;
    }
    if (!cAgreed) {
      setCErr("Please agree to the Terms and Conditions.");
      return;
    }
    if (cPass.length < 6) {
      setCErr("Password must be at least 6 characters.");
      return;
    }

    setCLoading(true);
    const cleanEmail = cEmail.trim().toLowerCase();
    try {
      try {
        const check = await api.staff.checkEmailExists(cleanEmail);
        if (check.exists) {
          setCErr("An account with this email address already exists. Please sign in.");
          setCLoading(false);
          return;
        }
      } catch {}

      const phoneStr = `${DIAL_CODES[cDialC] ?? ""} ${cPhone.trim()}`.trim();
      const pendingRef = (cReferralCode.trim() || getPendingReferrerCode() || "").toUpperCase();

      const performSignUp = () => auth.signUp({
        email: cleanEmail,
        password: cPass,
        name: cName.trim(),
        farmName: cFarm.trim(),
        city: cCity.trim(),
        state: cState.trim(),
        country: cCountry,
        phone: phoneStr,
        currencySymbol: cur.symbol,
        currencyCode: cur.code,
        activePlan: null,
        referredBy: pendingRef || undefined,
      });

      let data: any;
      try {
        data = await performSignUp();
      } catch (signupErr: any) {
        const errMsg = signupErr?.message || "";
        if (errMsg.includes("already registered") || errMsg.includes("User already registered")) {
          // Check if this was an orphaned ghost account without a user_profiles row
          const { data: prof } = await supabase.from("user_profiles").select("id").ilike("email", cleanEmail).maybeSingle();
          if (!prof) {
            // Clean up orphaned auth user completely and retry signup
            try { await supabase.rpc("delete_user_by_email", { target_email: cleanEmail }); } catch {}
            data = await performSignUp();
          } else {
            throw signupErr;
          }
        } else {
          throw signupErr;
        }
      }

      // Check if user already exists (Supabase returns empty identities array when user exists and email confirmation is on)
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        const { data: prof } = await supabase.from("user_profiles").select("id").ilike("email", cleanEmail).maybeSingle();
        if (!prof) {
          // Orphaned auth user without a profile — clean up and retry
          try { await supabase.rpc("delete_user_by_email", { target_email: cleanEmail }); } catch {}
          data = await performSignUp();
        }
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error("An account with this email address already exists. Please sign in.");
        }
      }

      const createdUserId = data?.user?.id;
      const profile: UserProfile = {
        id: createdUserId || "",
        name: cName.trim(),
        farmName: cFarm.trim(),
        city: cCity.trim(),
        state: cState.trim(),
        country: cCountry,
        email: data?.user?.email ?? cleanEmail,
        phone: phoneStr,
        currencySymbol: cur.symbol,
        currencyCode: cur.code,
        activePlan: null,
        trialStartDate: null,
        role: "owner",
        status: "Active",
        referredBy: pendingRef || undefined,
        onboardingCompleted: false,
      };

      // Ensure user profile & primary farm are immediately in the backend database
      if (createdUserId) {
        try {
          await supabase.from("user_profiles").upsert({
            id: createdUserId,
            name: cName.trim(),
            farm_name: cFarm.trim(),
            city: cCity.trim(),
            state: cState.trim(),
            country: cCountry,
            email: cleanEmail,
            phone: phoneStr,
            currency_symbol: cur.symbol,
            currency_code: cur.code,
            active_plan: null,
            trial_start_date: null,
            role: "owner",
            status: "Active",
            referred_by: pendingRef || null,
            raw_data: { onboarding_completed: false },
            updated_at: new Date().toISOString(),
          });
          const { data: existingFarms } = await supabase.from("farms").select("id").eq("user_id", createdUserId).limit(1);
          if (!existingFarms || existingFarms.length === 0) {
            await supabase.from("farms").insert({
              user_id: createdUserId,
              name: cFarm.trim() || "Primary Farm",
              city: cCity.trim() || "Lagos",
              state: cState.trim() || "Lagos",
              country: cCountry,
            });
          }
        } catch {}
      }

      // Sync into admin local state / logs immediately
      syncUserProfileToAdmin(profile, null, 1);
      attachReferralToNewUser({ id: createdUserId, email: cleanEmail, name: cName }, pendingRef);

      // Strict enforcement: only auto-login if email is confirmed
      if (data.session && data.user?.email_confirmed_at) {
        onSignup(profile);
      } else {
        // Sign out any session created before confirmation so unverified user cannot enter dashboard
        if (data.session) {
          await supabase.auth.signOut();
        }
        setSignupSent(true);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      const raw = err?.msg || err?.message || err?.error_description || (typeof err === "string" ? err : "");
      const str = typeof raw === "string" ? raw.trim() : "";
      let userMsg = "Registration failed. Please try again.";

      if (str.includes("already registered") || str.includes("already exists") || str.includes("email_exists") || err?.code === "user_already_exists") {
        userMsg = "An account with this email already exists. Please sign in.";
      } else if (
        str.toLowerCase().includes("confirmation email") ||
        str.toLowerCase().includes("smtp") ||
        str.toLowerCase().includes("error sending") ||
        str === "{}" ||
        str === "[]" ||
        err?.status === 500 ||
        err?.code === "unexpected_failure"
      ) {
        userMsg = "Unable to send confirmation email. Your Supabase project's email provider or SMTP configuration encountered an error. Please check your Supabase SMTP settings or enable Auto-Confirm in the Supabase Dashboard.";
      } else if (str && str !== "{}" && str !== "[object Object]") {
        userMsg = str;
      }
      setCErr(userMsg);
      toast.error(userMsg);
    } finally {
      setCLoading(false);
    }
  };

  // ── Forgot Password → send reset email ────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fEmail.trim()) return;
    setFLoading(true);
    try {
      await auth.resetPassword(fEmail.trim().toLowerCase());
      toast.success("Password reset link sent! Check your inbox.");
    } catch (err: any) {
      console.warn("Forgot password error:", err);
      const raw = err?.msg || err?.message || err?.error_description || "";
      const str = typeof raw === "string" ? raw.trim() : "";
      if (str.toLowerCase().includes("email") || str.toLowerCase().includes("smtp") || str === "{}" || err?.status === 500) {
        toast.error("Unable to send reset email. Your project's email provider or SMTP configuration encountered an error.");
      } else {
        toast.error(str || "Failed to send reset link. Please try again.");
      }
    } finally {
      setFLoading(false);
      setFSent(true);
    }
  };

  // ── Recovery → set new password after clicking email link ─────────────────
  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecErr("");
    if (!recPass.trim() || !recConfirm.trim()) { setRecErr("Please fill in both fields."); return; }
    if (recPass !== recConfirm) { setRecErr("Passwords do not match."); return; }
    if (recPass.length < 6) { setRecErr("Password must be at least 6 characters."); return; }
    setRecLoading(true);
    try {
      const data = await auth.updatePassword(recPass);
      const user = data.user;
      if (!user) throw new Error("Failed to update password.");
      const profile = await resolveFullUserProfile(user);
      syncUserProfileToAdmin(profile, profile.activePlan, 1);
      onLogin(profile);
    } catch (err: any) {
      setRecErr(err?.message ?? "Failed to update password. The link may have expired.");
    } finally {
      setRecLoading(false);
    }
  };

  // ── Go to App from Verification Modal ──────────────────────────────────────
  const handleGoToApp = async () => {
    setVerifyingSession(true);
    try {
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
      setShowVerifiedModal(false);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = session.user;
        const profile = await resolveFullUserProfile(user);
        syncUserProfileToAdmin(profile, profile.activePlan, 1);
        onLogin(profile);
      } else {
        setView("login");
        toast.success("Account verified! Please sign in with your credentials.");
      }
    } catch (e: any) {
      setView("login");
    } finally {
      setVerifyingSession(false);
    }
  };

  // ── Invite → staff sets their own password and immediately logs in ────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvErr("");
    if (!invPass.trim() || !invConfirm.trim()) { setInvErr("Please fill in both fields."); return; }
    if (invPass !== invConfirm) { setInvErr("Passwords do not match."); return; }
    if (invPass.length < 6) { setInvErr("Password must be at least 6 characters."); return; }
    setInvLoading(true);
    try {
      // Supabase already has a session established from the invite hash/OTP
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Invitation link is invalid or has expired. Please ask your farm administrator for a new invite.");

      const updateData = invName.trim()
        ? { password: invPass, data: { name: invName.trim() } }
        : { password: invPass };
      const { data: updated, error } = await supabase.auth.updateUser(updateData);
      if (error) throw error;

      const user = updated.user || session.user;
      const meta = user.user_metadata ?? {};
      const userEmail = (user.email || "").trim().toLowerCase();

      // Mark staff member status as Active in database and link staff_auth_id
      try {
        await supabase
          .from("staff_members")
          .update({ status: "Active", staff_auth_id: user.id })
          .ilike("email", userEmail);
      } catch (err) {
        console.warn("Could not mark staff as Active in staff_members table:", err);
      }

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }

      toast.success("Password set successfully! Welcome to Pondtora.");

      const profile = await resolveFullUserProfile(user);
      onLogin(profile);
    } catch (err: any) {
      setInvErr(err?.message ?? "Failed to accept invitation. The link may have expired.");
    } finally {
      setInvLoading(false);
    }
  };

  // ── Terms view ─────────────────────────────────────────────────────────────
  if (view === "terms") return (
    <div className="min-h-screen bg-white flex flex-col max-w-3xl mx-auto p-6 sm:p-10">
      <button onClick={() => setView("create")} className="flex items-center gap-2 text-green-600 hover:text-green-800 font-semibold text-sm mb-6 self-start"><ChevronLeft size={16} /> Back to Create Account</button>
      <h1 className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mb-2">Terms and Conditions</h1>
      <p className="text-xs text-slate-400 mb-6">Last updated: June 2026</p>
      <div className="space-y-4 text-xs text-slate-600 leading-relaxed overflow-y-auto">
        <section><h2 className="font-bold text-slate-800 mb-1">1. Acceptance of Terms</h2><p>By creating an account and using Pondtora ("the Service"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Service.</p></section>
        <section><h2 className="font-bold text-slate-800 mb-1">2. Use of the Service</h2><p>Pondtora is a farm management platform designed for aquaculture operations. You agree to use it only for lawful purposes. You are responsible for maintaining the confidentiality of your account credentials.</p></section>
        <section><h2 className="font-bold text-slate-800 mb-1">3. Data Ownership</h2><p>All farm data you enter into Pondtora remains yours. We do not sell or share your data with third parties without your explicit consent.</p></section>
        <section><h2 className="font-bold text-slate-800 mb-1">4. Subscription and Billing</h2><p>After your 30-day free trial, continued use requires a paid subscription. Billing occurs monthly or annually depending on your selected plan. You may cancel at any time.</p></section>
        <section><h2 className="font-bold text-slate-800 mb-1">5. Limitation of Liability</h2><p>Pondtora is provided "as is". We are not liable for any indirect or consequential damages arising from your use of the Service.</p></section>
        <section><h2 className="font-bold text-slate-800 mb-1">6. Changes to Terms</h2><p>We reserve the right to modify these Terms at any time. Continued use after changes constitutes acceptance.</p></section>
        <section><h2 className="font-bold text-slate-800 mb-1">7. Contact</h2><p>Questions? Contact us at support@pondtora.app</p></section>
      </div>
      <button onClick={() => { setCAgreed(true); setView("create"); }} className="mt-8 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors">I Agree — Back to Sign Up</button>
    </div>
  );

  // ── Invite accepted confirmation ────────────────────────────────────────────
  if (view === "invite" && invDone) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">You're all set!</h2>
        <p className="text-sm text-slate-500">Your password has been set. Sign in with your email to access Pondtora.</p>
        <button onClick={() => { setInvDone(false); setView("login"); }} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors">Sign In Now</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <AuthLeftPanel />
      <div className="flex flex-col justify-start overflow-y-auto px-6 py-8 sm:py-12 sm:px-10 lg:h-screen lg:overflow-y-auto min-h-screen">
        {!signupSent && (
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src={pondtoraLogo} alt="Pondtora" className="h-9 w-auto object-contain shrink-0" />
            <div>
              <p className="text-2xl font-extrabold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-wide leading-none">Pondtora</p>
              <p className="text-[10px] text-emerald-600 uppercase tracking-widest mt-1 font-semibold">Fish Farm Management System</p>
            </div>
          </div>
        )}
        <div className="max-w-sm my-auto w-full mx-auto transition-all">
          {!signupSent && (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif] mb-1">
                {view === "login" ? "Welcome back"
                  : view === "create" ? "Create your account"
                  : view === "recovery" ? "Set new password"
                  : view === "invite" ? "Accept your invitation"
                  : "Reset password"}
              </h2>
              <p className="text-sm text-slate-400 mb-7">
                {view === "login" ? "Sign in to your Pondtora account"
                  : view === "create" ? "Start your 30-day free trial today"
                  : view === "recovery" ? "Enter your new password below"
                  : view === "invite" ? "Set a password to complete your account setup"
                  : "Enter your email to receive a reset link"}
              </p>
            </>
          )}

          {/* ── Login ── */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className={LBL}>Email</label>
                <input id="login-email" type="email" className={AIC} placeholder="you@example.com" value={lEmail} onChange={e => setLEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <label htmlFor="login-password" className={LBL}>Password</label>
                <div className="relative">
                  <input id="login-password" type={showLPass ? "text" : "password"} className={AIC} placeholder="••••••••" value={lPass} onChange={e => setLPass(e.target.value)} autoComplete="current-password" />
                  <button type="button" tabIndex={-1} onClick={() => setShowLPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showLPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {lErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle size={13} />{lErr}</p>}
              {unconfirmedEmail && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-2">
                  <p className="leading-relaxed">
                    Need another confirmation link for <strong>{unconfirmedEmail}</strong>?
                  </p>
                  <button
                    type="button"
                    disabled={resendingEmail || resendCooldown > 0}
                    onClick={() => handleResendConfirmation(unconfirmedEmail)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors"
                  >
                    {resendingEmail ? (
                      <><Loader2 size={12} className="animate-spin" /> Sending link…</>
                    ) : resendCooldown > 0 ? (
                      `Resend link in ${resendCooldown}s`
                    ) : (
                      "Resend Confirmation Email"
                    )}
                  </button>
                  {resendSuccess && (
                    <p className="text-emerald-700 font-medium">Link sent! Check your inbox or spam.</p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-end pt-1">
                <button type="button" onClick={() => { setFSent(false); setFEmail(""); setView("forgot"); }} className="text-xs text-slate-400 hover:text-slate-600">Forgot password?</button>
              </div>
              <button id="login-submit-btn" type="submit" disabled={lLoading} className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                {lLoading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : "Sign In"}
              </button>
              <div className="flex items-center justify-center pt-1">
                <button type="button" onClick={() => setView("create")} className="text-xs text-green-600 hover:text-green-800 font-semibold">Create account</button>
              </div>
            </form>
          )}

          {/* ── Create account Details ── */}
          {view === "create" && !signupSent && (
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LBL}>Full Name *</label><input className={AIC} placeholder="Jane Doe" value={cName} onChange={e => setCName(e.target.value)} /></div>
                <div>
                  <label className={LBL}>Email *</label>
                  <input
                    type="email"
                    className={AIC}
                    placeholder="you@example.com"
                    value={cEmail}
                    onChange={e => {
                      setCEmail(e.target.value);
                      if (cErr) setCErr("");
                    }}
                    onBlur={async () => {
                      if (cEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cEmail.trim())) {
                        try {
                          const res = await api.staff.checkEmailExists(cEmail.trim().toLowerCase());
                          if (res.exists) {
                            setCErr("An account with this email address already exists. Please sign in.");
                          }
                        } catch {}
                      }
                    }}
                  />
                </div>
              </div>
              <div>
                <label className={LBL}>Password *</label>
                <div className="relative">
                  <input type={showCPass ? "text" : "password"} className={AIC} placeholder="Min. 6 characters" value={cPass} onChange={e => setCPass(e.target.value)} autoComplete="new-password" />
                  <button type="button" tabIndex={-1} onClick={() => setShowCPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showCPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={LBL}>Phone</label>
                <div className="flex gap-2">
                  <select className="px-2 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-300 shrink-0 w-[110px]" value={cDialC} onChange={e => setCDialC(e.target.value)}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{FLAG_EMOJI[c] ?? ""} {DIAL_CODES[c] ?? "+?"}</option>)}
                  </select>
                  <input type="tel" className={AIC} placeholder="800 000 0000" value={cPhone} onChange={e => setCPhone(e.target.value)} />
                </div>
              </div>
              <div><label className={LBL}>Farm Name *</label><input className={AIC} placeholder="e.g. Green Valley Aquafarm" value={cFarm} onChange={e => setCFarm(e.target.value)} /></div>
              <div><label className={LBL}>Country</label><SearchableCountrySelect value={cCountry} onChange={v => setCCountry(v)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LBL}>State / Region</label><input className={AIC} placeholder="e.g. Lagos" value={cState} onChange={e => setCState(e.target.value)} /></div>
                <div><label className={LBL}>City</label><input className={AIC} placeholder="e.g. Ikeja" value={cCity} onChange={e => setCCity(e.target.value)} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className={LBL}>Referral Code (Optional)</label>
                  {cReferralCode.trim() && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <Check size={10} /> Applied
                    </span>
                  )}
                </div>
                <input
                  className={`${AIC} uppercase font-mono tracking-wide`}
                  placeholder="e.g. FARM-1001"
                  value={cReferralCode}
                  onChange={e => setCReferralCode(e.target.value.toUpperCase())}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Referred by another fish farmer? Enter their referral code above.
                </p>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={cAgreed} onChange={e => setCAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 appearance-none border border-slate-300 rounded bg-white checked:bg-green-600 checked:border-green-600 transition-colors cursor-pointer shrink-0" />
                <span className="text-xs text-slate-500 leading-relaxed">I agree to the <button type="button" onClick={() => setView("terms")} className="text-green-600 hover:text-green-800 font-semibold underline">Terms and Conditions</button></span>
              </label>
              {cErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle size={13} />{cErr}</p>}
              <button
                type="submit"
                disabled={cLoading}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors mt-1 flex items-center justify-center gap-2 cursor-pointer"
              >
                {cLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating Account…</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
              <button type="button" onClick={() => setView("login")} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 pt-1">Already have an account? Sign in</button>
            </form>
          )}

          {/* ── Email confirmation pending ── */}
          {view === "create" && signupSent && (
            <div className="space-y-5 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto">
                <Mail size={26} className="text-emerald-600" />
              </div>
              <div>
                <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                  Account Verification
                </span>
                <p className="font-bold text-slate-800 text-2xl font-['Barlow_Condensed',sans-serif]">Check your inbox</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
                  We sent an activation link to <span className="font-semibold text-slate-800">{cEmail}</span>. Please click the link to confirm your email and access your dashboard.
                </p>
              </div>

              <div className="pt-2 flex flex-col items-center gap-2">
                <a
                  href="mailto:"
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <Mail size={15} />
                  <span>Open Email App</span>
                </a>
                <div className="flex items-center justify-center gap-2.5 text-[11px] text-slate-500 pt-0.5">
                  <span>Webmail:</span>
                  <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-semibold">Gmail</a>
                  <span>·</span>
                  <a href="https://outlook.live.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-semibold">Outlook</a>
                  <span>·</span>
                  <a href="https://mail.yahoo.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-semibold">Yahoo</a>
                </div>

                <button
                  type="button"
                  disabled={resendingEmail || resendCooldown > 0}
                  onClick={() => handleResendConfirmation(cEmail.trim().toLowerCase())}
                  className="text-xs text-green-700 hover:text-green-800 font-semibold underline disabled:opacity-50 disabled:no-underline cursor-pointer mt-1"
                >
                  {resendingEmail ? (
                    "Resending email..."
                  ) : resendCooldown > 0 ? (
                    `Resend email in ${resendCooldown}s`
                  ) : (
                    "Didn't get the email? Resend link"
                  )}
                </button>
                {resendSuccess && (
                  <span className="text-xs text-emerald-600 font-medium">Confirmation email resent!</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setSignupSent(false); setCreateStep("details"); setView("login"); }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* ── Forgot password ── */}
          {view === "forgot" && (
            !fSent ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div><label className={LBL}>Email</label><input type="email" className={AIC} placeholder="you@example.com" value={fEmail} onChange={e => setFEmail(e.target.value)} autoComplete="email" /></div>
                <button type="submit" disabled={fLoading} className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  {fLoading ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : "Send Reset Link"}
                </button>
                <button type="button" onClick={() => setView("login")} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 pt-1">Back to sign in</button>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto">
                  <CheckCircle size={26} className="text-green-500" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800 text-sm">Check your inbox</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    We sent a reset link to <span className="font-semibold text-slate-600">{fEmail}</span>. Click the link to set a new password.
                  </p>
                </div>
                <div className="space-y-2 pt-1">
                  <a
                    href="mailto:"
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <Mail size={15} />
                    <span>Open Email App</span>
                  </a>
                  <div className="flex items-center justify-center gap-2.5 text-[11px] text-slate-500 pt-0.5">
                    <span>Webmail:</span>
                    <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-semibold">Gmail</a>
                    <span>·</span>
                    <a href="https://outlook.live.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-semibold">Outlook</a>
                    <span>·</span>
                    <a href="https://mail.yahoo.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-semibold">Yahoo</a>
                  </div>
                  <button type="button" onClick={() => setView("login")} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 pt-1">Back to sign in</button>
                </div>
              </div>
            )
          )}

          {/* ── Recovery — set new password after clicking email link ── */}
          {view === "recovery" && (
            <form onSubmit={handleRecovery} className="space-y-4">
              <div>
                <label className={LBL}>New Password</label>
                <div className="relative">
                  <input type={showRecPass ? "text" : "password"} className={AIC} placeholder="••••••••" value={recPass} onChange={e => setRecPass(e.target.value)} autoComplete="new-password" />
                  <button type="button" tabIndex={-1} onClick={() => setShowRecPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showRecPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={LBL}>Confirm Password</label>
                <div className="relative">
                  <input type={showRecConfirm ? "text" : "password"} className={AIC} placeholder="••••••••" value={recConfirm} onChange={e => setRecConfirm(e.target.value)} autoComplete="new-password" />
                  <button type="button" tabIndex={-1} onClick={() => setShowRecConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showRecConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {recErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle size={13} />{recErr}</p>}
              <button type="submit" disabled={recLoading} className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                {recLoading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Set New Password"}
              </button>
            </form>
          )}

          {/* ── Invite — staff accepts invitation and sets their password ── */}
          {view === "invite" && !invDone && (
            <form onSubmit={handleInvite} className="space-y-4">
              <p className="text-xs text-slate-500 bg-green-50 border border-green-200 rounded-lg px-3 py-2 leading-relaxed">
                You have been invited to join Pondtora as a staff member. Set a password to activate your account. Your password is never stored or visible to the farm owner.
              </p>
              <div>
                <label className={LBL}>Your Name <span className="text-slate-300 font-normal">(Optional — confirm or update)</span></label>
                <input className={AIC} placeholder="Jane Doe" value={invName} onChange={e => setInvName(e.target.value)} />
              </div>
              <div>
                <label className={LBL}>Set Password</label>
                <div className="relative">
                  <input type={showInvPass ? "text" : "password"} className={AIC} placeholder="Min. 6 characters" value={invPass} onChange={e => setInvPass(e.target.value)} autoComplete="new-password" />
                  <button type="button" tabIndex={-1} onClick={() => setShowInvPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showInvPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={LBL}>Confirm Password</label>
                <div className="relative">
                  <input type={showInvConfirm ? "text" : "password"} className={AIC} placeholder="••••••••" value={invConfirm} onChange={e => setInvConfirm(e.target.value)} autoComplete="new-password" />
                  <button type="button" tabIndex={-1} onClick={() => setShowInvConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showInvConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {invErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle size={13} />{invErr}</p>}
              <button type="submit" disabled={invLoading} className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                {invLoading ? <><Loader2 size={15} className="animate-spin" /> Setting Password…</> : <><span>Set Password & Enter App</span><ArrowRight size={15} /></>}
              </button>
            </form>
          )}
        </div>
        <p className="text-[11px] text-slate-300 mt-4 text-center">© 2026 Pondtora · All rights reserved</p>
      </div>

      {/* ── Email Verified Popup Modal ── */}
      {showVerifiedModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-['Barlow',sans-serif]">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {verificationError ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
                  Verification Notice
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  {verificationError}
                </p>
                <div className="mt-6 space-y-2">
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
                      setShowVerifiedModal(false);
                      setVerificationError(null);
                      setView("login");
                    }}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Go to Sign In
                  </button>
                  {unconfirmedEmail && (
                    <button
                      onClick={() => {
                        setShowVerifiedModal(false);
                        setVerificationError(null);
                        handleResendConfirmation(unconfirmedEmail);
                      }}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw size={14} /> Resend Confirmation Email
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle size={34} className="text-green-500" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <Sparkles size={12} /> Email Verified
                </div>
                <h2 className="text-2xl font-extrabold font-['Barlow_Condensed',sans-serif] text-slate-900">
                  Account Verified Successfully!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  Your email address {verifiedEmail ? <strong className="text-slate-800">({verifiedEmail})</strong> : ""} has been confirmed. Your Pondtora account is now active and ready.
                </p>
                <div className="my-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <ShieldCheck size={15} className="text-green-600 shrink-0" />
                    <span>Secure aquaculture management unlocked</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Check size={15} className="text-green-600 shrink-0" />
                    <span>Real-time farm sync & reporting active</span>
                  </div>
                </div>
                <button
                  onClick={handleGoToApp}
                  disabled={verifyingSession}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-green-600/25 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {verifyingSession ? <Loader2 size={16} className="animate-spin" /> : <><span>Go to Pondtora App</span><ArrowRight size={16} /></>}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthScreen;
