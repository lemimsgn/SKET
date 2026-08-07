"use client";

import { useEffect, useState, type FormEvent } from "react";

type UserRecord = {
  firstName: string;
  lastName: string;
  phone: string;
  selectedPlan?: string;
  approved?: boolean;
  status?: string;
  walletBalance?: number;
  totalEarned?: number;
  totalWithdrawn?: number;
  referralCode?: string;
  referralNumber?: string;
  notifications?: any[];
  securityQuestions?: Array<{ question: string; answer: string }>;
  registrationFee?: number;
  registrationAccountNumber?: string;
  registrationTelegramLink?: string;
};

type DrawerTab = "Home" | "Profile" | "Transactions" | "Settings";

type ReferralInvite = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  createdAt?: any;
};

type TransactionItem = {
  id: string;
  title?: string;
  subtitle?: string;
  amount?: number;
  direction?: string;
  date?: string;
  createdAt?: any;
};

export default function DashboardPage() {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<DrawerTab>("Home");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [referralInvites, setReferralInvites] = useState<ReferralInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [referralExpanded, setReferralExpanded] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
  const [withdrawAccountHolderName, setWithdrawAccountHolderName] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [registrationFee, setRegistrationFee] = useState<number>(3000);
  const [registrationAccountNumber, setRegistrationAccountNumber] = useState<string>("1000686058477");
  const [registrationTelegramLink, setRegistrationTelegramLink] = useState<string>("https://t.me/leonmsgn");

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/user");
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const data = await response.json();
        setUser(data.user || null);
        if (data.user) {
          setRegistrationFee(data.user.registrationFee ?? 3000);
          setRegistrationAccountNumber(data.user.registrationAccountNumber || "1000686058477");
          setRegistrationTelegramLink(data.user.registrationTelegramLink || "https://t.me/leonmsgn");
        }
      } catch (error) {
        console.error("Failed to load user:", error);
        setLoadingError("Unable to load dashboard. Please refresh or log in again.");
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setTransactionLoading(true);
      try {
        const response = await fetch("/api/transactions");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load transactions.");
        }

        setTransactions(data.transactions || []);
      } catch (error: any) {
        console.error("Failed to load transactions:", error);
        setTransactionError(error.message || "Unable to load transactions.");
      } finally {
        setTransactionLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    (async () => {
      setLoadingInvites(true);
      try {
        const referralCode = user.referralNumber || user.referralCode || "";
        const query = referralCode ? `?referralCode=${encodeURIComponent(referralCode)}` : "";
        const response = await fetch(`/api/referral-invites${query}`);
        const data = await response.json();
        setReferralInvites(data.invites || []);
      } catch (error) {
        console.error("Failed to load referral invites:", error);
      } finally {
        setLoadingInvites(false);
      }
    })();
  }, [user]);

  const handleWithdrawSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setWithdrawError("");
    setWithdrawSuccess("");

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setWithdrawError("Enter a valid withdrawal amount.");
      return;
    }

    if (!/^\d{13}$/.test(withdrawAccountNumber)) {
      setWithdrawError("Account number must be exactly 13 digits.");
      return;
    }

    if (!withdrawAccountHolderName.trim()) {
      setWithdrawError("Please provide the account holder name.");
      return;
    }

    setWithdrawLoading(true);
    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.phone,
          amount,
          accountNumber: withdrawAccountNumber,
          accountHolderName: withdrawAccountHolderName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to submit withdrawal.");
      }

      setWithdrawSuccess("Withdrawal request submitted. Admin will approve it shortly.");
      setUser({ ...user, walletBalance: (user.walletBalance ?? 0) - amount });
      setWithdrawAmount("");
      setWithdrawAccountNumber("");
      setWithdrawAccountHolderName("");
    } catch (error: any) {
      console.error("Withdraw failed:", error);
      setWithdrawError(error.message || "Unable to submit withdrawal.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loadingUser) {
    return (
      <main className="page-shell">
        <div className="container auth-card">
          <p className="copy-small">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (loadingError) {
    return (
      <main className="page-shell">
        <div className="container auth-card">
          <h1 style={{ margin: 0, fontSize: 20, color: "#111827" }}>Dashboard failed to load</h1>
          <p className="copy-small">{loadingError}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>
            Refresh page
          </button>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-shell">
        <div className="container auth-card">
          <p className="copy-small">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  const statusLabel = user.status ?? (user.approved ? "approved" : "pending");
  const displayBalance = user.walletBalance ?? 0;
  const totalEarned = user.totalEarned ?? 0;
  const totalWithdrawn = user.totalWithdrawn ?? 0;

  const renderActiveTabContent = () => {
    switch (activeDrawerTab) {
      case "Profile":
        return (
          <section className="profile-page card">
            <div className="section-header">
              <div>
                <p className="eyebrow-small">Profile</p>
                <h1 className="hero-name">{user.firstName} {user.lastName}</h1>
                <p className="copy-small">Account details and stats</p>
              </div>
            </div>
            <div className="profile-page-grid">
              <div className="profile-info-card">
                <div className="profile-info-row"><span>Phone</span><strong>{user.phone}</strong></div>
                <div className="profile-info-row"><span>Referral number</span><strong>{user.referralNumber || "-"}</strong></div>
                <div className="profile-info-row"><span>Account status</span><strong>{statusLabel}</strong></div>
              </div>
            </div>
          </section>
        );
      case "Transactions":
        return (
          <section className="transactions-page card">
            <div className="section-header">
              <div>
                <p className="eyebrow-small">Transactions</p>
                <h1 className="hero-name">Recent activity</h1>
                <p className="copy-small">Your recent activity</p>
              </div>
            </div>
            {transactionError ? <p className="copy-small">{transactionError}</p> : null}
            {transactionLoading ? (
              <p className="copy-small">Loading transactions...</p>
            ) : (
              <div className="transaction-list">
                {transactions.length === 0 ? (
                  <p className="copy-small">No transactions found.</p>
                ) : (
                  transactions.map((tx) => {
                    const avatarClass = `invite-avatar ${tx.direction || (tx.amount != null && tx.amount >= 0 ? "received" : "sent")}`;
                    const amountClass = `transaction-amount ${tx.direction || (tx.amount != null && tx.amount >= 0 ? "received" : "sent")}`;
                    const amountText = tx.amount != null ? `${tx.amount >= 0 ? "+" : "-"}${Math.abs(tx.amount)} ETB` : "N/A";

                    return (
                      <article key={tx.id} className="invite-item transaction-item">
                        <div className={avatarClass}>
                          {tx.direction === "received" ? "+" : "-"}
                        </div>
                        <div className="invite-info">
                          <p className="invite-name">{tx.title || "Transaction"}</p>
                          <p className="invite-phone">{tx.subtitle || tx.date || "Unknown date"}</p>
                        </div>
                        <div className={amountClass}>
                          {amountText}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            )}
          </section>
        );
      case "Settings":
        return (
          <section className="settings-page card">
            <div className="section-header">
              <div>
                <p className="eyebrow-small">Settings</p>
                <h1 className="hero-name">Account controls</h1>
              </div>
            </div>
            <div className="settings-grid">
              <div className="settings-box">
                <div className="settings-box-head">
                  <div>
                    <p className="settings-label">Change password</p>
                    <p className="copy-small">Update your login password.</p>
                  </div>
                  <button className="secondary-button small">Change</button>
                </div>
              </div>
              <div className="settings-box">
                <div className="settings-box-head">
                  <div>
                    <p className="settings-label">Security questions</p>
                    <p className="copy-small">{user.securityQuestions && user.securityQuestions.length ? "Set" : "Not set"}</p>
                  </div>
                  <button className="secondary-button small">Manage</button>
                </div>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <main className="page-shell dashboard-shell">
      <div className="drawer-overlay" data-open={drawerOpen ? "true" : "false"} onClick={() => setDrawerOpen(false)} />
      <aside className={`drawer-menu ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Menu</p>
            <strong>{user.firstName} {user.lastName}</strong>
          </div>
          <button className="icon-button" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <nav className="drawer-links">
          {[
            { label: "Home", icon: "🏠" },
            { label: "Profile", icon: "👤" },
            { label: "Transactions", icon: "📜" },
            { label: "Settings", icon: "⚙" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className={`drawer-link ${activeDrawerTab === item.label ? "active" : ""}`}
              onClick={() => {
                setActiveDrawerTab(item.label as DrawerTab);
                setDrawerOpen(false);
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="container dashboard-ui">
        <header className="dashboard-top">
          <button className="icon-button" onClick={() => setDrawerOpen(true)}>☰</button>
          <div className="header-right">
            <button className="icon-button avatar small">{user.firstName.charAt(0)}</button>
          </div>
        </header>

        <section className="balance-hero card">
          <p className="eyebrow-small">Welcome back,</p>
          <h1 className="hero-name">{user.firstName} {user.lastName}</h1>
          <div className="balance-panel">
            <div>
              <div className="status-label">Status</div>
              <div className="status-value">{statusLabel}</div>
            </div>
            <div className="balance-actions">
              <button className="secondary-button small" onClick={() => setDrawerOpen(false)}>
                Withdraw
              </button>
            </div>
          </div>
          <div className="wallet-summary">
            <div className="wallet-card">
              <div className="wallet-top">
                <span>Wallet Balance</span>
              </div>
              <div className="wallet-bottom">
                <span>Total Earned</span>
                <span>£{totalEarned.toLocaleString()}</span>
              </div>
              <div className="wallet-bottom">
                <span>Total Withdrawn</span>
                <span>£{totalWithdrawn.toLocaleString()}</span>
              </div>
              <div className="wallet-bottom">
                <span>Available Balance</span>
                <span className="wallet-value">£{displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="referral-invites card">
          <div className="referral-header">
            <div>
              <p className="referral-label">Your Referral Code</p>
              <div className="referral-code-display">
                <span className="referral-code-text">{user.referralNumber || "-"}</span>
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(user.referralNumber || "");
                    setCopiedMessage(true);
                    setTimeout(() => setCopiedMessage(false), 2000);
                  }}
                  title="Copy referral code"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
          {copiedMessage && <div className="toast-message">Referral code copied</div>}
          <div className="referral-invites-header">
            <h3 className="invites-title">Your Referral Invites</h3>
            {referralInvites.length > 0 && !loadingInvites && (
              <button
                type="button"
                className="secondary-button small-action"
                onClick={() => setReferralExpanded((prev) => !prev)}
              >
                {referralExpanded ? "Collapse" : `Expand (${referralInvites.length})`}
              </button>
            )}
          </div>
          {loadingInvites ? (
            <p className="copy-small">Loading invites...</p>
          ) : referralInvites.length === 0 ? (
            <p className="copy-small">No one has joined using your referral link yet.</p>
          ) : referralExpanded ? (
            <div className="invite-list">
              {referralInvites.map((invite) => (
                <div key={invite.id} className="invite-item">
                  <div className="invite-avatar">{invite.firstName.charAt(0)}</div>
                  <div className="invite-info">
                    <p className="invite-name">{invite.fullName}</p>
                    <small className="invite-phone">{invite.phone}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="copy-small">Referral invites are collapsed. Click expand to view.</p>
          )}
        </section>

        {renderActiveTabContent()}
      </div>
    </main>
  );
}
