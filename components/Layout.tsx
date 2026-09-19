"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Role, useProfileStore } from "@/lib/store/profileStore"
import "primeicons/primeicons.css";
interface LayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    image: string;
  };
}

const Layout: React.FC<LayoutProps> = ({
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { profile, loading, error, fetchProfile } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  console.log("Profile Data:", profile, "Loading:", loading, "Error:", error);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    } catch (e) {
      console.log("Error reading sidebar state", e);
    }

    // Detect mobile
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Listen for sidebar toggle
    const handleToggleEvent = () => {
      const v = window.localStorage.getItem("sidebarCollapsed");
      setCollapsed(v === "1");
    };

    window.addEventListener("sidebarToggle", handleToggleEvent);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("sidebarToggle", handleToggleEvent);
    };
  }, []);


  const role: Role = profile?.role ?? "ADMIN";
  const name = profile?.name ?? "ADMIN"
  const image = "/img/avatars/avatar-2.jpg"
  const email = profile?.email ?? "admin@gmail.com"

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" ,overflowX: "hidden",}}>
      {/* Sidebar - Fixed */}
      <Sidebar user={{ name: name, email: email, image: image }} role={role} />
      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: isMobile ? "0" : (collapsed ? "88px" : "260px"),
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Navbar - Fixed */}
        <Navbar role={role} user={{ name: name, image: image }} />

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            marginTop: "72px", // Height of navbar
            padding: isMobile ? "16px" : "20px",
            overflowY: "auto",
            width: isMobile ? "100vw" : (collapsed ? "calc(100vw - 88px)" : "calc(100vw - 260px)"),
          }}
        >
        {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
