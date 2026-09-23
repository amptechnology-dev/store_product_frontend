"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { formatDate } from "@/helper/DateTime";
import { useProfileStore } from "@/lib/store/profileStore";

// ---------- Types (match dashboard.controller.js response shape) ----------

type OrderStatusBreakdown = {
  PENDING: number;
  CONFIRMED: number;
  SHIPPED: number;
  DELIVERED: number;
  CANCELLED: number;
};

type AdminDashboardData = {
  success: boolean;
  stores: {
    total: number;
    todayRegistered: number;
    verified: number;
    unverified: number;
    active: number;
    inactive: number;
    featured: number;
  };
  users: {
    totalCustomers: number;
    todayRegisteredCustomers: number;
    totalStoreOwners: number;
  };
  products: {
    total: number;
    verified: number;
    pendingVerification: number;
  };
  orders: {
    total: number;
    today: number;
    statusBreakdown: OrderStatusBreakdown;
    totalRevenue: number;
  };
  recentStores: {
    _id: string;
    storeName: string;
    storeUniqueId: string;
    isVerify: boolean;
    isActive: boolean;
    createdAt: string;
  }[];
};

type LowStockProduct = {
  _id: string;
  name: string;
  productCode?: string;
  variantId: string;
  size?: string | null;
  weight?: string | null;
  stock: number;
};

type StoreDashboardData = {
  success: boolean;
  store: {
    _id: string;
    storeName: string;
    storeUniqueId: string;
    isVerify: boolean;
    isActive: boolean;
  };
  orders: {
    total: number;
    today: number;
    yesterday: number;
    statusBreakdown: OrderStatusBreakdown;
    totalRevenue: number;
    todayRevenue: number;
  };
  products: {
    total: number;
    active: number;
    verified: number;
    outOfStockVariants: number;
    lowStockThreshold: number;
    lowStockProducts: LowStockProduct[];
  };
  recentOrders: {
    _id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    totalItems: number;
    createdAt: string;
  }[];
};

// ---------- Shared UI bits ----------

const StatCard = ({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: string | number;
  icon: string;
  gradient: string;
}) => (
  <div
    className={`relative overflow-hidden rounded-lg shadow-sm p-3 ${gradient} hover:shadow-md transition-shadow duration-200`}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-white/80 text-[11px] font-medium truncate">{title}</div>
        <div className="text-lg sm:text-xl font-bold text-white mt-0.5">{value}</div>
      </div>
      <div className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg shrink-0">
        <i className={`${icon} text-white text-base`}></i>
      </div>
    </div>
  </div>
);

