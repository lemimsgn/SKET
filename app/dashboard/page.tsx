"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type UserRecord = {
  firstName: string;
  lastName: string;
  phone: string;
  selectedPlan: string;
  approved: boolean;
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
  securityQuestionsExist?: boolean;
};

type ReferralInvite = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  createdAt?: any;
};

export default function DashboardPage() {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState("Home");
  const [referralInvites, setReferralInvites] = useState<ReferralInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [referralExpanded, setReferralExpanded] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
  const [withdrawAccountHolderName, setWithdrawAccountHolderName] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [registrationFee, setRegistrationFee] = useState(3000);
  const [registrationAccountNumber, setRegistrationAccountNumber] = useState("1000686058477");
  const [registrationTelegramLink, setRegistrationTelegramLink] = useState("https://t.me/leonmsgn");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "success" | "error">("idle");
  const [balanceHidden, setBalanceHidden] = useState(true);
  const [securityPanelOpen, setSecurityPanelOpen] = useState(false);
  const [securityLoaded, setSecurityLoaded] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [questionOne, setQuestionOne] = useState("");
  const [questionTwo, setQuestionTwo] = useState("");
  const [answerOne, setAnswerOne] = useState("");
  const [answerTwo, setAnswerTwo] = useState("");
  const [answerThree, setAnswerThree] = useState("");
  const [securityConfirmPassword, setSecurityConfirmPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityStatus, setSecurityStatus] = useState<"idle" | "success" | "error">("idle");
  const [paymentCopySuccess, setPaymentCopySuccess] = useState(false);
  const [requestAgainMessage, setRequestAgainMessage] = useState("");
  const [requestAgainStatus, setRequestAgainStatus] = useState<"idle" | "success" | "error">("idle");
  const [requestAgainLoading, setRequestAgainLoading] = useState(false);

  const securityQuestionsExist = (user as any)?.securityQuestionsExist ?? (!!user?.securityQuestions && Array.isArray(user.securityQuestions) && user.securityQuestions.length >= 2);

  const loadSecurityQuestions = () => {
    const existing = (user as any)?.securityQuestions;
    if (existing?.length >= 2) {
      setQuestionOne(existing[0].question || "");
      setAnswerOne(existing[0].answer || "");
      setQuestionTwo(existing[1].question || "");
      setAnswerTwo(existing[1].answer || "");
    } else {
      setQuestionOne("");
      setAnswerOne("");
      setQuestionTwo("");
      setAnswerTwo("");
    }
  };

  const handleOpenSecurityPanel = () => {
    if (!securityLoaded && user) {
      loadSecurityQuestions();
      setSecurityLoaded(true);
    }
    setSecurityConfirmPassword("");
    setSecurityPanelOpen(true);
    setSecurityStatus("idle");
    setSecurityMessage("");
  };

  const registrationFeeText = `registration fee\n${registrationFee} ETB\naccount number ${registrationAccountNumber}`;

  const handleCopyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(registrationAccountNumber);
      setPaymentCopySuccess(true);
      setTimeout(() => setPaymentCopySuccess(false), 2500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  const handleSendPaymentScreenshot = async () => {
    try {
      await navigator.clipboard.writeText(registrationAccountNumber);
      setPaymentCopySuccess(true);
      setTimeout(() => setPaymentCopySuccess(false), 2500);
    } catch (error) {
      console.error("Copy failed", error);
    }

    try {
      const message = `Full name: ${user?.firstName} ${user?.lastName}.\nPhone: ${user?.phone}.\nReferral code: ${referralNumber}.\nPlease attach the payment screenshot.`;
      const link = registrationTelegramLink || "https://t.me/leonmsgn";
      const telegramUrl = new URL(link);
      telegramUrl.searchParams.set("text", message);
      window.open(telegramUrl.toString(), "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Invalid Telegram link", error);
      window.open(registrationTelegramLink || "https://t.me/leonmsgn", "_blank", "noopener,noreferrer");
    }
  };

  const handleRequestAgain = async () => {
    if (!user) {
      return;
    }

    setRequestAgainLoading(true);
    setRequestAgainStatus("idle");
    setRequestAgainMessage("");

    try {
      const response = await fetch("/api/user/request-again", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: user.phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to resend registration request.");
      }

      setRequestAgainStatus("success");
      setRequestAgainMessage(data.message || "Registration request resent to admin.");
      setUser({ ...user, status: "pending" });
    } catch (error: any) {
      console.error("Request again failed", error);
      setRequestAgainStatus("error");
      setRequestAgainMessage(error.message || "Failed to resend registration request.");
    } finally {
      setRequestAgainLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout request failed:", err);
    }

    try {
      // Clear client-side sket-* keys
      if (typeof window !== "undefined") {
        Object.keys(window.localStorage || {})
          .filter((k) => k.startsWith("sket-"))
          .forEach((k) => window.localStorage.removeItem(k));
      }
    } catch (e) {
      // ignore
    }

    try {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          try {
            await r.unregister();
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const renderPageHeader = (eyebrow: string, title: string, description?: string) => (
    <div className="section-header">
      <div>
        <p className="eyebrow-small">{eyebrow}</p>
        <h1 className="hero-name">{title}</h1>
        {description ? <p className="copy-small">{description}</p> : null}
      </div>
    </div>
  );

  // Mark notifications as read when the panel opens and persist the change.
  useEffect(() => {
    if (!notificationsOpen || !user?.notifications) {
      return;
    }

    const unreadCount = user.notifications.filter((notif: any) => !notif.read).length;
    if (unreadCount === 0) {
      return;
    }

    const updatedNotifications = user.notifications.map((notif: any) => ({
      ...notif,
      read: true,
    }));

    setUser({
      ...user,
      notifications: updatedNotifications,
    });

    const markNotificationsRead = async () => {
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: user.phone }),
        });
      } catch (error) {
        console.error("Failed to mark notifications read:", error);
      }
    };

    markNotificationsRead();
  }, [notificationsOpen, user]);

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
          throw new Error(data.error || "Connection error. Please try again later.");
        }

        const userObj = data.user as UserRecord;
        setUser(userObj);
        setRegistrationFee(userObj.registrationFee ?? 3000);
        setRegistrationAccountNumber(userObj.registrationAccountNumber || "1000686058477");
        setRegistrationTelegramLink(userObj.registrationTelegramLink || "https://t.me/leonmsgn");
        setLoadingUser(false);
        setSecurityLoaded(true);

        const referralCodeToUse = userObj.referralNumber || userObj.referralCode;
        if (referralCodeToUse) {
          setLoadingInvites(true);
          const queryParams = new URLSearchParams();
          queryParams.set("referralCode", referralCodeToUse);
          const response = await fetch(`/api/referral-invites?${queryParams.toString()}`);
          if (response.ok) {
            const data = await response.json();
            setReferralInvites(data.invites || []);
          }
          setLoadingInvites(false);
        } else {
          setLoadingInvites(true);
          const response = await fetch(`/api/referral-invites`);
          if (response.ok) {
            const data = await response.json();
            setReferralInvites(data.invites || []);
          }
          setLoadingInvites(false);
        }

        setTransactionLoading(true);
        try {
          const txResponse = await fetch(`/api/transactions`);
          const txData = await txResponse.json();
          if (!txResponse.ok) {
            throw new Error(txData.error || "Connection error. Please try again later.");
          }
          setTransactions(txData.transactions || []);
        } catch (txError: any) {
          console.error("Failed to load transactions:", txError);
          setTransactionError(txError.message || "Connection error. Please try again later.");
        } finally {
          setTransactionLoading(false);
        }
      } catch (err) {
        console.warn("Failed to load user:", err);
        setLoadingError("Unable to load dashboard. Please refresh or log in again.");
        setLoadingUser(false);
      }
    })();
  }, []);

  // Ensure transactions do not leak into other tabs (some DOM may persist after navigation)
  useEffect(() => {
    // Clear transactions when leaving the Transactions tab to avoid DOM/state leakage
    if (activeDrawerTab !== "Transactions") {
      setTransactions([]);
      setTransactionError("");
      setTransactionLoading(false);
    }
  }, [activeDrawerTab]);

  const handleCloseWithdrawForm = () => {
    setShowWithdrawForm(false);
    setWithdrawAmount("");
    setWithdrawAccountNumber("");
    setWithdrawAccountHolderName("");
    setWithdrawError("");
    setWithdrawSuccess("");
    setWithdrawLoading(false);
  };

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
    const accountNumber = withdrawAccountNumber.trim();
    const accountHolderName = withdrawAccountHolderName.trim();
    if (!accountNumber) {
      setWithdrawError("Please provide your CBE account number.");
      return;
    }
    if (!/^\d{13}$/.test(accountNumber)) {
      setWithdrawError("Account number must be exactly 13 digits.");
      return;
    }
    if (!accountHolderName) {
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
          accountNumber,
          accountHolderName,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Connection error. Please try again later.");
      }
      setWithdrawSuccess("Withdrawal request submitted. Admin will approve it shortly.");
      setUser({ ...user, walletBalance: (user.walletBalance ?? 0) - amount });
      setWithdrawAmount("");
      setWithdrawAccountNumber("");
      setWithdrawAccountHolderName("");
    } catch (error: any) {
      setWithdrawError(error.message || "Connection error. Please try again later.");
      console.error(error);
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
          <button className="primary-button" onClick={() => window.location.reload()}>Refresh page</button>
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
  const displayBalance = user.walletBalance ?? 0;
  const totalEarned = user.totalEarned ?? 0;
  const totalWithdrawn = user.totalWithdrawn ?? 0;
  const referralCode = user.referralCode ?? "-";
  const referralNumber = (user.referralNumber || user.referralCode) ?? "-";
  const statusLabel = user.status ?? (user.approved ? "approved" : "pending");
  const notifications = Array.isArray(user.notifications) ? user.notifications : [];
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const formattedTransactions = transactions.map((tx) => ({
    ...tx,
    dateLabel: typeof tx.createdAt === "string" ? tx.createdAt : tx.createdAt instanceof Date ? tx.createdAt.toLocaleString() : tx.createdAt?.toString?.() || "Unknown date",
  }));

  const formatNotificationDate = (value: any) => {
    if (!value) return "";
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
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
            { label: "Home", icon: "🏠", href: "/dashboard" },
            { label: "Profile", icon: "👤", href: "/dashboard" },
            { label: "Transactions", icon: "📜", href: "/dashboard" },
            { label: "Settings", icon: "⚙", href: "/dashboard" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`drawer-link ${activeDrawerTab === item.label ? "active" : ""}`}
              onClick={() => {
                setActiveDrawerTab(item.label);
                setDrawerOpen(false);
                // Clear transactions when navigating to Settings to avoid stale list showing
                if (item.label === "Settings") {
                  setTransactions([]);
                  setTransactionError("");
                  setTransactionLoading(false);
                }
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="container dashboard-ui">
        <header className="dashboard-top">
          <button className="icon-button" onClick={() => setDrawerOpen(true)}>☰</button>
          <div className="header-right">
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                🔔
                {!notificationsOpen && unreadNotifications > 0 && <span className="notification-count">{unreadNotifications}</span>}
              </button>
              {notificationsOpen && (
                <>
                  <button
                    className="notification-overlay"
                    aria-label="Close notifications"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <aside className="notification-panel" aria-label="Notifications">
                    <div className="notification-panel-head">
                      <strong>Notifications</strong>
                      <div className="notification-panel-actions">
                        {unreadNotifications > 0 && <span>{unreadNotifications}</span>}
                        <button className="notification-close" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">
                          ×
                        </button>
                      </div>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="notification-empty">No notifications yet.</p>
                    ) : (
                      <div className="notification-list">
                        {[...notifications].reverse().slice(0, 15).map((notification, index) => (
                          <div key={`${notification.createdAt || "notification"}-${index}`} className="notification-item">
                            <p>{notification.message || "You have a new notification."}</p>
                            <small>{formatNotificationDate(notification.createdAt)}</small>
                          </div>
                        ))}
                        {notifications.length > 15 && (
                          <div className="notification-footer">
                            <small>Showing the 15 most recent notifications.</small>
                          </div>
                        )}
                      </div>
                    )}
                  </aside>
                </>
              )}
            </div>
            <div className="profile-menu-wrap">
              <button
                className="icon-button avatar small"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
              >
                {user.firstName.charAt(0)}
              </button>

              {profileMenuOpen && (
                <>
                  <button className="profile-menu-overlay" onClick={() => setProfileMenuOpen(false)} aria-label="Close profile menu" />
                  <div className="profile-menu-card" role="menu" aria-label="Profile menu">
                    <div className="profile-menu-header">
                      <div className="profile-menu-avatar">{user.firstName.charAt(0)}</div>
                      <div className="profile-menu-user">
                        <span className="profile-menu-name">{user.firstName} {user.lastName}</span>
                        <span className="profile-menu-title">Account</span>
                      </div>
                    </div>
                    <div className="profile-menu-stats">
                      <button
                        type="button"
                        className="profile-menu-link"
                        onClick={() => {
                          setActiveDrawerTab("Profile");
                          setProfileMenuOpen(false);
                        }}
                      >
                        Profile
                      </button>
                      <button type="button" className="profile-menu-link logout-btn" onClick={handleLogout}>
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {activeDrawerTab === "Profile" ? (
          <section className="profile-page card">
            {renderPageHeader("Profile", `${user.firstName} ${user.lastName}`, "Account details, referral metrics, and activity at a glance.")}

            <div className="profile-page-grid">
              <div className="profile-info-card">
                <div className="profile-info-row">
                  <span>Phone</span>
                  <strong>{user.phone}</strong>
                </div>
                <div className="profile-info-row">
                  <span>Referral number</span>
                  <strong>{referralNumber}</strong>
                </div>
                <div className="profile-info-row">
                  <span>Account status</span>
                  <strong>{statusLabel}</strong>
                </div>
              </div>

              <div className="profile-stats-card">
                <div className="profile-stat">
                  <span>Wallet balance</span>
                  <strong>{displayBalance.toLocaleString()} ETB</strong>
                </div>
                <div className="profile-stat">
                  <span>Total earned</span>
                  <strong>{totalEarned.toLocaleString()} ETB</strong>
                </div>
                <div className="profile-stat">
                  <span>Total withdrawn</span>
                  <strong>{totalWithdrawn.toLocaleString()} ETB</strong>
                </div>
                <div className="profile-stat">
                  <span>Joined referrals</span>
                  <strong>{referralInvites.length}</strong>
                </div>
              </div>
            </div>
          </section>
        ) : activeDrawerTab === "Transactions" ? (
          <section className="transactions-page card">
            {renderPageHeader("Transactions", "Recent activity")}
            <p className="copy-small">To view your transaction history, open the full Transactions page.</p>
            <Link href="/transactions" className="secondary-button small-action">Open Transactions page</Link>
          </section>
        ) : activeDrawerTab === "Settings" ? (
          <section className="settings-page">
            {renderPageHeader("Settings", "Account controls")}
            <div className="settings-grid">
              <div className="settings-box">
                <div className="settings-box-head">
                  <div>
                    <p className="settings-label">Change password</p>
                    <p className="copy-small">Update your login password securely in one step.</p>
                  </div>
                  <button className="secondary-button small" onClick={() => setChangePasswordOpen(true)}>
                    Change
                  </button>
                </div>
              </div>

              <div className="settings-box">
                <div className="settings-box-head">
                  <div>
                    <p className="settings-label">Security questions</p>
                    <p className="copy-small">
                      {!securityLoaded
                        ? "Checking status..."
                        : securityQuestionsExist
                        ? "Setted"
                        : "Not setted"}
                    </p>
                  </div>
                  <button className="secondary-button small" onClick={handleOpenSecurityPanel}>
                    {!securityLoaded ? "Loading..." : securityQuestionsExist ? "Edit" : "Set"}
                  </button>
                </div>
              </div>
            </div>

            {securityMessage && (
              <p className={securityStatus === "success" ? "success-message" : "error-message"}>
                {securityMessage}
              </p>
            )}

            {changePasswordOpen && (
              <div className="password-panel">
                <div className="password-panel-header">
                  <div>
                    <p className="eyebrow-small">Secure update</p>
                    <h2 className="hero-name small-title">Change password</h2>
                  </div>
                  <button className="modal-close" onClick={() => setChangePasswordOpen(false)}>✕</button>
                </div>
                <div className="password-form">
                    <div className="form-group">
                    <label htmlFor="newPassword">New password</label>
                    <input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <button
                    className="primary-button full"
                    onClick={async () => {
                      if (!user) return;
                      setPasswordStatus("idle");
                      setPasswordMessage("");

                      if (!newPassword || newPassword.length < 8) {
                        setPasswordStatus("error");
                        setPasswordMessage("Password must be at least 8 characters.");
                        return;
                      }

                      try {
                        const response = await fetch("/api/change-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            phone: user.phone,
                            newPassword,
                          }),
                        });
                        const data = await response.json();
                        if (!response.ok) {
                          setPasswordStatus("error");
                          setPasswordMessage(data.error || "Unable to update password.");
                        } else {
                          setPasswordStatus("success");
                          setPasswordMessage(data.message || "Password updated successfully.");
                          setCurrentPassword("");
                          setNewPassword("");
                        }
                      } catch (error) {
                        setPasswordStatus("error");
                        setPasswordMessage("Unable to update password. Please try again.");
                      }
                    }}
                  >
                    Save password
                  </button>
                  {passwordMessage && (
                    <p className={passwordStatus === "success" ? "success-message" : "error-message"}>
                      {passwordMessage}
                    </p>
                  )}
                </div>
              </div>
            )}

            {securityPanelOpen && (
              <div className="password-panel">
                <div className="password-panel-header">
                  <div>
                    <p className="eyebrow-small">Security setup</p>
                    <h2 className="hero-name small-title">Security questions</h2>
                  </div>
                  <button className="modal-close" onClick={() => setSecurityPanelOpen(false)}>✕</button>
                </div>
                <div className="password-form">
                  <div className="form-group">
                    <div className="form-group">
                      <label>Question 1</label>
                      <input
                        type="text"
                        className="input-field"
                        value="what is you favorite phone number"
                        disabled
                      />
                    </div>
                    <div className="form-group">
                        <label htmlFor="answerOne">Answer 1</label>
                        <input
                          id="answerOne"
                          type="text"
                          placeholder="Enter your favorite phone number (10 digits)"
                          value={answerOne}
                          onChange={(e) => setAnswerOne(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                      <label>Question 2</label>
                      <input
                        type="text"
                        className="input-field"
                        value="what is your favorite 4 digit number"
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="answerTwo">Answer 2</label>
                      <input
                        id="answerTwo"
                        type="text"
                        placeholder="Enter your favorite 4-digit number"
                        value={answerTwo}
                        onChange={(e) => setAnswerTwo(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Question 3</label>
                      <input
                        type="text"
                        className="input-field"
                        value="what is your other favorite phone number"
                        disabled
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="answerThree">Answer 3</label>
                      <input
                        id="answerThree"
                        type="text"
                        placeholder="Enter your other favorite phone number (10 digits)"
                        value={answerThree}
                        onChange={(e) => setAnswerThree(e.target.value)}
                      />
                    </div>
                  </div>
                    <div className="form-group">
                      <label htmlFor="securityConfirmPassword">Confirm password</label>
                      <input
                        id="securityConfirmPassword"
                        type="password"
                        placeholder="Enter current password"
                        value={securityConfirmPassword}
                        onChange={(e) => setSecurityConfirmPassword(e.target.value)}
                      />
                    </div>
                  <button
                    className="primary-button full"
                    onClick={async () => {
                      if (!user) return;
                      setSecurityStatus("idle");
                      setSecurityMessage("");

                      if (!answerOne || !answerTwo || !answerThree) {
                        setSecurityStatus("error");
                        setSecurityMessage("Please answer all three security questions.");
                        return;
                      }

                      // Ensure formats
                      if (!/^\d{10}$/.test(answerOne)) {
                        setSecurityStatus("error");
                        setSecurityMessage("Favorite phone number must be exactly 10 digits.");
                        return;
                      }

                      if (!/^\d{4}$/.test(answerTwo)) {
                        setSecurityStatus("error");
                        setSecurityMessage("Favorite 4-digit number must be exactly 4 digits.");
                        return;
                      }

                      if (!/^\d{10}$/.test(answerThree)) {
                        setSecurityStatus("error");
                        setSecurityMessage("Other favorite phone number must be exactly 10 digits.");
                        return;
                      }

                      // Ensure answers are distinct
                      const ansSet = new Set([answerOne.trim(), answerTwo.trim(), answerThree.trim()]);
                      if (ansSet.size !== 3) {
                        setSecurityStatus("error");
                        setSecurityMessage("Security answers must be different from each other.");
                        return;
                      }

                      if (!securityConfirmPassword) {
                        setSecurityStatus("error");
                        setSecurityMessage("Please enter your password to confirm.");
                        return;
                      }

                      if (!/^\d{4}$/.test(answerTwo)) {
                        setSecurityStatus("error");
                        setSecurityMessage("Favorite 4-digit number must be exactly 4 digits.");
                        return;
                      }

                      if (!/^\d{10}$/.test(answerThree)) {
                        setSecurityStatus("error");
                        setSecurityMessage("Other favorite phone number must be exactly 10 digits.");
                        return;
                      }

                      try {
                        const response = await fetch("/api/security-questions", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            phone: user.phone,
                            answerOne,
                            answerTwo,
                            answerThree,
                            currentPassword: securityConfirmPassword,
                          }),
                        });
                        const data = await response.json();
                        if (!response.ok) {
                          setSecurityStatus("error");
                          setSecurityMessage(data.error || "Unable to save security questions.");
                        } else {
                          setSecurityStatus("success");
                          setSecurityMessage(data.message || "Security questions saved successfully.");
                          setUser({
                            ...user,
                            securityQuestions: [
                              { question: "what is you favorite phone number", answer: answerOne },
                              { question: "what is your favorite 4 digit number", answer: answerTwo },
                              { question: "what is your other favorite phone number", answer: answerThree },
                            ],
                            securityQuestionsExist: true,
                          });
                          setSecurityConfirmPassword("");
                          setSecurityPanelOpen(false);
                        }
                      } catch (error) {
                        setSecurityStatus("error");
                        setSecurityMessage("Unable to save security questions. Please try again.");
                      }
                    }}
                  >
                    Save security questions
                  </button>
                  {securityMessage && (
                    <p className={securityStatus === "success" ? "success-message" : "error-message"}>
                      {securityMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          <>
            {user.status !== "approved" && (
              <section className="pending-approval-card card">
                <div className="approval-header">
                  <div>
                    <p className="eyebrow-small">
                      {user.status === "rejected" ? "Registration rejected" : "Payment required"}
                    </p>
                    <h2 className="hero-name small-title">
                      {user.status === "rejected" ? "Request registration again" : "Complete registration payment"}
                    </h2>
                  </div>
                  <span className="approval-badge">
                    {user.status === "rejected" ? "Registration rejected" : "Pending approval"}
                  </span>
                </div>

                <div className="approval-body">
                  <p className="approval-text">
                    {user.status === "rejected"
                      ? "Your registration was rejected. Please pay the registration fee and send a payment screenshot again to Telegram."
                      : "Please pay the registration fee and send a payment screenshot to Telegram."}
                  </p>
                  <div className="approval-detail-group">
                    <span className="detail-label">Amount</span>
                    <strong className="detail-value">{registrationFee} ETB</strong>
                  </div>
                  <div className="approval-detail-group">
                    <span className="detail-label">Account number</span>
                    <button className="account-copy-button" type="button" onClick={handleCopyAccountNumber}>
                      <span>{registrationAccountNumber}</span>
                      <strong>Copy</strong>
                    </button>
                  </div>
                  <button className="primary-button full approval-button" type="button" onClick={handleSendPaymentScreenshot}>
                    Send payment screenshot
                  </button>
                  {user.status === "rejected" && (
                    <button
                      className="secondary-button full approval-button"
                      type="button"
                      onClick={handleRequestAgain}
                      disabled={requestAgainLoading}
                    >
                      {requestAgainLoading ? "Requesting…" : "Request again"}
                    </button>
                  )}
                  {paymentCopySuccess && <p className="success-message">Account number copied to clipboard.</p>}
                  {requestAgainMessage && (
                    <p className={requestAgainStatus === "success" ? "success-message" : "error-message"}>
                      {requestAgainMessage}
                    </p>
                  )}
                </div>
              </section>
            )}

            <section className="balance-hero card">
              <p className="eyebrow-small">Welcome back,</p>
              <h1 className="hero-name">{user.firstName} {user.lastName}</h1>
              <div className="balance-panel">
                <div>
                  <div className="status-label">Status</div>
                  <div className="status-value">{statusLabel}</div>
                </div>
                <div className="balance-actions">
                  <button className="secondary-button small" onClick={() => {
                    setShowWithdrawForm(true);
                    setWithdrawError("");
                    setWithdrawSuccess("");
                  }}>
                    Withdraw
                  </button>
                </div>
              </div>
              <div className="wallet-summary">
                <div className="wallet-card">
                  <div className="wallet-top">
                    <span>Wallet Balance</span>
                    <button
                      className="toggle-balance eye-button"
                      onClick={() => setBalanceHidden(!balanceHidden)}
                      aria-label={balanceHidden ? "Show balances" : "Hide balances"}
                    >
                      {balanceHidden ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  <div className="wallet-bottom">
                    <span>Total Earned</span>
                    <span>{balanceHidden ? "••••••" : `£${Number(totalEarned).toLocaleString()}`}</span>
                  </div>
                  <div className="wallet-bottom">
                    <span>Total Withdrawn</span>
                    <span>{balanceHidden ? "••••••" : `£${Number(totalWithdrawn).toLocaleString()}`}</span>
                  </div>
                  <div className="wallet-bottom">
                    <span>Available Balance</span>
                    <span className="wallet-value">
                      {balanceHidden ? "••••••" : `£${Number(displayBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="referral-invites card">
              <div className="referral-header">
                <div>
                  <p className="referral-label">Your Referral Code</p>
                  <div className="referral-code-display">
                    <span className="referral-code-text">{referralNumber}</span>
                    <button
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(referralNumber || "");
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
          </>
        )}
      </div>

      {showWithdrawForm && (
        <>
          <button className="modal-overlay" onClick={handleCloseWithdrawForm} />
          <div className="modal-card">
            <div className="modal-topbar">
              <button className="modal-close modern-x" onClick={handleCloseWithdrawForm} aria-label="Close withdraw dialog">✕</button>
            </div>
            <div className="modal-header">
              <h2>Withdraw Funds</h2>
            </div>
            <form className="modal-content" onSubmit={handleWithdrawSubmit}>
              <div className="status-card success" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <p className="copy-small" style={{ margin: 0, color: '#d1fae5' }}>
                  Submit a withdrawal request for admin approval.
                </p>
              </div>

              <div className="balance-display">
                <span className="balance-label">Wallet Balance</span>
                <span className="balance-amount">£{Number(displayBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="form-group">
                <label htmlFor="withdrawAmount">Amount (ETB)</label>
                <input
                  id="withdrawAmount"
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className={withdrawError ? "error" : ""}
                />
              </div>

              <div className="form-group">
                <label htmlFor="withdrawAccountNumber">CBE Account Number</label>
                <input
                  id="withdrawAccountNumber"
                  type="text"
                  placeholder="1000123456789"
                  value={withdrawAccountNumber}
                  onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                  className={withdrawError ? "error" : ""}
                />
              </div>

              <div className="form-group">
                <label htmlFor="withdrawAccountHolderName">Account holder name</label>
                <input
                  id="withdrawAccountHolderName"
                  type="text"
                  placeholder="Enter account holder name"
                  value={withdrawAccountHolderName}
                  onChange={(e) => setWithdrawAccountHolderName(e.target.value)}
                />
              </div>

              {withdrawError && <p className="error-message">{withdrawError}</p>}
              {withdrawSuccess && <p className="success-message">{withdrawSuccess}</p>}

              <button className="primary-button full" type="submit" disabled={withdrawLoading}>
                {withdrawLoading ? "Submitting..." : "Submit Withdrawal Request"}
              </button>
            </form>
          </div>
        </>
      )}
    </main>
  );
}
