"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import BannerForm from "@/components/banner/BannerForm";

type BannerRow = {
  _id: string;
  name?: string;
  image?: string;
  mediaType?: "image" | "video";
  bannerURL?: string;
  isActive?: boolean;
  storeId?:
    | string
    | {
        _id?: string;
        storeName?: string;
        storeUniqueId?: string;
      };
  createdAt?: string;
};

// ---------- Media helpers (image / gif / video) ----------
const VIDEO_URL_REGEX = /\.(mp4|webm|mov)(\?.*)?$/i;
const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_REGEX.test(url);
const isBannerVideo = (b: BannerRow) =>
  b.mediaType === "video" || isVideoUrl(b.image);

// sudhu http/https link clickable hobe (javascript: XSS block)
const isSafeUrl = (url?: string) => !!url && /^https?:\/\//i.test(url);

/**
 * Listing er jonno halka media preview.
 *  - image/gif -> lazy-loaded <img>
 *  - video     -> muted <video>, preload="metadata"
 *      autoPlay=true  : screen e dekha gele play, baire gele pause
 *      autoPlay=false : hover korle play, mouse soriye nile pause + first frame
 *  - onError   : load fail hole parent fallback dekhate pare
 */
function MediaPreview({
  src,
  alt = "",
  isVideo,
  wrapperClassName = "",
  autoPlay = true,
  showBadge = true,
  onError,
}: {
  src: string;
  alt?: string;
  isVideo: boolean;
  wrapperClassName?: string;
  autoPlay?: boolean;
  showBadge?: boolean;
  onError?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isVideo || !autoPlay) return;
    const el = videoRef.current;
    if (!el) return;

    // user er device e "reduce motion" on thakle auto play korbo na
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
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
          onError={onError}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {/* #t=0.1 : play hobar age first frame poster hishebe dekhay (iOS Safari e o) */}
      <video
        ref={videoRef}
        src={`${src}#t=0.1`}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        onError={onError}
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

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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

const getStoreName = (storeId?: BannerRow["storeId"]) => {
  if (!storeId) return "-";
  return typeof storeId === "object" ? storeId.storeName || "-" : "-";
};

// media load fail hole initials fallback
function BannerThumb({
  banner,
  autoPlay,
  showBadge,
  sizeClass,
  initialsClass,
}: {
  banner: BannerRow;
  autoPlay: boolean;
  showBadge: boolean;
  sizeClass: string;
  initialsClass: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [banner.image]);

  if (!banner.image || failed) {
    return (
      <div
        className={`${sizeClass} flex items-center justify-center text-white font-bold ${initialsClass} ${stringToBg(
          banner.name,
        )}`}
      >
        {getInitials(banner.name)}
      </div>
    );
  }

  return (
    <MediaPreview
      src={banner.image}
      alt={banner.name || "Banner"}
      isVideo={isBannerVideo(banner)}
      autoPlay={autoPlay}
      showBadge={showBadge}
      onError={() => setFailed(true)}
      wrapperClassName={`${sizeClass} bg-gray-100`}
    />
  );
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12">
    <div className="text-6xl mb-4">🖼️</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Banners Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven&apos;t added any banners yet. Once a banner is created, it will
      appear here for management.
    </p>
  </div>
);

const BannerLink = ({ url }: { url?: string }) => {
  if (!url) return <span className="text-gray-400">-</span>;
  if (!isSafeUrl(url)) return <span className="break-all">{url}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline break-all line-clamp-1"
      title={url}
    >
      {url}
    </a>
  );
};

const ENDPOINT = "/api/banner/all-banners";

