"use client";

import { useEffect, useState } from "react";

export default function ChangePasswordPage() {
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const storedPhone = window.localStorage.getItem("sket-password-reset-phone");
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("resetToken");
    const storedToken = window.localStorage.getItem("sket-password-reset-token");
    if (tokenFromUrl) {
      window.localStorage.setItem("sket-password-reset-token", tokenFromUrl);
    }
    const effectiveToken = tokenFromUrl || storedToken || null;
    if (!storedPhone) {
      setError("Password reset session is not valid. Please start from login.");
      return;
    }
    setPhone(storedPhone);
    if (effectiveToken) setResetToken(effectiveToken);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!phone) {
      setError("Unable to verify reset session. Please restart from login.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    try {
      const body: any = { phone, newPassword };
      if (resetToken) body.resetToken = resetToken;
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to update password.");
        return;
      }

      window.localStorage.removeItem("sket-password-reset-phone");
      window.localStorage.removeItem("sket-password-reset-token");
      setSuccessMessage("Password updated successfully. Redirecting to login...");
      setTimeout(() => (window.location.href = "/login"), 800);
    } catch (err) {
      console.warn("Password update failed:", err);
      setError("Unable to update password. Please try again later.");
    }
  };

  return (
    <main className="page-shell">
      <div className="container auth-card">
        <div className="section-head">
          <h1 className="section-title">Reset password</h1>
          <p className="copy-small">Enter a new password for your account.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              className="input-field"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="field-group">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              className="input-field"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          {error && <div className="status-badge error">{error}</div>}
          {successMessage && <div className="status-badge success">{successMessage}</div>}

          <button className="primary-button" type="submit">
            Reset password
          </button>
        </form>
      </div>
    </main>
  );
}
