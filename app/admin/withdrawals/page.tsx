"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Withdrawal {
  id: string;
  fullName?: string;
  userId?: string;
  phone?: string;
  amount?: number;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  referralCode?: string;
  walletBalance?: number;
  requestedAt?: string;
  rejectionReason?: string | null;
  status?: string;
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWithdrawals = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/withdrawals");
      if (!response.ok) throw new Error(`Connection error. Please try again later.`);
      const data = await response.json();
      // sort: pending first, then by requestedAt desc (server already does this but be defensive)
      const list = (data.withdrawals || []).slice();
      list.sort((a: any, b: any) => {
        if (a.status === b.status) {
          const ta = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
          const tb = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
          return tb - ta;
        }
        return a.status === "pending" ? -1 : 1;
      });
      setWithdrawals(list);
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const updateWithdrawal = async (id: string, status: "approved" | "rejected") => {
    const rejectionReason = status === "rejected" ? window.prompt("Reason for rejection (optional):") || "" : "";
    try {
      const response = await fetch("/api/admin/withdraw-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, rejectionReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connection error. Please try again later.");
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status, rejectionReason: status === "rejected" ? (rejectionReason || "") : null } : w))
      );
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    }
  };

  const filteredWithdrawals = withdrawals.filter((w) => w.status === selectedStatus);
  const statusCounts = {
    pending: withdrawals.filter((w) => w.status === "pending").length,
    approved: withdrawals.filter((w) => w.status === "approved").length,
    rejected: withdrawals.filter((w) => w.status === "rejected").length,
  };

  return (
    <main className="page-shell admin-withdrawals-shell">
      <div className="container">
        <div className="section-head">
          <h1 className="section-title">Withdrawals</h1>
          <p className="copy-small">Review pending withdrawal requests.</p>
        </div>

        <div className="withdrawals-header-row">
          <Link href="/admin" className="secondary-button small-action">
            Back to Dashboard
          </Link>
          <div className="status-tabs">
            <button
              className={`status-tab ${selectedStatus === "pending" ? "active" : ""}`}
              onClick={() => setSelectedStatus("pending")}
            >
              Pending ({statusCounts.pending})
            </button>
            <button
              className={`status-tab ${selectedStatus === "approved" ? "active" : ""}`}
              onClick={() => setSelectedStatus("approved")}
            >
              Approved ({statusCounts.approved})
            </button>
            <button
              className={`status-tab ${selectedStatus === "rejected" ? "active" : ""}`}
              onClick={() => setSelectedStatus("rejected")}
            >
              Rejected ({statusCounts.rejected})
            </button>
          </div>
        </div>

        {loading && <p className="copy-small">Loading withdrawals...</p>}
        {error && <div className="status-badge error">{error}</div>}

        {!loading && !error && withdrawals.length === 0 && <p className="copy-small">No withdrawal requests found.</p>}

        {!loading && !error && withdrawals.length > 0 && (
          <div className="dashboard-grid user-list-grid">
            {filteredWithdrawals.map((request) => (
              <article key={request.id} className="user-card">
                <div className="pending-card-top">
                  <span className="pending-avatar">💸</span>
                  <div>
                    <p className="pending-name">{request.fullName || "Unknown user"}</p>
                    <p className="pending-meta">{request.phone || "No phone"}</p>
                  </div>
                </div>
                <p className="pending-detail">User ID: {request.userId || "—"}</p>
                <p className="pending-detail">Referral: {request.referralCode || "—"}</p>
                <p className="pending-detail">Wallet: {(request.walletBalance ?? 0).toLocaleString()} ETB</p>
                <p className="pending-detail">Requested: {(request.amount ?? 0).toLocaleString()} ETB</p>
                <p className="pending-detail">CBE Account: {request.accountNumber || "—"}</p>
                <p className="pending-detail">Account holder: {request.accountHolderName || "—"}</p>
                <p className="pending-detail">Date: {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "—"}</p>
                <p className="pending-detail">Status: {request.status || "pending"}</p>
                {request.rejectionReason && <p className="pending-detail">Reason: {request.rejectionReason}</p>}
                {request.status === "pending" && (
                  <div className="pending-actions">
                    <button className="primary-button small" onClick={() => updateWithdrawal(request.id, "approved")}>
                      Approve
                    </button>
                    <button className="secondary-button small" onClick={() => updateWithdrawal(request.id, "rejected")}>
                      Reject
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
