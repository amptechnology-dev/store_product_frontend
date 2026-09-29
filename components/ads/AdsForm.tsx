"use client";

import React, { useEffect, useRef, useState } from "react";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

type AdsFormProps = {
  adId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

// ---------- Media config: backend (uploadAdsMedia) er limit er sathe match ----------
const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
const MEDIA_ACCEPT = ALLOWED_MEDIA_TYPES.join(",");
const MAX_VIDEO_MB = 30;
const MAX_IMAGE_MB = 5;

const VIDEO_URL_REGEX = /\.(mp4|webm|mov)(\?.*)?$/i;
const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_REGEX.test(url);
const isVideoFile = (file?: File | null) =>
  !!file && file.type.startsWith("video/");

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

export default function AdsForm({ adId, onClose, onSuccess }: AdsFormProps) {
  const isEditMode = !!adId;

  const [file, setFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // ---------- Edit mode: existing ad load ----------
  useEffect(() => {
    if (!adId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/ads/${adId}`);
        if (cancelled) return;
        const ad = res.data.ads;
        setExistingUrl(ad.mediaUrl || null);
        setIsActive(ad.isActive ?? true);
      } catch (error: any) {
        if (cancelled) return;
        toast.error(error.response?.data?.message || "Failed to fetch ad");
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adId]);

  // ---------- Object URL cleanup ----------
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  // ---------- File validate + set ----------
  const handleFile = (picked?: File | null) => {
    if (!picked) return;

    if (!ALLOWED_MEDIA_TYPES.includes(picked.type)) {
      toast.error(
        `"${picked.name}" is not supported. Use MP4, WEBM, MOV, JPG, PNG, WEBP, GIF or AVIF.`,
      );
      return;
    }
    if (picked.size === 0) {
      toast.error(`"${picked.name}" is empty.`);
      return;
    }

    const maxMb = isVideoFile(picked) ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (picked.size > maxMb * 1024 * 1024) {
      toast.error(
        `${isVideoFile(picked) ? "Video" : "Image"} must be under ${maxMb}MB.`,
      );
      return;
    }

    setFile(picked);
    setLocalPreview(URL.createObjectURL(picked));
  };

  const removeFile = () => {
    setFile(null);
    setLocalPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isSubmitting) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isEditMode && !file) {
      toast.error("Ad video is required. Please upload a video.");
      return;
    }

    setIsSubmitting(true);
    setProgress(0);

    try {
      const formData = new FormData();
      if (file) formData.append("media", file); // backend field name: "media"
      formData.append("isActive", String(isActive));

      const res = await axiosInstance.request({
        url: isEditMode ? `/api/ads/${adId}` : "/api/ads",
        method: isEditMode ? "put" : "post",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
        // video upload + GIF convert e time lage, default timeout e fail na hoy
        timeout: 5 * 60 * 1000,
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      });

      toast.success(
        res.data.message ||
          `Ad ${isEditMode ? "updated" : "created"} successfully!`,
      );
      onSuccess();
    } catch (error: any) {
      const apiErrors = error.response?.data?.errors;
      toast.error(
        (Array.isArray(apiErrors) && apiErrors[0]?.message) ||
          error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} ad`,
      );
    } finally {
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
      </div>
    );
  }

  const isConverting = isSubmitting && progress >= 100;

  return (
    <div className="px-4 pt-2 pb-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* ---------- Media ---------- */}
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-video text-blue-600"></i>
            Ad Video
            {!isEditMode ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs font-normal text-gray-500">
                (optional — upload only to replace)
              </span>
            )}
          </h4>

          {/* Dropzone (file select na thakle) */}
          {!file && (
            <div
              onClick={() => !isSubmitting && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-7 text-center transition ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              <i className="pi pi-cloud-upload text-4xl text-blue-500" />
              <p className="text-sm font-semibold text-gray-700">
                Click to upload or drag & drop
              </p>
              <p className="text-[11px] text-gray-400">
                Video up to {MAX_VIDEO_MB}MB (MP4, WEBM, MOV) · Image up to{" "}
                {MAX_IMAGE_MB}MB
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={MEDIA_ACCEPT}
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {/* New file preview */}
          {file && localPreview && (
            <div className="space-y-2">
              <div className="rounded-lg overflow-hidden border border-blue-200 bg-black">
                {isVideoFile(file) ? (
                  <video
                    src={localPreview}
                    controls
                    muted
                    playsInline
                    className="w-full object-contain"
                    style={{ maxHeight: "40vh" }}
                  />
                ) : (
                  <img
                    src={localPreview}
                    alt="Selected"
                    className="w-full object-contain"
                    style={{ maxHeight: "40vh" }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formatSize(file.size)}
                    {isVideoFile(file) && " · will be converted to GIF"}
                  </p>
                </div>
                <Button
                  type="button"
                  icon="pi pi-times"
                  label="Remove"
                  size="small"
                  outlined
                  severity="danger"
                  onClick={removeFile}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Current media (edit mode + notun file select na hole) */}
          {isEditMode && !file && existingUrl && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Current ad
              </p>
              <div className="rounded-lg overflow-hidden border border-blue-200 bg-gray-100">
                {isVideoUrl(existingUrl) ? (
                  <video
                    src={`${existingUrl}#t=0.1`}
                    controls
                    muted
                    playsInline
                    className="w-full object-contain"
                    style={{ maxHeight: "40vh" }}
                  />
                ) : (
                  <img
                    src={existingUrl}
                    alt="Current ad"
                    className="w-full object-contain"
                    style={{ maxHeight: "40vh" }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Upload progress */}
          {isSubmitting && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
                <span>
                  {isConverting
                    ? "Converting to GIF & saving..."
                    : "Uploading..."}
                </span>
                {!isConverting && <span>{progress}%</span>}
              </div>
              <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-blue-500 transition-all ${
                    isConverting ? "animate-pulse" : ""
                  }`}
                  style={{ width: `${isConverting ? 100 : progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ---------- Status ---------- */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Ad Status</p>
              <p className="text-xs text-gray-500">
                {isActive
                  ? "Live — visible to users"
                  : "Hidden — not displayed"}
              </p>
            </div>
            <InputSwitch
              checked={isActive}
              onChange={(e) => setIsActive(!!e.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* ---------- Buttons ---------- */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 border-0 hover:bg-gray-200"
            outlined
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            label={
              isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Update Ad"
                  : "Create Ad"
            }
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}
