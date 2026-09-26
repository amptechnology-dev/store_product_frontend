"use client";

import React, { useEffect, useState } from "react";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import NotificationBell from "@/components/NotificationBell";
import { useRouter } from "next/navigation";

interface NavbarProps {
  role: "ADMIN" | "MANAGER" | "CASHIER" | "STORE";
  user: {
    name: string;
    image: string;
  };
}

// Role-wise accent color (matches Sidebar)
const roleColors: Record<string, string> = {
  ADMIN: "var(--brand-orange)",
  MANAGER: "var(--brand-blue)",
  CASHIER: "var(--brand-amber)",
  STORE: "var(--brand-primary-light)",
};

const Navbar: React.FC<NavbarProps> = ({ user, role }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const menuRef = React.useRef<Menu>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    } catch (e) {
      // ignore
    }

    const handleToggleEvent = () => {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    };

    window.addEventListener("sidebarToggle", handleToggleEvent);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("sidebarToggle", handleToggleEvent);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/api/login/logout");
      localStorage.removeItem("login-token");
      document.cookie =
        "login-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      toast.success("Logged out successfully");
      setTimeout(() => (window.location.href = "/login"), 500);
    } catch (error: any) {
      console.error("Logout error:", error);
      localStorage.removeItem("login-token");
      document.cookie =
        "login-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      toast.error("Logout failed, but clearing session");
      setTimeout(() => (window.location.href = "/login"), 500);
    }
  };

  const userMenuItems: MenuItem[] = [
    {
      label: "Profile",
      icon: "pi pi-user",
      command: () => {
        window.location.href = "/dashboard/profile";
      },
    },
    { separator: true },
    {
      label: "Update Password",
      icon: "pi pi-lock",
      command: () => {
        window.location.href = "/dashboard/update-password";
      },
    },
    { separator: true },
    {
      label: "Log out",
      icon: "pi pi-sign-out",
      command: handleLogout,
    },
  ];

  const roleLabel =
    role === "ADMIN"
      ? "Administrator"
      : role === "MANAGER"
        ? "Manager"
        : role === "STORE"
          ? "Store"
          : "Cashier";

  const pageTitle = "Amp Product Management System";

  const toggleSidebar = () => {
    try {
      const next = !collapsed;
      setCollapsed(next);
      window.localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      window.dispatchEvent(new Event("sidebarToggle"));
    } catch (e) {
      console.log("Error toggling sidebar", e);
    }
  };

  const navStyle: React.CSSProperties = {
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    padding: isMobile ? "8px 12px" : "12px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 4px 16px rgba(15, 28, 53, 0.05)",
    position: "fixed",
    top: 0,
    left: isMobile ? 0 : collapsed ? "86px" : "264px",
    right: 0,
    height: isMobile ? "64px" : "72px",
    transition: "left 0.28s ease, padding 0.2s",
    zIndex: 999,
  };

  return (
    <nav style={navStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 16,
          flexWrap: "wrap",
        }}
      >
        <Button
          icon="pi pi-bars"
          rounded
          text
          severity="secondary"
          onClick={toggleSidebar}
          className="nav-icon-btn"
          style={{ color: "var(--brand-primary)" }}
        />

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: isMobile ? 16 : 20,
              fontWeight: 700,
              color: "var(--brand-primary-dark)",
            }}
          >
            {pageTitle}
          </h1>
          {!isMobile && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              Welcome back, manage Amp Product operations
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 12,
        }}
      >
        {!isMobile && (
          <div
            style={{
              width: 1,
              height: 32,
              background: "var(--border)",
              margin: "0 8px",
            }}
          />
        )}
        {/* {role === "STORE" && (
          <Button
            icon="pi pi-cog"
            rounded
            text
            severity="secondary"
            onClick={() => router.push("/dashboard/store-settings")}
            className="nav-icon-btn"
            style={{ color: "var(--brand-primary)" }}
            tooltip="Store Settings"
            tooltipOptions={{ position: "bottom" }}
          />
        )} */}
        <NotificationBell enabled={role === "STORE"} />
        <div>
          <Menu
            className="amp-user-menu"
            model={userMenuItems}
            popup
            ref={menuRef}
          />
          <div
            onClick={(e) => menuRef.current?.toggle(e)}
            className="amp-user-trigger"
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 8 : 12,
              padding: isMobile ? "4px 8px" : "6px 14px 6px 6px",
              borderRadius: 999,
              cursor: "pointer",
              border: "1px solid var(--border)",
              background: "var(--surface-soft)",
            }}
          >
            <Avatar image={user.image} shape="circle" />

            {!isMobile && (
              <div style={{ lineHeight: 1.25 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    color: "var(--brand-primary-dark)",
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: roleColors[role] || "var(--brand-primary)",
                  }}
                >
                  {roleLabel}
                </div>
              </div>
            )}

            <i
              className="pi pi-chevron-down"
              style={{ color: "var(--brand-blue)", fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Hover & popup menu theming */}
      <style jsx global>{`
        .nav-icon-btn:hover {
          background: var(--surface-soft) !important;
          color: var(--brand-primary) !important;
        }
        .amp-user-trigger:hover {
          border-color: var(--brand-blue) !important;
          box-shadow: 0 4px 14px rgba(33, 150, 211, 0.15);
        }
        .amp-user-menu.p-menu {
          border-radius: 14px !important;
          border: 1px solid var(--border) !important;
          box-shadow: var(--shadow) !important;
          padding: 6px !important;
          min-width: 200px;
        }
        .amp-user-menu .p-menuitem-link {
          border-radius: 10px !important;
          color: var(--foreground) !important;
          gap: 10px;
        }
        .amp-user-menu .p-menuitem-link:hover {
          background: var(--surface-soft) !important;
          color: var(--brand-primary) !important;
        }
        .amp-user-menu .p-menuitem-icon {
          color: var(--brand-blue) !important;
        }
        .amp-user-menu .p-menuitem-separator {
          border-color: var(--border) !important;
          margin: 4px 0;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
