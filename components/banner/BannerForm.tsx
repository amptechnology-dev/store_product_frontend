"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { createBannerSchema, updateBannerSchema } from "@/helper/schema/Schema";

type BannerFormData = z.infer<typeof createBannerSchema>;

type BannerFormProps = {
  bannerId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

function BannerForm({ bannerId, onClose, onSuccess }: BannerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!bannerId;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BannerFormData>({
    resolver: zodResolver(
      (isEditMode ? updateBannerSchema : createBannerSchema) as any,
    ),
    defaultValues: {
      name: "",
      storeId: undefined,
    },
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [stores, setStores] = useState<any[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = (isExisting = false) => {
    if (isExisting) {
      setExistingImage("");
    } else {
      setImageFile(null);
      setImagePreview("");
    }
  };

  useEffect(() => {
    fetchStores();
    if (bannerId) {
      fetchBannerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerId]);

  const fetchBannerData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/banner/single-banner/${bannerId}`);
      const banner = res.data.banner;

      setValue("name", banner.name);

      if (banner.image) {
        setExistingImage(banner.image);
      }

      const storeId =
        typeof banner.storeId === "object" ? banner.storeId?._id : banner.storeId;
      if (storeId) setValue("storeId", storeId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch banner data");
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

  const onSubmit = async (data: BannerFormData) => {
    if (!isEditMode && !imageFile) {
      toast.error("Banner image is required");
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

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await axiosInstance.request({
        url,
        method: isEditMode ? "put" : "post",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        res.data.message || `Banner ${isEditMode ? "updated" : "created"} successfully!`,
      );
      reset();
      setImageFile(null);
      setImagePreview("");
      setExistingImage("");
      onSuccess();
    } catch (error: any) {
      console.error("Banner operation error:", error);
      toast.error(
        error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} banner`,
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
              <InputText className="w-full" {...register("name")} placeholder="Enter banner name" />
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
          </div>
        </div>

        {/* Image */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <i className="pi pi-image text-green-600"></i>
            Banner Image {!isEditMode && <span className="text-red-500">*</span>}
          </h3>

          {existingImage && (
            <div className="relative w-full h-40 rounded overflow-hidden border">
              <img src={existingImage} alt="banner" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(true)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs"
              >
                ×
              </button>
            </div>
          )}

          {imagePreview && (
            <div className="relative w-full h-40 rounded overflow-hidden border">
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(false)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs"
              >
                ×
              </button>
            </div>
          )}

          {!existingImage && !imagePreview && (
            <input
              type="file"
              onChange={handleImageChange}
              className="w-full p-2 border border-yellow-300 rounded-lg"
              accept="image/*"
            />
          )}

          {/* existing image replace korte chaile notun file dite pare */}
          {(existingImage || imagePreview) && (
            <input
              type="file"
              onChange={handleImageChange}
              className="w-full p-2 border border-yellow-300 rounded-lg"
              accept="image/*"
            />
          )}
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
            label={isSubmitting ? "Saving..." : isEditMode ? "Update Banner" : "Create Banner"}
            icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}

export default BannerForm;