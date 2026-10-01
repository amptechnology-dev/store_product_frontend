"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { ToastContainer, toast } from "react-toastify";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { formatDate } from "@/helper/DateTime";
import { Dialog } from "primereact/dialog";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import AdsForm from "@/components/ads/AdsForm";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdRow = {
  _id: string;
  mediaUrl: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const VIDEO_URL_REGEX = /\.(mp4|webm|mov)(\?.*)?$/i;
const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_REGEX.test(url);

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
  const [visible, setVisible] = useState(false);
  const [editAdId, setEditAdId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<string[]>([]);

  // ── Fetch (silent = true hole table spinner dekhabe na) ───────────────────
  const adsDataGet = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axiosInstance.get("/api/ads");
      setAdsData(res.data.ads || []);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (rowData: AdRow) => {
    confirmDialog({
      message: "Are you sure you want to delete this ad?",
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

  // ── Quick active toggle ────────────────────────────────────────────────────
  const setRowActive = (id: string, value: boolean) =>
    setAdsData((prev) =>
      prev.map((a) => (a._id === id ? { ...a, isActive: value } : a)),
    );

  const handleToggle = async (id: string, next: boolean) => {
    if (togglingIds.includes(id)) return;

    setTogglingIds((prev) => [...prev, id]);
    setRowActive(id, next); // optimistic update

    try {
      const formData = new FormData();
      formData.append("isActive", String(next));

      await axiosInstance.put(`/api/ads/${id}`, formData);

      toast.success(next ? "Ad activated" : "Ad deactivated");

      // response er upor bharosha na kore DB theke shotti value ene sync kori
      await adsDataGet(true);
    } catch (err: any) {
      setRowActive(id, !next); // rollback
      toast.error(err?.response?.data?.message || "Status update failed");
    } finally {
      setTogglingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  useEffect(() => {
    adsDataGet();
  }, []);

  // ── Column Templates ───────────────────────────────────────────────────────
  const previewTemplate = (rowData: AdRow) => {
    if (!rowData.mediaUrl) {
      return (
        <div className="h-16 w-28 rounded-xl flex items-center justify-center bg-gray-100 text-gray-400 mx-auto">
          <i className="pi pi-image text-2xl" />
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setPreviewUrl(rowData.mediaUrl)}
        className="group relative block h-16 w-28 overflow-hidden rounded-xl border border-blue-200 bg-gray-100"
        title="Click to preview"
      >
        {isVideoUrl(rowData.mediaUrl) ? (
          <video
            src={`${rowData.mediaUrl}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={rowData.mediaUrl}
            alt="Ad preview"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
          <i className="pi pi-eye text-white text-lg" />
        </span>
      </button>
    );
  };

  const statusTemplate = (rowData: AdRow) => (
    <div className="flex items-center gap-2">
      <InputSwitch
        checked={rowData.isActive}
        disabled={togglingIds.includes(rowData._id)}
        onChange={(e) => handleToggle(rowData._id, !!e.value)}
        className="[&.p-inputswitch-checked_.p-inputswitch-slider]:!bg-blue-600 [&.p-inputswitch-checked:hover_.p-inputswitch-slider]:!bg-blue-700"
      />
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          rowData.isActive
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {rowData.isActive ? "Active" : "Inactive"}
      </span>
    </div>
  );

  // ── Table Header ───────────────────────────────────────────────────────────
  const header = (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
      style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
    >
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-white">
          Advertisements
        </h2>
        <p className="text-xs text-blue-100">
          {adsData.length} ad{adsData.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-stretch sm:items-center w-full sm:w-auto">
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          onClick={() => adsDataGet()}
          loading={loading}
          className="w-full sm:w-auto"
          style={{
            background: "transparent",
            color: "#fff",
            border: "1px solid #93c5fd",
          }}
        />
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
            color: "#1d4ed8",
            border: "1px solid #93c5fd",
          }}
        />
      </div>
    </div>
  );

  const closeForm = () => {
    setVisible(false);
    setEditAdId(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {header}

        {adsData.length === 0 && !loading && <EmptyState />}

        {(adsData.length > 0 || loading) && (
          <div className="mt-3 overflow-hidden rounded-lg border border-blue-100">
            <DataTable
              value={adsData}
              loading={loading}
              stripedRows
              scrollable
              scrollHeight="flex"
              className="p-datatable-sm"
              emptyMessage="No ads found"
              dataKey="_id"
              tableStyle={{ minWidth: "700px" }}
            >
              <Column
                header="#"
                body={(_, options) => options.rowIndex + 1}
                style={{ width: "55px" }}
              />
              <Column
                header="Preview"
                body={previewTemplate}
                style={{ width: "150px" }}
              />
              <Column
                header="Status"
                body={statusTemplate}
                style={{ minWidth: "170px" }}
              />
              <Column
                field="createdAt"
                header="Created"
                sortable
                body={(rowData: AdRow) => (
                  <span className="text-sm text-gray-500">
                    {formatDate(rowData.createdAt || "")}
                  </span>
                )}
                style={{ width: "150px" }}
              />
              <Column
                header="Actions"
                style={{ width: "170px" }}
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
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
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

        {/* ── Add / Edit Dialog ── */}
        <Dialog
          header={
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 mb-2 p-3 rounded-t-lg">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <i className="pi pi-megaphone text-white text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editAdId ? "Edit Ad" : "Add New Ad"}
                </h2>
                <p className="text-sm text-white/90">
                  {editAdId
                    ? "Replace the video or change status"
                    : "Upload a video (auto-converted to GIF)"}
                </p>
              </div>
            </div>
          }
          visible={visible}
          style={{ width: "min(95vw, 600px)" }}
          contentStyle={{ maxHeight: "85vh", overflow: "auto" }}
          onHide={closeForm}
          closable={false}
          dismissableMask={false}
          draggable={false}
        >
          <AdsForm
            adId={editAdId}
            onClose={closeForm}
            onSuccess={() => {
              adsDataGet();
              closeForm();
            }}
          />
        </Dialog>

        {/* ── Preview Dialog ── */}
        <Dialog
          header="Ad Preview"
          visible={!!previewUrl}
          style={{ width: "min(95vw, 640px)" }}
          onHide={() => setPreviewUrl(null)}
          dismissableMask
          draggable={false}
        >
          {previewUrl &&
            (isVideoUrl(previewUrl) ? (
              <video
                src={previewUrl}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full rounded-lg border border-blue-100 bg-black"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Ad preview"
                className="w-full rounded-lg border border-blue-100"
              />
            ))}
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;