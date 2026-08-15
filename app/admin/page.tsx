"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSession, getAdminSession, setAdminSession } from "./authClient";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todaysRegistrations, setTodaysRegistrations] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = getAdminSession();
      if (!stored) {
        router.replace("/admin/login");
        return;
      }
      setAdmin(stored);
      loadDashboardData();
    }
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/dashboard");
      if (!response.ok) {
        let message = `Dashboard API returned ${response.status}`;
        const text = await response.text();
        if (text) {
          try {
            const body = JSON.parse(text);
            if (body?.error) {
              message = body.error;
            } else {
              message = text;
            }
          } catch {
            message = text;
          }
        }
        throw new Error(message);
      }
      const data = await response.json();
      setPendingUsers(data.pendingUsers || []);
      setApprovedUsers(data.approvedUsers || []);
      setPendingWithdrawals(data.pendingWithdrawals || []);
      setTodaysRegistrations(data.todaysRegistrations || 0);
    } catch (err: any) {
      console.warn("Failed to load admin dashboard data:", err);
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const postAdminAction = async (path: string, body: Record<string, any>) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Admin action failed");
    }
    return response.json();
  };

  const handleLogout = () => {
    setAdminSession(null);
    router.push("/admin/login");
  };

  const handleApproveUser = async (user: any) => {
    await postAdminAction("/api/admin/user-status", { id: user.id, status: "approved" });
    loadDashboardData();
  };

  const handleRejectUser = async (user: any) => {
    await postAdminAction("/api/admin/user-status", { id: user.id, status: "rejected" });
    loadDashboardData();
  };

  const handleApproveWithdrawal = async (request: any) => {
    await postAdminAction("/api/admin/withdraw-status", { id: request.id, status: "approved" });
    loadDashboardData();
  };

  const handleRejectWithdrawal = async (request: any) => {
    await postAdminAction("/api/admin/withdraw-status", { id: request.id, status: "rejected" });
    loadDashboardData();
  };

  const approvedCount = approvedUsers?.length ?? 0;
  const pendingCount = pendingUsers?.length ?? 0;
  const totalUsers = approvedCount + pendingCount;

  if (!admin) {
    return (
      <main className="page-shell admin-dashboard-shell">
        <div className="container auth-card">
          <p className="copy-small">Loading admin dashboard...</p>
        </div>
      </main>
    );
  }

  const adminDisplayName = admin.email ?? admin.name ?? "Admin";

  const summaryCards = [
    { icon: "👥", label: "Total Users", value: totalUsers.toString(), href: "/admin/users" },
    { icon: "🟢", label: "Active Users", value: approvedCount.toString(), href: "/admin/users?status=approved" },
    { icon: "🟡", label: "Pending Users", value: pendingCount.toString(), href: "/admin/users?status=pending" },
  ];

  const secondCards = [
    { icon: "📤", label: "Pending Withdrawals", value: (pendingWithdrawals?.length ?? 0).toString(), href: "/admin/withdrawals" },
    { icon: "📊", label: "Today's Registrations", value: todaysRegistrations.toString(), href: "/admin/users?status=approved" },
  ];


  return (
    <main className="page-shell admin-dashboard-shell">
      <div className="container">
        <header className="admin-bar">
          <div className="admin-bar-left">
            <div>
              <p className="eyebrow">Admin Dashboard</p>
              <h1 className="admin-title">Welcome, {adminDisplayName}</h1>
            </div>
          </div>
          <div className="admin-bar-right">
            <button className="icon-button">🔔</button>
            <div className="avatar large">{adminDisplayName.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        {error && <div className="status-badge error">{error}</div>}
        {loading ? (
          <p className="copy-small">Loading dashboard data...</p>
        ) : (
          <>
            <section className="dashboard-grid summary-grid">
              {summaryCards.map((card) => (
                <Link href={card.href} key={card.label} className="summary-card summary-card-link">
                  <div className="summary-icon">{card.icon}</div>
                  <div>
                    <p className="summary-label">{card.label}</p>
                    <p className="summary-value">{card.value}</p>
                  </div>
                </Link>
              ))}
            </section>

            <section className="dashboard-grid summary-grid">
              {secondCards.map((card) => (
                <Link href={card.href} key={card.label} className="summary-card summary-card-link">
                  <div className="summary-icon">{card.icon}</div>
                  <div>
                    <p className="summary-label">{card.label}</p>
                    <p className="summary-value">{card.value}</p>
                  </div>
                </Link>
              ))}
            </section>

            <div className="admin-footer-actions">
              <button className="secondary-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        )}
      </div>

    </main>
  );
}
