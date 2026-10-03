"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

// Matches backend validation (empty string is allowed so the admin can clear a field)
const phoneRegex = /^\+?[0-9]{10,15}$/;
const optionalPhone = z
  .string()
  .trim()
  .regex(phoneRegex, "Enter a valid phone number")
  .or(z.literal(""));
const optionalEmail = z.string().trim().email("Invalid email").or(z.literal(""));
const optionalUrl = z.string().trim().url("Enter a valid URL (https://...)").or(z.literal(""));

const companySchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required"),
  companyPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Enter a valid phone number (10-15 digits)"),
  companyEmail: optionalEmail,

  whatsappNo: optionalPhone,
  supportPhone: optionalPhone,
  supportEmail: optionalEmail,
  website: optionalUrl,
  description: z.string().trim().max(1000, "Max 1000 characters"),

  address: z.object({
    addressLine: z.string().trim(),
    area: z.string().trim(),
    city: z.string().trim(),
    state: z.string().trim(),
    pincode: z.string().trim(),
    country: z.string().trim(),
  }),

  socialLinks: z.object({
    facebookUrl: optionalUrl,
    instagramUrl: optionalUrl,
    twitterUrl: optionalUrl,
    linkedinUrl: optionalUrl,
    youtubeUrl: optionalUrl,
  }),
});

type CompanyFormData = z.infer<typeof companySchema>;

const emptyValues: CompanyFormData = {
  companyName: "",
  companyPhone: "",
  companyEmail: "",
  whatsappNo: "",
  supportPhone: "",
  supportEmail: "",
  website: "",
  description: "",
  address: {
    addressLine: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
  },
  socialLinks: {
    facebookUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
  },
};

const ENDPOINT = "/api/company";

