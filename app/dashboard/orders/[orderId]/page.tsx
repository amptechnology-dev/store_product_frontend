"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
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

const WORKER_ENDPOINT = "/api/worker/all-workers";

// Adjust to your karigars' actual country code (e.g. "880" for BD numbers).
const DEFAULT_COUNTRY_CODE = "91";

type KarigarRow = {
  _id: string;
  name: string;
  whatsappNo: string;
  isActive?: boolean;
};

const toWhatsAppNumber = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length > 10) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }
  return `${DEFAULT_COUNTRY_CODE}${digits}`;
};

// Shudhu jeta lagbe seta e — Image, Color (if any), Size (if any), Weight (if any), Quantity
const buildShareMessage = (item: any) => {
  const lines = [
    item.image ? `Image: ${item.image}` : null,
    item.color ? `Color: ${item.color}` : null,
    item.size ? `Size: ${item.size}` : null,
    item.weight ? `Weight: ${item.weight}` : null,
    `Quantity: ${item.quantity}`,
  ].filter(Boolean);

  return lines.join("\n");
};

function OrderDetailsPage() {
  const router = useRouter();
  const { orderId } = useParams<{ orderId: string }>();

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<OrderRow | null>(null);

  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  // ---- Karigar share modal state ----
  const [shareModal, setShareModal] = useState<{
    visible: boolean;
    item: any | null;
  }>({ visible: false, item: null });
  const [karigars, setKarigars] = useState<KarigarRow[]>([]);
  const [karigarLoading, setKarigarLoading] = useState(false);
  const [karigarSearch, setKarigarSearch] = useState("");

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

  // ---- Karigar share handlers ----
  const getKarigars = async () => {
    try {
      setKarigarLoading(true);
      const res = await axiosInstance.get(WORKER_ENDPOINT, {
        params: { limit: 100 },
      });
      setKarigars(
        (res.data.workers || []).filter((w: KarigarRow) => w.isActive !== false),
      );
    } catch {
      toast.error("Failed to load karigars");
    } finally {
      setKarigarLoading(false);
    }
  };

  const openShareModal = (item: any) => {
    setShareModal({ visible: true, item });
    if (karigars.length === 0) getKarigars();
  };

  const closeShareModal = () => {
    setShareModal({ visible: false, item: null });
    setKarigarSearch("");
  };

  const handleSelectKarigar = (karigar: KarigarRow) => {
    if (!shareModal.item) return;

    const number = toWhatsAppNumber(karigar.whatsappNo);
    const message = buildShareMessage(shareModal.item);
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Opening WhatsApp for ${karigar.name}`);
    closeShareModal();
  };

  const filteredKarigars = useMemo(() => {
    if (!karigarSearch.trim()) return karigars;
    const q = karigarSearch.trim().toLowerCase();
    return karigars.filter(
      (k) => k.name?.toLowerCase().includes(q) || k.whatsappNo?.includes(q),
    );
  }, [karigars, karigarSearch]);

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
      <div className="w-full bg-white rounded-lg shadow p-3 sm:p-4 space-y-3">
        {/* Header: back + order# + customer (compact, same block) + status */}
        <div
          className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-3 rounded-lg"
          style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              icon="pi pi-arrow-left"
              onClick={() => router.push("/dashboard/orders")}
              text
              style={{ color: "#fff" }}
            />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-white leading-tight">
                Order #{order.orderNumber}
              </h2>
              <p className="text-[11px] text-blue-100 leading-tight">
                Placed on {formatDate(order.createdAt)}
              </p>
              <p className="text-xs text-white/90 leading-tight mt-0.5">
                <i className="pi pi-user mr-1"></i>
                {order.userId?.name}
                <span className="text-blue-100"> • {order.userId?.phone}</span>
                {order.userId?.email && (
                  <span className="text-blue-100"> • {order.userId?.email}</span>
                )}
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${STATUS_STYLES[order.status]}`}
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
                    : { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }
                }
              />
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left: Items */}
          <div className="lg:col-span-2 space-y-3">
            <div className="border border-blue-100 rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-3 py-2 font-semibold text-blue-800 text-sm flex items-center justify-between">
                <span>Items ({order.totalItems})</span>
                <span className="text-[11px] font-normal text-blue-500">
                  click a product to share with karigar
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {order.items.map((item: any) => (
                  <div
                    key={item._id}
                    onClick={() => openShareModal(item)}
                    className="flex gap-3 p-2.5 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
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
                    <div className="flex flex-col items-end justify-between shrink-0">
                      <div className="text-sm font-semibold text-blue-700">
                        ₹{item.lineTotal.toFixed(2)}
                      </div>
                      <i className="pi pi-whatsapp text-green-600 text-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="border border-blue-100 rounded-lg p-3 text-sm">
              <p className="font-semibold text-gray-700 mb-1.5">Delivery Address</p>
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
                <p className="text-gray-600 mt-1.5">
                  <span className="font-medium">Note:</span> {order.note}
                </p>
              )}
            </div>

            {order.status === "CANCELLED" && order.cancelReason && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm">
                <p className="font-semibold text-red-700">Cancellation Reason</p>
                <p className="text-red-600 mt-1">{order.cancelReason}</p>
                <p className="text-xs text-red-400 mt-1">Cancelled by: {order.cancelledBy}</p>
              </div>
            )}

            {/* Status history */}
            {order.statusHistory && (order as any).statusHistory?.length > 0 && (
              <div className="border border-blue-100 rounded-lg p-3 text-sm">
                <p className="font-semibold text-gray-700 mb-1.5">Status History</p>
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

          {/* Right: Order Summary only (Customer moved to header) */}
          <div className="space-y-3">
            <div className="border border-blue-100 rounded-lg p-3 text-sm space-y-1.5">
              <p className="font-semibold text-gray-700 mb-1">Order Summary</p>
              <div className="flex justify-between text-gray-600">
                <span>Total MRP</span>
                <span>₹{order.totalMrp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span>- ₹{order.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-800 pt-1.5 border-t border-gray-100">
                <span>Total Amount</span>
                <span>₹{order.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 pt-1.5">
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

        {/* Karigar share modal */}
        <Dialog
          header={
            shareModal.item
              ? `Share "${shareModal.item.name}" with Karigar`
              : "Share with Karigar"
          }
          visible={shareModal.visible}
          style={{ width: "28rem" }}
          breakpoints={{ "641px": "95vw" }}
          onHide={closeShareModal}
        >
          {shareModal.item && (
            <div className="flex items-center gap-3 border border-blue-100 rounded-lg p-2 mb-3 bg-blue-50">
              <div className="h-12 w-12 rounded-md overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                {shareModal.item.image ? (
                  <img
                    src={shareModal.item.image}
                    alt={shareModal.item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                    N/A
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-700">
                <p className="font-medium">{shareModal.item.name}</p>
                <p className="text-gray-500">
                  {shareModal.item.color && `${shareModal.item.color} • `}
                  {shareModal.item.size && `${shareModal.item.size} • `}
                  Qty {shareModal.item.quantity}
                </p>
              </div>
            </div>
          )}

          <IconField iconPosition="left" className="w-full mb-2">
            <InputIcon className="pi pi-search" />
            <InputText
              value={karigarSearch}
              onChange={(e) => setKarigarSearch(e.target.value)}
              placeholder="Search karigar by name / number"
              className="p-inputtext-sm w-full"
            />
          </IconField>

          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {karigarLoading && (
              <p className="text-xs text-gray-400 text-center py-4">Loading karigars...</p>
            )}

            {!karigarLoading && filteredKarigars.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No karigar found</p>
            )}

            {!karigarLoading &&
              filteredKarigars.map((k) => (
                <button
                  key={k._id}
                  onClick={() => handleSelectKarigar(k)}
                  className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-3 py-2 hover:bg-green-50 hover:border-green-300 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{k.name}</p>
                    <p className="text-xs text-gray-500">{k.whatsappNo}</p>
                  </div>
                  <i className="pi pi-whatsapp text-green-600 text-lg" />
                </button>
              ))}
          </div>
        </Dialog>

        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default OrderDetailsPage;