function Page() {
  const [loading, setLoading] = useState(false);
  const [bannerData, setBannerData] = useState<BannerRow[]>([]);
  const [visible, setVisible] = useState(false);
  const [editBannerId, setEditBannerId] = useState<string | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // stale response ignore korar jonno
  const requestId = useRef(0);

  // Search debounce + page reset ek shathe (double fetch hobe na)
  useEffect(() => {
    const timer = setTimeout(() => {
      const value = searchInput.trim();
      if (value !== debouncedSearch) {
        setDebouncedSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  const bannerDataGet = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      setLoading(true);
      const res = await axiosInstance.get(ENDPOINT, {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      // porer request cholche, ei response ta purono
      if (currentRequest !== requestId.current) return;

      const banners: BannerRow[] = res.data.banners || [];
      const total = res.data.totalBanners || 0;
      const lastPage = Math.max(1, Math.ceil(total / pagination.rows));

      // current page faka (delete er por) -> last valid page e jao
      if (pagination.page > lastPage) {
        setPagination((prev) => ({ ...prev, page: lastPage }));
        return;
      }

      setBannerData(banners);
      setPagination((prev) => ({ ...prev, total }));
    } catch (error: any) {
      if (currentRequest !== requestId.current) return;
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [pagination.page, pagination.rows, debouncedSearch]);

  useEffect(() => {
    bannerDataGet();
  }, [bannerDataGet]);

  const handleAddBanner = () => {
    setEditBannerId(null);
    setVisible(true);
  };

  const handleUpdate = (rowData: BannerRow) => {
    setEditBannerId(rowData._id);
    setVisible(true);
  };

  const confirmDelete = (rowData: BannerRow) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/api/banner/delete-banner/${rowData._id}`,
          );
          toast.success(res.data.message || "Banner deleted successfully");
          await bannerDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const bannerList = bannerData;
  const lastPage = Math.max(1, Math.ceil(pagination.total / pagination.rows));

  // Card view: video hole viewport e thakle auto-play (muted loop)
  const bannerCardImage = (rowData: BannerRow) => (
    <BannerThumb
      banner={rowData}
      autoPlay
      showBadge
      sizeClass="w-full h-28 sm:h-32 md:h-36 lg:h-40 rounded-t-lg"
      initialsClass="text-3xl"
    />
  );

  // Table view: chhoto thumbnail, video hover korle play hoy
  const bannerImageTableTemplate = (rowData: BannerRow) => (
    <BannerThumb
      banner={rowData}
      autoPlay={false}
      showBadge={false}
      sizeClass="h-12 w-12 rounded-lg border border-gray-200"
      initialsClass="text-base"
    />
  );

  const statusTemplate = (rowData: BannerRow) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        rowData.isActive
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {rowData.isActive ? "Active" : "Inactive"}
    </span>
  );

  const actionTemplate = (rowData: BannerRow) => (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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

  const header = (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
      style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
    >
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-white">
          Banners
        </h2>
        <p className="text-xs text-blue-100">Manage banners</p>
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
            placeholder="Search banner"
            className="p-inputtext-sm w-full"
          />
        </IconField>

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
          label="Add Banner"
          icon="pi pi-plus"
          onClick={handleAddBanner}
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

  const EditBannerHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-image text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Edit Banner</h2>
        <p className="text-sm text-white/90">Update banner information</p>
      </div>
    </div>
  );

  const AddBannerHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-image text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Add New Banner</h2>
        <p className="text-sm text-white/90">Create a new banner</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {header}

        {bannerList.length === 0 && !loading && <EmptyState />}

        {viewMode === "card" && bannerList.length > 0 && (
          <div className="p-2 sm:p-3">
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 transition-opacity ${
                loading ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              {bannerList.map((banner) => (
                <div key={banner._id} className="w-full">
                  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-blue-100 flex flex-col h-full">
                    {bannerCardImage(banner)}

                    <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
                      <div>
                        <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-1 line-clamp-1">
                          {banner.name}
                        </h3>
                      </div>

                      <div className="text-xs text-gray-700 space-y-0.5 flex-1">
                        <p>
                          <span className="font-medium">🏪 Store:</span>{" "}
                          {getStoreName(banner.storeId)}
                        </p>
                        <p className="flex items-center gap-1 min-w-0">
                          <span className="font-medium shrink-0">🔗 URL:</span>
                          <BannerLink url={banner.bannerURL} />
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            banner.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {banner.isActive ? "✓ Active" : "✗ Inactive"}
                        </span>
                      </div>

                      <div className="flex gap-1 justify-between mt-auto pt-1">
                        <Button
                          icon="pi pi-pencil"
                          label="Edit"
                          onClick={() => handleUpdate(banner)}
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
                          onClick={() => confirmDelete(banner)}
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
                {Math.min(pagination.page * pagination.rows, pagination.total)}{" "}
                of {pagination.total} banners
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
                  {pagination.page} / {lastPage}
                </span>
                <Button
                  icon="pi pi-chevron-right"
                  onClick={() =>
                    setPagination((prev) =>
                      prev.page < Math.ceil(prev.total / prev.rows)
                        ? { ...prev, page: prev.page + 1 }
                        : prev,
                    )
                  }
                  disabled={pagination.page === lastPage}
                  text
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === "table" && bannerList.length > 0 && (
          <DataTable
            value={bannerList}
            lazy
            paginator
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
            emptyMessage={<EmptyState />}
          >
            <Column header="Media" body={bannerImageTableTemplate} />
            <Column field="name" header="Name" sortable />
            <Column
              header="Store"
              body={(row: BannerRow) => getStoreName(row.storeId)}
            />
            <Column
              header="URL"
              body={(row: BannerRow) => (
                <div className="max-w-[200px]">
                  <BannerLink url={row.bannerURL} />
                </div>
              )}
            />
            <Column header="Status" body={statusTemplate} />
            <Column
              header="Created"
              body={(row: BannerRow) => formatDate(row.createdAt || "")}
            />
            <Column header="Actions" body={actionTemplate} />
          </DataTable>
        )}

        {(visible || editBannerId) && (
          <Dialog
            header={editBannerId ? EditBannerHeader : AddBannerHeader}
            visible={visible}
            style={{ width: "min(95vw, 40vw)", minWidth: "320px" }}
            contentStyle={{ maxHeight: "85vh", overflow: "auto" }}
            onHide={() => {
              setVisible(false);
              setEditBannerId(null);
            }}
          >
            <BannerForm
              bannerId={editBannerId}
              onClose={() => {
                setVisible(false);
                setEditBannerId(null);
              }}
              onSuccess={() => {
                bannerDataGet();
                setVisible(false);
                setEditBannerId(null);
              }}
            />
          </Dialog>
        )}

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;