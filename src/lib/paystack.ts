import { supabase } from "./supabase";

export interface PaystackConfig {
  mode: "test" | "live";
  testPublicKey: string;
  livePublicKey: string;
}

const STORAGE_KEY = "pondtora_paystack_config";

export const DEFAULT_PAYSTACK_CONFIG: PaystackConfig = {
  mode: (import.meta.env.VITE_PAYSTACK_MODE as "test" | "live") || "test",
  testPublicKey:
    import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_f6c0521e72550ca50049367fa66800c36badacf6",
  livePublicKey:
    import.meta.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY || "pk_live_460ba5856621112e2cfa532db6999201fbe0be1a",
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
      delete (parsed as any).testSecretKey;
      delete (parsed as any).liveSecretKey;
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
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

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

let scriptPromise: Promise<boolean> | null = null;

export function loadPaystackScript(): Promise<boolean> {
  if (typeof window !== "undefined" && (window as any).PaystackPop) {
    return Promise.resolve(true);
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if ((window as any).PaystackPop) {
      resolve(true);
      return;
    }

    // Safety timeout: never hang forever if network is slow or script fails
    const timeoutId = setTimeout(() => {
      if ((window as any).PaystackPop) {
        resolve(true);
      } else {
        console.warn("Paystack script load timeout reached (6s)");
        scriptPromise = null; // allow fresh retry
        resolve(false);
      }
    }, 6000);

    const existing = document.getElementById("paystack-inline-js") as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).PaystackPop) {
        clearTimeout(timeoutId);
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => {
        clearTimeout(timeoutId);
        resolve(true);
      });
      existing.addEventListener("error", () => {
        clearTimeout(timeoutId);
        scriptPromise = null;
        resolve(false);
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timeoutId);
      scriptPromise = null;
      console.error("Failed to load Paystack Inline JS script.");
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
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

  try {
    const handler = (window as any).PaystackPop.setup({
      key: publicKey,
      email: cleanEmail,
      amount: amountInKobo,
      currency: "NGN",
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
          onSuccess(response);
        } catch (callbackErr) {
          console.error("Paystack success callback error:", callbackErr);
        }
      },
      onClose: () => {
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
