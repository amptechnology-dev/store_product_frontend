"use client";

import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "primereact/button";
import { toast } from "react-toastify";

interface StoreQRCodeProps {
  url: string;
  storeName?: string;
  size?: number; // display size (px)
}

const QR_RESOLUTION = 1024;

const StoreQRCode = ({ url, storeName, size = 160 }: StoreQRCodeProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  const fileName = `${(storeName || "store").replace(/\s+/g, "-")}-qr.png`;
  const shareText = `Scan this QR or open the link to visit ${
    storeName || "our store"
  }: ${url}`;

  const getQrCanvas = () => wrapRef.current?.querySelector("canvas") || null;

  // QR + store name + caption diye shareable image banabe
  const buildShareImage = (): Promise<{
    blob: Blob;
    dataUrl: string;
  } | null> =>
    new Promise((resolve) => {
      const qrCanvas = getQrCanvas();
      if (!qrCanvas) return resolve(null);

      const padding = 80;
      const titleHeight = storeName ? 140 : 0;
      const footerHeight = 110;
      const width = QR_RESOLUTION + padding * 2;
      const height = QR_RESOLUTION + padding * 2 + titleHeight + footerHeight;

      const out = document.createElement("canvas");
      out.width = width;
      out.height = height;
      const ctx = out.getContext("2d");
      if (!ctx) return resolve(null);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = "center";

      if (storeName) {
        ctx.fillStyle = "#111827";
        ctx.font = "bold 64px Arial, sans-serif";
        ctx.fillText(storeName, width / 2, padding + 70, width - padding * 2);
      }

      ctx.drawImage(
        qrCanvas,
        padding,
        padding + titleHeight,
        QR_RESOLUTION,
        QR_RESOLUTION,
      );

      ctx.fillStyle = "#6b7280";
      ctx.font = "40px Arial, sans-serif";
      ctx.fillText(
        "Scan to open our store in the app",
        width / 2,
        height - padding,
        width - padding * 2,
      );

      const dataUrl = out.toDataURL("image/png");
      out.toBlob((blob) => resolve(blob ? { blob, dataUrl } : null), "image/png");
    });

  const downloadBlob = (blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  // Modern Clipboard API (HTTPS / localhost only)
  const copyImageModern = async (blob: Blob) => {
    try {
      if (
        typeof ClipboardItem === "undefined" ||
        !navigator.clipboard?.write ||
        !window.isSecureContext
      ) {
        return false;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return true;
    } catch {
      return false;
    }
  };

  // Legacy trick: HTTP te o kaj kore (Chrome / Edge).
  // <img> ke contenteditable div e boshiye select kore execCommand("copy")
  const copyImageLegacy = (dataUrl: string) =>
    new Promise<boolean>((resolve) => {
      const img = new Image();

      img.onload = () => {
        const wrapper = document.createElement("div");
        wrapper.contentEditable = "true";
        wrapper.style.position = "fixed";
        wrapper.style.left = "-9999px";
        wrapper.style.top = "0";
        wrapper.style.opacity = "0";
        wrapper.appendChild(img);
        document.body.appendChild(wrapper);

        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNode(img);
        selection?.removeAllRanges();
        selection?.addRange(range);

        let ok = false;
        try {
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }

        selection?.removeAllRanges();
        document.body.removeChild(wrapper);
        resolve(ok);
      };

      img.onerror = () => resolve(false);
      img.src = dataUrl;
    });

  const handleDownload = async () => {
    const result = await buildShareImage();
    if (!result) return;
    downloadBlob(result.blob);
  };

  const handleShareOnWhatsApp = async () => {
    const result = await buildShareImage();
    if (!result) {
      toast.error("Failed to generate QR image");
      return;
    }
    const { blob, dataUrl } = result;

    const file = new File([blob], fileName, { type: "image/png" });

    // 1) Mobile + HTTPS: native share sheet -> WhatsApp select korle image + link jabe
    if (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: storeName || "Store",
          text: shareText,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return; // user cancel korse
      }
    }

    // 2) Fallback: image clipboard e copy (modern -> legacy) + download + WhatsApp open
    let copied = await copyImageModern(blob);
    if (!copied) copied = await copyImageLegacy(dataUrl);

    downloadBlob(blob);

    toast.info(
      copied
        ? "QR image copied! WhatsApp chat e Ctrl+V diye paste koro, tarpor Send."
        : "QR image downloaded. WhatsApp chat e 📎 diye attach koro.",
      { autoClose: 8000 },
    );

    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={wrapRef}
        className="bg-white p-2 rounded-xl border"
        style={{ borderColor: "var(--border)" }}
      >
        <QRCodeCanvas
          value={url}
          size={QR_RESOLUTION}
          level="H"
          marginSize={2}
          style={{ width: size, height: size }}
        />
      </div>

      <div className="flex gap-2">
        <Button
          icon="pi pi-download"
          label="Download"
          onClick={handleDownload}
          className="text-xs"
          style={{
            background: "var(--brand-primary)",
            color: "#fff",
            border: "1px solid var(--brand-primary-dark)",
            padding: "6px 12px",
          }}
        />
        <Button
          icon="pi pi-whatsapp"
          label="Share"
          onClick={handleShareOnWhatsApp}
          className="text-xs"
          style={{
            background: "#25D366",
            color: "#fff",
            border: "1px solid #1ebe57",
            padding: "6px 12px",
          }}
        />
      </div>
    </div>
  );
};

export default StoreQRCode;