"use client";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { ToastContainer, toast } from "react-toastify";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import { Dialog } from "primereact/dialog";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import AdsForm from "@/components/ads/AdsForm";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductInfo = {
  _id: string;
  name: string;
  images?: string[];
  description?: string;
  sellingPrice?: number;
  isActive?: boolean;
  isVerified?: boolean;
  storeId?: {
    _id: string;
    storeName: string;
  };
};

type AdRow = {
  _id: string;
  productId?: ProductInfo;
  storeId?: string;
  rank?: number;
  expiryDate?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
    <div className="text-6xl mb-4">📢</div>
    <h2 className="text-xl font-semibold text-gray-700">No Ads Found</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      There are no advertisements to display right now.
    </p>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
function Page() {
  const [adsData, setAdsData] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visible, setVisible] = useState(false);
  const [editAdId, setEditAdId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const adsDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/ads");
      setAdsData(res.data.ads || []);
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

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (rowData: AdRow) => {
    confirmDialog({
      message: `Are you sure you want to delete this ad?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(`/api/ads/${rowData._id}`);
          toast.success(res.data.message || "Ad deleted successfully");
          adsDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    adsDataGet();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredAds = useMemo(() => {
    if (!debouncedSearch) return adsData;
    const term = debouncedSearch.toLowerCase();
    return adsData.filter((ad) =>
      [
        ad.productId?.name,
        ad.productId?.description,
        ad.productId?.storeId?.storeName,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [adsData, debouncedSearch]);

  // ── Column Templates ───────────────────────────────────────────────────────

  // Product image
  const productImageTemplate = (rowData: AdRow) => {
    const img = rowData.productId?.images?.[0];
    if (img) {
      return (
        <div className="h-14 w-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 mx-auto">
          <img
            src={img}
            alt={rowData.productId?.name}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }
    return (
      <div className="h-14 w-20 rounded-xl flex items-center justify-center bg-gray-100 text-gray-400 mx-auto">
        <i className="pi pi-image text-2xl" />
      </div>
    );
  };

  // Product info
  const productTemplate = (rowData: AdRow) => {
    const p = rowData.productId;
    if (!p) return <span className="text-gray-400 italic text-sm">—</span>;
    return (
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
        {p.sellingPrice !== undefined && (
          <p className="text-xs text-amber-600 font-semibold">
            ₹{p.sellingPrice.toLocaleString("en-IN")}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          {p.isVerified && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              ✓ Verified
            </span>
          )}
          {!p.isActive && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              Inactive
            </span>
          )}
        </div>
      </div>
    );
  };

  // Store name
  const storeTemplate = (rowData: AdRow) => {
    const storeName = rowData.productId?.storeId?.storeName;
    if (!storeName)
      return <span className="text-gray-400 italic text-sm">—</span>;
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-600">
          {storeName.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-semibold text-slate-700 truncate">
          {storeName}
        </span>
      </div>
    );
  };

  // Rank
  const rankTemplate = (rowData: AdRow) => (
    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
      {rowData.rank ?? "—"}
    </span>
  );

  // Expiry date
  const expiryTemplate = (rowData: AdRow) => {
    if (!rowData.expiryDate)
      return <span className="text-gray-400 italic text-sm">—</span>;
    const date = new Date(rowData.expiryDate);
    const isExpired = date < new Date();
    return (
      <span
        className={`text-sm font-medium ${
          isExpired ? "text-red-500" : "text-slate-600"
        }`}
      >
        {date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
        {isExpired && (
          <span className="ml-1 text-[10px] font-bold text-red-400">
            (Expired)
          </span>
        )}
      </span>
    );
  };

  // Status
  const statusTemplate = (rowData: AdRow) => (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
        rowData.isActive
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-600"
      }`}
    >
      {rowData.isActive ? "● Active" : "● Inactive"}
    </span>
  );

  // ── Table Header ───────────────────────────────────────────────────────────
  const header = (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
      style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}
    >
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800">
          Advertisements
        </h2>
        <p className="text-xs text-gray-700">
          {adsData.length} ad{adsData.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-stretch sm:items-center w-full sm:w-auto">
        <IconField
          iconPosition="left"
          className="w-full sm:w-auto flex-1 sm:flex-none"
        >
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product or store..."
            className="p-inputtext-sm w-full"
          />
        </IconField>

        <Button
          label="Add Ad"
          icon="pi pi-plus"
          onClick={() => {
            setEditAdId(null);
            setVisible(true);
          }}
          className="w-full sm:w-auto"
          style={{
            background: "#fff",
            color: "#d89f00",
            border: "1px solid #e0ac1f",
          }}
        />

        <Button
          label="Refresh"
          icon="pi pi-refresh"
          onClick={adsDataGet}
          className="w-full sm:w-auto"
          style={{
            background: "#fff",
            color: "#d89f00",
            border: "1px solid #e0ac1f",
          }}
        />
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {header}

        {filteredAds.length === 0 && !loading && <EmptyState />}

        {(filteredAds.length > 0 || loading) && (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
            <DataTable
              value={filteredAds}
              loading={loading}
              stripedRows
              scrollable
              scrollHeight="flex"
              responsiveLayout="scroll"
              className="p-datatable-sm"
              emptyMessage="No ads found"
              dataKey="_id"
              tableStyle={{ minWidth: "900px" }}
            >
              <Column
                header="#"
                body={(_, options) => options.rowIndex + 1}
                style={{ width: "55px" }}
              />

              <Column
                header="Image"
                body={productImageTemplate}
                style={{ width: "110px" }}
              />

              <Column
                header="Product"
                body={productTemplate}
                style={{ minWidth: "180px" }}
              />

              <Column
                header="Store"
                body={storeTemplate}
                style={{ minWidth: "160px" }}
              />

              <Column
                header="Rank"
                body={rankTemplate}
                field="rank"
                sortable
                style={{ width: "80px" }}
              />

              <Column
                header="Expiry"
                body={expiryTemplate}
                style={{ width: "150px" }}
              />

              <Column
                header="Status"
                body={statusTemplate}
                field="isActive"
                style={{ width: "110px" }}
              />

              <Column
                field="createdAt"
                header="Created"
                body={(rowData: AdRow) => (
                  <span className="text-sm text-gray-500">
                    {formatDate(rowData.createdAt || "")}
                  </span>
                )}
                style={{ width: "140px" }}
              />

              <Column
                header="Actions"
                style={{ width: "150px" }}
                body={(rowData: AdRow) => (
                  <div className="flex gap-2">
                    <Button
                      icon="pi pi-pencil"
                      label="Edit"
                      onClick={() => {
                        setEditAdId(rowData._id);
                        setVisible(true);
                      }}
                      style={{
                        background: "#ffcf00",
                        color: "#1d232f",
                        border: "1px solid #e0ac1f",
                        padding: "4px 10px",
                        fontSize: "12px",
                      }}
                    />
                    <Button
                      icon="pi pi-trash"
                      label="Delete"
                      severity="danger"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={() => handleDelete(rowData)}
                    />
                  </div>
                )}
              />
            </DataTable>
          </div>
        )}

        {/* ── Dialog ── */}
        <Dialog
          header={
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-3 rounded-t-lg">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <i className="pi pi-megaphone text-white text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editAdId ? "Edit Ad" : "Add New Ad"}
                </h2>
                <p className="text-sm text-white/90">
                  {editAdId
                    ? "Update advertisement details"
                    : "Create a new advertisement"}
                </p>
              </div>
            </div>
          }
          visible={visible}
          style={{ width: "60vw" }}
          contentStyle={{ maxHeight: "85vh", overflow: "auto" }}
          onHide={() => {
            setVisible(false);
            setEditAdId(null);
          }}
        >
          <AdsForm
            adId={editAdId}
            onClose={() => {
              setVisible(false);
              setEditAdId(null);
            }}
            onSuccess={() => {
              adsDataGet();
              setVisible(false);
              setEditAdId(null);
            }}
          />
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;