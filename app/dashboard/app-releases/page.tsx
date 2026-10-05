"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { ProgressBar } from "primereact/progressbar";
import { formatDate } from "@/helper/DateTime";

const MAX_APK_SIZE = 200 * 1024 * 1024; // keep in sync with backend limit

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-10">
    <div className="text-6xl mb-4">📱</div>
    <h2 className="text-xl font-semibold text-gray-700">No App Release</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven&apos;t uploaded any APK yet. Once you upload one, Android users
      can download it directly from the store link.
    </p>
  </div>
);

const formatSize = (b?: number) => {
  if (!b) return "-";
  return b >= 1024 * 1024
    ? `${(b / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(b / 1024)} KB`;
};

// Turn any axios error into a clear message
const getErrorMessage = (error: any, fallback: string): string => {
  if (error?.response) {
    const data = error.response.data;
    const status = error.response.status;
    const fieldError = data?.errors?.[0]?.message;
    if (fieldError) return fieldError;
    if (data?.message) return data.message;
    if (status === 413) {
      return "File is too large for the server (413). Increase the proxy upload limit.";
    }
    if (status === 401 || status === 403) {
      return "You are not authorized to perform this action.";
    }
    return `${fallback} (status ${status})`;
  }
  if (error?.code === "ECONNABORTED") {
    return "Request timed out. Please try again.";
  }
  if (error?.request) {
    return "Network error: server unreachable, blocked by CORS, or the upload exceeded the server limit.";
  }
  return error?.message || fallback;
};

const emptyForm = { appName: "", version: "", releaseNotes: "" };

