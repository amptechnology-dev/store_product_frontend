"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

export default function Home() {
  const router = useRouter();

  return (
    <main className="jd-home jd-simple-home">
      <div className="jd-bg-orb jd-bg-orb-one" />
      <div className="jd-bg-orb jd-bg-orb-two" />

      <section className="jd-simple-shell">
        {/* ── Top Nav ── */}
        <div className="jd-topbar" style={{ marginBottom: 28 }}>
          <div className="jd-brand">
            <div style={{ position: "relative", width: 46, height: 46 }}>
              <div style={{
                position: "absolute", inset: -3,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f97316, #2196d3, #1a3a6b)",
                animation: "amp-ring-spin 3s linear infinite",
                zIndex: 0,
              }} />
              <div style={{
                position: "absolute", inset: -3,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                zIndex: 0,
                insetInline: "unset",
                width: "calc(100% + 2px)",
                height: "calc(100% + 2px)",
                top: 1, left: 1,
              }} />
              <Image
                src="/img/photos/amp-logo.png"
                alt="AMP"
                width={46}
                height={46}
                style={{ borderRadius: 10, position: "relative", zIndex: 1, width: 46, height: 46, objectFit: "contain" }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: "1.1rem", margin: 0, color: "#1a3a6b" }}>
                AMP <span style={{ color: "#f97316" }}>Store</span>
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#5f6b7a" }}>
                Management System
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="jd-btn-ghost"
              style={{ padding: "9px 18px", fontSize: "0.88rem" }}
              onClick={() => router.push("/store")}
            >
              🛍️ Visit Store
            </button>
            <button
              className="jd-btn-primary"
              style={{ padding: "9px 18px", fontSize: "0.88rem" }}
              onClick={() => router.push("/login")}
            >
              Login →
            </button>
          </div>
        </div>

        {/* ── Hero Card ── */}
        <div style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          border: "1px solid #dde8f5",
          borderRadius: 28,
          boxShadow: "0 24px 55px rgba(15,28,53,0.12)",
          overflow: "hidden",
        }}>
          {/* Top gradient strip */}
          <div style={{ height: 5, background: "linear-gradient(90deg, #f97316, #2196d3, #1a3a6b)" }} />

          <div style={{ padding: "40px 40px 40px" }}>
            {/* Badge row */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <span className="jd-tag" style={{ marginBottom: 0 }}>⚡ AMP Technology</span>
              <span style={{
                fontSize: "0.75rem", fontWeight: 700,
                color: "#00763f", background: "#e6f9ef",
                padding: "5px 12px", borderRadius: 999,
              }}>● Live</span>
            </div>

            {/* Hero grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 48,
              alignItems: "center",
            }}>
              {/* ── Left: Text ── */}
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)",
                  lineHeight: 1.18,
                  color: "#0f1c35",
                  fontWeight: 800,
                }}>
                  Create Your Store,{" "}
                  <span style={{
                    background: "linear-gradient(110deg, #f97316, #2196d3)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                    Sell Smarter
                  </span>
                </h2>

                <p style={{
                  marginTop: 14, marginBottom: 0,
                  fontSize: "1rem", lineHeight: 1.78,
                  color: "#5f6b7a", maxWidth: 460,
                }}>
                  Register your store, add your products, and start selling — all from one powerful dashboard built for store owners by{" "}
                  <strong style={{ color: "#1a3a6b" }}>AMP Technology</strong>.
                </p>

                {/* Feature pill list */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
                  {[
                    "🏪 Create Your Store",
                    "📦 Add Products",
                    "📊 Track Orders",
                    "💬 Get Reviews",
                  ].map((f) => (
                    <span key={f} style={{
                      fontSize: "0.78rem", fontWeight: 600,
                      color: "#1a3a6b", background: "#eef4ff",
                      border: "1px solid #d0e2f8",
                      padding: "5px 12px", borderRadius: 999,
                    }}>{f}</span>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
                  <button
                    className="jd-btn-primary"
                    style={{ padding: "13px 30px", fontSize: "0.95rem", borderRadius: 14 }}
                    onClick={() => router.push("/login")}
                  >
                    Get Started →
                  </button>
                  <button
                    className="jd-btn-ghost"
                    style={{ padding: "13px 24px", fontSize: "0.95rem", borderRadius: 14 }}
                    onClick={() => router.push("/store")}
                  >
                    🛍️ Visit Store
                  </button>
                </div>

                {/* Trust line */}
                <p style={{ marginTop: 16, fontSize: "0.78rem", color: "#9eabbe" }}>
                  ✅ Free to register &nbsp;·&nbsp; ⚡ Instant setup &nbsp;·&nbsp; 🔒 Secure & verified
                </p>
              </div>

              {/* ── Right: Animated Logo ── */}
              <div style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 170,
                height: 170,
                flexShrink: 0,
              }}>
                {[170, 140, 112].map((size, i) => (
                  <div key={size} style={{
                    position: "absolute",
                    width: size, height: size,
                    borderRadius: "50%",
                    border: "2px solid transparent",
                    borderTop: `2px solid ${i === 1 ? "#f97316" : "#2196d3"}`,
                    borderRight: i === 2 ? "2px solid #1a3a6b" : "2px solid transparent",
                    animation: `${i % 2 === 0 ? "amp-ring-spin" : "amp-ring-spin-rev"} ${1.4 + i * 0.7}s linear infinite`,
                    opacity: 0.9,
                  }} />
                ))}
                <div style={{
                  position: "absolute", width: 88, height: 88,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(33,150,211,0.15) 0%, transparent 70%)",
                  animation: "amp-pulse 2s ease-in-out infinite",
                }} />
                <div style={{
                  position: "relative", zIndex: 10,
                  background: "#fff",
                  borderRadius: 22,
                  padding: 14,
                  boxShadow: "0 8px 32px rgba(26,58,107,0.18), 0 0 0 8px rgba(33,150,211,0.07)",
                  animation: "amp-pulse 2s ease-in-out infinite",
                }}>
                  <Image
                    src="/img/photos/amp-logo.png"
                    alt="AMP Logo"
                    width={68}
                    height={68}
                    style={{ display: "block", objectFit: "contain" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderTop: "1px solid #eef4ff",
          }}>
            {[
              { icon: "🏪", value: "500+", label: "Stores Registered" },
              { icon: "📦", value: "10K+", label: "Products Listed" },
              { icon: "⭐", value: "4.9/5", label: "Store Owner Rating" },
            ].map((stat, i) => (
              <div key={i} style={{
                padding: "22px 16px",
                textAlign: "center",
                borderRight: i < 2 ? "1px solid #eef4ff" : "none",
                background: i === 1 ? "linear-gradient(135deg,#f5f8ff,#eef4ff)" : "transparent",
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{stat.icon}</div>
                <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#1a3a6b" }}>{stat.value}</div>
                <div style={{ fontSize: "0.78rem", color: "#5f6b7a", marginTop: 3 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── How It Works ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginTop: 16,
        }}>
          {[
            { step: "01", icon: "🏪", title: "Create Your Store", desc: "Register and set up your store profile with address, timing, and contact details in minutes." },
            { step: "02", icon: "📦", title: "Add Your Products", desc: "Upload products with images, prices, and descriptions. Manage your full catalogue easily." },
            { step: "03", icon: "📈", title: "Grow Your Sales", desc: "Get discovered by customers, collect reviews, and track your store performance in real time." },
          ].map((card) => (
            <div key={card.step} style={{
              background: "rgba(255,255,255,0.92)",
              border: "1px solid #dde8f5",
              borderRadius: 20,
              padding: "24px 20px",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(15,28,53,0.06)",
            }}>
              <div style={{
                position: "absolute", top: 14, right: 16,
                fontSize: "2rem", fontWeight: 900,
                color: "#eef4ff", letterSpacing: "-1px",
                userSelect: "none",
              }}>{card.step}</div>
              <div style={{ fontSize: "1.7rem", marginBottom: 10 }}>{card.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.93rem", color: "#1a3a6b", marginBottom: 6 }}>
                {card.title}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#5f6b7a", lineHeight: 1.65 }}>
                {card.desc}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <p style={{ textAlign: "center", marginTop: 20, marginBottom: 8, fontSize: "0.78rem", color: "#9eabbe" }}>
          © {new Date().getFullYear()} AMP Technology · All rights reserved
        </p>
      </section>

      <style>{`
        @keyframes amp-ring-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes amp-ring-spin-rev {
          to { transform: rotate(-360deg); }
        }
        @keyframes amp-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.82; transform: scale(0.95); }
        }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .how-grid  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}