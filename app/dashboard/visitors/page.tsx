"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-10">
    <div className="text-6xl mb-4">👀</div>
    <h2 className="text-xl font-semibold text-gray-700">No Visitors Yet</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      Jokhon kono user apnar store er link diye app e visit korbe, tara ekhane
      dekha jabe.
    </p>
  </div>
);

const formatDateTime = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
};

const stringToBg = (str?: string) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-orange-500",
  ];
  if (!str) return colors[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const orderStatusStyle: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const Avatar = ({
  name,
  picture,
  size = 40,
}: {
  name?: string;
  picture?: string;
  size?: number;
}) =>
  picture ? (
    <img
      src={picture}
      alt={name || "User"}
      style={{ width: size, height: size }}
      className="rounded-full object-cover"
    />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`rounded-full flex items-center justify-center text-white font-semibold ${stringToBg(name)}`}
    >
      {getInitials(name)}
    </div>
  );

const DetailItem = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
}) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
    <i className={`pi ${icon} text-blue-500 mt-1`} />
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-gray-500 m-0">
        {label}
      </p>
      <div className="text-sm font-medium text-gray-800 break-words">
        {value || "-"}
      </div>
    </div>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState<any[]>([]);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 10,
    total: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

  /* ================= STORES (filter dropdown) ================= */
  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get("/api/register/user-based-stores");
        setStores(res.data?.stores || []);
      } catch {
        setStores([]);
      }
    })();
  }, []);

  /* ================= FETCH VISITORS ================= */
  useEffect(() => {
    visitorsGet();
  }, [pagination.page, pagination.rows, debouncedSearch, selectedStore]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, selectedStore]);

  const visitorsGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/store-visit/visitors", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(selectedStore ? { storeId: selectedStore } : {}),
        },
      });

      setVisitors(res.data.visitors || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.totalVisitors || 0,
      }));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= DETAILS ================= */
  const openDetails = async (row: any) => {
    setDetail(null);
    setDetailVisible(true);
    try {
      setDetailLoading(true);
      const res = await axiosInstance.get(
        `/api/store-visit/visitors/${row._id}`,
      );
      setDetail(res.data.visitor);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load visitor details",
      );
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailVisible(false);
    setDetail(null);
  };

  /* ================= COLUMN TEMPLATES ================= */
  const userTemplate = (row: any) => (
    <div className="flex items-center gap-3">
      <Avatar name={row.user?.name} picture={row.user?.picture} />
      <div className="min-w-0">
        <div className="font-semibold text-gray-800">{row.user?.name}</div>
        <div className="text-xs text-gray-500">{row.user?.email}</div>
      </div>
    </div>
  );

  const storeTemplate = (row: any) => (
    <div>
      <div className="font-medium text-gray-800">{row.store?.storeName}</div>
      <div className="text-xs text-gray-500">{row.store?.storeUniqueId}</div>
    </div>
  );

  const statusTemplate = (row: any) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.user?.isActive
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {row.user?.isActive ? "Active" : "Inactive"}
    </span>
  );

  const actionTemplate = (row: any) => (
    <div onClick={(e) => e.stopPropagation()} className="flex">
      <Button
        icon="pi pi-eye"
        rounded
        text
        aria-label="View details"
        tooltip="View details"
        tooltipOptions={{ position: "left" }}
        onClick={() => openDetails(row)}
      />
    </div>
  );

  const header = (
    <div className="flex flex-wrap gap-3 justify-between items-center bg-blue-600 p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white m-0">Visitors</h2>
        <p className="text-sm text-blue-100 m-0">
          Users who visited your store through the store link
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {stores.length > 1 && (
          <Dropdown
            value={selectedStore}
            options={stores.map((s: any) => ({
              label: s.storeName,
              value: s._id,
            }))}
            onChange={(e) => setSelectedStore(e.value)}
            placeholder="All stores"
            showClear
            className="p-inputtext-sm"
          />
        )}
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search visitors"
            className="p-inputtext-sm"
          />
        </IconField>
      </div>
    </div>
  );

  const DetailHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-700 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
        <i className="pi pi-user text-white text-2xl"></i>
      </div>
      <div>
        <h2 className="text-xl font-bold text-white m-0">Visitor Details</h2>
        <p className="text-sm text-white/90 m-0">
          Full information about this visitor
        </p>
      </div>
    </div>
  );

  const u = detail?.user;
  const addr = u?.address;
  const addressText = addr
    ? [addr.addressLine, addr.area, addr.city, addr.state, addr.pincode, addr.country]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={visitors}
          header={header}
          lazy
          paginator
          className="visitors-table"
          rowClassName={() => "cursor-pointer"}
          onRowClick={(e) => openDetails(e.data)}
          first={(pagination.page - 1) * pagination.rows}
          rows={pagination.rows}
          totalRecords={pagination.total}
          loading={loading}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onPage={(e) =>
            setPagination((prev) => ({
              ...prev,
              page: (e.page ?? 0) + 1,
              rows: e.rows ?? prev.rows,
            }))
          }
          responsiveLayout="scroll"
          emptyMessage={EmptyState}
        >
          <Column header="Visitor" body={userTemplate} />
          <Column header="Phone" body={(row: any) => row.user?.phone || "-"} />
          <Column header="Store" body={storeTemplate} />
          <Column header="Status" body={statusTemplate} />
          <Column
            header="First Visit"
            body={(row: any) => formatDateTime(row.createdAt)}
          />
          <Column
            header="Last Visit"
            body={(row: any) => formatDateTime(row.lastVisitedAt)}
          />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        <Dialog
          header={DetailHeader}
          visible={detailVisible}
          style={{ width: "90vw", maxWidth: 720 }}
          onHide={closeDetails}
          draggable={false}
          blockScroll
        >
          {detailLoading || !detail ? (
            <div className="flex justify-center items-center py-16">
              <i className="pi pi-spin pi-spinner text-3xl text-blue-500" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <Avatar name={u?.name} picture={u?.picture} size={64} />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-800 m-0">
                    {u?.name}
                  </h3>
                  <p className="text-sm text-gray-500 m-0">{u?.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u?.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {u?.isActive ? "Active" : "Inactive"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u?.isVerified
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {u?.isVerified ? "Verified" : "Not verified"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-center">
                  <p className="text-2xl font-bold text-blue-700 m-0">
                    {detail.orderStats?.totalOrders ?? 0}
                  </p>
                  <p className="text-xs text-gray-600 m-0">
                    Orders from this store
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-center">
                  <p className="text-2xl font-bold text-blue-700 m-0">
                    ₹{detail.orderStats?.totalSpent ?? 0}
                  </p>
                  <p className="text-xs text-gray-600 m-0">
                    Total spent (excl. cancelled)
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem icon="pi-phone" label="Phone" value={u?.phone} />
                <DetailItem
                  icon="pi-sign-in"
                  label="Login Provider"
                  value={u?.provider}
                />
                <DetailItem
                  icon="pi-shop"
                  label="Visited Store"
                  value={`${detail.store?.storeName} (${detail.store?.storeUniqueId})`}
                />
                <DetailItem
                  icon="pi-calendar"
                  label="Joined App"
                  value={formatDateTime(u?.createdAt)}
                />
                <DetailItem
                  icon="pi-clock"
                  label="First Visit"
                  value={formatDateTime(detail.firstVisitedAt)}
                />
                <DetailItem
                  icon="pi-history"
                  label="Last Visit"
                  value={formatDateTime(detail.lastVisitedAt)}
                />
                <div className="sm:col-span-2">
                  <DetailItem
                    icon="pi-map-marker"
                    label="Address"
                    value={addressText}
                  />
                </div>
              </div>

              {/* Recent orders */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Recent Orders
                </h4>
                {detail.recentOrders?.length ? (
                  <div className="flex flex-col gap-2">
                    {detail.recentOrders.map((o: any) => (
                      <div
                        key={o._id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800 m-0">
                            Order #{o.orderNumber}
                          </p>
                          <p className="text-xs text-gray-500 m-0">
                            {formatDateTime(o.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">
                            ₹{o.totalAmount}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              orderStatusStyle[o.status] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Ei user ekhono ei store theke kono order kore ni.
                  </p>
                )}
              </div>
            </div>
          )}
        </Dialog>

        <ToastContainer position="top-right" />
      </div>

      {/* Blue table header + row hover */}
      <style jsx global>{`
        .visitors-table .p-datatable-thead > tr > th {
          background: #2563eb !important;
          color: #fff !important;
          border-color: #1d4ed8 !important;
          font-weight: 600;
        }
        .visitors-table .p-datatable-tbody > tr:hover {
          background: #eff6ff !important;
        }
      `}</style>
    </div>
  );
}

export default Page;