import React, { lazy, Suspense, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import App from "./app/App";

const AdminApp = lazy(() => import("./admin/AdminApp"));

const ADMIN_STORAGE_KEY = "pondtora_admin_mode";

function detectAdmin(): boolean {
  return (
    window.location.pathname.startsWith("/admin") ||
    new URLSearchParams(window.location.search).has("admin") ||
    window.location.hash === "#admin" ||
    window.location.hash.startsWith("#/admin") ||
    localStorage.getItem(ADMIN_STORAGE_KEY) === "1"
  );
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
    localStorage.setItem(ADMIN_STORAGE_KEY, "1");
    setIsAdmin(true);
  }

  function exitAdmin() {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
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
    <Root />
  </React.StrictMode>
);
