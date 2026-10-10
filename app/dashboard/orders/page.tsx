"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { getCustomer } from "@/helper/order";
import {
  OrderRow,
  OrderStatus,
  STATUS_STYLES,
  STATUS_ICONS,
  getNextStatuses,
  isQuotePending,
  updateOrderStatusApi,
} from "@/types/order";
import { useNotifications } from "@/lib/NotificationContext";
import DeliveryDateDialog, {
  formatDeliveryDate,
} from "@/components/orders/DeliveryDateDialog";
// [DELIVERY] order place er somoy er estimate dekhano
import { formatEstimateRange } from "@/helper/delivery";

const ENDPOINT = "/api/order/store-orders";

// Cancel reason validation
const CANCEL_REASON_MIN = 3;
const CANCEL_REASON_MAX = 300;
const getCancelReasonError = (value: string) => {
  const v = value.trim();
  if (!v) return "Cancellation reason is required";
  if (v.length < CANCEL_REASON_MIN)
    return `Reason must be at least ${CANCEL_REASON_MIN} characters`;
  return "";
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-12">
    <div className="text-6xl mb-4">🧾</div>
    <h2 className="text-xl font-semibold text-gray-700">No Orders Yet</h2>
    <p className="text-gray-500 mt-2 max-w-md">
      Orders placed by customers will show up here.
    </p>
  </div>
);

const Spinner = () => (
  <div className="flex justify-center items-center py-16">
    <i className="pi pi-spin pi-spinner text-3xl text-gray-400" />
  </div>
);

// price on request order: store estimate dibe / user accept korbe
const QuoteBadge = ({ order }: { order: OrderRow }) => {
  if (order.priceStatus === "AWAITING_QUOTE")
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 whitespace-nowrap">
        Quote needed
      </span>
    );
  if (order.priceStatus === "QUOTED")
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 whitespace-nowrap">
        Awaiting customer
      </span>
    );
  return null;
};

// price estimate pending thakle CONFIRMED option hide
const availableStatuses = (order: OrderRow): OrderStatus[] =>
  getNextStatuses(order.status).filter(
    (s) => !(s === "CONFIRMED" && isQuotePending(order)),
  );

// status response e userId string ashle purono populated customer rekhe dao
const mergeOrder = (prev: OrderRow, incoming: any): OrderRow => {
  const merged = { ...prev, ...incoming };
  if (!incoming?.userId || typeof incoming.userId !== "object") {
    merged.userId = prev.userId;
  }
  return merged;
};

// delivery date shudhu ei status gulo te edit kora jay
const DELIVERY_DATE_EDITABLE: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
];