// ---------- small helpers ----------
const SectionTitle = ({ icon, title }: { icon: string; title: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
    <i className={`pi ${icon} text-blue-600`}></i>
    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
  </div>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <small className="text-red-500 flex items-center gap-1">
      <i className="pi pi-exclamation-circle"></i>
      {message}
    </small>
  ) : null;

function CompanyPage() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasData, setHasData] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    fetchCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fill "" for any null/undefined field returned by the API
  const toFormValues = (c: any): CompanyFormData => ({
    companyName: c?.companyName ?? "",
    companyPhone: c?.companyPhone ?? "",
    companyEmail: c?.companyEmail ?? "",
    whatsappNo: c?.whatsappNo ?? "",
    supportPhone: c?.supportPhone ?? "",
    supportEmail: c?.supportEmail ?? "",
    website: c?.website ?? "",
    description: c?.description ?? "",
    address: {
      addressLine: c?.address?.addressLine ?? "",
      area: c?.address?.area ?? "",
      city: c?.address?.city ?? "",
      state: c?.address?.state ?? "",
      pincode: c?.address?.pincode ?? "",
      country: c?.address?.country ?? "",
    },
    socialLinks: {
      facebookUrl: c?.socialLinks?.facebookUrl ?? "",
      instagramUrl: c?.socialLinks?.instagramUrl ?? "",
      twitterUrl: c?.socialLinks?.twitterUrl ?? "",
      linkedinUrl: c?.socialLinks?.linkedinUrl ?? "",
      youtubeUrl: c?.socialLinks?.youtubeUrl ?? "",
    },
  });

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ENDPOINT);
      const company = res.data?.data;
      if (company) {
        reset(toFormValues(company));
        setHasData(true);
      } else {
        setHasData(false);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to fetch company details",
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    try {
      // Backend uses .strict(), so only the form fields are sent (no _id, createdAt, etc.)
      const res = await axiosInstance.put(ENDPOINT, data);
      toast.success(res.data?.message || "Company details saved successfully");
      reset(toFormValues(res.data?.data)); // resets isDirty and syncs the saved data
      setHasData(true);
    } catch (error: any) {
      const errs = error?.response?.data?.errors;
      if (Array.isArray(errs) && errs.length > 0) {
        toast.error(`${errs[0].field}: ${errs[0].message}`);
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to save company details",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full";
  const labelClass = "text-sm font-semibold text-gray-700";

  return (
    <div className="w-full flex justify-start items-start pt-2">
      <div className="w-full bg-white rounded-lg shadow p-2 sm:p-4">
        {/* HEADER */}
        <div
          className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 rounded-lg"
          style={{ background: "linear-gradient(120deg,#3b82f6,#1d4ed8)" }}
        >
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-white">
              Company Details
            </h2>
            <p className="text-xs text-blue-100">
              {hasData
                ? "Update company contact & social information"
                : "Add company contact & social information"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-2 sm:p-4 space-y-6"
          >
            {/* BASIC INFO */}
            <section className="space-y-3">
              <SectionTitle icon="pi-building" title="Basic Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <InputText
                    className={inputClass}
                    placeholder="Enter company name"
                    {...register("companyName")}
                  />
                  <FieldError message={errors.companyName?.message} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>
                    Company Phone <span className="text-red-500">*</span>
                  </label>
                  <InputText
                    className={inputClass}
                    placeholder="e.g. 9876543210"
                    {...register("companyPhone")}
                  />
                  <FieldError message={errors.companyPhone?.message} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Company Email</label>
                  <InputText
                    className={inputClass}
                    placeholder="info@company.com"
                    {...register("companyEmail")}
                  />
                  <FieldError message={errors.companyEmail?.message} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Website</label>
                  <InputText
                    className={inputClass}
                    placeholder="https://company.com"
                    {...register("website")}
                  />
                  <FieldError message={errors.website?.message} />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className={labelClass}>Description</label>
                  <InputTextarea
                    className={inputClass}
                    rows={3}
                    autoResize
                    placeholder="Short description about the company"
                    {...register("description")}
                  />
                  <FieldError message={errors.description?.message} />
                </div>
              </div>
            </section>

            {/* SUPPORT / CONTACT */}
            <section className="space-y-3">
              <SectionTitle icon="pi-phone" title="Support & Contact" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>WhatsApp Number</label>
                  <InputText
                    className={inputClass}
                    placeholder="e.g. 9876543210"
                    {...register("whatsappNo")}
                  />
                  <FieldError message={errors.whatsappNo?.message} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Support Phone</label>
                  <InputText
                    className={inputClass}
                    placeholder="e.g. 9876543210"
                    {...register("supportPhone")}
                  />
                  <FieldError message={errors.supportPhone?.message} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Support Email</label>
                  <InputText
                    className={inputClass}
                    placeholder="support@company.com"
                    {...register("supportEmail")}
                  />
                  <FieldError message={errors.supportEmail?.message} />
                </div>
              </div>
            </section>

            {/* ADDRESS */}
            <section className="space-y-3">
              <SectionTitle icon="pi-map-marker" title="Address" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <label className={labelClass}>Address Line</label>
                  <InputText
                    className={inputClass}
                    placeholder="Street, building, landmark"
                    {...register("address.addressLine")}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Area</label>
                  <InputText
                    className={inputClass}
                    placeholder="Area / locality"
                    {...register("address.area")}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>City</label>
                  <InputText
                    className={inputClass}
                    placeholder="City"
                    {...register("address.city")}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>State</label>
                  <InputText
                    className={inputClass}
                    placeholder="State"
                    {...register("address.state")}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Pincode</label>
                  <InputText
                    className={inputClass}
                    placeholder="Pincode"
                    {...register("address.pincode")}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Country</label>
                  <InputText
                    className={inputClass}
                    placeholder="Country"
                    {...register("address.country")}
                  />
                </div>
              </div>
            </section>

            {/* SOCIAL LINKS */}
            <section className="space-y-3">
              <SectionTitle icon="pi-share-alt" title="Social Links" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelClass}>
                    <i className="pi pi-facebook text-blue-600 mr-1"></i>
                    Facebook URL
                  </label>
                  <InputText
                    className={inputClass}
                    placeholder="https://facebook.com/yourpage"
                    {...register("socialLinks.facebookUrl")}
                  />
                  <FieldError message={errors.socialLinks?.facebookUrl?.message} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>
                    <i className="pi pi-instagram text-pink-600 mr-1"></i>
                    Instagram URL
                  </label>
                  <InputText
                    className={inputClass}
                    placeholder="https://instagram.com/yourpage"
                    {...register("socialLinks.instagramUrl")}
                  />
                  <FieldError message={errors.socialLinks?.instagramUrl?.message} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>
                    <i className="pi pi-twitter text-sky-500 mr-1"></i>
                    Twitter / X URL
                  </label>
                  <InputText
                    className={inputClass}
                    placeholder="https://x.com/yourpage"
                    {...register("socialLinks.twitterUrl")}
                  />
                  <FieldError message={errors.socialLinks?.twitterUrl?.message} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>
                    <i className="pi pi-linkedin text-blue-700 mr-1"></i>
                    LinkedIn URL
                  </label>
                  <InputText
                    className={inputClass}
                    placeholder="https://linkedin.com/company/yourpage"
                    {...register("socialLinks.linkedinUrl")}
                  />
                  <FieldError message={errors.socialLinks?.linkedinUrl?.message} />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>
                    <i className="pi pi-youtube text-red-600 mr-1"></i>
                    YouTube URL
                  </label>
                  <InputText
                    className={inputClass}
                    placeholder="https://youtube.com/@yourchannel"
                    {...register("socialLinks.youtubeUrl")}
                  />
                  <FieldError message={errors.socialLinks?.youtubeUrl?.message} />
                </div>
              </div>
            </section>

            {/* ACTIONS */}
            <div className="flex gap-3 pt-2 border-t border-blue-100">
              <Button
                type="button"
                label="Reset"
                icon="pi pi-refresh"
                onClick={fetchCompany}
                className="flex-1 sm:flex-none bg-gray-100 text-gray-700 border-0 hover:bg-gray-200"
                outlined
                disabled={isSubmitting || !isDirty}
              />
              <Button
                type="submit"
                label={
                  isSubmitting
                    ? "Saving..."
                    : hasData
                      ? "Update Company"
                      : "Save Company"
                }
                icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isSubmitting}
              />
            </div>
          </form>
        )}

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default CompanyPage;