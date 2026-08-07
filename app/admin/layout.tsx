"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";

export default function AdminLayout({ children }: PropsWithChildren<{}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [sideOpen, setSideOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const isLoginPath = pathname?.startsWith("/admin/login");

  useEffect(() => {
    if (isLoginPath) {
      setAuthChecking(false);
      return;
    }

    async function verifyAdminSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (!response.ok) {
          router.replace("/admin/login");
          setAuthChecking(false);
          return;
        }

        setAuthChecking(false);
      } catch (error) {
        router.replace("/admin/login");
        setAuthChecking(false);
      }
    }

    verifyAdminSession();
  }, [isLoginPath, router]);

  if (authChecking) {
    return (
      <main className="page-shell admin-dashboard-shell">
        <div className="container auth-card">
          <p className="copy-small">Checking admin session...</p>
        </div>
      </main>
    );
  }

  if (isLoginPath) {
    return <>{children}</>;
  }

  return (
    <div className="admin-shell">
      <header className="admin-layout-bar">
        <button className="icon-button" aria-label="Open side panel" onClick={() => setSideOpen(true)}>
          ☰
        </button>
      </header>

      <div className="admin-shell-content">{children}</div>

      <div className={`sidepanel-overlay ${sideOpen ? "open" : ""}`} onClick={() => setSideOpen(false)} />

      <aside className={`sidepanel ${sideOpen ? "open" : ""}`} aria-hidden={!sideOpen}>
        <div className="sidepanel-header">
          <button className="icon-button" onClick={() => setSideOpen(false)} aria-label="Close side panel">
            ✕
          </button>
          <strong>Menu</strong>
        </div>
        <nav className="sidepanel-nav">
          <button className="sidepanel-link" onClick={() => { setSideOpen(false); router.push('/admin'); }}>
            Dashboard
          </button>
          <button className="sidepanel-link" onClick={() => { setSideOpen(false); router.push('/admin/users'); }}>
            User Profile
          </button>
          <button className="sidepanel-link" onClick={() => { setSideOpen(false); router.push('/admin/statics'); }}>
            Statics
          </button>
          <button className="sidepanel-link" onClick={() => { setSideOpen(false); router.push('/admin/settings'); }}>
            Settings
          </button>
        </nav>
      </aside>
    </div>
  );
}
