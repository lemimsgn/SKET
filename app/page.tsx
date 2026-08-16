"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const stats = [
  { number: "10K+", label: "Active Learners" },
  { number: "500+", label: "Earning Members" },
  { number: "₦2B+", label: "Paid Out" },
];

const APP_SHARE_URL = "https://sket-beige.vercel.app";

const getStoredReferralCode = () => {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem("sketReferralCode") || "";
  } catch (error) {
    return "";
  }
};

const buildReferralShareText = (referralCode?: string) => {
  const code = (referralCode || getStoredReferralCode() || "YOUR_REFERRAL_CODE").trim();
  return `Join SKET today and start learning while growing your network.\n\nSign up with this referral code: ${code}\n\nWeb link: ${APP_SHARE_URL}`;
};

const handlePromoShare = async (referralCode?: string) => {
  const shareText = buildReferralShareText(referralCode);

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title: "Join SKET",
        text: shareText,
        url: APP_SHARE_URL,
      });
      return;
    }
  } catch (error) {
    console.warn("Native share cancelled or unavailable:", error);
  }

  const fallbackOptions = [
    { label: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
    { label: "Telegram", url: `https://t.me/share/url?url=${encodeURIComponent(APP_SHARE_URL)}&text=${encodeURIComponent(shareText)}` },
    { label: "SMS", url: `sms:?body=${encodeURIComponent(shareText)}` },
    { label: "Email", url: `mailto:?subject=${encodeURIComponent("Join SKET")}&body=${encodeURIComponent(shareText)}` },
  ];

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareText);
      window.alert("Invite message copied. You can paste it anywhere to share.");
      return;
    } catch (error) {
      console.warn("Clipboard copy failed:", error);
    }
  }

  const target = fallbackOptions[0];
  if (target) {
    window.open(target.url, "_blank", "noopener,noreferrer");
  }
};

function PromoSlider() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const cards = trackRef.current?.children ?? [];
    const dots = document.querySelectorAll(".promo-dot");

    if (!cards.length) return;

    if (trackRef.current) {
      trackRef.current.style.transform = "translateX(0%)";
    }

    const goTo = (nextIndex: number) => {
      setIndex(nextIndex);
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(-${nextIndex * 100}%)`;
      }
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === nextIndex);
      });

      Array.from(cards).forEach((card, cardIndex) => {
        card.classList.toggle("active", cardIndex === nextIndex);
      });
    };

    const timer = setInterval(() => {
      const nextIndex = (index + 1) % cards.length;
      goTo(nextIndex);
    }, 5000);

    const firstCard = cards[0];
    if (firstCard) {
      firstCard.classList.add("active");
    }

    return () => clearInterval(timer);
  }, [index]);

  const handleDotClick = (nextIndex: number) => {
    setIndex(nextIndex);
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${nextIndex * 100}%)`;
    }

    const cards = Array.from(trackRef.current?.children ?? []);
    const dots = document.querySelectorAll(".promo-dot");
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === nextIndex);
    });
    cards.forEach((card, cardIndex) => {
      card.classList.toggle("active", cardIndex === nextIndex);
    });
  };

  return (
    <div className="promo-wrap">
      <div className="promo-slider">
        <div className="promo-track" ref={trackRef}>
          <div className="promo-card c1 active">
            <div>
              <span className="promo-badge">REFERRAL BONUS</span>
              <p className="promo-title">Invite 2 friends<br />and earn 3000 Birr</p>
              <p className="promo-sub">Tap your referral link and cash in the moment they join your network.</p>
              <button type="button" className="promo-cta" onClick={() => handlePromoShare()}>Invite now →</button>
            </div>
            <div className="promo-icon">🎁</div>
          </div>

          <div className="promo-card c2">
            <div>
              <span className="promo-badge">KEEP EARNING</span>
              <p className="promo-title">Earn 1000 Birr<br />per extra invite</p>
              <p className="promo-sub">Build your referral chain and unlock bigger payouts as your circle grows.</p>
              <button type="button" className="promo-cta" onClick={() => handlePromoShare()}>Start sharing →</button>
            </div>
            <div className="promo-icon">💰</div>
          </div>

          <div className="promo-card c3">
            <div>
              <span className="promo-badge">AGENT PATH</span>
              <p className="promo-title">Become an agent<br />and grow monthly income</p>
              <p className="promo-sub">Move from referrals into a bigger earning model with recurring rewards.</p>
              <button type="button" className="promo-cta" onClick={() => handlePromoShare()}>See the path →</button>
            </div>
            <div className="promo-icon">🚀</div>
          </div>
        </div>
      </div>

      <div className="promo-dots" aria-label="Promo slider dots">
        {[0, 1, 2].map((dotIndex) => (
          <button
            key={dotIndex}
            type="button"
            className={`promo-dot ${dotIndex === index ? "active" : ""}`}
            aria-label={`Go to slide ${dotIndex + 1}`}
            onClick={() => handleDotClick(dotIndex)}
          />
        ))}
      </div>
    </div>
  );
}

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

          <PromoSlider />

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
