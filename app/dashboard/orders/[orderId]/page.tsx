"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { formatDate } from "@/helper/DateTime";
import {
  OrderRow,
  OrderStatus,
  STATUS_STYLES,
  STATUS_ICONS,
  TERMINAL_STATUSES,
  getNextStatuses,
  updateOrderStatusApi,
} from "@/types/order";

function OrderDetailsPage() {
  const router = useRouter();
  const { orderId } = useParams<{ orderId: string }>();

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<OrderRow | null>(null);

  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  useEffect(() => {
    if (orderId) getOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const getOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/order/store-orders/${orderId}`);
      setOrder(res.data.order);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Order not found");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const applyStatusChange = async (status: OrderStatus, note?: string) => {
    if (!order) return;
    try {
      setUpdating(true);
      const res = await updateOrderStatusApi(order._id, status, note);
      toast.success(res.data.message || `Order marked as ${status}`);
      setOrder((prev) => (prev ? { ...prev, ...res.data.order } : prev));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Status update failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusClick = (newStatus: OrderStatus) => {
    if (!order) return;

    if (newStatus === "CANCELLED") {
      setCancelNote("");
      setCancelDialogVisible(true);
      return;
    }

    confirmDialog({
      message: `Change order status from "${order.status}" to "${newStatus}"?`,
      header: "Confirm Status Change",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-warning",
      accept: () => applyStatusChange(newStatus),
    });
  };

  const confirmCancelOrder = async () => {
    await applyStatusChange("CANCELLED", cancelNote.trim() || undefined);
    setCancelDialogVisible(false);
  };

  if (loading || !order) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <i className="pi pi-spin pi-spinner text-3xl text-gray-400" />
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const nextStatuses = getNextStatuses(order.status);

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-3 sm:p-5 space-y-5">
        {/* Header */}
        <div
          className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center p-3 rounded-lg"
          style={{ background: "linear-gradient(120deg,#f3be27,#e4a90e)" }}
        >
          <div className="flex items-center gap-3">
            <Button
              icon="pi pi-arrow-left"
              onClick={() => router.push("/dashboard/orders")}
              text
              style={{ color: "#1d232f" }}
            />
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Order #{order.orderNumber}
              </h2>
              <p className="text-xs text-gray-700">Placed on {formatDate(order.createdAt)}</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status]}`}
          >
            {order.status}
          </span>
        </div>

        {/* Status action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isTerminal ? (
            <p className="text-xs text-gray-500 italic">
              This order is {order.status.toLowerCase()} — status can no longer be changed.
            </p>
          ) : (
            nextStatuses.map((s) => (
              <Button
                key={s}
                label={`Mark as ${s}`}
                icon={STATUS_ICONS[s]}
                loading={updating}
                onClick={() => handleStatusClick(s)}
                severity={s === "CANCELLED" ? "danger" : undefined}
                style={
                  s === "CANCELLED"
                    ? undefined
                    : { background: "#ffcf00", color: "#1d232f", border: "1px solid #e0ac1f" }
                }
              />
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-700 text-sm">
                Items ({order.totalItems})
              </div>
              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item._id} className="flex gap-3 p-3">
                    <div className="h-14 w-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        Code: {item.productCode || "-"} • {item.unit}
                        {item.size ? ` • ${item.size}` : ""}
                        {item.weight ? ` • ${item.weight}` : ""}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Qty: {item.quantity} × ₹{item.offerPrice.toFixed(2)}
                        <span className="line-through text-gray-400 ml-2">
                          ₹{item.mrp.toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 shrink-0">
                      ₹{item.lineTotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="border border-gray-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-gray-700 mb-2">Delivery Address</p>
              <p className="text-gray-800">{order.deliveryAddress.fullName}</p>
              <p className="text-gray-600">{order.deliveryAddress.phone}</p>
              <p className="text-gray-600">
                {order.deliveryAddress.addressLine}
                {order.deliveryAddress.area ? `, ${order.deliveryAddress.area}` : ""}
              </p>
              <p className="text-gray-600">
                {order.deliveryAddress.city}, {order.deliveryAddress.state} -{" "}
                {order.deliveryAddress.pincode}
              </p>
              <p className="text-gray-600">{order.deliveryAddress.country}</p>
              {order.note && (
                <p className="text-gray-600 mt-2">
                  <span className="font-medium">Note:</span> {order.note}
                </p>
              )}
            </div>

            {order.status === "CANCELLED" && order.cancelReason && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm">
                <p className="font-semibold text-red-700">Cancellation Reason</p>
                <p className="text-red-600 mt-1">{order.cancelReason}</p>
                <p className="text-xs text-red-400 mt-1">Cancelled by: {order.cancelledBy}</p>
              </div>
            )}

            {/* Status history */}
            {order.statusHistory && (order as any).statusHistory?.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-gray-700 mb-2">Status History</p>
                <div className="space-y-1">
                  {(order as any).statusHistory.map((h: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-gray-600">
                      <span className={`px-2 py-0.5 rounded-full ${STATUS_STYLES[h.status as OrderStatus]}`}>
                        {h.status}
                      </span>
                      <span>{formatDate(h.at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Customer + Summary */}
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-gray-700 mb-2">Customer</p>
              <p className="text-gray-800">{order.userId?.name}</p>
              <p className="text-gray-600">{order.userId?.email}</p>
              <p className="text-gray-600">{order.userId?.phone}</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 text-sm space-y-2">
              <p className="font-semibold text-gray-700 mb-1">Order Summary</p>
              <div className="flex justify-between text-gray-600">
                <span>Total MRP</span>
                <span>₹{order.totalMrp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span>- ₹{order.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-800 pt-2 border-t border-gray-100">
                <span>Total Amount</span>
                <span>₹{order.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 pt-2">
                <span>Payment Method</span>
                <span>{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Payment Status</span>
                <span>{order.paymentStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel reason dialog */}
        <Dialog
          header="Cancel Order"
          visible={cancelDialogVisible}
          style={{ width: "28rem" }}
          onHide={() => setCancelDialogVisible(false)}
        >
          <p className="text-sm text-gray-600 mb-2">Cancellation reason (optional):</p>
          <InputTextarea
            value={cancelNote}
            onChange={(e) => setCancelNote(e.target.value)}
            rows={3}
            className="w-full"
            placeholder="e.g. Out of stock"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button label="Close" text onClick={() => setCancelDialogVisible(false)} />
            <Button
              label="Confirm Cancel"
              severity="danger"
              onClick={confirmCancelOrder}
              loading={updating}
            />
          </div>
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default OrderDetailsPage;