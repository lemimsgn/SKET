"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface User {
  id: string;
  fullName?: string;
  phone?: string;
  referralCode?: string;
  status?: string;
  walletBalance?: number;
  successfulReferrals?: number;
}

export default function AdminStaticsPage() {
  const [view, setView] = useState<"none" | "list" | "message" | "wallet">("none");
  const [users, setUsers] = useState<User[]>([]);
  const [printUsers, setPrintUsers] = useState<User[]>([]);
  const [inviteCount, setInviteCount] = useState("");
  const [inviteMode, setInviteMode] = useState<"none" | "message" | "wallet">("none");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteAmount, setInviteAmount] = useState("");
  const [inviteReason, setInviteReason] = useState("");
  const [inviteWalletAction, setInviteWalletAction] = useState<"add" | "deduct" | "">("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [walletAction, setWalletAction] = useState<"add" | "deduct" | "">("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [listMode, setListMode] = useState<"all" | "invite">("all");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error(`Connection error. Please try again later.`);
      }
      const data = await res.json();
      setUsers(data.users || []);
      setStatus(`Loaded ${data.users?.length ?? 0} users.`);
      return data.users || [];
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const showUserList = async () => {
    setView("list");
    setListMode("all");
    setStatus("");
    setError("");
    setSuccess("");
    const allUsers = await loadUsers();
    setPrintUsers(allUsers);
  };

  const printAllUsers = async () => {
    setStatus("");
    setError("");
    setSuccess("");
    const allUsers = await loadUsers();
    setPrintUsers(allUsers);
    setView("list");
    setListMode("all");
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const sendBulkMessage = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/user-message-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to send messages (${res.status})`);
      }
      const data = await res.json();
      setSuccess(data.message || "Notifications sent to all users.");
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getParsedInviteCount = () => {
    const parsed = Number(inviteCount);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const getFilteredUsers = (sourceUsers: User[]) => {
    const parsed = getParsedInviteCount();
    if (parsed === null) {
      return [];
    }
    return sourceUsers.filter((user) => Number(user.successfulReferrals ?? 0) === parsed);
  };

  const showInviteList = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const parsed = getParsedInviteCount();
      if (parsed === null) {
        setError("Enter a valid invite count.");
        return;
      }

      const allUsers = await loadUsers();
      const matchingUsers = getFilteredUsers(allUsers);
      setPrintUsers(matchingUsers);
      setView("list");
      setListMode("invite");
      setStatus(`Loaded ${matchingUsers.length} users with ${parsed} invites.`);
      setSuccess(matchingUsers.length ? `Showing ${matchingUsers.length} user(s) with ${parsed} invites.` : "No users matched that invite count.");
    } catch (err: any) {
      setError(err.message || "Unable to load matching users.");
    } finally {
      setLoading(false);
    }
  };

  const printInviteList = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const parsed = getParsedInviteCount();
      if (parsed === null) {
        setError("Enter a valid invite count.");
        return;
      }

      const allUsers = await loadUsers();
      const matchingUsers = getFilteredUsers(allUsers);
      setPrintUsers(matchingUsers);
      setView("list");
      setListMode("invite");
      setStatus(`Loaded ${matchingUsers.length} users with ${parsed} invites.`);
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (err: any) {
      setError(err.message || "Unable to load matching users.");
    } finally {
      setLoading(false);
    }
  };

  const sendInviteMessage = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const parsed = getParsedInviteCount();
      if (parsed === null) {
        setError("Enter a valid invite count.");
        return;
      }
      if (!inviteMessage.trim()) {
        setError("Enter a message.");
        return;
      }

      const res = await fetch("/api/admin/user-message-by-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCount: parsed, message: inviteMessage.trim() }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to send message (${res.status})`);
      }
      const data = await res.json();
      setSuccess(data.message || `Notification sent to users with ${parsed} invites.`);
      setInviteMessage("");
      setInviteMode("none");
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const submitInviteWallet = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const parsed = getParsedInviteCount();
      if (parsed === null) {
        setError("Enter a valid invite count.");
        return;
      }
      if (!inviteWalletAction) {
        setError("Select add or deduct first.");
        return;
      }
      const numeric = Number(inviteAmount);
      if (!inviteAmount || Number.isNaN(numeric) || numeric <= 0) {
        setError("Enter a valid amount.");
        return;
      }
      if (!inviteReason.trim()) {
        setError("Reason is required.");
        return;
      }

      const res = await fetch("/api/admin/user-wallet-by-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCount: parsed, type: inviteWalletAction, amount: numeric, reason: inviteReason.trim() }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to update wallets (${res.status})`);
      }
      const data = await res.json();
      setSuccess(data.message || `Wallets updated for users with ${parsed} invites.`);
      setInviteAmount("");
      setInviteReason("");
      setInviteWalletAction("");
      setInviteMode("none");
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const submitWalletAll = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (!walletAction) {
        setError("Select add or deduct first.");
        return;
      }
      const numeric = Number(amount);
      if (!amount || Number.isNaN(numeric) || numeric <= 0) {
        setError("Enter a valid amount.");
        return;
      }
      if (!reason.trim()) {
        setError("Reason is required.");
        return;
      }

      const res = await fetch("/api/admin/user-wallet-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: walletAction, amount: numeric, reason: reason.trim() }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to update wallets (${res.status})`);
      }
      const data = await res.json();
      setSuccess(data.message || `Wallets updated for all users.`);
      setAmount("");
      setReason("");
      setWalletAction("");
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const filteredInviteUsers = getFilteredUsers(users);

  return (
    <main className="page-shell admin-users-shell profile-shell">
      <div className="container">
        <div className="section-head profile-top">
          <div>
            <p className="eyebrow">Admin statics</p>
            <h1 className="section-title">Statics</h1>
            <p className="copy-small">View admin statistics and charts here.</p>
          </div>
        </div>

        <section className="dashboard-grid statics-grid">
          <article className="summary-card statics-card statics-card-users">
            <div className="statics-button-row">
              <button className={view === "list" && listMode === "all" ? "primary-button" : "secondary-button"} onClick={showUserList}>List</button>
              <button className="secondary-button" onClick={printAllUsers}>Print</button>
              <button className={view === "message" ? "primary-button" : "secondary-button"} onClick={() => setView("message")}>Message</button>
              <button className={view === "wallet" ? "primary-button" : "secondary-button"} onClick={() => setView("wallet")}>Wallet</button>
            </div>
            <div>
              <div className="statics-card-badge">All user data</div>
              <h2 className="statics-card-title">All user data</h2>
              <p className="copy-small">Browse total user counts, registration activity, wallet summaries and referral performance.</p>
            </div>
            <div className="statics-card-icon">👥</div>
          </article>

          <article className="summary-card statics-card statics-card-search">
            <div>
              <div className="statics-card-badge">Search by invite</div>
              <h2 className="statics-card-title">Search by invite</h2>
              <p className="copy-small">Enter the number of successful invites and manage only users with that count.</p>
            </div>
            <div className="statics-card-controls">
              <div className="statics-card-row">
                <label className="label">Invite count</label>
                <input
                  type="number"
                  className="input-field"
                  value={inviteCount}
                  onChange={(event) => setInviteCount(event.target.value)}
                  placeholder="Number of invites"
                  min={0}
                />
              </div>
              <div className="statics-card-row statics-button-row">
                <button className={view === "list" && listMode === "invite" ? "primary-button" : "secondary-button"} onClick={showInviteList} disabled={!inviteCount.trim()}>
                  List matching users
                </button>
                <button className="secondary-button" onClick={printInviteList} disabled={!inviteCount.trim()}>
                  Print matching users
                </button>
                <button className={inviteMode === "message" ? "primary-button" : "secondary-button"} onClick={() => setInviteMode("message")}> 
                  Message matching users
                </button>
                <button className={inviteMode === "wallet" ? "primary-button" : "secondary-button"} onClick={() => setInviteMode("wallet")}> 
                  Wallet matching users
                </button>
              </div>

              {inviteMode === "message" && (
                <div className="bulk-message-panel">
                  <label className="label">Message</label>
                  <textarea
                    className="input-field"
                    rows={4}
                    value={inviteMessage}
                    onChange={(event) => setInviteMessage(event.target.value)}
                    placeholder="Notification for filtered users"
                  />
                  <button className="primary-button full" onClick={sendInviteMessage} disabled={loading || !inviteMessage.trim() || !inviteCount.trim()}>
                    {loading ? "Sending…" : "Send message to filtered users"}
                  </button>
                </div>
              )}

              {inviteMode === "wallet" && (
                <div className="bulk-wallet-panel">
                  <div className="action-menu-row">
                    <button className={inviteWalletAction === "add" ? "primary-button" : "secondary-button"} onClick={() => setInviteWalletAction("add")}>Add</button>
                    <button className={inviteWalletAction === "deduct" ? "primary-button" : "secondary-button"} onClick={() => setInviteWalletAction("deduct")}>Deduct</button>
                  </div>
                  <label className="label">Amount</label>
                  <input
                    type="number"
                    className="input-field"
                    value={inviteAmount}
                    onChange={(event) => setInviteAmount(event.target.value)}
                    placeholder="Enter amount"
                    min={0}
                  />
                  <label className="label">Reason</label>
                  <textarea
                    className="input-field"
                    rows={4}
                    value={inviteReason}
                    onChange={(event) => setInviteReason(event.target.value)}
                    placeholder="Reason for the wallet update"
                  />
                  <button className="primary-button full" onClick={submitInviteWallet} disabled={loading || !inviteWalletAction || !inviteAmount || !inviteReason.trim() || !inviteCount.trim()}>
                    {loading ? "Updating…" : inviteWalletAction === "add" ? "Credit filtered wallets" : "Deduct filtered wallets"}
                  </button>
                </div>
              )}
            </div>
            <div className="statics-card-icon">🔎</div>
          </article>
        </section>

        {view === "list" && (
          <section className="profile-card profile-main-card">
            <div className="profile-card-header">
              <div>
                <p className="section-title">
                  {listMode === "invite"
                    ? `Users with ${inviteCount} invite${inviteCount === "1" ? "" : "s"}`
                    : `All users (${printUsers.length})`}
                </p>
                <p className="copy-small">
                  {listMode === "invite"
                    ? `Showing ${printUsers.length} user${printUsers.length === 1 ? "" : "s"} with ${inviteCount} successful invite${inviteCount === "1" ? "" : "s"}.`
                    : `Showing every user record from Firestore.`}
                </p>
              </div>
            </div>
            <div className="user-table-wrap">
              {printUsers.length > 0 ? (
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Roll no.</th>
                      <th>Full name</th>
                      <th>Phone number</th>
                      <th>Referral code</th>
                      <th>Status</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printUsers.map((user, index) => (
                      <tr key={user.id}>
                        <td>{index + 1}</td>
                        <td>{user.fullName || "—"}</td>
                        <td>{user.phone || "—"}</td>
                        <td>{user.referralCode || "—"}</td>
                        <td>{user.status || "—"}</td>
                        <td>{user.walletBalance?.toLocaleString() ?? "0"} ETB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="copy-small">No users loaded yet. Click "List" or "List matching users" to show the list below.</p>
              )}
            </div>
          </section>
        )}

        <section className="profile-card profile-main-card print-only">
          <div className="profile-card-header">
            <div>
              <p className="section-title">
                {listMode === "invite"
                  ? `Users with ${inviteCount} invite${inviteCount === "1" ? "" : "s"} (${printUsers.length})`
                  : `All users (${printUsers.length})`}
              </p>
              <p className="copy-small">
                {listMode === "invite"
                  ? `Showing only users with ${inviteCount} successful invite${inviteCount === "1" ? "" : "s"}.`
                  : "Showing every user record from Firestore."}
              </p>
            </div>
          </div>
          <div className="user-table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Roll no.</th>
                  <th>Full name</th>
                  <th>Phone number</th>
                  <th>Referral code</th>
                  <th>Status</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {printUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>{user.fullName || "—"}</td>
                    <td>{user.phone || "—"}</td>
                    <td>{user.referralCode || "—"}</td>
                    <td>{user.status || "—"}</td>
                    <td>{user.walletBalance?.toLocaleString() ?? "0"} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {view === "message" && (
          <section className="profile-card profile-main-card">
            <div className="profile-card-header">
              <div>
                <p className="section-title">Message all users</p>
                <p className="copy-small">Send a single notification to every user in one place.</p>
              </div>
            </div>
            <div className="bulk-message-panel">
              <label className="label">Message</label>
              <textarea
                className="input-field"
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write the notification text for all users"
              />
              <button className="primary-button full" onClick={sendBulkMessage} disabled={loading || !message.trim()}>
                {loading ? "Sending…" : "Send notification to all users"}
              </button>
            </div>
          </section>
        )}

        {view === "wallet" && (
          <section className="profile-card profile-main-card">
            <div className="profile-card-header">
              <div>
                <p className="section-title">Adjust all wallets</p>
                <p className="copy-small">Credit or deduct funds for all users and notify them with a reason.</p>
              </div>
            </div>
            <div className="bulk-wallet-panel">
              <div className="action-menu-row">
                <button className={walletAction === "add" ? "primary-button" : "secondary-button"} onClick={() => setWalletAction("add")}>Add</button>
                <button className={walletAction === "deduct" ? "primary-button" : "secondary-button"} onClick={() => setWalletAction("deduct")}>Deduct</button>
              </div>
              <label className="label">Amount</label>
              <input
                type="number"
                className="input-field"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount"
                min={0}
              />
              <label className="label">Reason</label>
              <textarea
                className="input-field"
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for the wallet update"
              />
              <button className="primary-button full" onClick={submitWalletAll} disabled={loading || !walletAction || !amount || !reason.trim()}>
                {loading ? "Updating…" : walletAction === "add" ? "Credit all wallets" : "Deduct from all wallets"}
              </button>
            </div>
          </section>
        )}

        {(view === "list" || view === "message" || view === "wallet") && (
          <div className="status-bar-row">
            {error && <div className="status-badge error">{error}</div>}
            {success && <div className="status-badge success">{success}</div>}
            {status && <div className="status-badge">{status}</div>}
          </div>
        )}

        <div className="section-actions">
          <Link href="/admin" className="secondary-button small-action">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
