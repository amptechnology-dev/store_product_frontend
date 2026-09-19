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
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { formatDate } from "@/helper/DateTime";import UserForm from "@/components/user/UserForm";
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">👤</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No User Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven’t added any users yet. Once you create a user, it will appear
      here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  // search input (immediate) and debouncedSearch (sent to server)
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  /* ================= FETCH USERS (server-side pagination) ================= */
  // fetch when page, rows or debounced search change
  useEffect(() => {
    userDataGet();
  }, [pagination.page, pagination.rows, debouncedSearch]);

  // debounce searchInput -> debouncedSearch
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // when debounced search changes reset to first page
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const userDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/register/all-users", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
      });

      setUserData(res.data.users || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.totalUsers || 0,
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

  /* ================= ACTIONS ================= */
  const handleAddUser = () => {
    setEditUserId(null);
    setSelectedUser(null);
    setVisible(true);
  };

  const handleUpdate = (rowData: any) => {
    setEditUserId(rowData._id);
    setSelectedUser(rowData);
    setVisible(true);
  };

  const toggleUserStatus = async (rowData: any) => {
    try {
      const res = await axiosInstance.patch(
        `/register/toggle-status/${rowData._id}`
      );
      toast.success(res.data.message || "Status updated successfully");
      await userDataGet();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Status update failed");
    }
  };

  const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/register/delete-user/${rowData._id}`
          );
          toast.success(res.data.message || "User deleted successfully");
          await userDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  /* ================= COLUMN TEMPLATES ================= */
  const imageTemplate = (rowData: any) => {
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

    const initials = getInitials(rowData?.name || "");
    const bgClass = stringToBg(rowData?.name || "");

    return (
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${bgClass}`}>
        {initials}
      </div>
    );
  };

  const statusTemplate = (rowData: any) => (
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

  const roleTemplate = (rowData: any) => (
    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
      {rowData.role}
    </span>
  );

  const actionTemplate = (rowData: any) => (
    <div onClick={(e) => e.stopPropagation()} className="flex">
      <Button
        icon="pi pi-ellipsis-v"
        rounded
        text
        aria-label="More actions"
        onClick={(e) => showRowMenu(e, rowData)}
      />
    </div>
  );

  const showRowMenu = (event: any, rowData: any) => {
    event.stopPropagation();
    setSelectedUser(rowData);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedUser) handleUpdate(selectedUser);
      },
    },
    {
      label: selectedUser?.isActive ? "Deactivate" : "Activate",
      icon: selectedUser?.isActive ? "pi pi-times-circle" : "pi pi-check-circle",
      command: () => {
        if (selectedUser) toggleUserStatus(selectedUser);
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
        if (selectedUser) confirmDelete(selectedUser);
      },
    },
  ];

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Users</h2>
        <p className="text-sm text-black">Manage users</p>
      </div>

      <div className="flex gap-2 items-center">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search user"
            className="p-inputtext-sm"
          />
        </IconField>
        <Button
          label="Add User"
          icon="pi pi-plus"
          onClick={handleAddUser}
          className="bg-white text-primary border-0 hover:bg-gray-100"
        />
      </div>
    </div>
  );

  const EditUserHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500  mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
        <i className="pi pi-user-edit text-white text-2xl"></i>
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Edit User</h2>
        <p className="text-sm text-white/90">Update user information</p>
      </div>
    </div>
  );

   const AddUserHeader = (
    <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600  mb-2 p-3 rounded-t-lg">
      <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
        <i className="pi pi-user-plus text-white text-2xl"></i>
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Add New User</h2>
        <p className="text-sm text-white/90">Create a new team member</p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={userData}
          header={header}
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
          <Column header="Avatar" body={imageTemplate} />
          <Column field="name" header="Name" sortable />
          <Column field="email" header="Email" sortable />
          <Column field="phone" header="Phone" />
          <Column header="Role" body={roleTemplate} />
          <Column header="Status" body={statusTemplate} />
          <Column header="Created" body={(row: any) => formatDate(row.createdAt)} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        {/* popup menu (single instance) */}
        <Menu model={menuModel} popup ref={menu} />

        <Dialog 
          header={editUserId ? EditUserHeader : AddUserHeader} 
          visible={visible} 
          style={{ width: "50vw" }} 
          onHide={() => {
            setVisible(false);
            setEditUserId(null);
            setSelectedUser(null);
          }}
        >
          <UserForm
            userId={editUserId}
            onClose={() => {
              setVisible(false);
              setEditUserId(null);
              setSelectedUser(null);
            }}
            onSuccess={() => {
              userDataGet();
              setVisible(false);
              setEditUserId(null);
              setSelectedUser(null);
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