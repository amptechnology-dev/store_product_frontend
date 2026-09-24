"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "primereact/avatar";
import { useNotifications } from "@/lib/NotificationContext";

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
  const { unreadCount } = useNotifications();

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
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
        { label: "Dashboard", icon: "pi-th-large", href: "/dashboard" },
        ...(role === "ADMIN"
          ? [
              {
                label: "Ads",
                icon: "pi-megaphone",
                href: "/dashboard/ads",
              },
            ]
          : []),
        ...(role === "STORE"
          ? [
              {
                label: "Banners",
                icon: "pi-image",
                href: "/dashboard/banners",
              },
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
              {
                label: "Orders",
                icon: "pi-shopping-cart",
                href: "/dashboard/orders",
              },
            ]
          : []),
        { label: "Store", icon: "pi-shop", href: "/dashboard/store" },
      ],
    },
  ];

  const showLabels = !collapsed || isMobile;

  // ---------------- UI ----------------
  const sidebarWidth = isMobile ? 248 : collapsed ? 78 : 240;

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
          gap: 10,
          padding: "16px 14px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 10,
        }}
      >
        <img
          src="/img/photos/amp-logo.png"
          alt="AMP Technology"
          style={{
            width: 36,
            height: 36,
            objectFit: "contain",
            borderRadius: 9,
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
                fontSize: "0.98rem",
                fontWeight: 700,
                color: "var(--brand-primary-dark)",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              AMP Technology
            </h2>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.65rem",
                letterSpacing: "0.07em",
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
            margin: "0 12px 12px",
            padding: 10,
            borderRadius: 12,
            background: "var(--surface-soft)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Avatar image={user.image} shape="circle" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.82rem",
                color: "var(--brand-primary-dark)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.25,
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
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
              fontSize: "0.58rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              padding: "3px 7px",
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
            marginBottom: 12,
          }}
        >
          <Avatar image={user.image} shape="circle" />
        </div>
      )}

      {/* MENU */}
      <div style={{ padding: "0 8px", flex: 1 }}>
        {sections.map((sec) => (
          <div key={sec.title} style={{ marginBottom: 8 }}>
            {showLabels && (
              <div
                style={{
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  padding: "0 10px",
                  marginBottom: 6,
                }}
              >
                {sec.title}
              </div>
            )}

            {sec.items.map((item) => {
              const active = isActive(item.href);
              const showBadge =
                item.label === "Orders" && role === "STORE" && unreadCount > 0; // 👈 add

              return (
                <Link
                  key={item.label}
                  href={item.href || "#"}
                  className={`sidebar-link${active ? " active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    justifyContent:
                      collapsed && !isMobile ? "center" : "flex-start",
                    padding: collapsed && !isMobile ? "8px" : "8px 10px",
                    borderRadius: 10,
                    textDecoration: "none",
                    marginBottom: 2,
                    fontWeight: active ? 600 : 500,
                    fontSize: "0.86rem",
                    color: active ? "#fff" : "var(--brand-primary-dark)",
                    background: active
                      ? "linear-gradient(110deg, var(--brand-primary), var(--brand-blue))"
                      : "transparent",
                    boxShadow: active
                      ? "0 6px 16px rgba(26, 58, 107, 0.22)"
                      : "none",
                    transition:
                      "background 0.2s ease, color 0.2s ease, transform 0.15s ease",
                  }}
                >
                  {/* Icon box - always visible */}
                  <span
                    className="sidebar-icon"
                    style={{
                      position: "relative", // 👈 add
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      minWidth: 28,
                      minHeight: 28,
                      borderRadius: 8,
                      fontSize: 14,
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
                        fontSize: 14,
                        display: "block",
                        color: "inherit",
                      }}
                    />

                    {/* 👇 Notification badge */}
                    {showBadge && (
                      <span
                        style={{
                          position: "absolute",
                          top: -5,
                          right: -5,
                          minWidth: 16,
                          height: 16,
                          padding: "0 3px",
                          borderRadius: 999,
                          background: "#e53935",
                          color: "#fff",
                          fontSize: 9.5,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px solid var(--surface)",
                          lineHeight: 1,
                        }}
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
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
          padding: "10px 14px",
          borderTop: "1px solid var(--border)",
          fontSize: "0.68rem",
          color: "var(--muted)",
          textAlign: "center",
        }}
      >
        {showLabels ? (
          <span>© 2026 AMP Technology</span>
        ) : (
          <i className="pi pi-shield" style={{ fontSize: 13 }} />
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
