"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { SplitButton } from "primereact/splitbutton";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { formatDate } from "@/helper/DateTime";
import {
  OrderRow,
  OrderStatus,
  STATUS_STYLES,
  STATUS_ICONS,
  getNextStatuses,
  updateOrderStatusApi,
} from "@/types/order";
import { useNotifications } from "@/lib/NotificationContext";

const ENDPOINT = "/api/order/store-orders";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12">
    <div className="text-6xl mb-4">🧾</div>
    <h2 className="text-xl font-semibold text-gray-700">No Orders Yet</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      Customer order placed korle seta ekhane show korbe.
    </p>
  </div>
);

function OrdersPage() {
  const router = useRouter();
  const { markAllRead } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<OrderRow[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [pagination, setPagination] = useState({ page: 1, rows: 10, total: 0 });
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");

  // cancel-reason dialog state (CANCELLED status er jonno note lagbe)
  const [cancelDialog, setCancelDialog] = useState<{
    visible: boolean;
    orderId: string | null;
  }>({ visible: false, orderId: null });
  const [cancelNote, setCancelNote] = useState("");

  useEffect(() => {
    markAllRead();
  }, []);

  useEffect(() => {
    getOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.rows, debouncedSearch, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, statusFilter]);

  const getOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ENDPOINT, {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        },
      });

      const orders = res.data.orders || [];
      setOrderData(orders);
      setPagination((prev) => ({
        ...prev,
        total: res.data.totalOrders || orders.length || 0,
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

  const goToDetails = (orderId: string) => {
    router.push(`/dashboard/orders/${orderId}`);
  };

  // ---- Status change (list theke direct) ----
  const applyStatusChange = async (
    orderId: string,
    status: OrderStatus,
    note?: string,
  ) => {
    try {
      setUpdatingId(orderId);
      const res = await updateOrderStatusApi(orderId, status, note);
      toast.success(res.data.message || `Order marked as ${status}`);

      // optimistic local update, full refetch na kore
      setOrderData((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, ...res.data.order } : o)),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Status update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const requestStatusChange = (order: OrderRow, newStatus: OrderStatus) => {
    if (newStatus === "CANCELLED") {
      setCancelNote("");
      setCancelDialog({ visible: true, orderId: order._id });
      return;
    }

    confirmDialog({
      message: `Change order #${order.orderNumber} status from "${order.status}" to "${newStatus}"?`,
      header: "Confirm Status Change",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-warning",
      accept: () => applyStatusChange(order._id, newStatus),
    });
  };

  const confirmCancelOrder = async () => {
    if (!cancelDialog.orderId) return;
    await applyStatusChange(
      cancelDialog.orderId,
      "CANCELLED",
      cancelNote.trim() || undefined,
    );
    setCancelDialog({ visible: false, orderId: null });
    setCancelNote("");
  };

  const statusTemplate = (rowData: OrderRow) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[rowData.status]}`}
    >
      {rowData.status}
    </span>
  );

  const customerTemplate = (rowData: OrderRow) => (
    <div>
      <p className="font-medium text-gray-800">
        {rowData.userId?.name || "N/A"}
      </p>
      <p className="text-xs text-gray-500">{rowData.userId?.phone}</p>
    </div>
  );

  const itemsTemplate = (rowData: OrderRow) => (
    <span>
      {rowData.totalItems} item{rowData.totalItems > 1 ? "s" : ""}
    </span>
  );

  const amountTemplate = (rowData: OrderRow) => (
    <div>
      <p className="font-semibold text-gray-800">
        ₹{Number(rowData.totalAmount).toFixed(2)}
      </p>
      <p className="text-xs text-gray-400 line-through">
        ₹{Number(rowData.totalMrp).toFixed(2)}
      </p>
    </div>
  );

  // View + status-change dropdown ekshathe (SplitButton)
  const actionTemplate = (rowData: OrderRow) => {
    const nextStatuses = getNextStatuses(rowData.status);

    const items = nextStatuses.map((s) => ({
      label: `Mark as ${s}`,
      icon: STATUS_ICONS[s],
      command: () => requestStatusChange(rowData, s),
    }));

    return (
      <div onClick={(e) => e.stopPropagation()}>
        <SplitButton
          label="View"
          icon="pi pi-eye"
          onClick={() => goToDetails(rowData._id)}
          model={items}
          loading={updatingId === rowData._id}
          disabled={items.length === 0 && false} // View always enabled
          className="text-xs [&_.p-splitbutton-defaultbutton]:!bg-[#3b82f6] [&_.p-splitbutton-defaultbutton]:!text-white [&_.p-splitbutton-defaultbutton]:!border-[#2563eb]"
        />
      </div>
    );
  };

  const header = (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
      style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
    >
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-white">
          Orders
        </h2>
        <p className="text-xs text-blue-100">Manage customer orders</p>
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
            placeholder="Search order # / customer"
            className="p-inputtext-sm w-full"
          />
        </IconField>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as OrderStatus | "ALL")
          }
          className="p-inputtext-sm border rounded-md px-2 py-1.5 bg-white"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <div className="flex gap-0.5 bg-white/20 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            icon="pi pi-bars"
            onClick={() => setViewMode("table")}
            style={{
              minWidth: "36px",
              padding: "6px",
              background: viewMode === "table" ? "#fff" : "transparent",
              color: viewMode === "table" ? "#1d4ed8" : "#fff",
              border: "1px solid #93c5fd",
            }}
          />
          <Button
            icon="pi pi-th"
            onClick={() => setViewMode("card")}
            style={{
              minWidth: "36px",
              padding: "6px",
              background: viewMode === "card" ? "#fff" : "transparent",
              color: viewMode === "card" ? "#1d4ed8" : "#fff",
              border: "1px solid #93c5fd",
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {header}

        {orderData.length === 0 && !loading && <EmptyState />}

        {viewMode === "card" && orderData.length > 0 && (
          <div className="p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {orderData.map((order) => {
                const nextStatuses = getNextStatuses(order.status);
                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-blue-100 flex flex-col"
                  >
                    <div
                      onClick={() => goToDetails(order._id)}
                      className="cursor-pointer p-2.5 sm:p-3 flex flex-col gap-1.5"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm md:text-base font-semibold text-gray-800">
                            #{order.orderNumber}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="text-xs text-gray-700 space-y-0.5">
                        <p>
                          <span className="font-medium">👤 Customer:</span>{" "}
                          {order.userId?.name}
                        </p>
                        <p>
                          <span className="font-medium">📞 Phone:</span>{" "}
                          {order.userId?.phone}
                        </p>
                        <p>
                          <span className="font-medium">📦 Items:</span>{" "}
                          {order.totalItems}
                        </p>
                        <p>
                          <span className="font-medium">💳 Payment:</span>{" "}
                          {order.paymentMethod} ({order.paymentStatus})
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 border-t border-blue-100 mt-0.5">
                        <span className="text-sm font-semibold text-blue-700">
                          ₹{Number(order.totalAmount).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          ₹{Number(order.totalMrp).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {nextStatuses.length > 0 && (
                      <div
                        className="flex gap-1 px-2.5 pb-2.5 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {nextStatuses.map((s) => (
                          <Button
                            key={s}
                            label={s}
                            icon={STATUS_ICONS[s]}
                            loading={updatingId === order._id}
                            onClick={() => requestStatusChange(order, s)}
                            className="text-xs flex-1"
                            severity={s === "CANCELLED" ? "danger" : undefined}
                            style={
                              s === "CANCELLED"
                                ? undefined
                                : {
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    border: "1px solid #bfdbfe",
                                  }
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-4 p-2.5 border-t border-blue-100">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.rows + 1} to{" "}
                {Math.min(pagination.page * pagination.rows, pagination.total)}{" "}
                of {pagination.total} orders
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

        {viewMode === "table" && orderData.length > 0 && (
          <DataTable
            value={orderData}
            lazy
            paginator
            first={(pagination.page - 1) * pagination.rows}
            rows={pagination.rows}
            totalRecords={pagination.total}
            loading={loading}
            rowsPerPageOptions={[10, 25, 50]}
            onPage={(e) =>
              setPagination((prev) => ({
                ...prev,
                page: (e.page ?? 0) + 1,
                rows: e.rows ?? prev.rows,
              }))
            }
            responsiveLayout="scroll"
            onRowClick={(e) => goToDetails((e.data as OrderRow)._id)}
            className="cursor-pointer"
            emptyMessage={<EmptyState />}
          >
            <Column field="orderNumber" header="Order #" sortable />
            <Column header="Customer" body={customerTemplate} />
            <Column header="Items" body={itemsTemplate} />
            <Column header="Amount" body={amountTemplate} />
            <Column
              header="Payment"
              body={(row: OrderRow) =>
                `${row.paymentMethod} • ${row.paymentStatus}`
              }
            />
            <Column header="Status" body={statusTemplate} />
            <Column
              header="Placed On"
              body={(row: OrderRow) => formatDate(row.createdAt)}
            />
            <Column
              header="Actions"
              body={actionTemplate}
              headerStyle={{ width: "140px" }}
            />
          </DataTable>
        )}

        {/* Cancel reason dialog */}
        <Dialog
          header="Cancel Order"
          visible={cancelDialog.visible}
          style={{ width: "28rem" }}
          onHide={() => setCancelDialog({ visible: false, orderId: null })}
        >
          <p className="text-sm text-gray-600 mb-2">
            Cancellation reason (optional):
          </p>
          <InputTextarea
            value={cancelNote}
            onChange={(e) => setCancelNote(e.target.value)}
            rows={3}
            className="w-full"
            placeholder="e.g. Out of stock"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button
              label="Close"
              text
              onClick={() => setCancelDialog({ visible: false, orderId: null })}
            />
            <Button
              label="Confirm Cancel"
              severity="danger"
              onClick={confirmCancelOrder}
              loading={updatingId === cancelDialog.orderId}
            />
          </div>
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default OrdersPage;