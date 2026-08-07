"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TransactionItem = {
  id: string;
  type: string;
  label: string;
  subtitle: string;
  amount: number;
  status: string;
  direction: "sent" | "received" | "withdrawal" | "neutral";
  createdAt: string;
  note: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/transactions`);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Connection error. Please try again later.");
        }
        setTransactions(data.transactions || []);
      } catch (err: any) {
        setError(err.message || "Connection error. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  return (
    <main className="page-shell dashboard-shell">
      <div className="container dashboard-ui">
        <section className="transactions-page">
          <div className="section-header">
            <div>
              <p className="eyebrow-small">Transactions</p>
              <h1 className="hero-name">Activity ledger</h1>
              <p className="copy-small">All send and withdrawal activity for your account, ordered newest first.</p>
            </div>
            <Link href="/dashboard" className="secondary-button small">
              Back to dashboard
            </Link>
          </div>

          {loading ? (
            <p className="copy-small">Loading transactions...</p>
          ) : error ? (
            <p className="copy-small" style={{ color: "#fca5a5" }}>{error}</p>
          ) : transactions.length === 0 ? (
            <p className="copy-small">No transactions found yet.</p>
          ) : (
            <div className="transaction-list">
              {transactions.slice(0, 20).map((tx) => (
                <article key={tx.id} className="invite-item transaction-item">
                  <div className={`invite-avatar ${tx.direction}`}>
                    {tx.direction === "received" ? "+" : tx.direction === "sent" ? "-" : tx.direction === "withdrawal" ? "W" : "T"}
                  </div>
                  <div className="invite-info">
                    <p className="invite-name">{tx.label}</p>
                    <p className="invite-phone">{tx.subtitle || formatDate(tx.createdAt)}</p>
                    <p className="transaction-meta">{formatDate(tx.createdAt)} · {tx.status}</p>
                  </div>
                  <div className={`transaction-amount ${tx.direction}`}>
                    {tx.direction === "received" ? "+" : tx.direction === "sent" ? "-" : ""}{Math.abs(tx.amount).toLocaleString()} ETB
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
