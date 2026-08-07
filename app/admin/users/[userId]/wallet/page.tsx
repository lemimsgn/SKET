"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminUserWalletPage(props: any) {
  const { userId } = (props.params as { userId: string }) || {};
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [view, setView] = useState<"add" | "deduct" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/user-profile?id=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(`Unable to load user profile (${res.status})`);
      const data = await res.json();
      setPhone(data.user.phone || data.user.id);
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const submitWallet = async () => {
    setSuccess("");
    setError("");
    const numeric = Number(amount);
    if (!view) {
      setError("Choose add or deduct first.");
      return;
    }
    if (!amount || Number.isNaN(numeric) || numeric <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason.");
      return;
    }

    try {
      const res = await fetch("/api/admin/user-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: view, amount: numeric, reason: reason.trim() }),
      });
      if (!res.ok) throw new Error(`Connection error. Please try again later.`);
      const data = await res.json();
      setSuccess(data.message || "Wallet updated.");
      setAmount("");
      setReason("");
      setView(null);
    } catch (err: any) {
      setError(err.message || "Failed to update wallet.");
    }
  };

  return (
    <main className="page-shell admin-users-shell profile-shell">
      <div className="container">
        <div className="section-head profile-top">
          <div>
            <p className="eyebrow">Wallet adjustment</p>
            <h1 className="section-title">Add or deduct funds</h1>
            <p className="copy-small">Adjust the user's wallet balance with a reason and send a notification.</p>
          </div>
          <div className="profile-top-actions">
            <Link href={`/admin/users/${userId}`} className="secondary-button small-action">
              Back to profile
            </Link>
          </div>
        </div>

        <section className="profile-grid">
          <article className="profile-card action-menu-card">
            <div className="action-menu-column">
              <button className={view === "add" ? "primary-button full" : "secondary-button full"} onClick={() => setView("add")}>Add</button>
              <button className={view === "deduct" ? "primary-button full" : "secondary-button full"} onClick={() => setView("deduct")}>Deduct</button>
            </div>
          </article>

          <article className="profile-card wallet-panel-card">
            <div className="profile-card-header">
              <div>
                <p className="section-title">{view === "add" ? "Add funds" : view === "deduct" ? "Deduct funds" : "Choose an action"}</p>
                <p className="copy-small">Enter the amount and reason to notify the user.</p>
              </div>
            </div>

            {loading ? (
              <p className="copy-small">Loading user…</p>
            ) : error ? (
              <div className="status-badge error">{error}</div>
            ) : (
              <div className="wallet-form">
                <label className="label">User</label>
                <input type="text" className="input-field" value={phone} disabled />
                <label className="label">Amount</label>
                <input
                  type="number"
                  className="input-field"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                />
                <label className="label">Reason</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason for adjustment"
                />
                <button className="primary-button full" onClick={submitWallet}>
                  {view === "add" ? "Add funds" : view === "deduct" ? "Deduct funds" : "Select action"}
                </button>
                {success && <div className="status-badge success">{success}</div>}
                {error && <div className="status-badge error">{error}</div>}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
