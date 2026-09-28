"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
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

// ---------- Media helpers (image / gif / video) ----------
const VIDEO_URL_REGEX = /\.(mp4|webm|mov)(\?.*)?$/i;
const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_REGEX.test(url);

/**
 * Halka media preview.
 *  - image/gif  -> lazy-loaded <img>
 *  - video      -> muted <video>, preload="metadata" (sudhu first frame load hoy)
 *      autoPlay=true  : screen e dekha gele play, baire gele pause (IntersectionObserver)
 *      autoPlay=false : hover korle play, mouse soriye nile pause + first frame e ferot
 */
function MediaPreview({
  src,
  alt = "",
  wrapperClassName = "",
  autoPlay = true,
  showBadge = true,
}: {
  src: string;
  alt?: string;
  wrapperClassName?: string;
  autoPlay?: boolean;
  showBadge?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = isVideoUrl(src);

  useEffect(() => {
    if (!isVideo || !autoPlay) return;
    const el = videoRef.current;
    if (!el) return;

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
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      <video
        ref={videoRef}
        src={`${src}#t=0.1`}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
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

// Ekta item er message block: Image/Video, Color, Size, Weight, Quantity (jegulo ache shudhu segulo)
const buildItemLines = (item: any): string[] =>
  [
    item.image
      ? `${isVideoUrl(item.image) ? "Video" : "Image"}: ${item.image}`
      : null,
    item.color ? `Color: ${item.color}` : null,
    item.size ? `Size: ${item.size}` : null,
    item.weight ? `Weight: ${item.weight}` : null,
    `Quantity: ${item.quantity}`,
  ].filter(Boolean) as string[];

// Single item -> label chhara. Multiple item -> "Item N" label + blank line separator
const buildShareMessage = (items: any[]) => {
  if (items.length === 1) return buildItemLines(items[0]).join("\n");

  return items
    .map((item, idx) => [`Item ${idx + 1}`, ...buildItemLines(item)].join("\n"))
    .join("\n\n");
};

function OrderDetailsPage() {
  const router = useRouter();
  const { orderId } = useParams<{ orderId: string }>();

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<OrderRow | null>(null);

  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  // ---- Multi-select state ----
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ---- Karigar share modal state (ekhon multiple items support kore) ----
  const [shareModal, setShareModal] = useState<{
    visible: boolean;
    items: any[];
  }>({ visible: false, items: [] });
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
      setSelectedIds([]);
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

  // ---- Selection helpers ----
  const allItems: any[] = useMemo(() => (order?.items as any[]) || [], [order]);

  const allSelected =
    allItems.length > 0 && selectedIds.length === allItems.length;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : allItems.map((i) => i._id));
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

  const openShareModal = (items: any[]) => {
    if (items.length === 0) return;
    setShareModal({ visible: true, items });
    if (karigars.length === 0) getKarigars();
  };

  const closeShareModal = () => {
    setShareModal({ visible: false, items: [] });
    setKarigarSearch("");
  };

  const handleShareSelected = () => {
    openShareModal(allItems.filter((i) => selectedIds.includes(i._id)));
  };

  const handleSelectKarigar = (karigar: KarigarRow) => {
    if (shareModal.items.length === 0) return;

    const number = toWhatsAppNumber(karigar.whatsappNo);
    const message = buildShareMessage(shareModal.items);
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(
      `Opening WhatsApp for ${karigar.name} (${shareModal.items.length} item${
        shareModal.items.length > 1 ? "s" : ""
      })`,
    );
    closeShareModal();
    setSelectedIds([]);
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
              {/* Items header: Select all + Send selected */}
              <div className="bg-blue-50 px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    inputId="select-all-items"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={allItems.length === 0}
                  />
                  <label
                    htmlFor="select-all-items"
                    className="font-semibold text-blue-800 cursor-pointer select-none"
                  >
                    Items ({order.totalItems})
                  </label>
                  <span className="text-[11px] text-blue-500">
                    {selectedIds.length > 0
                      ? `${selectedIds.length} selected`
                      : "Select all"}
                  </span>
                </div>

                {selectedIds.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      label="Clear"
                      text
                      size="small"
                      onClick={() => setSelectedIds([])}
                    />
                    <Button
                      label={`Send (${selectedIds.length}) to Karigar`}
                      icon="pi pi-whatsapp"
                      size="small"
                      onClick={handleShareSelected}
                      style={{
                        background: "#16a34a",
                        border: "1px solid #15803d",
                        color: "#fff",
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-[11px] font-normal text-blue-500">
                    select products or tap WhatsApp icon to share one
                  </span>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {allItems.map((item: any) => {
                  const isSelected = selectedIds.includes(item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => toggleItem(item._id)}
                      className={`flex items-start gap-3 p-2.5 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50" : "hover:bg-blue-50/60"
                      }`}
                    >
                      <div
                        className="pt-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleItem(item._id)}
                        />
                      </div>

                      {item.image ? (
                        <MediaPreview
                          src={item.image}
                          alt={item.name}
                          autoPlay={false}
                          showBadge={false}
                          wrapperClassName="h-14 w-14 rounded-lg border border-gray-200 bg-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                          N/A
                        </div>
                      )}

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

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        <div className="text-sm font-semibold text-blue-700">
                          ₹{item.lineTotal.toFixed(2)}
                        </div>
                        {/* Single item share */}
                        <button
                          type="button"
                          title="Share this product with karigar"
                          onClick={(e) => {
                            e.stopPropagation();
                            openShareModal([item]);
                          }}
                          className="p-1 rounded-full hover:bg-green-100 transition-colors"
                        >
                          <i className="pi pi-whatsapp text-green-600 text-lg" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
            shareModal.items.length === 1
              ? `Share "${shareModal.items[0].name}" with Karigar`
              : `Share ${shareModal.items.length} products with Karigar`
          }
          visible={shareModal.visible}
          style={{ width: "28rem" }}
          breakpoints={{ "641px": "95vw" }}
          onHide={closeShareModal}
        >
          {shareModal.items.length > 0 && (
            <div className="border border-blue-100 rounded-lg mb-3 bg-blue-50 max-h-44 overflow-y-auto divide-y divide-blue-100">
              {shareModal.items.map((it: any) => (
                <div key={it._id} className="flex items-center gap-3 p-2">
                  {it.image ? (
                    <MediaPreview
                      src={it.image}
                      alt={it.name}
                      autoPlay={false}
                      showBadge={false}
                      wrapperClassName="h-12 w-12 rounded-md border border-gray-200 bg-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-md border border-gray-200 bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                      N/A
                    </div>
                  )}
                  <div className="text-xs text-gray-700 min-w-0">
                    <p className="font-medium line-clamp-1">{it.name}</p>
                    <p className="text-gray-500">
                      {it.color && `${it.color} • `}
                      {it.size && `${it.size} • `}
                      {it.weight && `${it.weight} • `}
                      Qty {it.quantity}
                    </p>
                  </div>
                </div>
              ))}
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