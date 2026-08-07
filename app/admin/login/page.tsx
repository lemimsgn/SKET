"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../lib/firebaseClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      if (typeof window === "undefined") return;
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (response.ok) {
          router.replace("/admin");
        }
      } catch {
        // ignore
      }
    }

    checkSession();
  }, [router]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    if (!auth) {
      setError(
        "Firebase auth is not initialized. Make sure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are configured."
      );
      setLoading(false);
      return;
    }

    signInWithEmailAndPassword(auth, email.trim(), password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        const idToken = await user.getIdToken();

        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
          const body = await response.text();
          setError(body || "You are not authorized to access the admin panel.");
          setLoading(false);
          return;
        }

        router.push("/admin");
      })
      .catch((err) => {
        setError(err.message || "Invalid login credentials.");
        setLoading(false);
      });
  };

  const handleForgot = () => {
    setError("Admin password recovery is not configured yet.");
  };

  return (
    <main className="page-shell admin-login-shell">
      <div className="container auth-card admin-login-card">
        <div className="section-head admin-login-head">
          <h1 className="section-title">Admin Login</h1>
          <p className="copy-small">Enter your admin credentials to continue.</p>
        </div>

        <form className="auth-form admin-login-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="adminEmail">Email</label>
            <div className="input-with-icon">
              <span className="input-icon">📧</span>
              <input
                id="adminEmail"
                className="input-field"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="adminPassword">Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input
                id="adminPassword"
                className="input-field"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
              />
            </div>
          </div>

          <div className="field-group">
            <button type="button" className="text-button" onClick={handleForgot}>
              Forgot Password?
            </button>
          </div>

          {error && <div className="status-badge error">{error}</div>}

          <button type="submit" className="primary-button admin-login-button" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        <p className="copy-small admin-login-extra">
          Sign in with your Firebase admin email and password.
        </p>
      </div>
    </main>
  );
}
