"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import {
  createProductSchema,
  updateProductSchema,
} from "@/helper/schema/Schema";
import {
  getStoreSettings,
  StoreSettings,
} from "@/service/storeSetting.service";

type ProductFormData = z.infer<typeof createProductSchema>;

type ProductFormProps = {
  productId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

const UNIT_OPTIONS = [
  { label: "Pieces (PCS)", value: "PCS" },
  { label: "Kilogram (KG)", value: "KG" },
  { label: "Gram (GM)", value: "GM" },
  { label: "Litre (LTR)", value: "LTR" },
  { label: "Millilitre (ML)", value: "ML" },
  { label: "Box", value: "BOX" },
  { label: "Dozen", value: "DOZEN" },
  { label: "Pack", value: "PACK" },
];

const isValidObjectId = (id?: string | null) =>
  !!id && /^[a-fA-F0-9]{24}$/.test(id);

const DEFAULT_SETTINGS: StoreSettings = {
  hasVariants: false,
  hasColor: false,
  hasStockManagement: false,
};

const buildEmptyVariant = () => ({
  color: "",
  size: "",
  weight: "",
  height: "",
  mrp: 0,
  offerPrice: 0,
  stock: 0,
  sku: "",
});

type FacingMode = "user" | "environment";

type VariantImageState = {
  existing: string[];
  files: File[];
  previews: string[];
};

function ProductFrom({ productId, onClose, onSuccess }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productCode, setProductCode] = useState<string>("");
  const isEditMode = !!productId;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(
      (isEditMode ? updateProductSchema : createProductSchema) as any,
    ),
    defaultValues: {
      name: "",
      description: "",
      unit: "",
      deliveryTime: "",
      storeId: undefined,
      categoryId: undefined,
      mrp: 0,
      offerPrice: 0,
      stock: 0,
      variants: [buildEmptyVariant()],
    },
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
    replace: replaceVariants,
  } = useFieldArray({ control, name: "variants" });

  // ---------------- MAIN PRODUCT IMAGES (mode nirbishese always) ----------------
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // ---------------- VARIANT (COLOR) MODE IMAGES ----------------
  const [variantImages, setVariantImages] = useState<
    Record<string, VariantImageState>
  >({});
  const [pendingVariantImages, setPendingVariantImages] = useState<
    string[][] | null
  >(null);

  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [storeSettings, setStoreSettings] =
    useState<StoreSettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const usesVariants = storeSettings.hasVariants || storeSettings.hasColor;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraOpenRef = useRef(false);
  const previewsRef = useRef<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);

  const selectedStoreId = watch("storeId");

  // ---------------- MAIN IMAGE HELPERS ----------------
  const addImageFiles = (files: File[]) => {
    if (!files.length) return;
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addImageFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeImage = (index: number, isExisting = false) => {
    if (isExisting) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      const url = imagePreviews[index];
      if (url) URL.revokeObjectURL(url);
      setImageFiles((prev) => prev.filter((_, i) => i !== index));
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const clearNewImages = () => {
    imagePreviews.forEach((u) => URL.revokeObjectURL(u));
    setImageFiles([]);
    setImagePreviews([]);
  };

  // ---------------- VARIANT IMAGE HELPERS ----------------
  const getVariantImageState = (fieldId: string): VariantImageState =>
    variantImages[fieldId] || { existing: [], files: [], previews: [] };

  const addVariantImageFiles = (fieldId: string, files: File[]) => {
    if (!files.length) return;
    setVariantImages((prev) => {
      const cur = prev[fieldId] || { existing: [], files: [], previews: [] };
      return {
        ...prev,
        [fieldId]: {
          ...cur,
          files: [...cur.files, ...files],
          previews: [
            ...cur.previews,
            ...files.map((f) => URL.createObjectURL(f)),
          ],
        },
      };
    });
  };

  const removeVariantImage = (
    fieldId: string,
    index: number,
    isExisting: boolean,
  ) => {
    setVariantImages((prev) => {
      const cur = prev[fieldId] || { existing: [], files: [], previews: [] };
      if (isExisting) {
        return {
          ...prev,
          [fieldId]: {
            ...cur,
            existing: cur.existing.filter((_, i) => i !== index),
          },
        };
      }
      const url = cur.previews[index];
      if (url) URL.revokeObjectURL(url);
      return {
        ...prev,
        [fieldId]: {
          ...cur,
          files: cur.files.filter((_, i) => i !== index),
          previews: cur.previews.filter((_, i) => i !== index),
        },
      };
    });
  };

  const handleAddVariant = () => appendVariant(buildEmptyVariant());

  const handleRemoveVariant = (index: number, fieldId: string) => {
    removeVariant(index);
    setVariantImages((prev) => {
      const cur = prev[fieldId];
      if (cur) cur.previews.forEach((u) => URL.revokeObjectURL(u));
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  // ---------------- WEBCAM LOGIC (অপরিবর্তিত) ----------------
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(
    async (mode: FacingMode) => {
      stopCamera();
      setCameraError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera is not supported in this browser, or the page is not served over HTTPS.",
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (!cameraOpenRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setHasMultipleCameras(
            devices.filter((d) => d.kind === "videoinput").length > 1,
          );
        } catch {
          setHasMultipleCameras(false);
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        switch (err?.name) {
          case "NotAllowedError":
          case "SecurityError":
            setCameraError(
              "Camera permission denied. Allow camera access in your browser settings and try again.",
            );
            break;
          case "NotFoundError":
          case "OverconstrainedError":
            setCameraError("No camera found on this device.");
            break;
          case "NotReadableError":
            setCameraError(
              "Camera is being used by another app. Close it and try again.",
            );
            break;
          default:
            setCameraError("Unable to access the camera.");
        }
      }
    },
    [stopCamera],
  );

  const cameraTargetRef = useRef<string | null>(null);

  const openCamera = (targetFieldId: string | null = null) => {
    cameraOpenRef.current = true;
    cameraTargetRef.current = targetFieldId;
    setCapturedCount(0);
    setCameraError("");
    setCameraOpen(true);
  };

  const closeCamera = () => {
    cameraOpenRef.current = false;
    stopCamera();
    setCameraOpen(false);
  };

  const switchCamera = () => {
    const next: FacingMode =
      facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture photo");
          return;
        }
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        if (cameraTargetRef.current) {
          addVariantImageFiles(cameraTargetRef.current, [file]);
        } else {
          addImageFiles([file]);
        }
        setCapturedCount((c) => c + 1);
      },
      "image/jpeg",
      0.9,
    );
  };

  useEffect(() => {
    previewsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      cameraOpenRef.current = false;
      stopCamera();
      previewsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [stopCamera]);

  useEffect(() => {
    fetchStores();
    if (productId) fetchProductData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (isValidObjectId(selectedStoreId)) {
      fetchCategories(selectedStoreId as string);
      fetchSettings(selectedStoreId as string);
    } else {
      setCategories([]);
      setStoreSettings(DEFAULT_SETTINGS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId]);

  const fetchSettings = async (storeId: string) => {
    try {
      setSettingsLoading(true);
      const res = await getStoreSettings(storeId);
      setStoreSettings(res.data?.settings || DEFAULT_SETTINGS);
    } catch (err) {
      console.error("Failed to fetch store settings", err);
      setStoreSettings(DEFAULT_SETTINGS);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchProductData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/product/single-product/${productId}`,
      );
      const product = res.data.product;

      setValue("name", product.name);
      setValue("description", product.description || "");
      setValue("unit", product.unit || "");
      setValue("deliveryTime", product.deliveryTime || "");
      setValue("mrp", product.mrp || 0);
      setValue("offerPrice", product.offerPrice || 0);
      setValue("stock", product.stock || 0);

      const productVariants: any[] =
        Array.isArray(product.variants) && product.variants.length > 0
          ? product.variants
          : [buildEmptyVariant()];

      replaceVariants(
        productVariants.map((v: any) => ({
          color: v.color || "",
          size: v.size || "",
          weight: v.weight || "",
          height: v.height || "",
          mrp: v.mrp || 0,
          offerPrice: v.offerPrice || 0,
          stock: v.stock || 0,
          sku: v.sku || "",
        })),
      );

      setProductCode(product.productCode || "");

      if (Array.isArray(product.images)) setExistingImages(product.images);

      const storeId =
        typeof product.storeId === "object"
          ? product.storeId?._id
          : product.storeId;
      if (storeId) setValue("storeId", storeId);

      const categoryId =
        typeof product.categoryId === "object"
          ? product.categoryId?._id
          : product.categoryId;
      if (categoryId) setValue("categoryId", categoryId);

      setPendingVariantImages(
        productVariants.map((v: any) =>
          Array.isArray(v.images) ? v.images : [],
        ),
      );
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to fetch product data",
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => {
    if (!pendingVariantImages) return;
    if (variantFields.length !== pendingVariantImages.length) return;
    setVariantImages(() => {
      const next: Record<string, VariantImageState> = {};
      variantFields.forEach((f, idx) => {
        next[f.id] = { existing: pendingVariantImages[idx] || [], files: [], previews: [] };
      });
      return next;
    });
    setPendingVariantImages(null);
  }, [pendingVariantImages, variantFields]);

  const fetchStores = async () => {
    try {
      const res = await axiosInstance.get("/api/register/user-based-stores");
      const list = res.data?.stores || [];
      setStores(list);
      if (list.length === 1 && !isEditMode) setValue("storeId", list[0]._id);
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
      console.error("Failed to fetch categories", err);
      toast.error(err?.response?.data?.message || "Failed to fetch categories");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const validateBySettings = (data: ProductFormData): string | null => {
    if (usesVariants) {
      if (!data.variants || data.variants.length === 0)
        return "At least one variant is required";
      for (let i = 0; i < data.variants.length; i++) {
        const v = data.variants[i];
        if (v.mrp === undefined || v.offerPrice === undefined)
          return `Variant ${i + 1}: MRP and Offer price are required`;
        if (Number(v.offerPrice) > Number(v.mrp))
          return `Variant ${i + 1}: Offer price cannot be greater than MRP`;
        if (storeSettings.hasVariants && !v.size && !v.weight && !v.height)
          return `Variant ${i + 1}: Size, weight or height is required`;
        if (storeSettings.hasColor && !v.color)
          return `Variant ${i + 1}: Color is required`;
      }
      return null;
    }
    if (data.mrp === undefined || data.mrp === null) return "MRP is required";
    if (data.offerPrice === undefined || data.offerPrice === null)
      return "Offer price is required";
    if (Number(data.offerPrice) > Number(data.mrp))
      return "Offer price cannot be greater than MRP";
    return null;
  };

  // ---------------- SUBMIT ----------------
  const onSubmit = async (data: ProductFormData) => {
    const validationError = validateBySettings(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `/api/product/update-product/${productId}`
        : `/api/product/create-product`;

      const formData = new FormData();
      formData.append("name", data.name || "");
      formData.append("description", data.description || "");
      formData.append("unit", data.unit || "");
      formData.append("deliveryTime", data.deliveryTime || "");

      if (!isEditMode && data.storeId)
        formData.append("storeId", String(data.storeId));
      if (data.categoryId)
        formData.append("categoryId", String(data.categoryId));

      // ---------- MAIN PRODUCT IMAGES: mode nirbishese sob somoy pathao ----------
      existingImages.forEach((url) => formData.append("images", url));
      imageFiles.forEach((file, idx) => formData.append(`image${idx}`, file));

      if (usesVariants) {
        const variantsPayload = (data.variants || []).map((v, idx) => {
          const fieldId = variantFields[idx]?.id;
          const imgState = fieldId
            ? getVariantImageState(fieldId)
            : { existing: [], files: [] };
          const clean: any = {
            mrp: v.mrp,
            offerPrice: v.offerPrice,
            sku: v.sku || undefined,
          };
          if (storeSettings.hasVariants) {
            clean.size = v.size || undefined;
            clean.weight = v.weight || undefined;
            clean.height = v.height || undefined;
          }
          if (storeSettings.hasStockManagement) clean.stock = v.stock ?? 0;
          if (storeSettings.hasColor) {
            clean.color = v.color || undefined;
            clean.images = imgState.existing; // existing color images retain
          }
          return clean;
        });
        formData.append("variants", JSON.stringify(variantsPayload));

        if (storeSettings.hasColor) {
          (data.variants || []).forEach((_, idx) => {
            const fieldId = variantFields[idx]?.id;
            const imgState = fieldId
              ? getVariantImageState(fieldId)
              : { files: [] as File[] };
            imgState.files.forEach((file) =>
              formData.append(`variantImage_${idx}`, file),
            );
          });
        }
      } else {
        formData.append("mrp", String(data.mrp ?? 0));
        formData.append("offerPrice", String(data.offerPrice ?? 0));
        if (storeSettings.hasStockManagement)
          formData.append("stock", String(data.stock ?? 0));
      }

      const res = await axiosInstance.request({
        url,
        method: isEditMode ? "put" : "post",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        res.data.message ||
          `Product ${isEditMode ? "updated" : "created"} successfully!`,
      );
      reset();
      clearNewImages();
      setExistingImages([]);
      setVariantImages({});
      onSuccess();
    } catch (error: any) {
      console.error("Product operation error:", error);
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} product`,
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

  return (
    <div className="px-4 pt-2 pb-4 min-h-[80vh]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isEditMode && productCode && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <i className="pi pi-hashtag text-gray-500"></i>
            <span className="text-sm text-gray-600">Product Code:</span>
            <span className="text-sm font-semibold text-gray-800">
              {productCode}
            </span>
          </div>
        )}

        {isValidObjectId(selectedStoreId) && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap">
            <i className="pi pi-cog text-indigo-600"></i>
            <span className="text-sm text-indigo-800 font-medium">
              {settingsLoading
                ? "Loading store settings..."
                : usesVariants
                  ? "Variant mode active for this store"
                  : "Simple mode (no variants) for this store"}
            </span>
            {!settingsLoading && (
              <span className="text-xs text-indigo-500 flex gap-2 flex-wrap">
                {storeSettings.hasVariants && (
                  <span className="px-2 py-0.5 bg-white rounded-full border border-indigo-200">
                    Size/Weight
                  </span>
                )}
                {storeSettings.hasColor && (
                  <span className="px-2 py-0.5 bg-white rounded-full border border-indigo-200">
                    Color
                  </span>
                )}
                {storeSettings.hasStockManagement && (
                  <span className="px-2 py-0.5 bg-white rounded-full border border-indigo-200">
                    Stock
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-box text-blue-600"></i>
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <InputText
                className="w-full"
                {...register("name")}
                placeholder="Enter product name"
              />
              {errors.name && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.name.message}
                </small>
              )}
            </div>

            <div className="space-y-1">
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
                    onChange={(e) => field.onChange(e.value)}
                  />
                )}
              />
              {errors.storeId && (
                <small className="text-red-500">
                  {errors.storeId.message as string}
                </small>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
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
                    disabled={
                      !isValidObjectId(selectedStoreId) || categoriesLoading
                    }
                    onChange={(e) => field.onChange(e.value)}
                  />
                )}
              />
              {errors.categoryId && (
                <small className="text-red-500">
                  {errors.categoryId.message as string}
                </small>
              )}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <InputTextarea
                className="w-full"
                rows={2}
                {...register("description")}
                placeholder="Product description"
              />
              {errors.description && (
                <small className="text-red-500">
                  {errors.description.message}
                </small>
              )}
            </div>
          </div>
        </div>

        {/* Unit */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-tag text-purple-600"></i>
            Unit
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Unit <span className="text-red-500">*</span>
              </label>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    options={UNIT_OPTIONS}
                    placeholder="Select unit"
                    className="w-full"
                    onChange={(e) => field.onChange(e.value)}
                  />
                )}
              />
              {errors.unit && (
                <small className="text-red-500">{errors.unit.message}</small>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">
                Delivery Time
              </label>
              <InputText
                className="w-full"
                {...register("deliveryTime")}
                placeholder="e.g. 3-5 days"
              />
            </div>
          </div>
        </div>

        {/* ================= MAIN PRODUCT IMAGES (always visible, variant mode hok ba na hok) ================= */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-image text-green-600"></i>
            Product Images
          </h4>

          {existingImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {existingImages.map((url, idx) => (
                <div
                  key={idx}
                  className="relative w-40 h-28 rounded overflow-hidden border"
                >
                  <img
                    src={url}
                    alt={`img-${idx}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx, true)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {imagePreviews.map((src, idx) => (
                <div
                  key={src}
                  className="relative w-40 h-28 rounded overflow-hidden border"
                >
                  <img
                    src={src}
                    alt={`preview-${idx}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx, false)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="file"
              multiple
              onChange={handleImageChange}
              className="flex-1 min-w-0 p-2 border border-yellow-300 rounded-lg"
              accept="image/*"
            />
            <Button
              type="button"
              label="Take Photo"
              icon="pi pi-camera"
              onClick={() => openCamera(null)}
              outlined
              className="shrink-0"
            />
          </div>
        </div>

        {/* ================= SIMPLE MODE PRICING (no variants) ================= */}
        {!usesVariants && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-green-600 text-base">₹</span>
              Pricing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  MRP <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="mrp"
                  control={control}
                  render={({ field: f }) => (
                    <InputNumber
                      value={f.value}
                      onValueChange={(e) => f.onChange(e.value)}
                      placeholder="MRP"
                      min={0}
                      className="w-full"
                      inputClassName="w-full"
                      useGrouping={false}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Offer Price <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="offerPrice"
                  control={control}
                  render={({ field: f }) => (
                    <InputNumber
                      value={f.value}
                      onValueChange={(e) => f.onChange(e.value)}
                      placeholder="Offer price"
                      min={0}
                      className="w-full"
                      inputClassName="w-full"
                      useGrouping={false}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                    />
                  )}
                />
              </div>
              {storeSettings.hasStockManagement && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Stock
                  </label>
                  <Controller
                    name="stock"
                    control={control}
                    render={({ field: f }) => (
                      <InputNumber
                        value={f.value}
                        onValueChange={(e) => f.onChange(e.value)}
                        placeholder="Stock"
                        min={0}
                        className="w-full"
                        inputClassName="w-full"
                        useGrouping={false}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= VARIANT MODE (hasVariants and/or hasColor) ================= */}
        {usesVariants && (
          <div className="space-y-3 w-full min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-green-600 text-base">₹</span>
                Variants
                <span className="text-red-500">*</span>
              </h3>
              <Button
                type="button"
                label="Add Variant"
                icon="pi pi-plus"
                onClick={handleAddVariant}
                className="p-button-sm"
                style={{
                  background: "#eef2ff",
                  color: "#4338ca",
                  border: "1px solid #c7d2fe",
                }}
              />
            </div>

            {typeof errors.variants?.message === "string" && (
              <small className="text-red-500 block">
                {errors.variants.message}
              </small>
            )}

            <div className="space-y-3 w-full min-w-0">
              {variantFields.map((field, index) => {
                const variantError = errors.variants?.[index] as any;
                const imgState = getVariantImageState(field.id);

                return (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative w-full min-w-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">
                        Variant {index + 1}
                      </span>
                      {variantFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(index, field.id)}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                        >
                          <i className="pi pi-trash"></i> Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
                      {storeSettings.hasColor && (
                        <div className="space-y-1 min-w-0">
                          <label className="text-xs font-semibold text-gray-700">
                            Color <span className="text-red-500">*</span>
                          </label>
                          <InputText
                            className="w-full"
                            {...register(`variants.${index}.color` as const)}
                            placeholder="e.g. Red"
                          />
                          {variantError?.color && (
                            <small className="text-red-500 block">
                              {variantError.color.message}
                            </small>
                          )}
                        </div>
                      )}

                      {storeSettings.hasVariants && (
                        <>
                          <div className="space-y-1 min-w-0">
                            <label className="text-xs font-semibold text-gray-700">
                              Size
                            </label>
                            <InputText
                              className="w-full"
                              {...register(`variants.${index}.size` as const)}
                              placeholder="e.g. Large"
                            />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <label className="text-xs font-semibold text-gray-700">
                              Weight
                            </label>
                            <InputText
                              className="w-full"
                              {...register(`variants.${index}.weight` as const)}
                              placeholder="e.g. 40kg"
                            />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <label className="text-xs font-semibold text-gray-700">
                              Height
                            </label>
                            <InputText
                              className="w-full"
                              {...register(`variants.${index}.height` as const)}
                              placeholder="e.g. 6ft"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1 min-w-0">
                        <label className="text-xs font-semibold text-gray-700">
                          MRP <span className="text-red-500">*</span>
                        </label>
                        <Controller
                          name={`variants.${index}.mrp` as const}
                          control={control}
                          render={({ field: f }) => (
                            <InputNumber
                              value={f.value}
                              onValueChange={(e) => f.onChange(e.value)}
                              placeholder="MRP"
                              min={0}
                              className="w-full"
                              inputClassName="w-full"
                              useGrouping={false}
                              mode="decimal"
                              minFractionDigits={2}
                              maxFractionDigits={2}
                            />
                          )}
                        />
                        {variantError?.mrp && (
                          <small className="text-red-500 block">
                            {variantError.mrp.message}
                          </small>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <label className="text-xs font-semibold text-gray-700">
                          Offer Price <span className="text-red-500">*</span>
                        </label>
                        <Controller
                          name={`variants.${index}.offerPrice` as const}
                          control={control}
                          render={({ field: f }) => (
                            <InputNumber
                              value={f.value}
                              onValueChange={(e) => f.onChange(e.value)}
                              placeholder="Offer price"
                              min={0}
                              className="w-full"
                              inputClassName="w-full"
                              useGrouping={false}
                              mode="decimal"
                              minFractionDigits={2}
                              maxFractionDigits={2}
                            />
                          )}
                        />
                        {variantError?.offerPrice && (
                          <small className="text-red-500 block">
                            {variantError.offerPrice.message}
                          </small>
                        )}
                      </div>

                      {storeSettings.hasStockManagement && (
                        <div className="space-y-1 min-w-0">
                          <label className="text-xs font-semibold text-gray-700">
                            Stock
                          </label>
                          <Controller
                            name={`variants.${index}.stock` as const}
                            control={control}
                            render={({ field: f }) => (
                              <InputNumber
                                value={f.value}
                                onValueChange={(e) => f.onChange(e.value)}
                                placeholder="Stock"
                                min={0}
                                className="w-full"
                                inputClassName="w-full"
                                useGrouping={false}
                              />
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {storeSettings.hasColor && (
                      <div className="mt-3 space-y-2">
                        <label className="text-xs font-semibold text-gray-700">
                          Color Images
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {imgState.existing.map((url, i) => (
                            <div
                              key={`ex-${i}`}
                              className="relative w-20 h-20 rounded overflow-hidden border"
                            >
                              <img
                                src={url}
                                className="w-full h-full object-cover"
                                alt=""
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  removeVariantImage(field.id, i, true)
                                }
                                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {imgState.previews.map((src, i) => (
                            <div
                              key={`new-${i}`}
                              className="relative w-20 h-20 rounded overflow-hidden border"
                            >
                              <img
                                src={src}
                                className="w-full h-full object-cover"
                                alt=""
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  removeVariantImage(field.id, i, false)
                                }
                                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              if (!e.target.files) return;
                              addVariantImageFiles(
                                field.id,
                                Array.from(e.target.files),
                              );
                              e.target.value = "";
                            }}
                            className="text-xs flex-1 min-w-0"
                          />
                          <Button
                            type="button"
                            icon="pi pi-camera"
                            outlined
                            size="small"
                            onClick={() => openCamera(field.id)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                ? "Saving..."
                : isEditMode
                  ? "Update Product"
                  : "Create Product"
            }
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            disabled={isSubmitting}
          />
        </div>
      </form>

      {/* CAMERA DIALOG */}
      <Dialog
        header="Take Product Photo"
        visible={cameraOpen}
        onShow={() => startCamera(facingMode)}
        onHide={closeCamera}
        style={{ width: "min(92vw, 640px)" }}
        modal
        draggable={false}
      >
        <div className="space-y-3">
          {cameraError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 flex flex-col gap-2">
              <span className="flex items-start gap-2">
                <i className="pi pi-exclamation-circle mt-0.5"></i>
                {cameraError}
              </span>
              <Button
                type="button"
                label="Try again"
                icon="pi pi-refresh"
                size="small"
                outlined
                className="self-start"
                onClick={() => startCamera(facingMode)}
              />
            </div>
          )}

          <div
            className={`relative bg-black rounded-lg overflow-hidden ${cameraError ? "hidden" : ""}`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setCameraReady(true)}
              className="w-full"
              style={{ maxHeight: "60vh", objectFit: "contain" }}
            />
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <i className="pi pi-spin pi-spinner text-2xl"></i>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-gray-600">
              {capturedCount > 0
                ? `${capturedCount} photo${capturedCount > 1 ? "s" : ""} added`
                : "Capture as many photos as you need"}
            </span>
            <div className="flex gap-2">
              {hasMultipleCameras && (
                <Button
                  type="button"
                  icon="pi pi-sync"
                  label="Switch"
                  outlined
                  onClick={switchCamera}
                  disabled={!cameraReady}
                />
              )}
              <Button
                type="button"
                icon="pi pi-camera"
                label="Capture"
                onClick={capturePhoto}
                disabled={!cameraReady}
              />
              <Button
                type="button"
                icon="pi pi-check"
                label="Done"
                severity="success"
                onClick={closeCamera}
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ProductFrom;
