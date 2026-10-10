import { supabase } from "./supabase";

export interface PaystackConfig {
  mode: "test" | "live";
  testPublicKey: string;
  livePublicKey: string;
  testSecretKey?: string;
  liveSecretKey?: string;
}

const STORAGE_KEY = "pondtora_paystack_config";

export const DEFAULT_PAYSTACK_CONFIG: PaystackConfig = {
  mode: (import.meta.env.VITE_PAYSTACK_MODE as "test" | "live") || "test",
  testPublicKey:
    import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_f6c0521e72550ca50049367fa66800c36badacf6",
  livePublicKey:
    import.meta.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY || "pk_live_460ba5856621112e2cfa532db6999201fbe0be1a",
  testSecretKey: import.meta.env.VITE_PAYSTACK_SECRET_KEY || "",
  liveSecretKey: import.meta.env.VITE_PAYSTACK_LIVE_SECRET_KEY || "",
};

// In-memory cache
let cachedConfig: PaystackConfig | null = null;

export function loadPaystackConfig(): PaystackConfig {
  if (cachedConfig) return cachedConfig;
  try {
    const explicitMode = localStorage.getItem("pondtora_paystack_mode") as "test" | "live" | null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedConfig = {
        ...DEFAULT_PAYSTACK_CONFIG,
        ...parsed,
        mode: explicitMode || parsed.mode || DEFAULT_PAYSTACK_CONFIG.mode,
      };
      return cachedConfig;
    }
    if (explicitMode) {
      cachedConfig = { ...DEFAULT_PAYSTACK_CONFIG, mode: explicitMode };
      return cachedConfig;
    }
  } catch {}
  cachedConfig = { ...DEFAULT_PAYSTACK_CONFIG };
  return cachedConfig;
}

/**
 * Fetch latest global Paystack configuration from Supabase platform_settings
 */
export async function fetchRemotePaystackConfig(): Promise<PaystackConfig> {
  const currentLocal = loadPaystackConfig();
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "paystack_config")
      .maybeSingle();

    if (!error && data?.value && typeof data.value === "object") {
      const remote = data.value as Partial<PaystackConfig>;
      const merged: PaystackConfig = {
        mode: remote.mode === "live" ? "live" : (remote.mode === "test" ? "test" : currentLocal.mode),
        testPublicKey: remote.testPublicKey || currentLocal.testPublicKey || DEFAULT_PAYSTACK_CONFIG.testPublicKey,
        livePublicKey: remote.livePublicKey || currentLocal.livePublicKey || DEFAULT_PAYSTACK_CONFIG.livePublicKey,
        testSecretKey: remote.testSecretKey || currentLocal.testSecretKey || "",
        liveSecretKey: remote.liveSecretKey || currentLocal.liveSecretKey || "",
      };
      cachedConfig = merged;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        localStorage.setItem("pondtora_paystack_mode", merged.mode);
      } catch {}
      window.dispatchEvent(new CustomEvent("pondtora:paystack_config_updated", { detail: merged }));
      return merged;
    }
  } catch (err) {
    console.warn("fetchRemotePaystackConfig fallback to local:", err);
  }
  return currentLocal;
}

// Automatically sync remote config in the background on startup
if (typeof window !== "undefined") {
  fetchRemotePaystackConfig().catch(() => {});
}

