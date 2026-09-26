"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

const workerSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  whatsappNo: z
    .string()
    .min(1, "WhatsApp number is required")
    .regex(/^[0-9+\-\s]{6,15}$/, "Enter a valid WhatsApp number"),
  storeId: z.string().min(1, "Store is required"),
  isActive: z.boolean().optional(),
});

type WorkerFormData = z.infer<typeof workerSchema>;

type WorkerFormProps = {
  workerId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

function WorkerForm({ workerId, onClose, onSuccess }: WorkerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const isEditMode = !!workerId;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      name: "",
      whatsappNo: "",
      storeId: undefined,
      isActive: true,
    },
  });

  const isActive = watch("isActive");

  useEffect(() => {
    fetchStores();
    if (workerId) fetchWorkerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const fetchStores = async () => {
    try {
      const res = await axiosInstance.get("/api/register/user-based-stores");
      const list = res.data?.stores || [];
      setStores(list);
      if (list.length > 0 && !workerId) setValue("storeId", list[0]._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch stores");
    }
  };

  const fetchWorkerData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/worker/single-worker/${workerId}`,
      );
      const worker = res.data.worker;

      setValue("name", worker.name || "");
      setValue("whatsappNo", worker.whatsappNo || "");
      setValue("isActive", worker.isActive ?? true);

      const storeId =
        typeof worker.storeId === "object" ? worker.storeId?._id : worker.storeId;
      if (storeId) setValue("storeId", storeId);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to fetch worker data",
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: WorkerFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `/api/worker/update-worker/${workerId}`
        : `/api/worker/create-worker`;

      const payload: any = {
        name: data.name,
        whatsappNo: data.whatsappNo,
        storeId: data.storeId,
      };
      if (isEditMode) payload.isActive = data.isActive;

      const res = await axiosInstance.request({
        url,
        method: isEditMode ? "put" : "post",
        data: payload,
      });

      toast.success(
        res.data.message ||
          `Worker ${isEditMode ? "updated" : "created"} successfully!`,
      );
      reset();
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} worker`,
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
    <div className="px-4 pt-2 pb-3">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-gray-700">
            Karigar Name <span className="text-red-500">*</span>
          </label>
          <InputText
            className="w-full"
            {...register("name")}
            placeholder="Enter karigar name"
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
            WhatsApp Number <span className="text-red-500">*</span>
          </label>
          <InputText
            className="w-full"
            {...register("whatsappNo")}
            placeholder="e.g. +91 98765 43210"
          />
          {errors.whatsappNo && (
            <small className="text-red-500 flex items-center gap-1">
              <i className="pi pi-exclamation-circle"></i>
              {errors.whatsappNo.message}
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
                placeholder={stores.length === 0 ? "Loading..." : "Select store"}
                className="w-full border-blue-200"
                onChange={(e) => field.onChange(e.value)}
              />
            )}
          />
          {errors.storeId && (
            <small className="text-red-500 flex items-center gap-1">
              <i className="pi pi-exclamation-circle"></i>
              {errors.storeId.message}
            </small>
          )}
        </div> */}

        {isEditMode && (
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-2.5 py-2">
            <div>
              <p className="text-sm font-semibold text-gray-700">Active</p>
              <p className="text-xs text-gray-500">
                Turn off to temporarily disable this worker
              </p>
            </div>
            <InputSwitch
              checked={!!isActive}
              onChange={(e) => setValue("isActive", e.value)}
            />
          </div>
        )}

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
                  ? "Update Worker"
                  : "Create Worker"
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

export default WorkerForm;