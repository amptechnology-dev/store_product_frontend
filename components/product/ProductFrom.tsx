"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { createProductSchema, updateProductSchema } from "@/helper/schema/Schema";

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

const isValidObjectId = (id?: string | null) => !!id && /^[a-fA-F0-9]{24}$/.test(id);

const emptyVariant = {
  size: "",
  weight: "",
  mrp: 0,
  offerPrice: 0,
  stock: 0,
  sku: "",
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
      (isEditMode ? updateProductSchema : createProductSchema) as any
    ),
    defaultValues: {
      name: "",
      description: "",
      unit: "",
      deliveryTime: "",
      storeId: undefined,
      categoryId: undefined,
      variants: [emptyVariant],
    },
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: "variants",
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const selectedStoreId = watch("storeId");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setImageFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((p) => [...p, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number, isExisting = false) => {
    if (isExisting) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setImageFiles((prev) => prev.filter((_, i) => i !== index));
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  useEffect(() => {
    fetchStores();
    if (productId) {
      fetchProductData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (isValidObjectId(selectedStoreId)) {
      fetchCategories(selectedStoreId as string);
    } else {
      setCategories([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreId]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/product/single-product/${productId}`);
      const product = res.data.product;

      setValue("name", product.name);
      setValue("description", product.description || "");
      setValue("unit", product.unit || "");
      setValue("deliveryTime", product.deliveryTime || "");

      const variants =
        Array.isArray(product.variants) && product.variants.length > 0
          ? product.variants.map((v: any) => ({
              size: v.size || "",
              weight: v.weight || "",
              mrp: v.mrp || 0,
              offerPrice: v.offerPrice || 0,
              stock: v.stock || 0,
              sku: v.sku || "",
            }))
          : [emptyVariant];
      setValue("variants", variants);

      setProductCode(product.productCode || "");

      if (product.images && Array.isArray(product.images)) {
        setExistingImages(product.images || []);
      }

      const storeId =
        typeof product.storeId === "object" ? product.storeId?._id : product.storeId;
      if (storeId) {
        setValue("storeId", storeId);
      }

      const categoryId =
        typeof product.categoryId === "object" ? product.categoryId?._id : product.categoryId;
      if (categoryId) setValue("categoryId", categoryId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch product data");
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
      const list = res.data?.categories || [];
      setCategories(list);
    } catch (err: any) {
      console.error("Failed to fetch categories", err);
      toast.error(err?.response?.data?.message || "Failed to fetch categories");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
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
      // variants purota ekta JSON string hishebe pathano hocche
      formData.append("variants", JSON.stringify(data.variants || []));

      if (!isEditMode && data.storeId) {
        formData.append("storeId", String(data.storeId));
      }
      if (data.categoryId) {
        formData.append("categoryId", String(data.categoryId));
      }

      existingImages.forEach((url) => {
        formData.append("images", url);
      });

      imageFiles.forEach((file, idx) => {
        formData.append(`image${idx}`, file);
      });

      const res = await axiosInstance.request({
        url,
        method: isEditMode ? "put" : "post",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data.message || `Product ${isEditMode ? "updated" : "created"} successfully!`);
      reset();
      setImageFiles([]);
      setImagePreviews([]);
      setExistingImages([]);
      onSuccess();
    } catch (error: any) {
      console.error("Product operation error:", error);
      toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} product`);
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
            <span className="text-sm font-semibold text-gray-800">{productCode}</span>
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
              <InputText className="w-full" {...register("name")} placeholder="Enter product name" />
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
                    options={stores.map((s) => ({ label: s.storeName, value: s._id }))}
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
                <small className="text-red-500">{errors.storeId.message as string}</small>
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
                    options={categories.map((c) => ({ label: c.name, value: c._id }))}
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
                    disabled={!isValidObjectId(selectedStoreId) || categoriesLoading}
                    onChange={(e) => field.onChange(e.value)}
                  />
                )}
              />
              {errors.categoryId && (
                <small className="text-red-500">{errors.categoryId.message as string}</small>
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
                <small className="text-red-500">{errors.description.message}</small>
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
              {errors.unit && <small className="text-red-500">{errors.unit.message}</small>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Delivery Time</label>
              <InputText className="w-full" {...register("deliveryTime")} placeholder="e.g. 3-5 days" />
            </div>
          </div>
        </div>

        {/* Variants: size / weight wise price */}
        {/* ✅ FIX: outer wrapper e min-w-0 + w-full diye page-er baire chole jawa atkano hocche */}
        <div className="space-y-3 w-full min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-green-600 text-base">₹</span>
              Size / Weight wise Price
              <span className="text-red-500">*</span>
            </h3>
            <Button
              type="button"
              label="Add Variant"
              icon="pi pi-plus"
              onClick={() => appendVariant(emptyVariant)}
              className="p-button-sm"
              style={{
                background: "#eef2ff",
                color: "#4338ca",
                border: "1px solid #c7d2fe",
              }}
            />
          </div>

          {typeof errors.variants?.message === "string" && (
            <small className="text-red-500 block">{errors.variants.message}</small>
          )}

          <div className="space-y-3 w-full min-w-0">
            {variantFields.map((field, index) => {
              const variantError = errors.variants?.[index] as any;
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
                        onClick={() => removeVariant(index)}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                      >
                        <i className="pi pi-trash"></i> Remove
                      </button>
                    )}
                  </div>

                  {/*
                    ✅ FIX: grid-cols-2 md:grid-cols-5 chilo agei, kintu InputNumber-er
                    bhitorer real <input> element w-full paccho na chilo (className="w-full"
                    sudhu wrapper span-e lagto, actual input-e na), tai input nijer default
                    width dhore rakhto ebong grid cell-er cheye chowra hoye giye puro
                    dialog-take horizontally scrollable kore dicchilo.
                    Fix: prottekta InputNumber-e inputClassName="w-full" add kora hocche,
                    ar grid item gulote min-w-0 dewa hocche (grid item-er default
                    min-width:auto thake, jeta content overflow atkate pare na).
                  */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-semibold text-gray-700">Size</label>
                      <InputText
                        className="w-full"
                        {...register(`variants.${index}.size` as const)}
                        placeholder="e.g. Large"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-semibold text-gray-700">Weight</label>
                      <InputText
                        className="w-full"
                        {...register(`variants.${index}.weight` as const)}
                        placeholder="e.g. 40kg"
                      />
                      {variantError?.size && (
                        <small className="text-red-500 block">
                          {variantError.size.message}
                        </small>
                      )}
                    </div>

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
                        <small className="text-red-500 block">{variantError.mrp.message}</small>
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

                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-semibold text-gray-700">Stock</label>
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Images */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-image text-green-600"></i>
            Product Images
          </h3>

          {existingImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {existingImages.map((url, idx) => (
                <div key={idx} className="relative w-40 h-28 rounded overflow-hidden border">
                  <img src={url} alt={`img-${idx}`} className="w-full h-full object-cover" />
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
                <div key={idx} className="relative w-40 h-28 rounded overflow-hidden border">
                  <img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
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

          <input
            type="file"
            multiple
            onChange={handleImageChange}
            className="w-full p-2 border border-yellow-300 rounded-lg"
            accept="image/*"
          />
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
            label={isSubmitting ? "Saving..." : isEditMode ? "Update Product" : "Create Product"}
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}

export default ProductFrom;