export async function savePaystackConfig(cfg: PaystackConfig): Promise<boolean> {
  cachedConfig = cfg;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    localStorage.setItem("pondtora_paystack_mode", cfg.mode);
    window.dispatchEvent(new CustomEvent("pondtora:paystack_config_updated", { detail: cfg }));
  } catch {}

  // Persist to Supabase platform_settings table so it never reverts across browsers/devices
  try {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({
        key: "paystack_config",
        value: {
          mode: cfg.mode,
          testPublicKey: cfg.testPublicKey,
          livePublicKey: cfg.livePublicKey,
          testSecretKey: cfg.testSecretKey || "",
          liveSecretKey: cfg.liveSecretKey || "",
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    // Also update individual paystack_secret_key key if present
    const activeSecretKey = cfg.mode === "live" ? cfg.liveSecretKey : cfg.testSecretKey;
    if (activeSecretKey && activeSecretKey.startsWith("sk_")) {
      await supabase
        .from("platform_settings")
        .upsert({
          key: "paystack_secret_key",
          value: { secretKey: activeSecretKey.trim() },
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" })
        .catch(() => {});
    }

    if (error) {
      console.warn("Could not persist paystack_config to Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Supabase paystack_config save error:", err);
    return false;
  }
}

export function getActivePaystackPublicKey(): string {
  const cfg = loadPaystackConfig();
  return cfg.mode === "live" ? cfg.livePublicKey : cfg.testPublicKey;
}

export function loadPaystackScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if ((window as any).PaystackPop) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    if ((window as any).PaystackPop) {
      resolve(true);
      return;
    }

    let resolved = false;
    const finish = (ok: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(ok);
      }
    };

    // Fast interval check for PaystackPop
    const interval = setInterval(() => {
      if ((window as any).PaystackPop) {
        clearInterval(interval);
        finish(true);
      }
    }, 100);

    // 5-second maximum timeout
    setTimeout(() => {
      clearInterval(interval);
      finish(Boolean((window as any).PaystackPop));
    }, 5000);

    const existing = document.getElementById("paystack-inline-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => finish(true), { once: true });
      existing.addEventListener("error", () => finish(false), { once: true });
    } else {
      const script = document.createElement("script");
      script.id = "paystack-inline-js";
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      script.onload = () => finish(true);
      script.onerror = () => finish(false);
      document.head.appendChild(script);
    }
  });
}

export interface PendingTransaction {
  reference: string;
  email: string;
  planName: string;
  amount: number;
  billingCycle: "monthly" | "yearly";
  userName?: string;
  phone?: string;
  farmName?: string;
  timestamp: number;
}

const PENDING_TX_KEY = "pondtora_pending_paystack_tx";

export function getPendingPaystackTransaction(): PendingTransaction | null {
  try {
    const raw = localStorage.getItem(PENDING_TX_KEY) || sessionStorage.getItem(PENDING_TX_KEY);
    if (!raw) return null;
    const parsed: PendingTransaction = JSON.parse(raw);
    // Discard if older than 24 hours
    if (Date.now() - (parsed.timestamp || 0) > 24 * 60 * 60 * 1000) {
      clearPendingPaystackTransaction();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePendingPaystackTransaction(tx: PendingTransaction) {
  try {
    localStorage.setItem(PENDING_TX_KEY, JSON.stringify(tx));
    sessionStorage.setItem(PENDING_TX_KEY, JSON.stringify(tx));
  } catch {}
}

export function clearPendingPaystackTransaction() {
  try {
    localStorage.removeItem(PENDING_TX_KEY);
    sessionStorage.removeItem(PENDING_TX_KEY);
  } catch {}
}

export interface PaystackCheckoutOptions {
  email: string;
  amount: number; // in NGN Naira (e.g. 5000)
  planName: string;
  billingCycle?: "monthly" | "yearly";
  userName?: string;
  phone?: string;
  farmName?: string;
  onSuccess: (response: { reference: string; status: string; trans?: string; message?: string }) => void;
  onClose?: () => void;
}

export async function initializePaystackCheckout(options: PaystackCheckoutOptions): Promise<boolean> {
  const {
    email,
    amount,
    planName,
    billingCycle = "monthly",
    userName = "",
    phone = "",
    farmName = "",
    onSuccess,
    onClose,
  } = options;

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    alert("Please provide a valid email address for subscription.");
    if (onClose) onClose();
    return false;
  }

  const isLoaded = await loadPaystackScript();
  if (!isLoaded || !(window as any).PaystackPop) {
    alert("Unable to load Paystack payment modal. Please check your internet connection and try again.");
    if (onClose) onClose();
    return false;
  }

  const publicKey = getActivePaystackPublicKey();
  if (!publicKey) {
    alert("Paystack Public Key is not configured. Please contact the administrator.");
    if (onClose) onClose();
    return false;
  }

  // Paystack expects amount in KOBO (1 NGN = 100 KOBO)
  const validAmount = typeof amount === "number" && !isNaN(amount) && amount > 0 ? amount : 100;
  const amountInKobo = Math.round(validAmount * 100);
  const reference = `PND_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Persist transaction prior to launching popup so background app switching won't lose it
  const pendingTx: PendingTransaction = {
    reference,
    email: cleanEmail,
    planName,
    amount: validAmount,
    billingCycle,
    userName,
    phone,
    farmName,
    timestamp: Date.now(),
  };
  savePendingPaystackTransaction(pendingTx);

  try {
    const handler = (window as any).PaystackPop.setup({
      key: publicKey,
      email: cleanEmail,
      amount: amountInKobo,
      currency: "NGN",
      channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer", "eft"],
      ref: reference,
      metadata: {
        custom_fields: [
          {
            display_name: "Plan Name",
            variable_name: "plan_name",
            value: planName,
          },
          {
            display_name: "Billing Frequency",
            variable_name: "billing_frequency",
            value: billingCycle,
          },
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: userName || cleanEmail,
          },
          {
            display_name: "Farm Name",
            variable_name: "farm_name",
            value: farmName || "Primary Farm",
          },
        ],
      },
      callback: (response: any) => {
        try {
          clearPendingPaystackTransaction();
          onSuccess(response);
        } catch (callbackErr) {
          console.error("Paystack success callback error:", callbackErr);
        }
      },
      onClose: () => {
        // Keep pending transaction saved in case user completed bank transfer in another app and modal closed
        if (onClose) {
          try {
            onClose();
          } catch {}
        }
      },
    });

    handler.openIframe();
    return true;
  } catch (err) {
    console.error("Error opening Paystack iframe:", err);
    alert("An error occurred while launching Paystack. Please try again.");
    if (onClose) onClose();
    return false;
  }
}

export interface PaystackVerifyResult {
  verified: boolean;
  status: "success" | "pending" | "failed" | "abandoned" | "not_found" | "error";
  amount?: number; // In Naira
  currency?: string;
  reference?: string;
  planName?: string;
  billingCycle?: "monthly" | "yearly";
  paidAt?: string;
  message?: string;
  raw?: any;
}

/**
 * Verifies a transaction reference against Paystack via backend or direct API
 */
export async function verifyPaystackPayment(
  reference: string,
  options?: {
    expectedPlan?: string;
    expectedAmount?: number;
    billingCycle?: "monthly" | "yearly";
    email?: string;
  }
): Promise<PaystackVerifyResult> {
  const cleanRef = (reference || "").trim();
  if (!cleanRef) {
    return {
      verified: false,
      status: "not_found",
      message: "No transaction reference provided.",
    };
  }

  // 1. Check if Supabase user_profiles already has this payment confirmed (e.g. from webhook or previous confirmation)
  try {
    const { data: profileWithRef } = await supabase
      .from("user_profiles")
      .select("id, email, active_plan, subscription_status, subscription_amount, paystack_reference, subscription_start, billing_frequency")
      .eq("paystack_reference", cleanRef)
      .maybeSingle();

    if (profileWithRef && profileWithRef.subscription_status === "Active") {
      return {
        verified: true,
        status: "success",
        amount: Number(profileWithRef.subscription_amount) || options?.expectedAmount || 0,
        currency: "NGN",
        reference: cleanRef,
        planName: profileWithRef.active_plan || options?.expectedPlan || "Starter",
        billingCycle: profileWithRef.billing_frequency === "yearly" ? "yearly" : "monthly",
        paidAt: profileWithRef.subscription_start || new Date().toISOString().slice(0, 10),
        message: "Payment confirmed in database.",
      };
    }
  } catch {}

  // 2. Try Supabase Edge Function verification endpoints
  const baseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL || "https://fegtvgfkxueorybefthj.supabase.co";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_A0ZzIUTY3KIIOE4ZFhELsQ_9eepyJue";
  const edgeUrls = [
    `${baseUrl}/functions/v1/make-server-1da59a07/paystack/verify`,
    `${baseUrl}/functions/v1/server/paystack/verify`,
    `${baseUrl}/functions/v1/server/make-server-1da59a07/paystack/verify`,
    `${baseUrl}/functions/v1/paystack/verify`,
  ];

  let sessionToken = "";
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    sessionToken = sessionData?.session?.access_token || "";
  } catch {}

  for (const edgeUrl of edgeUrls) {
    try {
      const res = await fetch(edgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          Authorization: `Bearer ${sessionToken || anonKey}`,
        },
        body: JSON.stringify({
          reference: cleanRef,
          expectedPlan: options?.expectedPlan,
          expectedAmount: options?.expectedAmount,
          billingCycle: options?.billingCycle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.verified === "boolean") {
          if (data.verified) {
            return data as PaystackVerifyResult;
          }
          if (data.status === "failed" || data.status === "abandoned") {
            return data as PaystackVerifyResult;
          }
        }
      }
    } catch (backendErr) {
      // Continue to next endpoint or direct fallback
    }
  }

  // 3. Direct Paystack REST API verification fallback using platform_settings keys
  try {
    const candidateKeys: string[] = [];

    // Check local config
    const localCfg = loadPaystackConfig();
    if (localCfg.liveSecretKey && localCfg.liveSecretKey.trim().startsWith("sk_")) {
      candidateKeys.push(localCfg.liveSecretKey.trim());
    }
    if (localCfg.testSecretKey && localCfg.testSecretKey.trim().startsWith("sk_")) {
      candidateKeys.push(localCfg.testSecretKey.trim());
    }

    // Check platform_settings table
    const { data: settingData } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "paystack_secret_key")
      .maybeSingle();

    const directSec = settingData?.value?.secretKey || (typeof settingData?.value === "string" ? settingData.value : null);
    if (directSec && typeof directSec === "string" && directSec.trim().startsWith("sk_")) {
      candidateKeys.push(directSec.trim());
    }

    const { data: cfgSetting } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "paystack_config")
      .maybeSingle();

    if (cfgSetting?.value && typeof cfgSetting.value === "object") {
      const v = cfgSetting.value;
      if (v.liveSecretKey && typeof v.liveSecretKey === "string" && v.liveSecretKey.trim().startsWith("sk_")) {
        candidateKeys.push(v.liveSecretKey.trim());
      }
      if (v.testSecretKey && typeof v.testSecretKey === "string" && v.testSecretKey.trim().startsWith("sk_")) {
        candidateKeys.push(v.testSecretKey.trim());
      }
      if (v.secretKey && typeof v.secretKey === "string" && v.secretKey.trim().startsWith("sk_")) {
        candidateKeys.push(v.secretKey.trim());
      }
    }

    // Deduplicate candidate keys
    const uniqueKeys = Array.from(new Set(candidateKeys));

    for (const secretKey of uniqueKeys) {
      try {
        const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        });

        if (paystackRes.ok) {
          const psJson = await paystackRes.json();
          if (psJson.status && psJson.data) {
            const tx = psJson.data;
            const isSuccess = tx.status === "success";
            const amountInNaira = typeof tx.amount === "number" ? tx.amount / 100 : 0;
            const currency = (tx.currency || "").toUpperCase();

            if (isSuccess && (currency === "NGN" || !currency)) {
              return {
                verified: true,
                status: "success",
                amount: amountInNaira || options?.expectedAmount || 0,
                currency: tx.currency || "NGN",
                reference: tx.reference || cleanRef,
                paidAt: tx.paid_at || tx.paidAt || new Date().toISOString(),
                planName: tx.metadata?.plan_name || options?.expectedPlan,
                billingCycle: tx.metadata?.billing_frequency || options?.billingCycle || "monthly",
                message: "Transaction verified successfully through Paystack.",
                raw: tx,
              };
            } else if (tx.status === "failed" || tx.status === "abandoned") {
              return {
                verified: false,
                status: tx.status as any,
                amount: amountInNaira,
                currency: tx.currency,
                reference: tx.reference || cleanRef,
                message: `Transaction status is ${tx.status} on Paystack.`,
                raw: tx,
              };
            } else if (tx.status === "ongoing" || tx.status === "processing" || tx.status === "pending") {
              return {
                verified: false,
                status: "pending",
                reference: cleanRef,
                message: "Paystack is currently processing your bank transfer. Please wait 1-2 minutes and click verify again.",
              };
            }
          }
        }
      } catch (keyErr) {
        console.warn("Paystack verify error for key:", keyErr);
      }
    }
  } catch (directErr) {
    console.warn("Direct Paystack verify error:", directErr);
  }

  // 4. Check if secret keys are missing in platform_settings
  const cfg = loadPaystackConfig();
  const hasAnySecret = Boolean(cfg.liveSecretKey || cfg.testSecretKey);
  if (!hasAnySecret) {
    const { data: psSet } = await supabase.from("platform_settings").select("value").in("key", ["paystack_config", "paystack_secret_key"]);
    const hasDbSecret = psSet?.some(s => s?.value?.secretKey || s?.value?.liveSecretKey || s?.value?.testSecretKey);
    if (!hasDbSecret) {
      return {
        verified: false,
        status: "pending",
        message: "Paystack Secret Key is not configured yet in Admin Settings. Please configure the Paystack Secret Key in Admin > Settings > Paystack Payment Gateway to enable automatic instant confirmation.",
      };
    }
  }

  // 5. Fallback: Paystack has not confirmed this payment yet
  return {
    verified: false,
    status: "pending",
    message: "Paystack has not confirmed this payment yet. If you made a bank transfer, please allow 1-2 minutes for your bank and Paystack to confirm, then try again.",
  };
}

