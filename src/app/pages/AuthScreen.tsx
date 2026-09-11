import React, { useState, useEffect } from "react";
import { CheckCircle, ChevronLeft, Loader2, AlertCircle, Eye, EyeOff, Mail } from "lucide-react";
import pondtoraLogo from "../../imports/loo-2.svg";
import type { UserProfile } from "../types";
import { COUNTRIES, DIAL_CODES, FLAG_EMOJI, COUNTRY_CURRENCIES } from "../data";
import { SearchableCountrySelect } from "../shared";
import { supabase } from "../../lib/supabase";
import { auth } from "../../lib/api";

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
    <div className="hidden lg:flex flex-col justify-between h-full p-10 bg-gradient-to-br from-green-700 via-green-600 to-green-500 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px),radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-x-16 translate-y-16 pointer-events-none" />
      <div className="flex items-center gap-3 relative z-10">
        <img src={pondtoraLogo} alt="Pondtora" className="h-9 w-auto rounded-lg object-contain bg-white p-1 shadow-sm" />
        <div>
          <p className="text-xl font-extrabold font-['Barlow_Condensed',sans-serif] leading-none">Pondtora</p>
          <p className="text-[10px] text-green-200 uppercase tracking-widest mt-0.5">Farm Management System</p>
        </div>
      </div>
      <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
        <h2 className="text-3xl font-extrabold font-['Barlow_Condensed',sans-serif] leading-tight mb-8">
          Management System for Fish Farmers
        </h2>
        <ul className="space-y-4">
          {features.map(f => (
            <li key={f} className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-300 shrink-0 mt-1.5" />
              <span className="text-sm text-green-50 leading-relaxed">{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative z-10 border-t border-white/20 pt-6">
        <p className="text-xs text-green-200 font-semibold">© 2026 Pondtora · All rights reserved</p>
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
  initialView?: "login" | "create";
}) {
  const [view, setView] = useState<ViewType>(initialView);

  // Detect URL hash for invite / recovery flows on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.slice(1));
    const type = params.get("type");
    if (type === "invite") {
      setView("invite");
      // Supabase auto-establishes session from hash tokens
    } else if (type === "recovery") {
      setView("recovery");
    }
    // Clean hash without triggering navigation
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const isCreate = view === "create";

  // ── Login state ────────────────────────────────────────────────────────────
  const [lEmail, setLEmail] = useState("");
  const [lPass, setLPass] = useState("");
  const [lErr, setLErr] = useState("");
  const [lLoading, setLLoading] = useState(false);
  const [showLPass, setShowLPass] = useState(false);

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

  // ── Supabase Login ─────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLErr("");
    if (!lEmail.trim() || !lPass.trim()) { setLErr("Please enter email and password."); return; }
    setLLoading(true);
    try {
      const data = await auth.signIn(lEmail.trim().toLowerCase(), lPass);
      const user = data.user;
      if (!user) throw new Error("Login failed — no user returned.");
      const meta = user.user_metadata ?? {};
      const profile: UserProfile = {
        name: meta.name ?? user.email?.split("@")[0] ?? "",
        farmName: meta.farm_name ?? "",
        city: meta.city ?? "",
        state: meta.state ?? "",
        country: meta.country ?? "Nigeria",
        email: user.email ?? "",
        phone: meta.phone ?? "",
        currencySymbol: meta.currency_symbol ?? "₦",
        currencyCode: meta.currency_code ?? "NGN",
        activePlan: meta.active_plan,
        trialStartDate: meta.trial_start_date,
      };
      onLogin(profile);
    } catch (err: any) {
      const msg = err?.message ?? "Login failed.";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
        setLErr("Incorrect email or password.");
      } else if (msg.includes("Email not confirmed")) {
        setLErr("Please confirm your email before signing in.");
      } else {
        setLErr(msg);
      }
    } finally {
      setLLoading(false);
    }
  };

  // ── Supabase Sign Up ───────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCErr("");
    if (!cName.trim() || !cEmail.trim() || !cPass.trim() || !cFarm.trim()) {
      setCErr("Please fill in all required fields."); return;
    }
    if (!cAgreed) { setCErr("Please agree to the Terms and Conditions."); return; }
    if (cPass.length < 6) { setCErr("Password must be at least 6 characters."); return; }
    setCLoading(true);
    try {
      const phoneStr = `${DIAL_CODES[cDialC] ?? ""} ${cPhone.trim()}`.trim();
      const data = await auth.signUp({
        email: cEmail.trim().toLowerCase(),
        password: cPass,
        name: cName.trim(),
        farmName: cFarm.trim(),
        city: cCity.trim(),
        state: cState.trim(),
        country: cCountry,
        phone: phoneStr,
        currencySymbol: cur.symbol,
        currencyCode: cur.code,
      });

      // If Supabase returns a session immediately (email confirm disabled), log them in
      if (data.session) {
        const user = data.user!;
        const profile: UserProfile = {
          name: cName.trim(),
          farmName: cFarm.trim(),
          city: cCity.trim(),
          state: cState.trim(),
          country: cCountry,
          email: user.email ?? cEmail.trim().toLowerCase(),
          phone: phoneStr,
          currencySymbol: cur.symbol,
          currencyCode: cur.code,
          activePlan: undefined,
          trialStartDate: new Date().toISOString(),
        };
        onSignup(profile);
      } else {
        // Email confirmation required — show confirmation message
        setSignupSent(true);
      }
    } catch (err: any) {
      const msg = err?.message ?? "Registration failed.";
      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("email_exists")) {
        setCErr("An account with this email already exists. Please sign in.");
      } else {
        setCErr(msg);
      }
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
    } catch {
      // Intentionally silent — we always show "check your inbox" to avoid email enumeration
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
      const meta = user.user_metadata ?? {};
      const profile: UserProfile = {
        name: meta.name ?? user.email?.split("@")[0] ?? "",
        farmName: meta.farm_name ?? "",
        city: meta.city ?? "",
        state: meta.state ?? "",
        country: meta.country ?? "Nigeria",
        email: user.email ?? "",
        phone: meta.phone ?? "",
        currencySymbol: meta.currency_symbol ?? "₦",
        currencyCode: meta.currency_code ?? "NGN",
        activePlan: meta.active_plan,
        trialStartDate: meta.trial_start_date,
      };
      onLogin(profile);
    } catch (err: any) {
      setRecErr(err?.message ?? "Failed to update password. The link may have expired.");
    } finally {
      setRecLoading(false);
    }
  };

  // ── Invite → staff sets their own password ─────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvErr("");
    if (!invPass.trim() || !invConfirm.trim()) { setInvErr("Please fill in both fields."); return; }
    if (invPass !== invConfirm) { setInvErr("Passwords do not match."); return; }
    if (invPass.length < 6) { setInvErr("Password must be at least 6 characters."); return; }
    setInvLoading(true);
    try {
      // Supabase already has a session established from the invite hash
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Invitation link is invalid or has expired.");

      const updateData = invName.trim()
        ? { password: invPass, data: { name: invName.trim() } }
        : { password: invPass };
      const { error } = await supabase.auth.updateUser(updateData);
      if (error) throw error;

      setInvDone(true);
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
      <div className={`flex flex-col justify-center px-6 py-10 sm:px-10 overflow-y-auto ${isCreate ? "" : "min-h-screen"}`}>
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <img src={pondtoraLogo} alt="Pondtora" className="h-10 w-auto object-contain" />
          <p className="text-lg font-extrabold font-['Barlow_Condensed',sans-serif] text-slate-900">Pondtora</p>
        </div>
        <div className="max-w-sm w-full mx-auto">
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

          {/* ── Create account ── */}
          {view === "create" && !signupSent && (
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LBL}>Full Name *</label><input className={AIC} placeholder="Jane Doe" value={cName} onChange={e => setCName(e.target.value)} /></div>
                <div><label className={LBL}>Email *</label><input type="email" className={AIC} placeholder="you@example.com" value={cEmail} onChange={e => setCEmail(e.target.value)} /></div>
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
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={cAgreed} onChange={e => setCAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 appearance-none border border-slate-300 rounded bg-white checked:bg-green-600 checked:border-green-600 transition-colors cursor-pointer shrink-0" />
                <span className="text-xs text-slate-500 leading-relaxed">I agree to the <button type="button" onClick={() => setView("terms")} className="text-green-600 hover:text-green-800 font-semibold underline">Terms and Conditions</button></span>
              </label>
              {cErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle size={13} />{cErr}</p>}
              <button type="submit" disabled={cLoading} className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors mt-1 flex items-center justify-center gap-2">
                {cLoading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : "Create Account"}
              </button>
              <button type="button" onClick={() => setView("login")} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 pt-1">Already have an account? Sign in</button>
            </form>
          )}

          {/* ── Email confirmation pending ── */}
          {view === "create" && signupSent && (
            <div className="space-y-5 py-2 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto">
                <Mail size={26} className="text-green-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Check your inbox</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">We sent a confirmation email to <span className="font-semibold text-slate-600">{cEmail}</span>. Click the link to activate your account.</p>
              </div>
              <button type="button" onClick={() => { setSignupSent(false); setView("login"); }} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors">Back to Sign In</button>
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
                <button type="button" onClick={() => setView("login")} className="w-full text-center text-xs text-green-600 hover:text-green-800 font-semibold">Back to sign in</button>
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
                {invLoading ? <><Loader2 size={15} className="animate-spin" /> Activating…</> : "Activate My Account"}
              </button>
            </form>
          )}
        </div>
        <p className="text-[11px] text-slate-300 mt-4 text-center">© 2026 Pondtora · All rights reserved</p>
      </div>
    </div>
  );
}

export default AuthScreen;