const StatusBarChart = ({ breakdown }: { breakdown: OrderStatusBreakdown }) => {
  const entries: [string, number, string][] = [
    ["PENDING", breakdown.PENDING, "#f59e0b"],
    ["CONFIRMED", breakdown.CONFIRMED, "#3b82f6"],
    ["SHIPPED", breakdown.SHIPPED, "#8b5cf6"],
    ["DELIVERED", breakdown.DELIVERED, "#10b981"],
    ["CANCELLED", breakdown.CANCELLED, "#ef4444"],
  ];
  const max = Math.max(...entries.map((e) => e[1]), 1);

  return (
    <div className="space-y-2.5">
      {entries.map(([label, value, color]) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-700">{label}</span>
            <span className="font-bold" style={{ color }}>
              {value}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyState = ({ label }: { label: string }) => (
  <div className="text-center py-5 text-gray-400">
    <i className="pi pi-inbox text-3xl mb-2"></i>
    <div className="text-sm">{label}</div>
  </div>
);

const SectionCard = ({
  icon,
  iconGradient,
  title,
  children,
}: {
  icon: string;
  iconGradient: string;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
    <div className="flex items-center gap-2 mb-3">
      <div className={`${iconGradient} p-1.5 rounded-lg`}>
        <i className={`${icon} text-white text-sm`}></i>
      </div>
      <h3 className="text-sm sm:text-base font-bold text-gray-800">{title}</h3>
    </div>
    {children}
  </div>
);

// ---------- Admin view ----------

const AdminDashboardView = ({ data }: { data: AdminDashboardData }) => (
  <>
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      <StatCard title="Total Stores" value={data.stores.total} icon="pi pi-shop" gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
      <StatCard title="Registered Today" value={data.stores.todayRegistered} icon="pi pi-calendar-plus" gradient="bg-gradient-to-br from-green-500 to-green-600" />
      <StatCard title="Verified" value={data.stores.verified} icon="pi pi-verified" gradient="bg-gradient-to-br from-purple-500 to-purple-600" />
      <StatCard title="Pending Verify" value={data.stores.unverified} icon="pi pi-clock" gradient="bg-gradient-to-br from-orange-500 to-orange-600" />
      <StatCard title="Active" value={data.stores.active} icon="pi pi-check-circle" gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      <StatCard title="Inactive" value={data.stores.inactive} icon="pi pi-times-circle" gradient="bg-gradient-to-br from-red-500 to-red-600" />
      <StatCard title="Featured" value={data.stores.featured} icon="pi pi-star" gradient="bg-gradient-to-br from-pink-500 to-pink-600" />
      <StatCard title="Store Owners" value={data.users.totalStoreOwners} icon="pi pi-user" gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCard title="Customers" value={data.users.totalCustomers} icon="pi pi-users" gradient="bg-gradient-to-br from-cyan-500 to-cyan-600" />
      <StatCard title="New Today" value={data.users.todayRegisteredCustomers} icon="pi pi-user-plus" gradient="bg-gradient-to-br from-teal-500 to-teal-600" />
      <StatCard title="Products" value={data.products.total} icon="pi pi-box" gradient="bg-gradient-to-br from-violet-500 to-violet-600" />
      <StatCard title="Pending Verify" value={data.products.pendingVerification} icon="pi pi-hourglass" gradient="bg-gradient-to-br from-amber-500 to-amber-600" />
    </div>

    <div className="grid grid-cols-3 gap-2">
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-sm p-3 text-white">
        <div className="text-[11px] opacity-90">Total Revenue</div>
        <div className="text-lg sm:text-xl font-bold">₹{data.orders.totalRevenue.toLocaleString()}</div>
      </div>
      <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-sm p-3 text-white">
        <div className="text-[11px] opacity-90">Total Orders</div>
        <div className="text-lg sm:text-xl font-bold">{data.orders.total.toLocaleString()}</div>
      </div>
      <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-sm p-3 text-white">
        <div className="text-[11px] opacity-90">Today's Orders</div>
        <div className="text-lg sm:text-xl font-bold">{data.orders.today.toLocaleString()}</div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SectionCard icon="pi pi-chart-bar" iconGradient="bg-gradient-to-br from-orange-500 to-red-600" title="Order Status Breakdown">
        <StatusBarChart breakdown={data.orders.statusBreakdown} />
      </SectionCard>

      <SectionCard icon="pi pi-shop" iconGradient="bg-gradient-to-br from-blue-500 to-indigo-600" title="Recently Registered Stores">
        {data.recentStores.length === 0 ? (
          <EmptyState label="No recent stores" />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.recentStores.map((s, idx) => (
              <div
                key={s._id}
                className="flex items-center justify-between border-l-4 border-blue-500 bg-blue-50/60 rounded-md p-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="bg-blue-100 text-blue-600 font-bold w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 text-sm truncate">{s.storeName}</div>
                    <div className="text-[11px] text-gray-500 truncate">{s.storeUniqueId}</div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1">
                      <i className="pi pi-calendar text-[10px]"></i>
                      {formatDate(s.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.isVerify ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {s.isVerify ? "Verified" : "Pending"}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  </>
);

// ---------- Store view ----------

const StoreDashboardView = ({ data }: { data: StoreDashboardData }) => (
  <>
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 flex items-center justify-between border border-gray-100">
      <div className="min-w-0">
        <div className="text-base sm:text-lg font-bold text-gray-800 truncate">{data.store.storeName}</div>
        <div className="text-xs text-gray-500">{data.store.storeUniqueId}</div>
      </div>
      <div className="flex gap-2 shrink-0">
        <span className={`text-xs px-2 py-1 rounded-full ${data.store.isVerify ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {data.store.isVerify ? "Verified" : "Pending"}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${data.store.isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
          {data.store.isActive ? "Active" : "Inactive"}
        </span>
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <StatCard title="Total Orders" value={data.orders.total} icon="pi pi-shopping-bag" gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
      <StatCard title="Today's Orders" value={data.orders.today} icon="pi pi-calendar-plus" gradient="bg-gradient-to-br from-green-500 to-green-600" />
      <StatCard title="Yesterday" value={data.orders.yesterday} icon="pi pi-calendar-minus" gradient="bg-gradient-to-br from-purple-500 to-purple-600" />
      <StatCard title="Total Revenue" value={`₹${data.orders.totalRevenue.toLocaleString()}`} icon="pi pi-wallet" gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
      <StatCard title="Today's Revenue" value={`₹${data.orders.todayRevenue.toLocaleString()}`} icon="pi pi-chart-line" gradient="bg-gradient-to-br from-cyan-500 to-cyan-600" />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCard title="Total Products" value={data.products.total} icon="pi pi-box" gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" />
      <StatCard title="Active" value={data.products.active} icon="pi pi-check-circle" gradient="bg-gradient-to-br from-teal-500 to-teal-600" />
      <StatCard title="Verified" value={data.products.verified} icon="pi pi-verified" gradient="bg-gradient-to-br from-violet-500 to-violet-600" />
      <StatCard title="Out of Stock" value={data.products.outOfStockVariants} icon="pi pi-exclamation-triangle" gradient="bg-gradient-to-br from-red-500 to-red-600" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SectionCard icon="pi pi-chart-bar" iconGradient="bg-gradient-to-br from-orange-500 to-red-600" title="Order Status Breakdown">
        <StatusBarChart breakdown={data.orders.statusBreakdown} />
      </SectionCard>

      <SectionCard
        icon="pi pi-exclamation-triangle"
        iconGradient="bg-gradient-to-br from-amber-500 to-orange-600"
        title={`Low Stock (≤ ${data.products.lowStockThreshold})`}
      >
        {data.products.lowStockProducts.length === 0 ? (
          <EmptyState label="No low stock items" />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.products.lowStockProducts.map((p) => (
              <div
                key={p.variantId}
                className="flex items-center justify-between border-l-4 border-amber-500 bg-amber-50/60 rounded-md p-2.5"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {p.productCode} {p.size ? `• ${p.size}` : ""} {p.weight ? `• ${p.weight}` : ""}
                  </div>
                </div>
                <span className={`text-xs font-bold shrink-0 ${p.stock === 0 ? "text-red-600" : "text-amber-600"}`}>
                  {p.stock} left
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>

    <SectionCard icon="pi pi-list" iconGradient="bg-gradient-to-br from-blue-500 to-indigo-600" title="Recent Orders">
      {data.recentOrders.length === 0 ? (
        <EmptyState label="No recent orders" />
      ) : (
        <div className="space-y-2">
          {data.recentOrders.map((o, idx) => (
            <div
              key={o._id}
              className="flex items-center justify-between border-l-4 border-blue-500 bg-blue-50/60 rounded-md p-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="bg-blue-100 text-blue-600 font-bold w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{o.orderNumber}</div>
                  <div className="text-[11px] text-gray-500">{o.totalItems} items • {o.status}</div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1">
                    <i className="pi pi-calendar text-[10px]"></i>
                    {formatDate(o.createdAt)}
                  </div>
                </div>
              </div>
              <div className="text-sm sm:text-base font-bold text-blue-700 shrink-0">₹{o.totalAmount.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  </>
);

// ---------- Page ----------

export default function Page() {
  const [apiLoading, setApiLoading] = useState(false);
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [storeData, setStoreData] = useState<StoreDashboardData | null>(null);

  // same store the layout/Sidebar already reads role from
  const { profile, loading: profileLoading, fetchProfile } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const role = profile?.role;

  useEffect(() => {
    if (role) fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const fetchStats = async () => {
    if (!role) return;
    try {
      setApiLoading(true);
      const endpoint = role === "ADMIN" ? "/api/dashboard/admin" : "/api/dashboard/store";
      const res = await axiosInstance.get(endpoint);
      if (role === "ADMIN") {
        setAdminData(res.data as AdminDashboardData);
      } else {
        setStoreData(res.data as StoreDashboardData);
      }
    } catch (err: any) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.message || "Failed to load dashboard stats");
      else toast.error("Failed to load dashboard stats");
    } finally {
      setApiLoading(false);
    }
  };

  const loading = profileLoading || apiLoading;

  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {role === "ADMIN" ? "Admin Dashboard" : "Store Dashboard"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="bg-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-shadow flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 text-sm"
        >
          <i className={`pi pi-refresh text-blue-600 ${loading ? "animate-spin" : ""}`}></i>
          <span className="text-gray-700 font-medium">Refresh</span>
        </button>
      </div>

      {!role && !profileLoading && (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
          Could not determine your role. Please log in again.
        </div>
      )}

      {role === "ADMIN" && adminData && <AdminDashboardView data={adminData} />}
      {role === "STORE" && storeData && <StoreDashboardView data={storeData} />}

      {loading && !adminData && !storeData && (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-400">Loading dashboard...</div>
      )}

      <ToastContainer position="top-right" />
    </div>
  );
}