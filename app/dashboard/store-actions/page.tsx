"use client";

import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "@/service/axios.service";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StoreRef {
  _id: string;
  storeName: string;
  contactNo: string;
  storeUniqueId: string;
}

interface UserRef {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "USER" | "STORE" | "ADMIN";
}

interface ViewEntry {
  _id: string;
  storeId: StoreRef;
  userId: UserRef;
  createdAt: string;
  updatedAt: string;
}

type ActionType = "WHATSAPP" | "CALL" | "DIRECTION" | "SHARE" | "WEBSITE";

interface ActionEntry {
  _id: string;
  storeId: StoreRef;
  userId: UserRef;
  actionType: ActionType;
  createdAt: string;
  updatedAt: string;
}

interface StoreActionsResponse {
  totalViews: number;
  totalActions: number;
  views: ViewEntry[];
  actions: ActionEntry[];
}

// ─── Unified timeline row ───────────────────────────────────────────────────

type TimelineKind = "VIEW" | ActionType;

interface TimelineRow {
  id: string;
  kind: TimelineKind;
  store: StoreRef;
  user: UserRef;
  timestamp: string;
}

// ─── Static config ──────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<TimelineKind, { label: string; icon: string; ramp: string }> = {
  VIEW: { label: "Viewed store", icon: "pi-eye", ramp: "slate" },
  WHATSAPP: { label: "WhatsApp", icon: "pi-whatsapp", ramp: "emerald" },
  CALL: { label: "Called", icon: "pi-phone", ramp: "blue" },
  DIRECTION: { label: "Directions", icon: "pi-map-marker", ramp: "amber" },
  SHARE: { label: "Shared", icon: "pi-share-alt", ramp: "violet" },
  WEBSITE: { label: "Website visit", icon: "pi-globe", ramp: "cyan" },
};

const RAMP_CLASSES: Record<string, { bg: string; text: string; dot: string }> = {
  slate: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
};

const ROLE_BADGE: Record<UserRef["role"], { bg: string; text: string }> = {
  USER: { bg: "bg-slate-100", text: "text-slate-600" },
  STORE: { bg: "bg-indigo-50", text: "text-indigo-600" },
  ADMIN: { bg: "bg-rose-50", text: "text-rose-600" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

const formatRelative = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StoreActionsAdminPage() {
  const [data, setData] = useState<StoreActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | TimelineKind>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRef["role"]>("all");

  useEffect(() => {
    axiosInstance
      .get("/api/store-action")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load store activity. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const timeline: TimelineRow[] = useMemo(() => {
    if (!data) return [];
    const viewRows: TimelineRow[] = data.views.map((v) => ({
      id: v._id,
      kind: "VIEW",
      store: v.storeId,
      user: v.userId,
      timestamp: v.createdAt,
    }));
    const actionRows: TimelineRow[] = data.actions.map((a) => ({
      id: a._id,
      kind: a.actionType,
      store: a.storeId,
      user: a.userId,
      timestamp: a.createdAt,
    }));
    return [...viewRows, ...actionRows].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [data]);

  const filteredTimeline = useMemo(() => {
    const q = search.trim().toLowerCase();
    return timeline.filter((row) => {
      if (kindFilter !== "all" && row.kind !== kindFilter) return false;
      if (roleFilter !== "all" && row.user.role !== roleFilter) return false;
      if (q) {
        const haystack = `${row.user.name} ${row.user.email} ${row.store.storeName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [timeline, search, kindFilter, roleFilter]);

  const actionBreakdown = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.actions.forEach((a) => {
      counts[a.actionType] = (counts[a.actionType] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const uniqueUsers = useMemo(() => {
    if (!data) return 0;
    const ids = new Set<string>();
    data.views.forEach((v) => ids.add(v.userId._id));
    data.actions.forEach((a) => ids.add(a.userId._id));
    return ids.size;
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <i className="pi pi-spin pi-spinner mb-3 block text-3xl text-slate-400" />
          <p className="text-sm font-medium text-slate-500">Loading store activity…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <i className="pi pi-exclamation-triangle text-xl text-red-500" />
          </div>
          <p className="font-semibold text-slate-900">Couldn't load activity</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Analytics
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Store activity</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every view and action recorded against your stores, in one feed.
          </p>
        </div>

        {/* Metric cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-400">Total views</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{data.totalViews}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-400">Total actions</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{data.totalActions}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-400">Unique users</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{uniqueUsers}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-400">Top action</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {actionBreakdown[0]
                ? ACTION_CONFIG[actionBreakdown[0][0] as ActionType].label
                : "—"}
            </p>
          </div>
        </div>

        {/* Action breakdown pills */}
        {actionBreakdown.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {actionBreakdown.map(([type, count]) => {
              const cfg = ACTION_CONFIG[type as ActionType];
              const ramp = RAMP_CLASSES[cfg.ramp];
              return (
                <div
                  key={type}
                  className={`flex items-center gap-2 rounded-lg border border-slate-200 ${ramp.bg} px-3 py-2`}
                >
                  <i className={`pi ${cfg.icon} text-sm ${ramp.text}`} />
                  <span className={`text-xs font-semibold ${ramp.text}`}>{cfg.label}</span>
                  <span className="text-xs font-bold text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, email, or store"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-800 outline-none focus:border-slate-400"
            />
          </div>

          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all">All activity</option>
            {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all">All roles</option>
            <option value="USER">User</option>
            <option value="STORE">Store</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <p className="mb-3 text-xs text-slate-400">
          {filteredTimeline.length} of {timeline.length} events
        </p>

        {/* Timeline table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filteredTimeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <i className="pi pi-inbox mb-3 text-3xl text-slate-200" />
              <p className="text-sm font-medium text-slate-500">No matching activity</p>
              <p className="mt-1 text-xs text-slate-400">
                Try a different search term or clear your filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTimeline.map((row) => {
                const cfg = ACTION_CONFIG[row.kind];
                const ramp = RAMP_CLASSES[cfg.ramp];
                const roleBadge = ROLE_BADGE[row.user.role];

                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
                  >
                    {/* Action icon */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ramp.bg}`}
                    >
                      <i className={`pi ${cfg.icon} text-sm ${ramp.text}`} />
                    </div>

                    {/* User avatar */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
                      {initials(row.user.name)}
                    </div>

                    {/* Main content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                        <span className="font-semibold text-slate-900">{row.user.name}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${roleBadge.bg} ${roleBadge.text}`}
                        >
                          {row.user.role}
                        </span>
                        <span className="text-slate-500">{cfg.label.toLowerCase()}</span>
                        <span className="font-semibold text-slate-900">{row.store.storeName}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {row.user.email} · {row.store.storeUniqueId}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-slate-600">
                        {formatRelative(row.timestamp)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatDateTime(row.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}