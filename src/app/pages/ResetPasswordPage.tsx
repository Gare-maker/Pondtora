import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import pondtoraLogo from "../../imports/loo-2.svg";
import { supabase, getAppUrl } from "../../lib/supabase";
import { auth } from "../../lib/api";
import type { UserProfile } from "../types";

interface ResetPasswordPageProps {
  onSuccess?: (profile: UserProfile) => void;
  onGoToLogin?: () => void;
}

export default function ResetPasswordPage({ onSuccess, onGoToLogin }: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  // Request new reset link state
  const [requestEmail, setRequestEmail] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

    // Check for error parameters in URL (e.g. otp_expired, access_denied)
    const errorDesc = searchParams.get("error_description") || hashParams.get("error_description");
    const errCode = searchParams.get("error_code") || hashParams.get("error_code") || searchParams.get("error") || hashParams.get("error");

    if (errorDesc || errCode) {
      setIsExpired(true);
      const decoded = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, " ")) : "This password reset link is invalid or has expired.";
      setErrorMessage(decoded);
      return;
    }

    // Check if a session already exists or was detected by Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setRequestEmail(session.user.email);
      }
    });

    // Listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session?.user) {
        if (session?.user?.email) {
          setUserEmail(session.user.email);
          setRequestEmail(session.user.email);
        }
        setIsExpired(false);
        setErrorMessage(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
      const data = await auth.updatePassword(password);
      const user = data.user;
      if (!user) throw new Error("Could not update password. Please try requesting a new reset link.");

      setIsSuccess(true);
      toast.success("Password updated successfully!");

      // Clean the URL
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/");
      }

      const meta = user.user_metadata ?? {};
      const profile: UserProfile = {
        id: user.id,
        name: meta.name ?? user.email?.split("@")[0] ?? "User",
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
      const msg = err?.message || "Failed to update password. The link may have expired.";
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
        setIsExpired(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = requestEmail.trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    setRequestLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${getAppUrl()}/reset-password`,
      });
      if (error) throw error;
      setRequestSent(true);
      toast.success("A new password reset link has been sent to your email.");
    } catch (err: any) {
      // Show sent state anyway to prevent email enumeration, but log message
      console.warn("Reset password request error:", err);
      setRequestSent(true);
      toast.success("If an account exists for that email, a new reset link has been sent.");
    } finally {
      setRequestLoading(false);
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

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header Icon */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <KeyRound size={26} />
            </div>
            <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-white">
              {isExpired ? "Reset Link Expired" : isSuccess ? "Password Updated" : "Set New Password"}
            </h1>
            <p className="text-xs text-slate-400">
              {isExpired
                ? "This password reset link is invalid or has already been used."
                : isSuccess
                ? "Your new password has been set. Redirecting to your account..."
                : userEmail
                ? `Enter a new password for ${userEmail}`
                : "Enter your new password below to secure your account."}
            </p>
          </div>

          {/* Success State */}
          {isSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto animate-bounce" />
              <p className="text-sm font-semibold text-emerald-200">
                Password successfully updated!
              </p>
              <p className="text-xs text-slate-400">
                You will be redirected automatically in a moment.
              </p>
            </div>
          )}

          {/* Expired / Invalid Link State with Request New Link form */}
          {isExpired && !isSuccess && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200 leading-relaxed">
                  {errorMessage || "Email link is invalid or has expired. You can request a fresh password reset link below."}
                </p>
              </div>

              {requestSent ? (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-3">
                  <CheckCircle2 size={28} className="text-emerald-400 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Check your email</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    We sent a new password reset link to <strong className="text-emerald-300">{requestEmail}</strong>.
                    Please check your inbox and spam folder.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRequestSent(false)}
                    className="text-xs text-emerald-400 hover:underline font-semibold pt-1 block mx-auto"
                  >
                    Didn't receive it? Resend
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestNewLink} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={requestEmail}
                      onChange={(e) => setRequestEmail(e.target.value)}
                      placeholder="name@farm.com"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={requestLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {requestLoading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <span>Send New Reset Link</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Normal Reset Password Form */}
          {!isExpired && !isSuccess && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {errorMessage && (
                <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200">{errorMessage}</p>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  New Password
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
                  Confirm New Password
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

              {/* Requirements checklist */}
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
                    <span>Update Password</span>
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
