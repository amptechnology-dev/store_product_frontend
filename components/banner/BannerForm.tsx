"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { createBannerSchema, updateBannerSchema } from "@/helper/schema/Schema";
import {
  useVideoTrimmer,
  appendMediaFile,
  getTrim,
  formatTime,
  MAX_CLIP_SECONDS,
} from "@/components/VideoTrim";

type BannerFormData = z.infer<typeof createBannerSchema>;

type BannerFormProps = {
  bannerId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

type ExistingMedia = { url: string; isVideo: boolean };

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 100; // original video (backend multer limit er sathe mil)
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
const VIDEO_URL_REGEX = /\.(mp4|webm|mov)(\?.*)?$/i;
const isValidObjectId = (id?: string | null) =>
  !!id && /^[a-fA-F0-9]{24}$/.test(id);

function MediaBox({
  src,
  isVideo,
  onRemove,
}: {
  src: string;
  isVideo: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="relative w-full h-40 rounded overflow-hidden border bg-black/5">
      {isVideo ? (
        <video
          src={src}
          controls
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
      ) : (
        <img src={src} alt="banner" className="w-full h-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs leading-none"
        aria-label="Remove media"
      >
        ×
      </button>
    </div>
  );
}

function BannerForm({ bannerId, onClose, onSuccess }: BannerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!bannerId;

  const { prepareFiles, trimDialog } = useVideoTrimmer();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BannerFormData>({
    resolver: zodResolver(
      (isEditMode ? updateBannerSchema : createBannerSchema) as any,
    ),
    defaultValues: {
      name: "",
      storeId: undefined,
      categoryId: undefined,
      productId: undefined,
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [existingMedia, setExistingMedia] = useState<ExistingMedia | null>(
    null,
  );
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const selectedStoreId = watch("storeId");
  const selectedCategoryId = watch("categoryId");

  // object URL memory leak roke
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // same file abar select korle o onChange fire hobe
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(
        "Only image (jpg, png, webp, gif, avif) or video (mp4, webm, mov) allowed",
      );
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`${isVideo ? "Video" : "Image"} must be under ${maxMb}MB`);
      return;
    }

    // video 15s er beshi hole trim dialog khulbe, user skip korle file nibe na
    const [ready] = await prepareFiles([file]);
    if (!ready) return;

    setMediaFile(ready);
    setPreviewUrl(URL.createObjectURL(ready));
  };

  const removeNewMedia = () => {
    setMediaFile(null);
    setPreviewUrl("");
  };

  useEffect(() => {
    fetchStores();
    if (bannerId) fetchBannerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerId]);

  // store select hole oi store er category load
  useEffect(() => {
    if (isValidObjectId(selectedStoreId)) {
      fetchCategories(selectedStoreId as string);
    } else {
      setCategories([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId]);

  // store ba category change hole product list refresh (category dile shudhu oi category r product)
  useEffect(() => {
    if (isValidObjectId(selectedStoreId)) {
      fetchProducts(
        selectedStoreId as string,
        isValidObjectId(selectedCategoryId as string)
          ? (selectedCategoryId as string)
          : undefined,
      );
    } else {
      setProducts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId, selectedCategoryId]);

  const fetchBannerData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/banner/single-banner/${bannerId}`,
      );
      const banner = res.data.banner;

      setValue("name", banner.name);

      if (banner.image) {
        setExistingMedia({
          url: banner.image,
          isVideo:
            banner.mediaType === "video" || VIDEO_URL_REGEX.test(banner.image),
        });
      }

      const storeId =
        typeof banner.storeId === "object"
          ? banner.storeId?._id
          : banner.storeId;
      if (storeId) setValue("storeId", storeId);

      const categoryId =
        typeof banner.categoryId === "object"
          ? banner.categoryId?._id
          : banner.categoryId;
      setValue("categoryId", categoryId || null);

      const productId =
        typeof banner.productId === "object"
          ? banner.productId?._id
          : banner.productId;
      setValue("productId", productId || null);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to fetch banner data",
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await axiosInstance.get("/api/register/user-based-stores");
      const list = res.data?.stores || [];
      setStores(list);

      if (list.length === 1 && !isEditMode) {
        setValue("storeId", list[0]._id);
      }
    } catch (err: any) {
      console.error("Failed to fetch user stores", err);
      toast.error(err?.response?.data?.message || "Failed to fetch stores");
    }
  };

  const fetchCategories = async (storeId: string) => {
    try {
      setCategoriesLoading(true);
      const res = await axiosInstance.get("/api/category", {
        params: { storeId },
      });
      setCategories(res.data?.categories || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch categories");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchProducts = async (storeId: string, categoryId?: string) => {
    try {
      setProductsLoading(true);
      const res = await axiosInstance.get("/api/banner/product-options", {
        params: { storeId, ...(categoryId ? { categoryId } : {}) },
      });
      setProducts(res.data?.products || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch products");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const onSubmit = async (data: BannerFormData) => {
    // create e to lagbei, edit e existing remove kore notun na dile o lagbe
    if (!mediaFile && !existingMedia) {
      toast.error("Banner image or video is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `/api/banner/update-banner/${bannerId}`
        : `/api/banner/create-banner`;

      const formData = new FormData();
      formData.append("name", data.name || "");

      if (!isEditMode && data.storeId) {
        formData.append("storeId", String(data.storeId));
      }

      // category/product optional: khali ("") pathale backend e remove / nai hisebe dhore
      formData.append(
        "categoryId",
        data.categoryId ? String(data.categoryId) : "",
      );
      formData.append(
        "productId",
        data.productId ? String(data.productId) : "",
      );

      // video hole trim (start/end) file er naam e jay, backend oi part ta kete GIF banay
      if (mediaFile) {
        appendMediaFile(formData, "media", mediaFile);
      }

      // Content-Type manually set korbo na, browser boundary shoho nije set kore
      const res = await axiosInstance.request({
        url,
        method: isEditMode ? "put" : "post",
        data: formData,
        // boro video upload + GIF convert e time lage
        timeout: 10 * 60 * 1000,
      });

      toast.success(
        res.data.message ||
          `Banner ${isEditMode ? "updated" : "created"} successfully!`,
      );
      reset();
      removeNewMedia();
      setExistingMedia(null);
      onSuccess();
    } catch (error: any) {
      console.error("Banner operation error:", error);
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} banner`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
      </div>
    );
  }

  const showUploadInput = !mediaFile && !existingMedia;
  const mediaIsVideo = !!mediaFile && mediaFile.type.startsWith("video/");
  const trim = mediaIsVideo ? getTrim(mediaFile) : null;

  return (
    <div className="px-4 pt-2 pb-4 min-h-[40vh]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-image text-blue-600"></i>
            Basic Information
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Banner Name <span className="text-red-500">*</span>
              </label>
              <InputText
                className="w-full"
                {...register("name")}
                placeholder="Enter banner name"
              />
              {errors.name && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.name.message}
                </small>
              )}
            </div>

            {/* <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Store <span className="text-red-500">*</span>
              </label>
              <Controller
                name="storeId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    options={stores.map((s) => ({
                      label: s.storeName,
                      value: s._id,
                    }))}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select store"
                    className="w-full"
                    disabled={isEditMode}
                    onChange={(e) => {
                      field.onChange(e.value);
                      // store change hole ager category ar product valid na
                      setValue("categoryId", null);
                      setValue("productId", null);
                    }}
                  />
                )}
              />
              {errors.storeId && (
                <small className="text-red-500">
                  {errors.storeId.message as string}
                </small>
              )}
            </div> */}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Category{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value || null}
                    options={categories.map((c) => ({
                      label: c.name,
                      value: c._id,
                    }))}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={
                      !isValidObjectId(selectedStoreId)
                        ? "Select store first"
                        : categoriesLoading
                          ? "Loading categories..."
                          : categories.length === 0
                            ? "No categories found"
                            : "Select category"
                    }
                    className="w-full"
                    showClear
                    disabled={
                      !isValidObjectId(selectedStoreId) || categoriesLoading
                    }
                    onChange={(e) => {
                      field.onChange(e.value ?? null);
                      // category change hole ager product ei category r na o hote pare
                      setValue("productId", null);
                    }}
                  />
                )}
              />
              {errors.categoryId && (
                <small className="text-red-500">
                  {errors.categoryId.message as string}
                </small>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Product{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Controller
                name="productId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value || null}
                    options={products.map((p) => ({
                      label: p.productCode
                        ? `${p.name} (${p.productCode})`
                        : p.name,
                      value: p._id,
                    }))}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={
                      !isValidObjectId(selectedStoreId)
                        ? "Select store first"
                        : productsLoading
                          ? "Loading products..."
                          : products.length === 0
                            ? "No products found"
                            : "Select product"
                    }
                    className="w-full"
                    filter
                    showClear
                    disabled={
                      !isValidObjectId(selectedStoreId) || productsLoading
                    }
                    onChange={(e) => field.onChange(e.value ?? null)}
                  />
                )}
              />
              {errors.productId && (
                <small className="text-red-500">
                  {errors.productId.message as string}
                </small>
              )}
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-images text-green-600"></i>
            Banner Image / Video <span className="text-red-500">*</span>
          </h3>

          {mediaFile && previewUrl ? (
            <MediaBox
              src={previewUrl}
              isVideo={mediaIsVideo}
              onRemove={removeNewMedia}
            />
          ) : existingMedia ? (
            <MediaBox
              src={existingMedia.url}
              isVideo={existingMedia.isVideo}
              onRemove={() => setExistingMedia(null)}
            />
          ) : null}

          {/* selected clip info (video hole) */}
          {trim && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-800">
              <i className="pi pi-clock"></i>
              <span>
                Selected clip: {formatTime(trim.start)} –{" "}
                {formatTime(trim.end)} ({(trim.end - trim.start).toFixed(1)}s).
                GIF hoye save hobe.
              </span>
            </div>
          )}

          {showUploadInput && (
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleMediaChange}
              className="w-full p-2 border border-yellow-300 rounded-lg"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
            />
          )}

          {/* existing / notun media replace korar jonno */}
          {!showUploadInput && (
            <Button
              type="button"
              label="Replace with another file"
              icon="pi pi-upload"
              size="small"
              outlined
              onClick={() => fileInputRef.current?.click()}
            />
          )}
          {/* replace button er jonno hidden input */}
          {!showUploadInput && (
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleMediaChange}
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
            />
          )}

          <small className="text-gray-500 block">
            Image max {MAX_IMAGE_MB}MB, video max {MAX_VIDEO_MB}MB (mp4, webm,
            mov). Video max {MAX_CLIP_SECONDS} sec (trim korte parben), GIF
            hoye save hobe (max 1080p, 30MB er moddhe).
          </small>
        </div>

        {/* SUBMIT BUTTONS */}
        <div className="flex gap-3 pt-3">
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
                ? mediaIsVideo
                  ? "Converting to GIF..."
                  : "Saving..."
                : isEditMode
                  ? "Update Banner"
                  : "Create Banner"
            }
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            disabled={isSubmitting}
          />
        </div>
      </form>

      {/* VIDEO TRIM DIALOG */}
      {trimDialog}
    </div>
  );
}

export default BannerForm;