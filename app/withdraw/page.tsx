"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserRecord = {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  status?: string;
  walletBalance?: number;
  pendingWithdrawalId?: string | null;
  referralNumber?: string;
  referralCode?: string;
};

export default function WithdrawPage() {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [amount, setAmount] = useState(0);
  const [accountNumber, setAccountNumber] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`/api/user`);
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await response.json();
        if (!response.ok || !data.user) {
          window.location.href = "/login";
          return;
        }
        setUser(data.user as UserRecord);
      } catch (err) {
        console.error(err);
        setError("Unable to load your account.");
      }
    })();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!user) return;

    if (user.status !== "approved") {
      setError("Your account must be approved before submitting a withdrawal request.");
      return;
    }

    if (amount <= 0) {
      setError("Enter a valid withdrawal amount.");
      return;
    }

    if (amount > (user.walletBalance ?? 0)) {
      setError("You cannot withdraw more than your current wallet balance.");
      return;
    }

    if (!accountNumber.trim()) {
      setError("Please provide your CBE account number.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id || user.phone,
          amount,
          bankName: "CBE",
          accountNumber: accountNumber.trim(),
          note: note.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connection error. Please try again later.");
      setSuccess("Withdrawal request submitted. Admin will approve it shortly.");
      setUser({ ...user, pendingWithdrawalId: data.id });
      setAmount(0);
      setAccountNumber("");
      setNote("");
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main className="page-shell">
        <div className="container auth-card">
          <p className="copy-small">Loading withdrawal page…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="container auth-card">
        <div className="section-header">
          <div>
            <p className="eyebrow-small">Withdraw</p>
            <h1 className="hero-name">Withdrawal request</h1>
            <p className="copy-small">Submit a withdrawal request for admin approval.</p>
          </div>
          <Link href="/dashboard" className="secondary-button small">
            Back to dashboard
          </Link>
        </div>

        {user.status !== "approved" ? (
          <div className="status-badge error">
            Your registration is still pending approval. You cannot submit a withdrawal until your account is approved.
          </div>
        ) : user.pendingWithdrawalId ? (
          <div className="status-badge error">
            You already have a pending withdrawal request. Wait until it is approved or rejected before submitting another.
          </div>
        ) : (
          <div className="status-badge success">Your account is approved. You may submit a withdrawal request.</div>
        )}

        <div className="wallet-card">
          <div className="wallet-top">
            <span>Wallet Balance</span>
            <span className="wallet-value">£{Number(user.walletBalance ?? 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              className="input-field"
              type="number"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              placeholder="Enter amount"
              min={0}
              step={50}
              disabled={user.status !== "approved" || Boolean(user.pendingWithdrawalId)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="accountNumber">CBE Account Number</label>
            <input
              id="accountNumber"
              className="input-field"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              placeholder="1000123456789"
              disabled={user.status !== "approved" || Boolean(user.pendingWithdrawalId)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="note">Note (optional)</label>
            <input
              id="note"
              className="input-field"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Reason or instruction"
              disabled={user.status !== "approved" || Boolean(user.pendingWithdrawalId)}
            />
          </div>

          {error && <div className="status-badge error">{error}</div>}
          {success && <div className="status-badge success">{success}</div>}

          <button className="primary-button" type="submit" disabled={user.status !== "approved" || Boolean(user.pendingWithdrawalId) || loading}>
            {loading ? "Submitting…" : "Submit Withdrawal Request"}
          </button>
        </form>

        <p className="copy-small">
          Back to <Link href="/dashboard">Dashboard</Link>
        </p>
      </div>
    </main>
  );
}
