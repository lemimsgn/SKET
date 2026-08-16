"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [step] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralUserName, setReferralUserName] = useState<string | null>(null);
  const [referralLookupError, setReferralLookupError] = useState("");
  const [referralChecking, setReferralChecking] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");

  const referralStatus = useMemo(() => {
    if (!referralCode.trim()) return null;
    return /^[A-Z]{2}\d{4}$/.test(referralCode.trim().toUpperCase()) ? "valid" : "invalid";
  }, [referralCode]);

  const passwordStrength = useMemo(() => {
    if (password.length >= 12) return "Strong";
    if (password.length >= 8) return "Medium";
    if (!password) return "";
    return "Weak";
  }, [password]);

  useEffect(() => {
    if (!referralCode.trim() || referralStatus !== "valid") {
      setReferralUserName(null);
      setReferralLookupError("");
      return;
    }

    const controller = new AbortController();
    const lookupReferral = async () => {
      setReferralChecking(true);
      setReferralLookupError("");
      try {
        const response = await fetch(`/api/referral-invites?referralCode=${encodeURIComponent(referralCode.trim().toUpperCase())}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Referral lookup failed.");
        }
        const data = await response.json();
        const inviter = data.inviter || (Array.isArray(data.invites) && data.invites.length > 0 ? data.invites[0] : null);
        if (inviter) {
          setReferralUserName(`${inviter.firstName || ""} ${inviter.lastName || ""}`.trim());
          setReferralLookupError("");
        } else {
          setReferralUserName(null);
          setReferralLookupError("Referral code not found.");
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setReferralUserName(null);
        setReferralLookupError(err.message || "Referral lookup failed.");
      } finally {
        setReferralChecking(false);
      }
    };

    lookupReferral();
    return () => controller.abort();
  }, [referralCode, referralStatus]);

  const handleContinue = () => {
    /* no-op: plans removed, go straight to form */
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password || !confirmPassword) {
      setError("Please complete all required fields.");
      return;
    }

    if (firstName.trim().length > 15 || !/^[A-Za-z]+$/.test(firstName.trim())) {
      setError("First name must be letters only and max 15 characters.");
      return;
    }

    if (lastName.trim().length > 15 || !/^[A-Za-z]+$/.test(lastName.trim())) {
      setError("Last name must be letters only and max 15 characters.");
      return;
    }

    if (!/^(09|07)\d{8}$/.test(phone.trim())) {
      setError("Phone number must start with 09 or 07 and be exactly 10 digits.");
      return;
    }

    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters and can include letters, numbers, and symbols.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (referralCode.trim() && !/^[A-Z]{2}\d{4}$/.test(referralCode.trim().toUpperCase())) {
      setError("Referral code must be 2 letters followed by 4 digits, e.g. AB1234.");
      return;
    }

    if (referralCode.trim() && referralLookupError) {
      setError("Invalid referral code.");
      return;
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          password,
          referralCode: referralCode.trim().toUpperCase(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Connection error. Please try again later.");
      }

      window.localStorage.setItem("sket-current-user", data.phone);
      setRegistered(true);
      setTimeout(() => (window.location.href = "/dashboard"), 300);
    } catch (err: any) {
      console.warn("Firestore write failed:", err);
      setError(err?.message || "Connection error. Please try again later.");
    }
  };

  return (
    <main className="page-shell">
      <div className="container auth-card">
        <div className="section-head">
          <h1 className="section-title">Sign Up</h1>
          <p className="copy-small">Complete your details to register.</p>
        </div>

        {!registered ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <section className="section-block">
                  <h2 className="subheading">Personal details</h2>
                  <div className="field-grid">
                    <div className="field-group">
                      <label htmlFor="firstName">First Name</label>
                      <input
                        id="firstName"
                        className="input-field"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="lastName">Last Name</label>
                      <input
                        id="lastName"
                        className="input-field"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>
                  <div className="field-group">
                    <label htmlFor="signupPhone">Phone Number</label>
                    <input
                      id="signupPhone"
                      className="input-field"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="09XXXXXXXX"
                      required
                    />
                  </div>
            </section>

            <section className="section-block">
                  <h2 className="subheading">Security</h2>
                  <div className="field-grid">
                    <div className="field-group">
                      <label htmlFor="signupPassword">Password (min 8 characters)</label>
                      <input
                        id="signupPassword"
                        className="input-field"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter at least 8 characters"
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="confirmPassword">Confirm Password</label>
                      <input
                        id="confirmPassword"
                        className="input-field"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Repeat your password"
                        required
                      />
                    </div>
                  </div>
                  <div className="checkbox-row">
                    <button type="button" className="secondary-button small-action" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? "Hide password" : "Show password"}
                    </button>
                    <span className="helper-text">Password strength: {passwordStrength || "Enter a password"}</span>
                  </div>
            </section>

            <section className="section-block">
                  <h2 className="subheading">Referral</h2>
                  <div className="field-group">
                    <label htmlFor="referralCode">Referral code (optional)</label>
                    <input
                      id="referralCode"
                      className="input-field"
                      inputMode="text"
                      maxLength={6}
                      value={referralCode}
                      onChange={(event) => setReferralCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                      placeholder="Enter referral code, e.g. AB1234"
                    />
                  </div>
                  {referralChecking && <div className="status-badge info">Checking referral code...</div>}
                  {!referralChecking && referralStatus === "valid" && referralUserName && (
                    <div className="signup-referral-name">{referralUserName}</div>
                  )}
                  {!referralChecking && referralStatus === "valid" && referralCode.trim() && referralLookupError && (
                    <div className="status-badge error">{referralLookupError}</div>
                  )}
                  {referralStatus === "invalid" && <div className="status-badge error">Enter a valid referral code (AB1234)</div>}
            </section>

            {error && <div className="status-badge error">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="primary-button">
                Create account
              </button>
            </div>

            <p className="login-prompt">
              Already have an account? <Link href="/login">Login</Link>
            </p>
          </form>
        ) : (
          <div className="registration-summary">
            <div className="card">
              <h2>Account Created</h2>
              <p>Your account has been saved to Firestore and is pending approval.</p>
              <p>
                <strong>Phone:</strong> {phone}
              </p>
            </div>
            <p className="copy-small">
              You can now <Link href="/login">login</Link> with your phone number and password.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
