"use client";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { useProfileStore } from "@/lib/store/profileStore";
import { ToastContainer, toast } from "react-toastify";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime";
import { Dialog } from "primereact/dialog";
import CategoryForm from "@/components/category/CategoryForm";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";

type CategoryRow = {
  _id: string;
  name: string;
  storeId: string;
  description?: string;
  image?: string;
  icon?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
    <div className="text-6xl mb-4">🗂️</div>
    <h2 className="text-xl font-semibold text-gray-700">No Categories Found</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven't added any categories yet.
    </p>
  </div>
);

function Page() {
  const { profile, fetchProfile } = useProfileStore();
  const [myStoreId, setMyStoreId] = useState<string | null>(null);

  const [categoryData, setCategoryData] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visible, setVisible] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Fetch the logged-in STORE user's own storeId
  const fetchMyStore = async () => {
    try {
      const res = await axiosInstance.get("/api/register/user-based-stores");
      const store = res.data?.stores?.[0];
      if (store?._id) setMyStoreId(store._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load your store");
    }
  };

  useEffect(() => {
    if (profile?.role === "STORE") {
      fetchMyStore();
    }
  }, [profile]);

  const categoryDataGet = async () => {
    try {
      setLoading(true);
      const params =
        profile?.role === "STORE" && myStoreId ? { storeId: myStoreId } : {};
      const res = await axiosInstance.get("/api/category", { params });
      setCategoryData(res.data.categories || []);
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

  const handleDelete = (rowData: CategoryRow) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/api/category/${rowData._id}`,
          );
          toast.success(res.data.message || "Category deleted successfully");
          categoryDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  useEffect(() => {
    // wait until we know role, and for STORE users until storeId is resolved
    if (!profile) return;
    if (profile.role === "STORE" && !myStoreId) return;
    categoryDataGet();
  }, [profile, myStoreId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredCategories = useMemo(() => {
    if (!debouncedSearch) return categoryData;

    const term = debouncedSearch.toLowerCase();

    return categoryData.filter((category) =>
      [category.name, category.description].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [categoryData, debouncedSearch]);

  const imageTemplate = (rowData: CategoryRow) =>
    rowData.image ? (
      <img
        src={rowData.image}
        alt={rowData.name}
        className="w-12 h-12 rounded-lg object-cover border border-gray-200"
      />
    ) : (
      <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
        <i className="pi pi-image text-gray-400"></i>
      </div>
    );

  const iconTemplate = (rowData: CategoryRow) =>
    rowData.icon ? (
      <span className="text-2xl leading-none">{rowData.icon}</span>
    ) : (
      <span className="text-gray-400">-</span>
    );

  const statusTemplate = (rowData: CategoryRow) => (
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

  const header = (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
      style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}
    >
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800">
          Categories
        </h2>
        <p className="text-xs text-gray-700">Manage your store categories</p>
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
            placeholder="Search category"
            className="p-inputtext-sm w-full"
          />
        </IconField>

        {profile?.role === "STORE" && (
          <Button
            label="Add Category"
            icon="pi pi-plus"
            onClick={() => {
              setEditCategoryId(null);
              setVisible(true);
            }}
            className="w-full sm:w-auto"
            style={{
              background: "#fff",
              color: "#d89f00",
              border: "1px solid #e0ac1f",
            }}
          />
        )}

        <Button
          label="Refresh"
          icon="pi pi-refresh"
          onClick={categoryDataGet}
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

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {header}

        {filteredCategories.length === 0 && !loading && <EmptyState />}

        {filteredCategories.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
            <DataTable
              value={filteredCategories}
              loading={loading}
              stripedRows
              scrollable
              scrollHeight="flex"
              responsiveLayout="scroll"
              className="p-datatable-sm"
              emptyMessage="No categories found"
              dataKey="_id"
              tableStyle={{ minWidth: "800px" }}
            >
              <Column
                header="#"
                body={(_, options) => options.rowIndex + 1}
                style={{ width: "60px" }}
              />
              <Column
                header="Image"
                body={imageTemplate}
                style={{ width: "90px" }}
              />
              <Column
                header="Icon"
                body={iconTemplate}
                style={{ width: "80px" }}
              />
              <Column field="name" header="Name" sortable />
              <Column
                field="description"
                header="Description"
                body={(rowData: CategoryRow) => (
                  <span className="text-sm text-gray-600">
                    {rowData.description || "No description"}
                  </span>
                )}
              />
              <Column
                field="isActive"
                header="Status"
                body={statusTemplate}
                style={{ width: "120px" }}
              />
              <Column
                field="createdAt"
                header="Created"
                body={(rowData: CategoryRow) => (
                  <span className="text-sm text-gray-600">
                    {formatDate(rowData.createdAt || "")}
                  </span>
                )}
                style={{ width: "160px" }}
              />
              {profile?.role === "STORE" && (
                <Column
                  header="Actions"
                  style={{ width: "140px" }}
                  body={(rowData: CategoryRow) => (
                    <div className="flex gap-2">
                      <Button
                        icon="pi pi-pencil"
                        onClick={() => {
                          setEditCategoryId(rowData._id);
                          setVisible(true);
                        }}
                        style={{
                          background: "#ffcf00",
                          color: "#1d232f",
                          border: "1px solid #e0ac1f",
                          padding: "6px 10px",
                        }}
                      />
                      <Button
                        icon="pi pi-trash"
                        severity="danger"
                        style={{ padding: "6px 10px" }}
                        onClick={() => handleDelete(rowData)}
                      />
                    </div>
                  )}
                />
              )}
            </DataTable>
          </div>
        )}

        <Dialog
          header={
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-3 rounded-t-lg">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <i className="pi pi-tag text-white text-xl"></i>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editCategoryId ? "Edit Category" : "Add New Category"}
                </h2>
                <p className="text-sm text-white/90">
                  {editCategoryId
                    ? "Update category information"
                    : "Create a new category"}
                </p>
              </div>
            </div>
          }
          visible={visible}
          style={{ width: "40vw" }}
          contentStyle={{ maxHeight: "85vh", overflow: "auto" }}
          onHide={() => {
            setVisible(false);
            setEditCategoryId(null);
          }}
        >
          <CategoryForm
            categoryId={editCategoryId}
            storeId={myStoreId}
            onClose={() => {
              setVisible(false);
              setEditCategoryId(null);
            }}
            onSuccess={() => {
              categoryDataGet();
              setVisible(false);
              setEditCategoryId(null);
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