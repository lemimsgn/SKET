"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminUserMessagePage(props: any) {
  const { userId } = (props.params as { userId: string }) || {};
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
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

  const sendMessage = async () => {
    setSuccess("");
    setError("");
    if (!message.trim()) {
      setError("Message cannot be empty.");
      return;
    }

    try {
      const res = await fetch("/api/admin/user-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: message.trim() }),
      });
      if (!res.ok) throw new Error(`Connection error. Please try again later.`);
      const data = await res.json();
      setSuccess(data.message || "Notification sent to user.");
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Connection error. Please try again later.");
    }
  };

  return (
    <main className="page-shell admin-users-shell profile-shell">
      <div className="container">
        <div className="section-head profile-top">
          <div>
            <p className="eyebrow">Message user</p>
            <h1 className="section-title">Send a notification</h1>
            <p className="copy-small">Write a message and push it to the user's notification feed.</p>
          </div>
          <div className="profile-top-actions">
            <Link href={`/admin/users/${userId}`} className="secondary-button small-action">
              Back to profile
            </Link>
          </div>
        </div>

        <section className="profile-card message-card">
          <div className="profile-card-header">
            <div>
              <p className="section-title">Direct message</p>
              <p className="copy-small">The user will receive this in their notification list.</p>
            </div>
          </div>

          {loading ? (
            <p className="copy-small">Loading user…</p>
          ) : error ? (
            <div className="status-badge error">{error}</div>
          ) : (
            <div className="message-panel">
              <label className="label">To</label>
              <input type="text" className="input-field" value={phone} disabled />
              <label className="label">Message</label>
              <textarea
                className="input-field"
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your notification here"
              />
              <button className="primary-button full" onClick={sendMessage}>
                Send message
              </button>
              {success && <div className="status-badge success">{success}</div>}
              {error && <div className="status-badge error">{error}</div>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
