"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

type CategoryFormProps = {
  categoryId: string | null;
  storeId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

type CategoryFormData = {
  name: string;
  description: string;
};

function CategoryForm({
  categoryId,
  storeId,
  onClose,
  onSuccess,
}: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!categoryId;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (categoryId) fetchCategoryData();
  }, [categoryId]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/category/${categoryId}`);
      const cat = res.data.category;
      setValue("name", cat.name);
      setValue("description", cat.description || "");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch category");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    if (!isEditMode && !storeId) {
      toast.error("Store information not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, string> = {
        name: data.name.trim(),
        description: data.description?.trim() || "",
      };

      if (!isEditMode && storeId) {
        payload.storeId = storeId;
      }

      const url = isEditMode ? `/api/category/${categoryId}` : `/api/category`;
      const method = isEditMode ? "put" : "post";

      const res = await axiosInstance.request({
        url,
        method,
        data: payload,
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

  return (
    <div className="px-4 pt-2 pb-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-tag text-blue-600"></i>
            Category Information
          </h3>

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