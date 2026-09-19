"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { formatDate } from "@/helper/DateTime";

type DashboardData = {
  totals: {
    totalUsers: number;
    totalWorkers: number;
    totalProducts: number;
    totalTanks: number;
    totalNozzles: number;
    totalSuppliers: number;
  };
  sales: {
    totalSalesAmount: number;
    totalLitresSold: number;
    totalProductsSold: number;
    todaySales: number;
    monthlySales: number;
  };
  purchase: {
    totalPurchaseAmount: number;
    totalPaid: number;
    totalDue: number;
    todayPurchase: number;
    monthlyPurchase: number;
  };
  stock: {
    totalStockQuantity: number;
  };
  finance: {
    totalIncome: number;
    totalExpense: number;
    profit: number;
  };
  recentSales: any[];
  recentPurchases: any[];
};

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/dashboard/dashboard-stats");
      const data = res.data?.data;
      if (data) {
        setDashboardData(data);
      }
    } catch (err: any) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.message || "Failed to load dashboard stats");
      else toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  const ColorfulStatCard = ({
    title,
    value,
    icon,
    gradient,
    note,
  }: {
    title: string;
    value: string | number;
    icon: string;
    gradient: string;
    note?: string;
  }) => (
    <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 ${gradient} transform hover:scale-105 transition-transform duration-300`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-white opacity-10"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="text-white/80 text-xs sm:text-sm font-medium">{title}</div>
          <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-2.5 rounded-lg sm:rounded-xl">
            <i className={`${icon} text-white text-lg sm:text-2xl`}></i>
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
        {note && <div className="text-xs text-white/70 mt-1 sm:mt-2">{note}</div>}
      </div>
    </div>
  );

  const DonutChart = ({ value, max, label, color }: { value: number; max: number; label: string; color: string }) => {
    const percentage = (value / max) * 100;
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <svg width="100" height="100" viewBox="0 0 120 120" className="transform -rotate-90 w-20 h-20 sm:w-28 sm:h-28">
          <circle cx="60" cy="60" r="40" stroke="#e5e7eb" strokeWidth="10" fill="none" />
          <circle
            cx="60"
            cy="60"
            r="40"
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="text-center mt-1 sm:mt-2">
          <div className="text-xl sm:text-2xl font-bold" style={{ color }}>{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    );
  };

  const BarChart = ({ items, labels, colors }: { items: number[]; labels: string[]; colors: string[] }) => {
    const max = Math.max(...items, 1);
    return (
      <div className="space-y-3">
        {items.map((v, i) => {
          const percentage = (v / max) * 100;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{labels[i]}</span>
                <span className="font-bold" style={{ color: colors[i] }}>{v}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%`, backgroundColor: colors[i] }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          onClick={fetchStats}
          className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <i className="pi pi-refresh text-blue-600"></i>
          <span className="text-gray-700 font-medium">Refresh</span>
        </button>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <ColorfulStatCard
          title="Total Users"
          value={dashboardData?.totals?.totalUsers ?? "—"}
          icon="pi pi-users"
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <ColorfulStatCard
          title="Workers"
          value={dashboardData?.totals?.totalWorkers ?? "—"}
          icon="pi pi-user"
          gradient="bg-gradient-to-br from-green-500 to-green-600"
        />
        <ColorfulStatCard
          title="Products"
          value={dashboardData?.totals?.totalProducts ?? "—"}
          icon="pi pi-box"
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <ColorfulStatCard
          title="Tanks"
          value={dashboardData?.totals?.totalTanks ?? "—"}
          icon="pi pi-database"
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
        />
        <ColorfulStatCard
          title="Suppliers"
          value={dashboardData?.totals?.totalSuppliers ?? "—"}
          icon="pi pi-building"
          gradient="bg-gradient-to-br from-pink-500 to-pink-600"
        />
        <ColorfulStatCard
          title="Nozzles"
          value={dashboardData?.totals?.totalNozzles ?? "—"}
          icon="pi pi-compass"
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
        />
      </div>

      {/* Sales Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
              <i className="pi pi-shopping-bag text-2xl sm:text-3xl"></i>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm opacity-90">Total Sales</div>
              <div className="text-xl sm:text-2xl font-bold">₹{dashboardData?.sales?.totalSalesAmount?.toLocaleString() ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
              <i className="pi pi-calendar-plus text-2xl sm:text-3xl"></i>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm opacity-90">Today's Sales</div>
              <div className="text-xl sm:text-2xl font-bold">₹{dashboardData?.sales?.todaySales?.toLocaleString() ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
              <i className="pi pi-chart-line text-2xl sm:text-3xl"></i>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm opacity-90">Monthly Sales</div>
              <div className="text-xl sm:text-2xl font-bold">₹{dashboardData?.sales?.monthlySales?.toLocaleString() ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl">
              <i className="pi pi-inbox text-2xl sm:text-3xl"></i>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm opacity-90">Products Sold</div>
              <div className="text-xl sm:text-2xl font-bold">{dashboardData?.sales?.totalProductsSold?.toLocaleString() ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase & Finance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Purchase Stats */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
              <i className="pi pi-shopping-cart text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Purchase Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Total Purchase</div>
              <div className="text-lg sm:text-xl font-bold text-blue-700">₹{dashboardData?.purchase?.totalPurchaseAmount?.toLocaleString() ?? "—"}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Total Paid</div>
              <div className="text-lg sm:text-xl font-bold text-green-700">₹{dashboardData?.purchase?.totalPaid?.toLocaleString() ?? "—"}</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Total Due</div>
              <div className="text-lg sm:text-xl font-bold text-red-700">₹{dashboardData?.purchase?.totalDue?.toLocaleString() ?? "—"}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Today's Purchase</div>
              <div className="text-lg sm:text-xl font-bold text-purple-700">₹{dashboardData?.purchase?.todayPurchase?.toLocaleString() ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Finance Stats */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg">
              <i className="pi pi-wallet text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Financial Summary</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-transparent rounded-lg p-3 border-l-4 border-green-500">
              <div className="flex items-center gap-2">
                <i className="pi pi-arrow-up text-green-600 text-xl"></i>
                <span className="text-sm font-medium text-gray-700">Total Income</span>
              </div>
              <span className="text-lg font-bold text-green-700">₹{dashboardData?.finance?.totalIncome?.toLocaleString() ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between bg-gradient-to-r from-red-50 to-transparent rounded-lg p-3 border-l-4 border-red-500">
              <div className="flex items-center gap-2">
                <i className="pi pi-arrow-down text-red-600 text-xl"></i>
                <span className="text-sm font-medium text-gray-700">Total Expense</span>
              </div>
              <span className="text-lg font-bold text-red-700">₹{dashboardData?.finance?.totalExpense?.toLocaleString() ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-transparent rounded-lg p-3 border-l-4 border-blue-500">
              <div className="flex items-center gap-2">
                <i className="pi pi-chart-line text-blue-600 text-xl"></i>
                <span className="text-sm font-medium text-gray-700">Profit</span>
              </div>
              <span className="text-lg font-bold text-blue-700">₹{dashboardData?.finance?.profit?.toLocaleString() ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-transparent rounded-lg p-3 border-l-4 border-orange-500">
              <div className="flex items-center gap-2">
                <i className="pi pi-database text-orange-600 text-xl"></i>
                <span className="text-sm font-medium text-gray-700">Stock Quantity</span>
              </div>
              <span className="text-lg font-bold text-orange-700">{dashboardData?.stock?.totalStockQuantity?.toLocaleString() ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales and Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
              <i className="pi pi-shopping-bag text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Recent Sales</h3>
          </div>
          {!dashboardData?.recentSales || dashboardData.recentSales.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-400">
              <i className="pi pi-inbox text-4xl sm:text-5xl mb-2 sm:mb-3"></i>
              <div className="text-sm sm:text-base">No recent sales</div>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
              {dashboardData.recentSales.map((s, idx) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between border-l-4 border-green-500 bg-gradient-to-r from-green-50 to-transparent rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="bg-green-100 text-green-600 font-bold w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm sm:text-base">{s.invoiceNumber}</div>
                      <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                        <i className="pi pi-calendar text-xs"></i>
                        {formatDate(s.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base sm:text-xl font-bold text-green-700">₹{s.totalAmount?.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
              <i className="pi pi-shopping-cart text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Recent Purchases</h3>
          </div>
          {!dashboardData?.recentPurchases || dashboardData.recentPurchases.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-400">
              <i className="pi pi-inbox text-4xl sm:text-5xl mb-2 sm:mb-3"></i>
              <div className="text-sm sm:text-base">No recent purchases</div>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
              {dashboardData.recentPurchases.map((p, idx) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="bg-blue-100 text-blue-600 font-bold w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm sm:text-base">{p.invoiceNo}</div>
                      <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                        <i className="pi pi-building text-xs"></i>
                        {p.supplierName}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <i className="pi pi-calendar text-xs"></i>
                        {formatDate(p.purchaseDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base sm:text-xl font-bold text-blue-700">₹{p.totalAmount?.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Donut Charts */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg">
              <i className="pi pi-chart-pie text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">System Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <DonutChart
              value={dashboardData?.totals?.totalUsers ?? 0}
              max={Math.max(dashboardData?.totals?.totalUsers ?? 1, 10)}
              label="Users"
              color="#3b82f6"
            />
            <DonutChart
              value={dashboardData?.totals?.totalWorkers ?? 0}
              max={Math.max(dashboardData?.totals?.totalWorkers ?? 1, 10)}
              label="Workers"
              color="#10b981"
            />
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg">
              <i className="pi pi-chart-bar text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Inventory</h3>
          </div>
          {dashboardData?.totals ? (
            <BarChart
              items={[
                dashboardData.totals.totalProducts,
                dashboardData.totals.totalTanks,
                dashboardData.totals.totalNozzles,
                dashboardData.totals.totalSuppliers
              ]}
              labels={["Products", "Tanks", "Nozzles", "Suppliers"]}
              colors={["#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6"]}
            />
          ) : (
            <div className="text-gray-400 text-center py-4">Loading...</div>
          )}
        </div>
      </div>

      <ToastContainer position="top-right" />
    </div>
  );
}