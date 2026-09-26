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
import WorkerForm from "@/components/worker/WorkerForm";

type WorkerRow = {
  _id: string;
  name: string;
  whatsappNo: string;
  isActive?: boolean;
  createdAt?: string;
  storeId?: {
    _id?: string;
    storeName?: string;
    storeUniqueId?: string;
  };
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
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12">
    <div className="text-6xl mb-4">🧑‍💼</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Karigar Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven&apos;t added any karigar yet. Once a worker is created, it will
      appear here for management.
    </p>
  </div>
);

const ENDPOINT = "/api/worker/all-workers";

function WorkerListingPage() {
  const [loading, setLoading] = useState(false);
  const [workerData, setWorkerData] = useState<WorkerRow[]>([]);
  const [visible, setVisible] = useState(false);
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);

  const [pagination, setPagination] = useState({ page: 1, rows: 5, total: 0 });
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    workerDataGet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.rows, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const workerDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ENDPOINT, {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });
      const workers = res.data.workers || [];
      setWorkerData(workers);
      setPagination((prev) => ({
        ...prev,
        total: res.data.totalWorkers || workers.length || 0,
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

  const handleAddWorker = () => {
    setEditWorkerId(null);
    setVisible(true);
  };

  const handleUpdate = (rowData: WorkerRow) => {
    setEditWorkerId(rowData._id);
    setVisible(true);
  };

  const confirmDelete = (rowData: WorkerRow) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/api/worker/delete-worker/${rowData._id}`,
          );
          toast.success(res.data.message || "Worker deleted successfully");
          await workerDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const workerList = workerData;

  const workerAvatar = (rowData: WorkerRow, size: "card" | "table") => {
    const initials = getInitials(rowData?.name || "");
    const bgClass = stringToBg(rowData?.name || "");
    const dim = size === "card" ? "h-14 w-14 text-lg" : "h-12 w-12 text-sm";
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center text-white font-bold ${bgClass}`}
      >
        {initials}
      </div>
    );
  };

  const statusTemplate = (rowData: WorkerRow) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${rowData.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
    >
      {rowData.isActive ? "Active" : "Inactive"}
    </span>
  );

  const actionTemplate = (rowData: WorkerRow) => (
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
          Karigars
        </h2>
        <p className="text-xs text-blue-100">Manage store karigars</p>
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
            placeholder="Search karigar"
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
          label="Add Karigar"
          icon="pi pi-plus"
          onClick={handleAddWorker}
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

  const EditWorkerHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-user-edit text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Edit Karigar</h2>
        <p className="text-sm text-white/90">Update karigar information</p>
      </div>
    </div>
  );

  const AddWorkerHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
        <i className="pi pi-user-plus text-white text-xl"></i>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Add New karigar</h2>
        <p className="text-sm text-white/90">Create a new karigar</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {header}

        {workerList.length === 0 && !loading && <EmptyState />}

        {viewMode === "card" && workerList.length > 0 && (
          <div className="p-2 sm:p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {workerList.map((worker) => {
                const storeName = worker.storeId?.storeName || "Unknown Store";

                return (
                  <div key={worker._id} className="w-full">
                    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-blue-100 flex flex-col h-full">
                      <div className="p-3 sm:p-4 flex flex-col items-center text-center gap-2 flex-1">
                        {workerAvatar(worker, "card")}

                        <h3 className="text-sm md:text-base font-semibold text-gray-800 line-clamp-1">
                          {worker.name}
                        </h3>

                        <div className="text-xs text-gray-700 space-y-0.5 w-full">
                          <p className="flex items-center justify-center gap-1">
                            <i className="pi pi-whatsapp text-green-600"></i>
                            {worker.whatsappNo}
                          </p>
                          <p>
                            <span className="font-medium">🏪 Store:</span>{" "}
                            {storeName}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${worker.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                          >
                            {worker.isActive ? "✓ Active" : "✗ Inactive"}
                          </span>
                        </div>

                        <div className="flex gap-1 justify-between mt-auto pt-1 w-full">
                          <Button
                            icon="pi pi-pencil"
                            label="Edit"
                            onClick={() => handleUpdate(worker)}
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
                            onClick={() => confirmDelete(worker)}
                            className="flex-1 text-xs"
                            severity="danger"
                            style={{ padding: "4px 8px" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-6 p-3 border-t border-blue-100">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.rows + 1} to{" "}
                {Math.min(pagination.page * pagination.rows, pagination.total)}{" "}
                of {pagination.total} karigars
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

        {viewMode === "table" && workerList.length > 0 && (
          <DataTable
            value={workerList}
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
            <Column header="Avatar" body={(row) => workerAvatar(row, "table")} />
            <Column field="name" header="Name" sortable />
            <Column field="whatsappNo" header="WhatsApp No" />
            <Column
              header="Store"
              body={(row: WorkerRow) => row.storeId?.storeName || "-"}
            />
            <Column header="Status" body={statusTemplate} />
            <Column
              header="Created"
              body={(row: WorkerRow) => formatDate(row.createdAt || "")}
            />
            <Column header="Actions" body={actionTemplate} />
          </DataTable>
        )}

        {(visible || editWorkerId) && (
          <Dialog
            header={editWorkerId ? EditWorkerHeader : AddWorkerHeader}
            visible={visible}
            style={{ width: "35vw" }}
            breakpoints={{ "960px": "75vw", "641px": "95vw" }}
            contentStyle={{ maxHeight: "85vh", overflow: "auto" }}
            onHide={() => {
              setVisible(false);
              setEditWorkerId(null);
            }}
          >
            <WorkerForm
              workerId={editWorkerId}
              onClose={() => {
                setVisible(false);
                setEditWorkerId(null);
              }}
              onSuccess={() => {
                workerDataGet();
                setVisible(false);
                setEditWorkerId(null);
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

export default WorkerListingPage;