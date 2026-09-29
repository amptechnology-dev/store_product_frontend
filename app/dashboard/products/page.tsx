"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import AdsForm from "@/components/ads/AdsForm";

type AdRow = {
  _id: string;
  mediaUrl: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type StatusFilter = "all" | "active" | "inactive";

// ---------- Media helpers (image / gif / video) ----------
const VIDEO_URL_REGEX = /\.(mp4|webm|mov)(\?.*)?$/i;
const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_REGEX.test(url);

/**
 * Listing er jonno halka media preview.
 *  - image/gif -> lazy-loaded <img>
 *  - video (purono data thakle) -> muted <video>, screen e dekha gele play
 */
function MediaPreview({
  src,
  alt = "",
  wrapperClassName = "",
  autoPlay = true,
  showBadge = true,
}: {
  src: string;
  alt?: string;
  wrapperClassName?: string;
  autoPlay?: boolean;
  showBadge?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const isVideo = isVideoUrl(src);

  useEffect(() => {
    if (!isVideo || !autoPlay) return;
    const el = videoRef.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      el.pause();
    };
  }, [isVideo, autoPlay, src]);

  if (!isVideo) {
    return (
      <div className={`relative overflow-hidden ${wrapperClassName}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {showBadge && /\.gif(\?.*)?$/i.test(src) && (
          <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1 pointer-events-none">
            <i className="pi pi-play text-[9px]"></i>
            GIF
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      <video
        ref={videoRef}
        src={`${src}#t=0.1`}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        onMouseEnter={
          autoPlay ? undefined : (e) => e.currentTarget.play().catch(() => {})
        }
        onMouseLeave={
          autoPlay
            ? undefined
            : (e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0.1;
              }
        }
        className="absolute inset-0 h-full w-full object-cover"
      />
      {showBadge && (
        <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1 pointer-events-none">
          <i className="pi pi-video text-[9px]"></i>
          Video
        </span>
      )}
    </div>
  );
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12">
    <div className="text-6xl mb-4">📢</div>
    <h2 className="text-xl font-semibold text-gray-700">No Ads Available</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven&apos;t added any ads yet. Once an ad is created, it will appear
      here for management.
    </p>
  </div>
);

const ENDPOINT = "/api/ads";

function Page() {
  const [loading, setLoading] = useState(false);
  const [adsData, setAdsData] = useState<AdRow[]>([]);
  const [visible, setVisible] = useState(false);
  const [editAdId, setEditAdId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pagination, setPagination] = useState({ page: 1, rows: 8 });

  useEffect(() => {
    adsDataGet();
  }, []);

  // filter change hole page 1 e ferot
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [statusFilter]);

  const adsDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ENDPOINT);
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

  const handleAddAd = () => {
    setEditAdId(null);
    setVisible(true);
  };

  const handleUpdate = (rowData: AdRow) => {
    setEditAdId(rowData._id);
    setVisible(true);
  };

  const closeForm = () => {
    setVisible(false);
    setEditAdId(null);
  };

  const confirmDelete = (rowData: AdRow) => {
    confirmDialog({
      message: "Are you sure you want to delete this ad?",
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(`${ENDPOINT}/${rowData._id}`);
          toast.success(res.data.message || "Ad deleted successfully");
          await adsDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  // Quick active toggle (optimistic + rollback)
  const handleToggle = async (rowData: AdRow) => {
    const next = !rowData.isActive;
    setTogglingId(rowData._id);
    setAdsData((prev) =>
      prev.map((a) => (a._id === rowData._id ? { ...a, isActive: next } : a)),
    );
    try {
      await axiosInstance.put(`${ENDPOINT}/${rowData._id}`, { isActive: next });
      toast.success(next ? "Ad activated" : "Ad deactivated");
    } catch (err: any) {
      setAdsData((prev) =>
        prev.map((a) =>
          a._id === rowData._id ? { ...a, isActive: rowData.isActive } : a,
        ),
      );
      toast.error(err?.response?.data?.message || "Status update failed");
    } finally {
      setTogglingId(null);
    }
  };

  // ---------- Filter + client-side pagination ----------
  const filteredAds = useMemo(() => {
    if (statusFilter === "active") return adsData.filter((a) => a.isActive);
    if (statusFilter === "inactive") return adsData.filter((a) => !a.isActive);
    return adsData;
  }, [adsData, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAds.length / pagination.rows),
  );

  // delete korar por page out-of-range hole clamp
  useEffect(() => {
    if (pagination.page > totalPages) {
      setPagination((prev) => ({ ...prev, page: totalPages }));
    }
  }, [totalPages, pagination.page]);

  const pagedAds = useMemo(() => {
    const start = (pagination.page - 1) * pagination.rows;
    return filteredAds.slice(start, start + pagination.rows);
  }, [filteredAds, pagination]);

  const activeCount = adsData.filter((a) => a.isActive).length;

  // ---------- Templates ----------
  const statusBadge = (rowData: AdRow) => (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
        rowData.isActive
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {rowData.isActive ? "✓ Active" : "✗ Inactive"}
    </span>
  );

  const statusToggle = (rowData: AdRow) => (
    <div className="flex items-center gap-2">
      <InputSwitch
        checked={rowData.isActive}
        disabled={togglingId === rowData._id}
        onChange={() => handleToggle(rowData)}
      />
      {statusBadge(rowData)}
    </div>
  );

  const adThumbTable = (rowData: AdRow) =>
    rowData.mediaUrl ? (
      <button
        type="button"
        onClick={() => setPreviewUrl(rowData.mediaUrl)}
        title="Click to preview"
        className="block"
      >
        <MediaPreview
          src={rowData.mediaUrl}
          alt="Ad"
          autoPlay={false}
          showBadge={false}
          wrapperClassName="h-12 w-20 rounded-lg border border-gray-200 bg-gray-100"
        />
      </button>
    ) : (
      <div className="h-12 w-20 rounded-lg flex items-center justify-center bg-blue-500 text-white">
        <i className="pi pi-image" />
      </div>
    );

  const actionTemplate = (rowData: AdRow) => (
    <div className="flex gap-2">
      <Button
        icon="pi pi-pencil"
        label="Edit"
        onClick={() => handleUpdate(rowData)}
        className="flex-1"
        style={{
          background: "#eff6ff",
          color: "#1d4ed8",
          border: "1px solid #bfdbfe",
        }}
      />
      <Button
        icon="pi pi-trash"
        label="Delete"
        onClick={() => confirmDelete(rowData)}
        className="flex-1"
        severity="danger"
      />
    </div>
  );

  // ---------- Header ----------
  const filterButton = (value: StatusFilter, label: string) => (
    <Button
      label={label}
      onClick={() => setStatusFilter(value)}
      className={statusFilter === value ? "font-semibold" : ""}
      style={{
        padding: "6px 10px",
        fontSize: "12px",
        background: statusFilter === value ? "#fff" : "transparent",
        color: statusFilter === value ? "#1d4ed8" : "#fff",
        border: "1px solid #93c5fd",
      }}
    />
  );

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
          {adsData.length} total · {activeCount} active
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-stretch sm:items-center w-full sm:w-auto">
        <div className="flex gap-0.5 bg-white/20 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
          {filterButton("all", "All")}
          {filterButton("active", "Active")}
          {filterButton("inactive", "Inactive")}
        </div>

        <div className="flex gap-0.5 bg-white/20 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            icon="pi pi-th"
            onClick={() => setViewMode("card")}
            className={viewMode === "card" ? "font-semibold" : ""}
            style={{
              minWidth: "36px",
              padding: "6px",
              background: viewMode === "card" ? "#fff" : "transparent",
              color: viewMode === "card" ? "#1d4ed8" : "#fff",
              border: "1px solid #93c5fd",
            }}
          />
          <Button
            icon="pi pi-bars"
            onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "font-semibold" : ""}
            style={{
              minWidth: "36px",
              padding: "6px",
              background: viewMode === "table" ? "#fff" : "transparent",
              color: viewMode === "table" ? "#1d4ed8" : "#fff",
              border: "1px solid #93c5fd",
            }}
          />
        </div>

        <Button
          label="Refresh"
          icon="pi pi-refresh"
          onClick={adsDataGet}
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
          onClick={handleAddAd}
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

  const EditAdHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-megaphone text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Edit Ad</h2>
        <p className="text-sm text-white/90">Replace the video or change status</p>
      </div>
    </div>
  );

  const AddAdHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-megaphone text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Add New Ad</h2>
        <p className="text-sm text-white/90">
          Upload a video (auto-converted to GIF)
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {header}

        {filteredAds.length === 0 && !loading && <EmptyState />}

        {/* ---------- CARD VIEW ---------- */}
        {viewMode === "card" && filteredAds.length > 0 && (
          <div className="p-2 sm:p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {pagedAds.map((ad) => (
                <div key={ad._id} className="w-full">
                  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-blue-100 flex flex-col h-full">
                    {ad.mediaUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(ad.mediaUrl)}
                        title="Click to preview"
                        className="block w-full"
                      >
                        <MediaPreview
                          src={ad.mediaUrl}
                          alt="Ad"
                          autoPlay
                          wrapperClassName="w-full h-28 sm:h-32 md:h-36 lg:h-40 rounded-t-lg bg-gray-100"
                        />
                      </button>
                    ) : (
                      <div className="w-full h-28 sm:h-32 md:h-36 lg:h-40 flex items-center justify-center text-white text-3xl bg-blue-500">
                        <i className="pi pi-image text-3xl" />
                      </div>
                    )}

                    <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
                      <div className="text-xs text-gray-700 space-y-1 flex-1">
                        <p className="flex items-center gap-1">
                          <span className="font-medium">📅 Created:</span>
                          <span>{formatDate(ad.createdAt || "")}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {statusBadge(ad)}
                        <InputSwitch
                          checked={ad.isActive}
                          disabled={togglingId === ad._id}
                          onChange={() => handleToggle(ad)}
                        />
                      </div>

                      <div className="flex gap-1 justify-between mt-auto pt-1">
                        <Button
                          icon="pi pi-pencil"
                          label="Edit"
                          onClick={() => handleUpdate(ad)}
                          className="flex-1 text-xs"
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            padding: "4px 8px",
                          }}
                        />
                        <Button
                          icon="pi pi-trash"
                          label="Delete"
                          onClick={() => confirmDelete(ad)}
                          className="flex-1 text-xs"
                          severity="danger"
                          style={{ padding: "4px 8px" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6 p-3 border-t border-blue-100">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.rows + 1} to{" "}
                {Math.min(
                  pagination.page * pagination.rows,
                  filteredAds.length,
                )}{" "}
                of {filteredAds.length} ads
              </p>
              <div className="flex gap-2">
                <Button
                  icon="pi pi-chevron-left"
                  onClick={() =>
                    setPagination((prev) =>
                      prev.page > 1 ? { ...prev, page: prev.page - 1 } : prev,
                    )
                  }
                  disabled={pagination.page === 1}
                  text
                />
                <span className="px-3 py-2 bg-blue-50 text-blue-700 rounded">
                  {pagination.page} / {totalPages}
                </span>
                <Button
                  icon="pi pi-chevron-right"
                  onClick={() =>
                    setPagination((prev) =>
                      prev.page < totalPages
                        ? { ...prev, page: prev.page + 1 }
                        : prev,
                    )
                  }
                  disabled={pagination.page === totalPages}
                  text
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------- TABLE VIEW ---------- */}
        {viewMode === "table" && filteredAds.length > 0 && (
          <DataTable
            value={filteredAds}
            paginator
            first={(pagination.page - 1) * pagination.rows}
            rows={pagination.rows}
            loading={loading}
            rowsPerPageOptions={[5, 8, 10, 25, 50]}
            onPage={(e) =>
              setPagination({
                page: (e.page ?? 0) + 1,
                rows: e.rows ?? pagination.rows,
              })
            }
            dataKey="_id"
            responsiveLayout="scroll"
            emptyMessage={<EmptyState />}
            className="mt-3"
          >
            <Column
              header="#"
              body={(_, options) => options.rowIndex + 1}
              style={{ width: "55px" }}
            />
            <Column header="Preview" body={adThumbTable} />
            <Column header="Status" body={statusToggle} />
            <Column
              field="createdAt"
              header="Created"
              sortable
              body={(row: AdRow) => formatDate(row.createdAt || "")}
            />
            <Column header="Actions" body={actionTemplate} />
          </DataTable>
        )}

        {/* ---------- ADD / EDIT DIALOG ---------- */}
        {(visible || editAdId) && (
          <Dialog
            header={editAdId ? EditAdHeader : AddAdHeader}
            visible={visible}
            style={{ width: "min(95vw, 640px)" }}
            contentStyle={{ maxHeight: "85vh", overflow: "auto" }}
            onHide={closeForm}
            closable={false}
            dismissableMask={false}
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
        )}

        {/* ---------- PREVIEW DIALOG ---------- */}
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
                className="w-full rounded-lg border border-blue-100"
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