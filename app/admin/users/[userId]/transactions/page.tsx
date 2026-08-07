"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface TransactionItem {
  id: string;
  type: string;
  category: string;
  label: string;
  subtitle: string;
  amount: number;
  direction: string;
  createdAt: string;
}

export default function AdminUserTransactionsPage(props: any) {
  const { userId } = (props.params as { userId: string }) || {};
  const [phone, setPhone] = useState<string>("");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [activeView, setActiveView] = useState<"send" | "receive" | "withdraw" | "invite">("send");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadUserData();
  }, [userId]);

  useEffect(() => {
    if (phone) {
      loadTransactions();
    }
  }, [phone]);

  const loadUserData = async () => {
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

  const loadTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/transactions?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) throw new Error(`Unable to load transactions (${res.status})`);
      const data = await res.json();
      setTransactions(
        (data.transactions || []).map((tx: any) => ({
          ...tx,
          createdAt: new Date(tx.createdAt).toLocaleString(),
        }))
      );
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (activeView === "send") {
      return transactions.filter((tx) => tx.category === "send");
    }
    if (activeView === "receive") {
      return transactions.filter((tx) => tx.category === "receive");
    }
    if (activeView === "withdraw") {
      return transactions.filter((tx) => tx.category === "withdraw");
    }
    if (activeView === "invite") {
      return transactions.filter((tx) => tx.category === "invite");
    }
    return transactions;
  }, [activeView, transactions]);

  const viewTitle = useMemo(() => {
    switch (activeView) {
      case "send":
        return "Sent transactions";
      case "receive":
        return "Received transactions";
      case "withdraw":
        return "Withdrawals";
      case "invite":
        return "Referral invites";
      default:
        return "Transactions";
    }
  }, [activeView]);

  return (
    <main className="page-shell admin-users-shell profile-shell">
      <div className="container">
        <div className="section-head profile-top">
          <div>
            <p className="eyebrow">User transactions</p>
            <h1 className="section-title">Transaction history</h1>
            <p className="copy-small">Browse all send, receive, withdraw, and referral invite records for this user.</p>
          </div>
          <div className="profile-top-actions">
            <Link href={`/admin/users/${userId}`} className="secondary-button small-action">
              Back to profile
            </Link>
          </div>
        </div>

        <div className="profile-grid">
          <section className="profile-card action-menu-card">
            <div className="action-menu-column">
              <button className={activeView === "send" ? "primary-button full" : "secondary-button full"} onClick={() => setActiveView("send")}>Send</button>
              <button className={activeView === "receive" ? "primary-button full" : "secondary-button full"} onClick={() => setActiveView("receive")}>Receive</button>
              <button className={activeView === "withdraw" ? "primary-button full" : "secondary-button full"} onClick={() => setActiveView("withdraw")}>Withdraw</button>
              <button className={activeView === "invite" ? "primary-button full" : "secondary-button full"} onClick={() => setActiveView("invite")}>Invite</button>
            </div>
          </section>

          <section className="profile-card transaction-list-card">
            <div className="profile-card-header">
              <div>
                <p className="section-title">{viewTitle}</p>
                <p className="copy-small">Showing records for {phone || "user"}.</p>
              </div>
            </div>

            {loading ? (
              <p className="copy-small">Loading data…</p>
            ) : error ? (
              <div className="status-badge error">{error}</div>
            ) : filteredTransactions.length === 0 ? (
              <p className="copy-small">No transactions found for this view.</p>
            ) : (
              <div className="dashboard-grid transaction-card-grid">
                {filteredTransactions.map((tx) => (
                  <article key={tx.id} className="user-card">
                    <p className="pending-name">{tx.label}</p>
                    <p className="pending-detail">{tx.subtitle}</p>
                    <div className="user-list-row">
                      <span>Amount</span>
                      <strong>{tx.amount.toLocaleString()} ETB</strong>
                    </div>
                    <div className="user-list-row">
                      <span>Date</span>
                      <strong>{tx.createdAt}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
