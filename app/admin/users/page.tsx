"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface User {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
  walletBalance?: number;
  registrationFee?: number;
  referralCode?: string;
  referralNumber?: string;
  email?: string;
  createdAt?: string;
}

export default function AdminUsersPage() {
  const [status, setStatus] = useState("");
  const isStatusMode = Boolean(status);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentStatus = new URL(window.location.href).searchParams.get("status") || "";
      setStatus(currentStatus);
    }
  }, []);

  const [overview, setOverview] = useState({ totalUsers: 0, activeUsers: 0, pendingUsers: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searched, setSearched] = useState(false);

  const formatName = (user: User) => user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown user";

  const loadOverview = async () => {
    setLoadingOverview(true);
    setError("");
    try {
      const response = await fetch("/api/admin/dashboard");
      if (!response.ok) {
        throw new Error(`Connection error. Please try again later.`);
      }
      const data = await response.json();
      const totalUsers = (data.pendingUsers?.length ?? 0) + (data.approvedUsers?.length ?? 0);
      const activeUsers = data.approvedUsers?.length ?? 0;
      const pendingUsers = data.pendingUsers?.length ?? 0;
      setOverview({ totalUsers, activeUsers, pendingUsers });
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadStatusUsers = async () => {
    setLoadingUsers(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users?status=${encodeURIComponent(status)}`);
      if (!response.ok) {
        throw new Error(`Connection error. Please try again later.`);
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isStatusMode) {
      loadStatusUsers();
    } else {
      loadOverview();
    }
  }, [isStatusMode, status]);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearched(true);
    setSearchResults([]);
    if (!searchQuery.trim()) {
      return;
    }

    setLoadingSearch(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const postAdminAction = async (path: string, body: Record<string, any>) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Admin action failed");
    }

    return response.json();
  };

  const handleApproveUser = async (user: User) => {
    await postAdminAction("/api/admin/user-status", { id: user.id, status: "approved" });
    await loadStatusUsers();
  };

  const handleRejectUser = async (user: User) => {
    await postAdminAction("/api/admin/user-status", { id: user.id, status: "rejected" });
    await loadStatusUsers();
  };

  return (
    <main className="page-shell admin-users-shell">
      <div className="container">
        <div className="section-head">
          <h1 className="section-title">
            {isStatusMode ? (status === "pending" ? "Pending Users" : `${status.charAt(0).toUpperCase() + status.slice(1)} Users`) : "User Overview"}
          </h1>
          <p className="copy-small">
            {isStatusMode
              ? status === "pending"
                ? "Review new users waiting for approval."
                : `Showing ${status} users.`
              : "See totals first, then search by name, phone, referral code, or user ID."}
          </p>
        </div>

        {isStatusMode ? (
          <>
            {loadingUsers ? (
              <p className="copy-small">Loading users...</p>
            ) : error ? (
              <div className="status-badge error">{error}</div>
            ) : users.length === 0 ? (
              <p className="copy-small">There is no pending user.</p>
            ) : (
              <div className="dashboard-grid user-list-grid">
                {users.map((user) => (
                  <article key={user.id} className="user-card">
                    <div className="pending-card-top">
                      <span className="pending-avatar">👤</span>
                      <div>
                        <p className="pending-name">{formatName(user)}</p>
                        <p className="pending-meta">{user.phone || user.id}</p>
                      </div>
                    </div>
                    <p className="pending-detail">Referral: {user.referralCode || "—"}</p>
                    {user.referralNumber && <p className="pending-detail">Referral number: {user.referralNumber}</p>}
                    <p className="pending-detail">Status: {user.status || "pending"}</p>
                    <p className="pending-detail">Wallet: {(user.walletBalance ?? 0).toLocaleString()} ETB</p>
                    <div className="pending-actions">
                      <Link href={`/admin/users/${user.id}`} className="secondary-button small">
                        Open profile
                      </Link>
                      <button className="primary-button small" onClick={() => handleApproveUser(user)}>
                        Approve
                      </button>
                      <button className="secondary-button small" onClick={() => handleRejectUser(user)}>
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {loadingOverview ? (
              <p className="copy-small">Loading overview...</p>
            ) : error ? (
              <div className="status-badge error">{error}</div>
            ) : (
              <section className="dashboard-grid overview-grid">
                <article className="summary-card">
                  <p className="summary-label">Total Users</p>
                  <p className="summary-value">{overview.totalUsers}</p>
                </article>
                <article className="summary-card">
                  <p className="summary-label">Active Users</p>
                  <p className="summary-value">{overview.activeUsers}</p>
                </article>
                <article className="summary-card">
                  <p className="summary-label">Pending Users</p>
                  <p className="summary-value">{overview.pendingUsers}</p>
                </article>
              </section>
            )}

            <section className="section-block admin-search-section">
              <form onSubmit={handleSearch} className="search-card search-form">
                <input
                  className="input-field"
                  placeholder="Search by name, phone, referral code, or user ID"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <button type="submit" className="primary-button">
                  Search
                </button>
              </form>
            </section>

            {searched && (
              <section className="section-block">
                <div className="section-head">
                  <h2 className="section-title">Search Results</h2>
                  <p className="copy-small">
                    {loadingSearch ? "Searching users..." : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`}
                  </p>
                </div>

                {loadingSearch ? (
                  <p className="copy-small">Searching...</p>
                ) : error ? (
                  <div className="status-badge error">{error}</div>
                ) : searchResults.length === 0 ? (
                  <p className="copy-small">No users found. Try another name, phone number, referral code, or user ID.</p>
                ) : (
                  <div className="dashboard-grid user-list-grid">
                    {searchResults.map((user) => (
                      <article key={user.id} className="user-card">
                        <div className="pending-card-top">
                          <span className="pending-avatar">👤</span>
                          <div>
                            <p className="pending-name">{formatName(user)}</p>
                            <p className="pending-meta">{user.phone || user.id}</p>
                          </div>
                        </div>
                        <div className="user-list-row">
                          <span>Wallet</span>
                          <strong>{(user.walletBalance ?? 0).toLocaleString()} ETB</strong>
                        </div>
                        <div className="user-list-row">
                          <span>Status</span>
                          <strong>{user.status || "—"}</strong>
                        </div>
                        {user.referralCode && (
                          <div className="user-list-row">
                            <span>Referral</span>
                            <strong>{user.referralCode}</strong>
                          </div>
                        )}
                        {user.email && (
                          <div className="user-list-row">
                            <span>Email</span>
                            <strong>{user.email}</strong>
                          </div>
                        )}
                        {user.registrationFee != null && (
                          <div className="user-list-row">
                            <span>Registration Fee</span>
                            <strong>{user.registrationFee} ETB</strong>
                          </div>
                        )}
                        <div className="pending-actions">
                          <Link href={`/admin/users/${user.id}`} className="secondary-button small">
                            Open profile
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <div className="section-actions">
          <Link href="/admin" className="secondary-button small-action">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
