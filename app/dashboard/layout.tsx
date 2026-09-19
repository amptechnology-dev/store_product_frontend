"use client";

import DashboardLayout from "@/components/Layout"


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  children,
}) => {
  
  return (
    <DashboardLayout>
        {children}
    </DashboardLayout>
  );
};

export default Layout;
