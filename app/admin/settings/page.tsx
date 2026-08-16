"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [registrationFee, setRegistrationFee] = useState(3000);
  const [accountNumber, setAccountNumber] = useState("1000686058477");
  const [registrationTelegramLink, setRegistrationTelegramLink] = useState("https://t.me/leonmsgn");
  const [forgotPasswordTelegramLink, setForgotPasswordTelegramLink] = useState("https://t.me/leonmsgn");
  const [firstTwoInvites, setFirstTwoInvites] = useState(1500);
  const [laterInviteReward, setLaterInviteReward] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        throw new Error(`Connection error. Please try again later.`);
      }
      const data = await res.json();
      setRegistrationFee(Number(data.registrationFee ?? 3000));
      setAccountNumber(String(data.accountNumber || "1000686058477"));
      setRegistrationTelegramLink(String(data.registrationTelegramLink || "https://t.me/leonmsgn"));
      setForgotPasswordTelegramLink(String(data.forgotPasswordTelegramLink || "https://t.me/leonmsgn"));
      setFirstTwoInvites(Number(data.firstTwoInvites ?? 1500));
      setLaterInviteReward(Number(data.thirdAndLaterInvites ?? 1000));
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationFee: Number(registrationFee),
          accountNumber: String(accountNumber).trim(),
          registrationTelegramLink: String(registrationTelegramLink).trim(),
          forgotPasswordTelegramLink: String(forgotPasswordTelegramLink).trim(),
          firstTwoInvites: Number(firstTwoInvites),
          thirdAndLaterInvites: Number(laterInviteReward),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Connection error. Please try again later.");
      }
      setSuccess("Settings saved successfully.");
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-shell admin-users-shell profile-shell">
      <div className="container">
        <div className="section-head profile-top">
          <div>
            <p className="eyebrow">Admin settings</p>
            <h1 className="section-title">Referral and registration fees</h1>
            <p className="copy-small">Configure the registration fee and referral bonus tiers from one place.</p>
          </div>
        </div>

        <section className="profile-card profile-main-card">
          <div className="profile-card-header">
            <div>
              <p className="section-title">Referral reward settings</p>
              <p className="copy-small">Set the first, second and later invite bonus amounts.</p>
            </div>
          </div>

          {loading ? (
            <p className="copy-small">Loading settings…</p>
          ) : (
            <div className="profile-details-grid">
              <div className="profile-detail">
                <span>Registration fee</span>
                <input
                  type="number"
                  className="input-field"
                  value={registrationFee}
                  onChange={(event) => setRegistrationFee(Number(event.target.value))}
                  min={0}
                />
              </div>
              <div className="profile-detail">
                <span>CBE account number</span>
                <input
                  type="text"
                  className="input-field"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  maxLength={13}
                  placeholder="1000686058477"
                />
              </div>
              <div className="profile-detail">
                <span>Telegram registration link</span>
                <input
                  type="text"
                  className="input-field"
                  value={registrationTelegramLink}
                  onChange={(event) => setRegistrationTelegramLink(event.target.value)}
                  placeholder="https://t.me/leonmsgn"
                />
              </div>
              <div className="profile-detail">
                <span>Telegram forgot-password link</span>
                <input
                  type="text"
                  className="input-field"
                  value={forgotPasswordTelegramLink}
                  onChange={(event) => setForgotPasswordTelegramLink(event.target.value)}
                  placeholder="https://t.me/leonmsgn"
                />
              </div>
              <div className="profile-detail">
                <span>First invite bonus</span>
                <input
                  type="number"
                  className="input-field"
                  value={firstTwoInvites}
                  onChange={(event) => setFirstTwoInvites(Number(event.target.value))}
                  min={0}
                />
              </div>
              <div className="profile-detail">
                <span>Invite bonus after 2 referrals</span>
                <input
                  type="number"
                  className="input-field"
                  value={laterInviteReward}
                  onChange={(event) => setLaterInviteReward(Number(event.target.value))}
                  min={0}
                />
              </div>
              <div className="profile-detail">
                <button className="primary-button full" onClick={saveSettings} disabled={saving}>
                  {saving ? "Saving…" : "Save settings"}
                </button>
              </div>
              {success && <div className="status-badge success">{success}</div>}
              {error && <div className="status-badge error">{error}</div>}
            </div>
          )}
        </section>

        <div className="section-actions">
          <Link href="/admin" className="secondary-button small-action">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
