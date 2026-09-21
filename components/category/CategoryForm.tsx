"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import {
  CATEGORY_ICON_GROUPS,
  CategoryIconOption,
} from "../../app/constants/categoryIcons";

type CategoryFormProps = {
  categoryId: string | null;
  storeId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

type CategoryFormData = {
  name: string;
  description: string;
  icon: string;
};

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

// dropdown er option + selected value er template
const iconOptionTemplate = (option: CategoryIconOption) => (
  <div className="flex items-center gap-2">
    <span className="text-xl leading-none">{option.value}</span>
    <span className="text-sm">{option.label}</span>
  </div>
);

const iconGroupTemplate = (group: { group: string }) => (
  <span className="text-xs font-semibold uppercase text-gray-500">
    {group.group}
  </span>
);

function CategoryForm({
  categoryId,
  storeId,
  onClose,
  onSuccess,
}: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!categoryId;

  // image state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [existingImage, setExistingImage] = useState<string>("");
  const [removeImage, setRemoveImage] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: { name: "", description: "", icon: "" },
  });

  useEffect(() => {
    if (categoryId) fetchCategoryData();
  }, [categoryId]);

  // local preview URL cleanup (memory leak na hoy)
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/category/${categoryId}`);
      const cat = res.data.category;
      setValue("name", cat.name);
      setValue("description", cat.description || "");
      setValue("icon", cat.icon || "");
      setExistingImage(cat.image || "");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch category");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image size must be less than 2MB");
      e.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    // purono image chhilo hole backend e clear korar signal pathabo
    if (existingImage) setRemoveImage(true);
  };

  const onSubmit = async (data: CategoryFormData) => {
    if (!isEditMode && !storeId) {
      toast.error("Store information not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name.trim());
      formData.append("description", data.description?.trim() || "");
      formData.append("icon", data.icon || "");

      if (!isEditMode && storeId) {
        formData.append("storeId", storeId);
      }

      if (imageFile) {
        formData.append("image", imageFile);
      } else if (isEditMode && removeImage) {
        formData.append("removeImage", "true");
      }

      const url = isEditMode ? `/api/category/${categoryId}` : `/api/category`;
      const method = isEditMode ? "put" : "post";

      // Content-Type manually set korbe na, axios nijei boundary soho set kore nibe
      const res = await axiosInstance.request({
        url,
        method,
        data: formData,
      });

      toast.success(
        res.data.message ||
          `Category ${isEditMode ? "updated" : "created"} successfully!`,
      );
      onSuccess();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} category`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
      </div>
    );
  }

  // preview: notun file > purono image (jodi remove na kora hoy)
  const displayImage = imagePreview || (!removeImage ? existingImage : "");

  return (
    <div className="px-4 pt-2 pb-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-tag text-blue-600"></i>
            Category Information
          </h3>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">
              Category Name <span className="text-red-500">*</span>
            </label>
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon bg-blue-50">
                <i className="pi pi-tag text-blue-600"></i>
              </span>
              <InputText
                className="w-full"
                placeholder="e.g. Groceries"
                {...register("name", {
                  required: "Category name is required",
                })}
              />
            </div>
            {errors.name && (
              <small className="text-red-500 flex items-center gap-1">
                <i className="pi pi-exclamation-circle"></i>
                {errors.name.message}
              </small>
            )}
          </div>

          {/* Icon dropdown */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Icon</label>
            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <Dropdown
                  value={field.value || null}
                  onChange={(e) => field.onChange(e.value ?? "")}
                  options={CATEGORY_ICON_GROUPS}
                  optionGroupLabel="group"
                  optionGroupTemplate={iconGroupTemplate}
                  optionLabel="label"
                  optionValue="value"
                  itemTemplate={iconOptionTemplate}
                  valueTemplate={(option: CategoryIconOption | null) =>
                    option ? (
                      iconOptionTemplate(option)
                    ) : (
                      <span className="text-gray-400">Select an icon</span>
                    )
                  }
                  placeholder="Select an icon"
                  filter
                  filterBy="label"
                  showClear
                  className="w-full"
                  panelStyle={{ maxHeight: "300px" }}
                />
              )}
            />
          </div>

          {/* Image upload (single) */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">
              Category Image
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            {displayImage ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={displayImage}
                  alt="Category"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow"
                  title="Remove image"
                >
                  <i className="pi pi-times text-xs"></i>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 flex flex-col items-center gap-1 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition"
              >
                <i className="pi pi-image text-2xl"></i>
                <span className="text-sm">Click to upload image</span>
                <span className="text-xs text-gray-400">
                  JPG, PNG, WEBP (max 2MB)
                </span>
              </button>
            )}

            {displayImage && (
              <Button
                type="button"
                label="Change image"
                icon="pi pi-upload"
                size="small"
                text
                onClick={() => fileInputRef.current?.click()}
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">
              Description
            </label>
            <InputTextarea
              className="w-full"
              rows={3}
              placeholder="Short description"
              {...register("description")}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            onClick={onClose}
            outlined
            disabled={isSubmitting}
            className="flex-1 bg-gray-100 text-gray-700 border-0 hover:bg-gray-200"
          />
          <Button
            type="submit"
            label={
              isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Update Category"
                  : "Create Category"
            }
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg"
          />
        </div>
      </form>
    </div>
  );
}

export default CategoryForm;