// [DELIVERY] store date set kora thakle seta, nahole order er somoy dekhano estimate
const deliveryCell = (row: OrderRow) => {
  if (row.expectedDeliveryDate) {
    return formatDeliveryDate(row.expectedDeliveryDate);
  }
  if (
    DELIVERY_DATE_EDITABLE.includes(row.status) &&
    row.deliveryInfo?.estimatedMinDate
  ) {
    return (
      <span className="text-xs text-gray-500">
        Est. {formatEstimateRange(row.deliveryInfo)}
      </span>
    );
  }
  return formatDeliveryDate(row.expectedDeliveryDate);
};

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

  // cancel-reason dialog state
  const [cancelDialog, setCancelDialog] = useState<{
    visible: boolean;
    orderId: string | null;
  }>({ visible: false, orderId: null });
  const [cancelNote, setCancelNote] = useState("");
  const [cancelError, setCancelError] = useState("");

  // delivery date dialog state (ship / edit)
  const [dateDialog, setDateDialog] = useState<{
    visible: boolean;
    order: OrderRow | null;
    mode: "ship" | "edit";
  }>({ visible: false, order: null, mode: "edit" });

  // stale response guard
  const requestIdRef = useRef(0);

  useEffect(() => {
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getOrders = useCallback(async () => {
    const requestId = ++requestIdRef.current;
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

      if (requestId !== requestIdRef.current) return; // purono response ignore

      const orders = res.data.orders || [];
      setOrderData(orders);
      setPagination((prev) => ({
        ...prev,
        total: res.data.totalOrders ?? orders.length ?? 0,
      }));
    } catch (error: any) {
      if (requestId !== requestIdRef.current) return;
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [pagination.page, pagination.rows, debouncedSearch, statusFilter]);

  useEffect(() => {
    getOrders();
  }, [getOrders]);

  // debounce + page reset ekshathe (double fetch hobe na)
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      setDebouncedSearch((prev) => {
        if (prev !== next) {
          setPagination((p) => ({ ...p, page: 1 }));
        }
        return next;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleStatusFilterChange = (value: OrderStatus | "ALL") => {
    setStatusFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
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

      if (statusFilter !== "ALL") {
        // filter on thakle row ta ar ei list e thakbe na, tai refetch
        await getOrders();
      } else {
        setOrderData((prev) =>
          prev.map((o) =>
            o._id === orderId ? mergeOrder(o, res.data.order) : o,
          ),
        );
      }
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Status update failed");
      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const requestStatusChange = (order: OrderRow, newStatus: OrderStatus) => {
    if (newStatus === "CANCELLED") {
      setCancelNote("");
      setCancelError("");
      setCancelDialog({ visible: true, orderId: order._id });
      return;
    }

    // SHIPPED korar age delivery date nite hobe
    if (newStatus === "SHIPPED") {
      setDateDialog({ visible: true, order, mode: "ship" });
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

  const closeDateDialog = () =>
    setDateDialog((d) => ({ ...d, visible: false }));

  const confirmDeliveryDate = async (dateStr: string) => {
    const order = dateDialog.order;
    if (!order) return;
    const isShip = dateDialog.mode === "ship";

    try {
      setUpdatingId(order._id);
      const res = isShip
        ? await axiosInstance.patch(`${ENDPOINT}/${order._id}/status`, {
            status: "SHIPPED",
            expectedDeliveryDate: dateStr,
          })
        : await axiosInstance.patch(`${ENDPOINT}/${order._id}/delivery-date`, {
            expectedDeliveryDate: dateStr,
          });

      toast.success(
        res.data.message ||
          (isShip ? "Order marked as SHIPPED" : "Delivery date updated"),
      );

      if (isShip && statusFilter !== "ALL") {
        await getOrders(); // filter on thakle row ar ei list e thakbe na
      } else {
        setOrderData((prev) =>
          prev.map((o) =>
            o._id === order._id ? mergeOrder(o, res.data.order) : o,
          ),
        );
      }
      closeDateDialog();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.errors?.[0]?.message ||
          err?.response?.data?.message ||
          "Failed to update delivery date",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const closeCancelDialog = () => {
    setCancelDialog({ visible: false, orderId: null });
    setCancelNote("");
    setCancelError("");
  };

  const confirmCancelOrder = async () => {
    if (!cancelDialog.orderId) return;

    // Remarks mandatory
    const err = getCancelReasonError(cancelNote);
    if (err) {
      setCancelError(err);
      return;
    }

    const ok = await applyStatusChange(
      cancelDialog.orderId,
      "CANCELLED",
      cancelNote.trim(),
    );
    if (ok) closeCancelDialog();
  };

  const statusTemplate = (rowData: OrderRow) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[rowData.status]}`}
    >
      {rowData.status}
    </span>
  );

  const customerTemplate = (rowData: OrderRow) => {
    const c = getCustomer(rowData);
    return (
      <div>
        <p className="font-medium text-gray-800">{c.name}</p>
        <p className="text-xs text-gray-500">{c.phone}</p>
      </div>
    );
  };

  const itemsTemplate = (rowData: OrderRow) => (
    <span>
      {rowData.totalItems} item{rowData.totalItems > 1 ? "s" : ""}
    </span>
  );

  const amountTemplate = (rowData: OrderRow) => {
    // price estimate pending hole amount-er jaygay badge
    if (isQuotePending(rowData)) {
      return (
        <div className="space-y-0.5">
          <QuoteBadge order={rowData} />
          {rowData.priceStatus === "QUOTED" && rowData.quote && (
            <p className="text-xs text-gray-500">
              Est. ₹{Number(rowData.quote.total).toFixed(2)}
            </p>
          )}
        </div>
      );
    }
    return (
      <div>
        <p className="font-semibold text-gray-800">
          ₹{Number(rowData.totalAmount).toFixed(2)}
        </p>
        <p className="text-xs text-gray-400 line-through">
          ₹{Number(rowData.totalMrp).toFixed(2)}
        </p>
      </div>
    );
  };

  // View + status-change + delivery date dropdown ekshathe (SplitButton)
  const actionTemplate = (rowData: OrderRow) => {
    const items: any[] = availableStatuses(rowData).map((s) => ({
      label: `Mark as ${s}`,
      icon: STATUS_ICONS[s],
      command: () => requestStatusChange(rowData, s),
    }));

    if (DELIVERY_DATE_EDITABLE.includes(rowData.status)) {
      items.unshift({
        label: rowData.expectedDeliveryDate
          ? "Edit delivery date"
          : "Set delivery date",
        icon: "pi pi-calendar",
        command: () =>
          setDateDialog({ visible: true, order: rowData, mode: "edit" }),
      });
    }

    // price estimate pending: details page e giye price dite hobe
    if (rowData.status === "PENDING" && isQuotePending(rowData)) {
      items.unshift({
        label:
          rowData.priceStatus === "QUOTED"
            ? "Revise price estimate"
            : "Send price estimate",
        icon: "pi pi-tag",
        command: () => goToDetails(rowData._id),
      });
    }

    return (
      <div onClick={(e) => e.stopPropagation()}>
        <SplitButton
          label="View"
          icon="pi pi-eye"
          onClick={() => goToDetails(rowData._id)}
          model={items}
          loading={updatingId === rowData._id}
          className="text-xs [&_.p-splitbutton-defaultbutton]:!bg-[#3b82f6] [&_.p-splitbutton-defaultbutton]:!text-white [&_.p-splitbutton-defaultbutton]:!border-[#2563eb]"
        />
      </div>
    );
  };

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.rows));

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
            handleStatusFilterChange(e.target.value as OrderStatus | "ALL")
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

        {loading && orderData.length === 0 && <Spinner />}
        {!loading && orderData.length === 0 && <EmptyState />}

        {viewMode === "card" && orderData.length > 0 && (
          <div
            className={`p-2 ${loading ? "opacity-60 pointer-events-none" : ""}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {orderData.map((order) => {
                const nextStatuses = availableStatuses(order);
                const customer = getCustomer(order);
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
                          {customer.name}
                        </p>
                        <p>
                          <span className="font-medium">📞 Phone:</span>{" "}
                          {customer.phone || "-"}
                        </p>
                        <p>
                          <span className="font-medium">📦 Items:</span>{" "}
                          {order.totalItems}
                        </p>
                        <p>
                          <span className="font-medium">💳 Payment:</span>{" "}
                          {order.paymentMethod} ({order.paymentStatus})
                        </p>
                        <p>
                          <span className="font-medium">🚚 Delivery:</span>{" "}
                          {deliveryCell(order)}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-1.5 border-t border-blue-100 mt-0.5">
                        {isQuotePending(order) ? (
                          <>
                            <QuoteBadge order={order} />
                            {order.priceStatus === "QUOTED" && order.quote && (
                              <span className="text-xs text-gray-500">
                                Est. ₹{Number(order.quote.total).toFixed(2)}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-semibold text-blue-700">
                              ₹{Number(order.totalAmount).toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-400 line-through">
                              ₹{Number(order.totalMrp).toFixed(2)}
                            </span>
                          </>
                        )}
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

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center mt-4 p-2.5 border-t border-blue-100">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.rows + 1} to{" "}
                {Math.min(pagination.page * pagination.rows, pagination.total)}{" "}
                of {pagination.total} orders
              </p>
              <div className="flex gap-2 items-center">
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
                  disabled={pagination.page >= totalPages}
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
            rowClassName={() => "cursor-pointer"}
            emptyMessage={<EmptyState />}
          >
            <Column field="orderNumber" header="Order #" />
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
              header="Delivery"
              body={(row: OrderRow) => deliveryCell(row)}
            />
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

        {/* Cancel reason dialog (remarks mandatory) */}
        <Dialog
          header="Cancel Order"
          visible={cancelDialog.visible}
          style={{ width: "28rem" }}
          breakpoints={{ "641px": "95vw" }}
          onHide={closeCancelDialog}
        >
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            Cancellation reason <span className="text-red-500">*</span>
          </label>
          <InputTextarea
            value={cancelNote}
            onChange={(e) => {
              setCancelNote(e.target.value);
              if (cancelError) setCancelError("");
            }}
            onBlur={() => setCancelError(getCancelReasonError(cancelNote))}
            rows={3}
            maxLength={CANCEL_REASON_MAX}
            className={`w-full ${cancelError ? "p-invalid" : ""}`}
            placeholder="e.g. Out of stock"
            autoFocus
          />
          <div className="flex justify-between items-start mt-1">
            {cancelError ? (
              <small className="text-red-500 flex items-center gap-1">
                <i className="pi pi-exclamation-circle"></i>
                {cancelError}
              </small>
            ) : (
              <span />
            )}
            <small className="text-gray-400">
              {cancelNote.length}/{CANCEL_REASON_MAX}
            </small>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button label="Close" text onClick={closeCancelDialog} />
            <Button
              label="Confirm Cancel"
              severity="danger"
              onClick={confirmCancelOrder}
              loading={updatingId === cancelDialog.orderId}
              disabled={cancelNote.trim().length < CANCEL_REASON_MIN}
            />
          </div>
        </Dialog>

        {/* Expected delivery date dialog (ship / edit) */}
        <DeliveryDateDialog
          visible={dateDialog.visible}
          title={
            dateDialog.mode === "ship"
              ? `Ship Order #${dateDialog.order?.orderNumber ?? ""}`
              : "Expected Delivery Date"
          }
          description={
            dateDialog.mode === "ship"
              ? "Set when this order will reach the customer, then it will be marked as Shipped."
              : "Set or change when this order will reach the customer."
          }
          confirmLabel={dateDialog.mode === "ship" ? "Ship Order" : "Save Date"}
          loading={updatingId === dateDialog.order?._id}
          // [DELIVERY] date set kora na thakle customer ke dekhano estimate er shesh date prefill
          initialDate={
            dateDialog.order?.expectedDeliveryDate ??
            dateDialog.order?.deliveryInfo?.estimatedMaxDate
          }
          onHide={closeDateDialog}
          onConfirm={confirmDeliveryDate}
        />

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default OrdersPage;