function Page() {
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const menu = React.useRef<Menu | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const [pagination, setPagination] = useState({ page: 1, rows: 10, total: 0 });

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // form dialog
  const [visible, setVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [makeActive, setMakeActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  /* ================= FETCH ================= */
  useEffect(() => {
    appsGet();
  }, [pagination.page, pagination.rows, debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const appsGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/app-release/all", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });
      setApps(res.data.apps || []);
      setPagination((prev) => ({ ...prev, total: res.data.totalApps || 0 }));
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

  /* ================= ACTIONS ================= */
  const closeDialog = () => {
    if (saving) return;
    setVisible(false);
    setEditId(null);
    setForm(emptyForm);
    setApkFile(null);
    setMakeActive(true);
    setProgress(0);
  };

  const handleAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setApkFile(null);
    setMakeActive(true);
    setProgress(0);
    setVisible(true);
  };

  const handleEdit = (row: any) => {
    setEditId(row._id);
    setForm({
      appName: row.appName || "",
      version: row.version || "",
      releaseNotes: row.releaseNotes || "",
    });
    setApkFile(null);
    setMakeActive(!!row.isActive);
    setProgress(0);
    setVisible(true);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setApkFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".apk")) {
      toast.error("Only .apk file is allowed");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_APK_SIZE) {
      toast.error("APK must be under 200MB");
      e.target.value = "";
      return;
    }
    setApkFile(file);
  };

  const handleSubmit = async () => {
    if (!form.appName.trim()) return toast.error("App name is required");
    if (!form.version.trim()) return toast.error("Version is required");
    if (!editId && !apkFile) return toast.error("APK file is required");

    const fd = new FormData();
    if (editId) fd.append("id", editId);
    fd.append("appName", form.appName.trim());
    fd.append("version", form.version.trim());
    fd.append("releaseNotes", form.releaseNotes.trim());
    fd.append("isActive", String(makeActive));
    if (apkFile) fd.append("apk", apkFile);

    try {
      setSaving(true);
      setProgress(0);

      // No manual Content-Type: the browser sets multipart + boundary itself
      const res = await axiosInstance.post("/api/app-release/upsert", fd, {
        timeout: 0, // no timeout for large APK uploads
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });

      toast.success(res.data.message || "Saved successfully");
      setSaving(false);
      closeDialog();
      await appsGet();
    } catch (error: any) {
      console.error("Upsert app release failed:", error);
      toast.error(getErrorMessage(error, "Failed to save app release"));
    } finally {
      setSaving(false);
    }
  };

  // Toggle live status (no file needed, same upsert API)
  const toggleActive = async (row: any) => {
    try {
      const res = await axiosInstance.post("/api/app-release/upsert", {
        id: row._id,
        isActive: !row.isActive,
      });
      toast.success(res.data.message || "Status updated");
      await appsGet();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Status update failed"));
    }
  };

  const confirmDelete = (row: any) => {
    confirmDialog({
      message: `Are you sure you want to delete v${row.version} of "${row.appName}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/api/app-release/delete/${row._id}`,
          );
          toast.success(res.data.message || "Deleted successfully");
          await appsGet();
        } catch (err: any) {
          toast.error(getErrorMessage(err, "Delete failed"));
        }
      },
    });
  };

  const copyLink = async (row: any) => {
    try {
      await navigator.clipboard.writeText(row.apkUrl);
      toast.success("APK link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  /* ================= ROW MENU ================= */
  const showRowMenu = (event: any, row: any) => {
    event.stopPropagation();
    setSelectedApp(row);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => selectedApp && handleEdit(selectedApp),
    },
    {
      label: selectedApp?.isActive ? "Deactivate" : "Make Live",
      icon: selectedApp?.isActive ? "pi pi-times-circle" : "pi pi-check-circle",
      command: () => selectedApp && toggleActive(selectedApp),
    },
    {
      label: "Copy APK link",
      icon: "pi pi-copy",
      command: () => selectedApp && copyLink(selectedApp),
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => selectedApp && confirmDelete(selectedApp),
    },
  ];

  /* ================= COLUMN TEMPLATES ================= */
  const appTemplate = (row: any) => (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
        <i className="pi pi-android text-blue-600 text-xl" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-gray-800">{row.appName}</div>
        <div className="text-xs text-gray-500 truncate max-w-[220px]">
          {row.fileName || "-"}
        </div>
      </div>
    </div>
  );

  const statusTemplate = (row: any) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.isActive
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {row.isActive ? "Live" : "Inactive"}
    </span>
  );

  const downloadTemplate = (row: any) => (
    <a
      href={row.apkUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-blue-600 hover:underline text-sm font-medium"
    >
      <i className="pi pi-download mr-1" />
      Download
    </a>
  );

  const actionTemplate = (row: any) => (
    <div onClick={(e) => e.stopPropagation()} className="flex">
      <Button
        icon="pi pi-ellipsis-v"
        rounded
        text
        aria-label="More actions"
        onClick={(e) => showRowMenu(e, row)}
      />
    </div>
  );

  const header = (
    <div className="flex flex-wrap gap-3 justify-between items-center bg-blue-600 p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white m-0">App Releases</h2>
        <p className="text-sm text-blue-100 m-0">
          Manage Android APK. The live release is served from the store link
        </p>
      </div>

      <div className="flex gap-2 items-center">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search app or version"
            className="p-inputtext-sm"
          />
        </IconField>
        <Button
          label="Upload APK"
          icon="pi pi-upload"
          onClick={handleAdd}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  const DialogHeader = (
    <div
      className={`flex items-center gap-3 bg-gradient-to-r ${
        editId ? "from-amber-500 to-orange-500" : "from-blue-500 to-indigo-600"
      } mb-2 p-3 rounded-t-lg`}
    >
      <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
        <i
          className={`pi ${editId ? "pi-pencil" : "pi-upload"} text-white text-2xl`}
        />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white m-0">
          {editId ? "Edit App Release" : "Upload New APK"}
        </h2>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={apps}
          header={header}
          className="app-releases-table"
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
          emptyMessage={EmptyState}
        >
          <Column header="App" body={appTemplate} />
          <Column
            header="Version"
            body={(row: any) => (
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                v{row.version}
              </span>
            )}
          />
          <Column header="Size" body={(row: any) => formatSize(row.fileSize)} />
          <Column header="Status" body={statusTemplate} />
          <Column header="APK" body={downloadTemplate} />
          <Column
            header="Uploaded By"
            body={(row: any) => row.uploadedBy?.name || "-"}
          />
          <Column
            header="Created"
            body={(row: any) => formatDate(row.createdAt)}
          />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        <Menu model={menuModel} popup ref={menu} />

        <Dialog
          header={DialogHeader}
          visible={visible}
          style={{ width: "90vw", maxWidth: 560 }}
          onHide={closeDialog}
          closable={!saving}
          dismissableMask={!saving}
          draggable={false}
          blockScroll
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                App Name *
              </label>
              <InputText
                value={form.appName}
                onChange={(e) => setForm({ ...form, appName: e.target.value })}
                placeholder="e.g. AMP Store"
                disabled={saving}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Version *
              </label>
              <InputText
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="e.g. 1.0.3"
                disabled={saving}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                APK File {editId ? "(optional)" : "*"}
              </label>
              <input
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                onChange={onFileChange}
                disabled={saving}
                className="block w-full text-sm text-gray-600 border border-slate-300 rounded-lg cursor-pointer file:mr-3 file:py-2 file:px-4 file:border-0 file:bg-blue-600 file:text-white file:font-medium hover:file:bg-blue-700"
              />
              {apkFile && (
                <p className="text-xs text-gray-500 m-0">
                  {apkFile.name} ({formatSize(apkFile.size)})
                </p>
              )}
              <p className="text-xs text-gray-400 m-0">Max 200MB, only .apk</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Release Notes
              </label>
              <InputTextarea
                value={form.releaseNotes}
                onChange={(e) =>
                  setForm({ ...form, releaseNotes: e.target.value })
                }
                rows={3}
                autoResize
                placeholder="What changed in this version"
                disabled={saving}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={makeActive}
                onChange={(e) => setMakeActive(e.target.checked)}
                disabled={saving}
              />
              Make this release live
            </label>

            {saving && (
              <div>
                <ProgressBar value={progress} showValue />
                <p className="text-xs text-gray-500 mt-1 m-0">
                  {progress < 100
                    ? "Uploading... please do not close this window"
                    : "Processing..."}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                label="Cancel"
                outlined
                severity="secondary"
                onClick={closeDialog}
                disabled={saving}
              />
              <Button
                label={editId ? "Update" : "Upload"}
                icon={editId ? "pi pi-check" : "pi pi-upload"}
                onClick={handleSubmit}
                loading={saving}
              />
            </div>
          </div>
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>

      <style jsx global>{`
        .app-releases-table .p-datatable-thead > tr > th {
          background: #2563eb !important;
          color: #fff !important;
          border-color: #1d4ed8 !important;
          font-weight: 600;
        }
        .app-releases-table .p-datatable-tbody > tr:hover {
          background: #eff6ff !important;
        }
      `}</style>
    </div>
  );
}

export default Page;