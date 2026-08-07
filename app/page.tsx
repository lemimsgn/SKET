import Link from "next/link";

const stats = [
  { number: "10K+", label: "Active Learners" },
  { number: "500+", label: "Earning Members" },
  { number: "₦2B+", label: "Paid Out" },
];

export default function HomePage() {
  return (
    <main className="page-shell home-shell">
      <div className="container">
        <header className="home-header">
          <div className="header-top">
            <div className="logo">SKET</div>
            <div className="header-actions">
              <Link className="header-link" href="/login">
                Login
              </Link>
              <Link className="primary-button" href="/signup">
                Sign Up
              </Link>
            </div>
          </div>
        </header>

        <section className="hero-section-modern">
          <div className="hero-badge">
            <span className="eyebrow">✨ Welcome to SKET</span>
          </div>
          
          <h1 className="hero-title-large">
            Learn Skills.<br />Grow Your<br />Network. Earn.
          </h1>
          
          <p className="hero-subtitle">
            Join thousands of learners earning referral rewards while mastering in-demand skills. A modern platform built for growth.
          </p>

          <div className="hero-buttons">
            <Link className="primary-button-large" href="/signup?plan=G3">
              🚀 Get Started Free
            </Link>
            <Link className="secondary-button-large" href="/login">
              Already have an account? Login
            </Link>
          </div>

          <div className="hero-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-item">
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="hero-card-feature">
            <div className="feature-badge">⚡ Instant Access</div>
            <p className="feature-text">Start earning referral bonuses from day one. No hidden fees. No locked content.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
