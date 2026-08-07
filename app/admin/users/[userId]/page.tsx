"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
  walletBalance?: number;
  referralCode?: string;
  referralNumber?: string;
  registrationFee?: number;
}

export default function AdminUserProfilePage(props: any) {
  const { userId } = (props.params as { userId: string }) || {};
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [modalAction, setModalAction] = useState<"delete" | "ban" | null>(null);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/user-profile?id=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Failed to load user profile (${response.status})`);
      }
      const data = await response.json();
      setUser(data.user || null);
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const postAction = async (action: string, body: Record<string, any> = {}) => {
    setActionLoading(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/user-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, action, ...body }),
      });
      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(bodyText || `Action failed: ${action}`);
      }
      const data = await response.json();
      await loadUser();
      return data;
    } catch (err: any) {
      setActionError(err.message || "Action failed.");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    setPasswordMessage("");
    if (!newPassword.trim()) {
      setPasswordMessage("Please enter a new password.");
      return;
    }

    try {
      await postAction("changePassword", { newPassword: newPassword.trim() });
      setPasswordMessage("Password updated successfully.");
      setNewPassword("");
      setPasswordOpen(false);
    } catch (err: any) {
      setPasswordMessage(err.message || "Could not update the password.");
    }
  };

  const handleToggleLock = async () => {
    if (!user) {
      return;
    }
    const action = user.status === "locked" ? "unlock" : "lock";
    await postAction(action);
  };

  const handleDelete = async () => {
    await postAction("delete");
    router.push("/admin/users");
  };

  const handleBan = async () => {
    await postAction("ban");
    router.push("/admin/users");
  };

  const statusLabel = (status?: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "pending":
        return "Pending";
      case "rejected":
        return "Rejected";
      case "locked":
        return "Locked";
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
    }
  };

  return (
    <main className="page-shell admin-users-shell profile-shell">
      <div className="container">
        <div className="section-head profile-top">
          <div>
            <p className="eyebrow">Admin user profile</p>
            <h1 className="section-title">{user?.fullName || user?.phone || "User profile"}</h1>
            <p className="copy-small">Manage this account, update password, and enforce restrictions.</p>
          </div>
          <div className="profile-top-actions">
            <Link href="/admin/users" className="secondary-button small-action">
              Back to users
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="copy-small">Loading user profile…</p>
        ) : error ? (
          <div className="status-badge error">{error}</div>
        ) : !user ? (
          <div className="status-badge error">User not found.</div>
        ) : (
          <div className="profile-grid">
            <section className="profile-card profile-main-card">
              <div className="profile-card-header">
                <div>
                  <p className="section-title">Account information</p>
                  <p className="copy-small">Core Firestore data for this user.</p>
                </div>
                <span className={`status-pill status-${user.status || "unknown"}`}>{statusLabel(user.status)}</span>
              </div>

              <div className="profile-details-grid">
                <div className="profile-detail">
                  <span>Full name</span>
                  <strong>{user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—"}</strong>
                </div>
                <div className="profile-detail">
                  <span>Phone number</span>
                  <strong>{user.phone || user.id}</strong>
                </div>
                <div className="profile-detail">
                  <span>Wallet balance</span>
                  <strong>{(user.walletBalance ?? 0).toLocaleString()} ETB</strong>
                </div>
                <div className="profile-detail">
                  <span>Referral code</span>
                  <strong>{user.referralCode || user.referralNumber || "—"}</strong>
                </div>
                <div className="profile-detail">
                  <span>Registration fee</span>
                  <strong>{user.registrationFee != null ? `${user.registrationFee} ETB` : "—"}</strong>
                </div>
              </div>
            </section>

            <section className="profile-card profile-action-card">
              <div className="profile-card-header">
                <div>
                  <p className="section-title">Actions</p>
                  <p className="copy-small">Apply changes and enforcement directly from the admin console.</p>
                </div>
              </div>

              <div className="action-block">
                <button className="primary-button full" onClick={() => setPasswordOpen((prev) => !prev)}>
                  Change password
                </button>
                {passwordOpen && (
                  <div className="password-panel">
                    <label className="label">New password</label>
                    <input
                      type="password"
                      className="input-field"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Enter new password"
                    />
                    <button className="primary-button full" onClick={handlePasswordSave} disabled={actionLoading}>
                      {actionLoading ? "Updating…" : "Save new password"}
                    </button>
                    {passwordMessage && <p className="copy-small">{passwordMessage}</p>}
                  </div>
                )}
              </div>

              <div className="action-block">
                <button className="warning-button full" onClick={handleToggleLock} disabled={actionLoading}>
                  {user.status === "locked" ? "Unlock account" : "Lock account"}
                </button>
              </div>

              <div className="action-group">
                <button className="secondary-button full" onClick={() => setModalAction("delete")}>Delete user</button>
                <button className="danger-button full" onClick={() => setModalAction("ban")}>Ban user</button>
              </div>

              {actionError && <div className="status-badge error">{actionError}</div>}
            </section>
          </div>
        )}

        {!loading && user && (
          <section className="profile-card profile-shortcuts-card">
            <div className="section-title">Quick actions</div>
            <div className="shortcut-buttons-grid">
              <Link href={`/admin/users/${userId}/transactions`} className="block-button secondary-button">
                Transactions
              </Link>
              <Link href={`/admin/users/${userId}/message`} className="block-button secondary-button">
                Message
              </Link>
              <Link href={`/admin/users/${userId}/wallet`} className="block-button secondary-button">
                Wallet
              </Link>
            </div>
          </section>
        )}
      </div>

      {modalAction && (
        <div className="modal-overlay" onClick={() => setModalAction(null)}>
          <div className="action-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <p className="eyebrow">Warning</p>
              <h2>{modalAction === "delete" ? "Delete user permanently" : "Ban user and remove data"}</h2>
            </header>
            <p className="copy-small modal-copy">
              {modalAction === "delete"
                ? "This will permanently remove the user and related Firestore records. This action cannot be undone."
                : "This will ban the phone number, remove the user record, and keep a banned list entry for future enforcement."}
            </p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setModalAction(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className={modalAction === "ban" ? "danger-button" : "warning-button"}
                onClick={modalAction === "delete" ? handleDelete : handleBan}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing…" : modalAction === "delete" ? "Delete now" : "Ban now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
