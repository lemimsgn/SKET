"use client";

import { useState } from "react";
import Link from "next/link";

type SecurityQuestion = {
  question: string;
  answer: string;
};

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "forgotPhone" | "forgotQuestions" | "forgotNotSet">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion[]>([]);
  const [securityAnswers, setSecurityAnswers] = useState<string[]>(["", "", ""]);
  const [foundUser, setFoundUser] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!phone.trim() || !password) {
      setError("Please enter both phone number and password.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Incorrect phone or password. Please try again.");
        return;
      }

      setSuccessMessage(`Welcome back, ${data.user.firstName}! You are logged in.`);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 400);
    } catch (err) {
      console.warn("Login failed:", err);
      setError("Login failed. Please try again later.");
    }
  };

  const handleForgotPasswordStart = () => {
    setError("");
    setSuccessMessage("");
    setForgotPhone("");
    setSecurityQuestions([]);
    setSecurityAnswers(["", "", ""]);
    setFoundUser(null);
    setMode("forgotPhone");
  };

  const handleForgotPhoneSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const phoneValue = forgotPhone.trim();
    if (!phoneValue) {
      setError("Please enter your phone number.");
      return;
    }

    try {
      const response = await fetch(`/api/user?phone=${encodeURIComponent(phoneValue)}`);
      const data = await response.json();
      if (!response.ok || !data.user) {
        setError(data.error || "No user found with that phone number.");
        return;
      }

      const questions = Array.isArray(data.user.securityQuestions) ? data.user.securityQuestions : [];
      if (questions.length < 3) {
        setMode("forgotNotSet");
        setFoundUser(data.user);
        return;
      }

      setSecurityQuestions(questions.slice(0, 3));
      setFoundUser(data.user);
      setMode("forgotQuestions");
    } catch (err) {
      console.warn("Forgot password lookup failed:", err);
      setError("Unable to verify phone number. Please try again later.");
    }
  };

  const handleRequestPassword = () => {
    if (!foundUser) return;

    const referralValue = foundUser.referralNumber || foundUser.referralCode || "";
    const referralLink = referralValue
      ? `${window.location.origin}/signup?referralCode=${encodeURIComponent(referralValue)}`
      : window.location.origin;
    const fullName = foundUser.fullName || `${foundUser.firstName || ""} ${foundUser.lastName || ""}`.trim();
    const message = `Full name: ${fullName}\nPhone: ${foundUser.phone}\nReferral link: ${referralLink}`;

    let telegramLink = String(foundUser.forgotPasswordTelegramLink || foundUser.registrationTelegramLink || "").trim();
    if (!telegramLink) {
      telegramLink = "https://t.me/leonmsgn";
    } else if (telegramLink.startsWith("@")) {
      telegramLink = `https://t.me/${telegramLink.slice(1)}`;
    } else if (!/^https?:\/\//i.test(telegramLink)) {
      telegramLink = `https://${telegramLink}`;
    }

    try {
      const url = new URL(telegramLink);
      url.searchParams.set("text", message);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch (error) {
      window.open(`https://t.me/leonmsgn?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    }
  };

  const handleForgotQuestionsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!foundUser) {
      setError("Unable to verify user. Please start again.");
      return;
    }

    const answers = securityAnswers.map((answer) => answer.trim());
    if (answers.some((answer) => !answer)) {
      setError("Please answer all three security questions or request password reset.");
      return;
    }

    try {
      const response = await fetch("/api/security-questions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: foundUser.phone, answers }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Incorrect answers. Please try again or request password reset.");
        return;
      }

      window.localStorage.setItem("sket-password-reset-phone", foundUser.phone);
      setSuccessMessage("Answers verified. Redirecting to password reset...");
      setTimeout(() => {
        window.location.href = "/change-password";
      }, 400);
    } catch (err) {
      console.warn("Security question verification failed:", err);
      setError("Unable to verify answers. Please try again later.");
    }
  };

  const handleBackToLogin = () => {
    setMode("login");
    setError("");
    setSuccessMessage("");
    setForgotPhone("");
    setSecurityQuestions([]);
    setSecurityAnswers(["", "", ""]);
    setFoundUser(null);
  };

  const loginTitle =
    mode === "login"
      ? "Login"
      : mode === "forgotPhone"
      ? "Forgot password"
      : mode === "forgotQuestions"
      ? "Answer security questions"
      : "Security questions not set";
  const loginDescription =
    mode === "login"
      ? "Access your account with your phone number and password."
      : mode === "forgotPhone"
      ? "Enter the phone number on your account so we can show your security questions."
      : mode === "forgotQuestions"
      ? "Answer the three security questions you previously set to regain access."
      : "Security questions are not set for this account. You cannot recover via this method.";

  return (
    <main className="page-shell">
      <div className="container auth-card">
        <div className="section-head">
          <h1 className="section-title">{loginTitle}</h1>
          <p className="copy-small">{loginDescription}</p>
        </div>

        {mode === "login" && (
          <>
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="field-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  className="input-field"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter your phone"
                />
              </div>
              <div className="field-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              {error && <div className="status-badge error">{error}</div>}
              {successMessage && <div className="status-badge success">{successMessage}</div>}

              <div className="checkbox-row">
                <label>
                  <input type="checkbox" /> Remember Me
                </label>
              </div>
              <button className="primary-button" type="submit">
                Login
              </button>
            </form>
            <p className="copy-small">
              <button type="button" className="secondary-button small-action" onClick={handleForgotPasswordStart}>
                Forgot password
              </button>
            </p>
          </>
        )}

        {mode === "forgotPhone" && (
          <form className="auth-form" onSubmit={handleForgotPhoneSubmit}>
            <div className="field-group">
              <label htmlFor="forgotPhone">Phone Number</label>
              <input
                id="forgotPhone"
                className="input-field"
                type="tel"
                value={forgotPhone}
                onChange={(event) => setForgotPhone(event.target.value)}
                placeholder="Enter your phone number"
              />
            </div>

            {error && <div className="status-badge error">{error}</div>}
            {successMessage && <div className="status-badge success">{successMessage}</div>}

            <button className="primary-button" type="submit">
              Continue
            </button>
            <button type="button" className="secondary-button small-action" onClick={handleBackToLogin}>
              Back to login
            </button>
          </form>
        )}

        {mode === "forgotQuestions" && (
          <form className="auth-form" onSubmit={handleForgotQuestionsSubmit}>
            {securityQuestions.map((question, index) => (
              <div className="field-group" key={index}>
                <label htmlFor={`securityAnswer${index}`}>{question.question}</label>
                <input
                  id={`securityAnswer${index}`}
                  className="input-field"
                  type="text"
                  value={securityAnswers[index] || ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSecurityAnswers((prev) => {
                      const next = [...prev];
                      next[index] = value;
                      return next;
                    });
                  }}
                  placeholder="Your answer"
                />
              </div>
            ))}

            {error && <div className="status-badge error">{error}</div>}
            {successMessage && <div className="status-badge success">{successMessage}</div>}

            <button className="primary-button" type="submit">
              Submit answers
            </button>
            <button type="button" className="secondary-button small-action" onClick={handleRequestPassword}>
              Request password
            </button>
            <button type="button" className="secondary-button small-action" onClick={handleBackToLogin}>
              Back to login
            </button>
          </form>
        )}

        {mode === "forgotNotSet" && (
          <div className="auth-form">
            <div className="status-badge error">Security questions not set for this account.</div>
            <button type="button" className="secondary-button full" onClick={handleRequestPassword}>
              Request password
            </button>
            <button type="button" className="secondary-button small-action" onClick={handleBackToLogin}>
              Back to login
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
