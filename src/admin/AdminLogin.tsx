import React, { useState } from "react";
import { Fish, Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import pondtoraLogo from "../imports/loo-2.svg";
import { supabase } from "../lib/supabase";

interface AdminLoginProps {
  onLogin: (adminInfo?: { email: string; role: string }) => void;
  onExit?: () => void;
}

export default function AdminLogin({ onLogin, onExit }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate against Supabase Auth securely
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (!authError && data.user) {
        // Query user profile to verify role
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role, email, name")
          .eq("id", data.user.id)
          .maybeSingle();

        setLoading(false);
        localStorage.setItem("pondtora_admin_auth", "true");
        localStorage.setItem("pondtora_admin_email", cleanEmail);
        onLogin({ email: cleanEmail, role: profile?.role || "owner" });
        return;
      }

      setLoading(false);
      setError(authError?.message || "Invalid admin credentials. Access is restricted to authorised administrators only.");
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Authentication service error. Please try again.");
    }
  }

  function handleBackToApp() {
    if (onExit) {
      onExit();
    } else {
      localStorage.removeItem("pondtora_admin_mode");
      window.location.href = window.location.origin + window.location.pathname;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-['Barlow',sans-serif]">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/20 mb-3 border border-green-400/20">
            <img src={pondtoraLogo} alt="Pondtora" className="w-9 h-9 object-contain brightness-0 invert" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <Fish size={24} className="text-white hidden only:block" />
          </div>
          <h1 className="text-white font-extrabold text-2xl font-['Barlow_Condensed',sans-serif] tracking-wide">
            Pondtora Admin Portal
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldCheck size={13} className="text-green-400" />
            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Master Control & Regulation</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-white text-lg font-bold font-['Barlow_Condensed',sans-serif]">
              Site Owner Authentication
            </h2>
            <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
              Sign in with your master administrative credentials to regulate pricing, monitor users, and inspect app health.
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-red-400 text-xs animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  placeholder="admin@pondtora.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Admin Password
                </label>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={e => { setPass(e.target.value); setError(null); }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !pass}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-600/20 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying Credentials…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Sign In to Admin
                </>
              )}
            </button>
          </form>
        </div>

        {/* Navigation back */}
        <div className="text-center mt-6">
          <button
            onClick={handleBackToApp}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold transition-colors py-1 px-3 rounded-lg hover:bg-slate-900"
          >
            <ArrowLeft size={13} /> Return to Main Application
          </button>
        </div>
      </div>
    </div>
  );
}
