import React, { lazy, Suspense, useState, Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import App from "./app/App";

const AdminApp = lazy(() => import("./admin/AdminApp"));

const ADMIN_STORAGE_KEY = "pondtora_admin_mode";

function detectAdmin(): boolean {
  try {
    return (
      window.location.pathname.startsWith("/admin") ||
      new URLSearchParams(window.location.search).has("admin") ||
      window.location.hash === "#admin" ||
      window.location.hash.startsWith("#/admin") ||
      localStorage.getItem(ADMIN_STORAGE_KEY) === "1"
    );
  } catch {
    return false;
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Pondtora ErrorBoundary caught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("pondtora_")) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
    window.location.href = window.location.origin;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          fontFamily: "'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "24px"
        }}>
          <div style={{
            maxWidth: "480px",
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            padding: "32px",
            textAlign: "center"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              fontSize: "26px"
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px", lineHeight: "1.5" }}>
              An unexpected issue occurred while rendering the page. You can refresh the page or clear local cached data to restore normal operation.
            </p>
            {this.state.error && (
              <div style={{
                backgroundColor: "#f1f5f9",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "20px",
                textAlign: "left",
                fontSize: "12px",
                color: "#475569",
                fontFamily: "monospace",
                overflowX: "auto",
                maxHeight: "100px"
              }}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleResetAndReload}
                style={{
                  backgroundColor: "#f8fafc",
                  color: "#475569",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer"
                }}
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Root() {
  const [isAdmin, setIsAdmin] = useState(detectAdmin);

  React.useEffect(() => {
    const handleHashChange = () => {
      setIsAdmin(detectAdmin());
    };
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  function enterAdmin() {
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, "1");
    } catch {}
    setIsAdmin(true);
  }

  function exitAdmin() {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {}
    if (window.location.hash === "#admin" || window.location.hash.startsWith("#/admin")) {
      window.location.hash = "";
    }
    setIsAdmin(false);
  }

  if (isAdmin) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <AdminApp onExit={exitAdmin} />
      </Suspense>
    );
  }

  return <App onAdmin={enterAdmin} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
);
