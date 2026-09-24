"use client";

import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    bannerDataGet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.rows, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const bannerDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ENDPOINT, {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      const banners = res.data.banners || [];
      setBannerData(banners);
      setPagination((prev) => ({
        ...prev,
        total: res.data.totalBanners || banners.length || 0,
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

  const bannerCardImage = (rowData: BannerRow) => {
    if (rowData.image) {
      return (
        <div className="w-full h-28 sm:h-32 md:h-36 lg:h-40 relative rounded-t-lg overflow-hidden bg-gray-100">
          <img
            src={rowData.image}
            alt="Banner"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      );
    }

    const initials = getInitials(rowData?.name || "");
    const bgClass = stringToBg(rowData?.name || "");

    return (
      <div
        className={`w-full h-28 sm:h-32 md:h-36 lg:h-40 flex items-center justify-center text-white text-3xl font-bold ${bgClass}`}
      >
        {initials}
      </div>
    );
  };

  const bannerImageTableTemplate = (rowData: BannerRow) => {
    if (rowData.image) {
      return (
        <div className="h-12 w-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
          <img
            src={rowData.image}
            alt="Banner"
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    const initials = getInitials(rowData?.name || "");
    const bgClass = stringToBg(rowData?.name || "");

    return (
      <div
        className={`h-12 w-12 rounded-lg flex items-center justify-center text-white font-semibold ${bgClass}`}
      >
        {initials}
      </div>
    );
  };

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
          background: "#ffcf00",
          color: "#1d232f",
          border: "1px solid #e0ac1f",
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
      style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}
    >
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800">
          Banners
        </h2>
        <p className="text-xs text-gray-700">Manage banners</p>
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

        <div className="flex gap-0.5 bg-white/30 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            icon="pi pi-th"
            onClick={() => setViewMode("card")}
            className={viewMode === "card" ? "font-semibold" : ""}
            style={{
              minWidth: "36px",
              padding: "6px",
              background: viewMode === "card" ? "#fff" : "transparent",
              color: viewMode === "card" ? "#d89f00" : "#1d232f",
              border: "1px solid #e0ac1f",
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
              color: viewMode === "table" ? "#d89f00" : "#1d232f",
              border: "1px solid #e0ac1f",
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
            color: "#d89f00",
            border: "1px solid #e0ac1f",
          }}
        />
      </div>
    </div>
  );

  const EditBannerHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 mb-2 p-3 rounded-t-lg">
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
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-3 rounded-t-lg">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {bannerList.map((banner) => (
                <div key={banner._id} className="w-full">
                  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200 flex flex-col h-full">
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
                            background: "#ffcf00",
                            color: "#1d232f",
                            border: "1px solid #e0ac1f",
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

            <div className="flex justify-between items-center mt-6 p-3 border-t border-gray-200">
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
                <span className="px-3 py-2 bg-gray-100 rounded">
                  {pagination.page} /{" "}
                  {Math.max(1, Math.ceil(pagination.total / pagination.rows))}
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
                  disabled={
                    pagination.page ===
                    Math.max(1, Math.ceil(pagination.total / pagination.rows))
                  }
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
            <Column header="Image" body={bannerImageTableTemplate} />
            <Column field="name" header="Name" sortable />
            <Column
              header="Store"
              body={(row: BannerRow) => getStoreName(row.storeId)}
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
            style={{ width: "40vw" }}
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
