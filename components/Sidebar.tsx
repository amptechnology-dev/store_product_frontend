"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "primereact/avatar";

// ---------------- TYPES ----------------

type SidebarProps = {
  role: "ADMIN" | "MANAGER" | "CASHIER" | "STORE";
  user: {
    name: string;
    image: string;
    email: string;
  };
};

type MenuItem = {
  label: string;
  icon?: string;
  href?: string;
};

type Section = {
  title: string;
  items: MenuItem[];
};

// Role-wise badge color (theme accents)
const roleColors: Record<string, string> = {
  ADMIN: "var(--brand-orange)",
  MANAGER: "var(--brand-blue)",
  CASHIER: "var(--brand-amber)",
  STORE: "var(--brand-primary-light)",
};

// ---------------- COMPONENT ----------------

const Sidebar: React.FC<SidebarProps> = ({ role, user }) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Load collapsed state
  useEffect(() => {
    try {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (mobile) {
        setCollapsed(true);
        try {
          window.localStorage.setItem("sidebarCollapsed", "1");
        } catch {}
      } else {
        const v = window.localStorage.getItem("sidebarCollapsed");
        setCollapsed(v === "1");
      }
    } catch (e) {
      console.log("Error loading sidebar state", e);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sidebarCollapsed") {
        setCollapsed(e.newValue === "1");
      }
    };

    const handleToggleEvent = () => {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    };

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        try {
          window.localStorage.setItem("sidebarCollapsed", "1");
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("sidebarToggle", handleToggleEvent);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sidebarToggle", handleToggleEvent);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const sections: Section[] = [
  {
    title: "Menu",
    items: [
      ...(role === "ADMIN"
        ? [
            {
              label: "Ads",
              icon: "pi-megaphone",
              href: "/dashboard/ads",
            },
            // {
            //   label: "User Actions",
            //   icon: "pi-history",
            //   href: "/dashboard/store-actions",
            // },
          ]
        : []),
      ...(role === "STORE"
        ? [
            {
              label: "Categories",
              icon: "pi-tags",
              href: "/dashboard/categories",
            },
            {
              label: "Products",
              icon: "pi-box",
              href: "/dashboard/products",
            },
          ]
        : []),
      { label: "Store", icon: "pi-shop", href: "/dashboard/store" },
    ],
  },
];

  const showLabels = !collapsed || isMobile;

  // ---------------- UI ----------------
  const sidebarWidth = isMobile ? 264 : collapsed ? 86 : 264;

  const sidebarStyle: React.CSSProperties = {
    width: sidebarWidth,
    background: "var(--surface)",
    color: "var(--foreground)",
    position: "fixed",
    top: isMobile ? "64px" : 0,
    left: 0,
    height: isMobile ? "calc(100vh - 64px)" : "100vh",
    transition: "transform 0.28s ease, width 0.28s ease",
    transform: isMobile
      ? collapsed
        ? "translateX(-100%)"
        : "translateX(0)"
      : "none",
    overflowY: "auto",
    borderRight: "1px solid var(--border)",
    zIndex: isMobile ? 1000 : 40,
    boxShadow: isMobile
      ? "0 8px 20px rgba(15, 28, 53, 0.12)"
      : "2px 0 18px rgba(15, 28, 53, 0.04)",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <nav style={sidebarStyle} className="scrollbar-hide">
      {/* HEADER / LOGO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed && !isMobile ? "center" : "flex-start",
          gap: 12,
          padding: "20px 16px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 16,
        }}
      >
        <img
          src="/img/photos/amp-logo.png"
          alt="AMP Technology"
          style={{
            width: 42,
            height: 42,
            objectFit: "contain",
            borderRadius: 10,
            background: "var(--surface-soft)",
            border: "1px solid var(--border)",
            padding: 4,
            flexShrink: 0,
          }}
        />
        {showLabels && (
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--brand-primary-dark)",
                whiteSpace: "nowrap",
              }}
            >
              AMP Technology
            </h2>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.7rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              Dashboard Panel
            </p>
          </div>
        )}
      </div>

      {/* USER */}
      {showLabels ? (
        <div
          style={{
            margin: "0 14px 18px",
            padding: 12,
            borderRadius: 14,
            background: "var(--surface-soft)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Avatar image={user.image} shape="circle" size="large" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.88rem",
                color: "var(--brand-primary-dark)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email}
            </div>
          </div>
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: "4px 8px",
              borderRadius: 999,
              color: "#fff",
              background: roleColors[role] || "var(--brand-primary)",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            {role}
          </span>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <Avatar image={user.image} shape="circle" />
        </div>
      )}

      {/* MENU */}
      <div style={{ padding: "0 10px", flex: 1 }}>
        {sections.map((sec) => (
          <div key={sec.title} style={{ marginBottom: 20 }}>
            {showLabels && (
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  padding: "0 12px",
                  marginBottom: 10,
                }}
              >
                {sec.title}
              </div>
            )}

            {sec.items.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href || "#"}
                  className={`sidebar-link${active ? " active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    justifyContent:
                      collapsed && !isMobile ? "center" : "flex-start",
                    padding: collapsed && !isMobile ? "10px" : "10px 12px",
                    borderRadius: 12,
                    textDecoration: "none",
                    marginBottom: 6,
                    fontWeight: active ? 600 : 500,
                    fontSize: "0.9rem",
                    color: active ? "#fff" : "var(--brand-primary-dark)",
                    background: active
                      ? "linear-gradient(110deg, var(--brand-primary), var(--brand-blue))"
                      : "transparent",
                    boxShadow: active
                      ? "0 8px 20px rgba(26, 58, 107, 0.25)"
                      : "none",
                    transition:
                      "background 0.2s ease, color 0.2s ease, transform 0.15s ease",
                  }}
                >
                  {/* Icon box - always visible */}
                  <span
                    className="sidebar-icon"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      minWidth: 32,
                      minHeight: 32,
                      borderRadius: 10,
                      fontSize: 16,
                      lineHeight: 1,
                      flexShrink: 0,
                      background: active
                        ? "rgba(255,255,255,0.18)"
                        : "var(--surface-soft, #f1f5f9)",
                      border: active
                        ? "none"
                        : "1px solid var(--border, #e2e8f0)",
                      color: active ? "#fff" : "var(--brand-blue, #2196d3)",
                      transition: "background 0.2s ease, color 0.2s ease",
                    }}
                  >
                    <i
                      className={`pi ${item.icon || "pi-circle"}`}
                      style={{
                        fontSize: 16,
                        display: "block",
                        color: "inherit",
                      }}
                    />
                  </span>

                  {showLabels && (
                    <span style={{ flex: 1, whiteSpace: "nowrap" }}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div
        style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--border)",
          fontSize: "0.7rem",
          color: "var(--muted)",
          textAlign: "center",
        }}
      >
        {showLabels ? (
          <span>© 2026 AMP Technology</span>
        ) : (
          <i className="pi pi-shield" style={{ fontSize: 14 }} />
        )}
      </div>

      {/* HOVER STYLES */}
      <style jsx>{`
        .sidebar-link:hover:not(.active) {
          background: var(--surface-soft);
          color: var(--brand-primary);
        }
        .sidebar-link:hover:not(.active) .sidebar-icon {
          background: rgba(33, 150, 211, 0.12);
          color: var(--brand-primary);
        }
        .collapse-btn:hover {
          background: var(--surface-soft);
        }
      `}</style>
    </nav>
  );
};

export default Sidebar;
