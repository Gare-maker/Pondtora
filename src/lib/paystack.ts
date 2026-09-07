/**
 * Paystack Integration Helper for Pondtora
 * Supports Option A: Paystack Inline Popup / Direct Subscription Checkout
 */

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

export function loadPaystackConfig(): PaystackConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Strip any legacy secret keys from local storage
      delete (parsed as any).testSecretKey;
      delete (parsed as any).liveSecretKey;
      return { ...DEFAULT_PAYSTACK_CONFIG, ...parsed };
    }
  } catch {}
  return DEFAULT_PAYSTACK_CONFIG;
}

export function savePaystackConfig(cfg: PaystackConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent("pondtora:paystack_config_updated", { detail: cfg }));
  } catch {}
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
    const existing = document.getElementById("paystack-inline-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
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

  if (!email) {
    alert("Please provide a valid email address for subscription.");
    return false;
  }

  const isLoaded = await loadPaystackScript();
  if (!isLoaded || !(window as any).PaystackPop) {
    alert("Unable to load Paystack payment modal. Please check your internet connection and try again.");
    return false;
  }

  const publicKey = getActivePaystackPublicKey();
  if (!publicKey) {
    alert("Paystack Public Key is not configured. Please contact the administrator.");
    return false;
  }

  // Paystack expects amount in KOBO (1 NGN = 100 KOBO)
  const amountInKobo = Math.round(amount * 100);
  const reference = `PND_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  try {
    const handler = (window as any).PaystackPop.setup({
      key: publicKey,
      email: email.trim().toLowerCase(),
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
            value: userName || email,
          },
          {
            display_name: "Farm Name",
            variable_name: "farm_name",
            value: farmName || "Primary Farm",
          },
        ],
      },
      callback: (response: any) => {
        onSuccess(response);
      },
      onClose: () => {
        if (onClose) onClose();
      },
    });

    handler.openIframe();
    return true;
  } catch (err) {
    console.error("Error opening Paystack iframe:", err);
    alert("An error occurred while launching Paystack. Please try again.");
    return false;
  }
}
