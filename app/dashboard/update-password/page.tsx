"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Message } from "primereact/message";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

const updatePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Confirm password must match new password",
  });

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setSuccessMessage("");
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/api/login/update-password", {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      const msg = res.data?.message || "Password updated successfully";
      setSuccessMessage(msg);
      toast.success(msg, { autoClose: 2500 });
      reset();
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to update password";
      setErrorMessage(msg);
      toast.error(msg, { autoClose: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordInput = (
    id: "oldPassword" | "newPassword" | "confirmPassword",
    placeholder: string,
    show: boolean,
    setShow: React.Dispatch<React.SetStateAction<boolean>>
  ) => (
    <Controller
      name={id}
      control={control}
      render={({ field }) => (
        <div style={{ position: "relative", width: "100%" }}>
          <InputText
            id={id}
            type={show ? "text" : "password"}
            value={field.value || ""}
            onChange={(e) => field.onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete="new-password"
            style={{ width: "100%", paddingRight: 42 }}
            className={errors[id] ? "p-invalid" : ""}
          />
          <button
            type="button"
            onClick={() => setShow((prev) => !prev)}
            aria-label={show ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              color: "#64748b",
              cursor: "pointer",
              padding: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <i className={`pi ${show ? "pi-eye-slash" : "pi-eye"}`} aria-hidden="true" />
          </button>
        </div>
      )}
    />
  );

  return (
    <main className="w-full flex justify-center px-3 md:px-6 py-6">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 mb-2 p-4">
          <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
            <i className="pi pi-lock text-white text-2xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Update Password</h2>
            <p className="text-sm text-white/90">Change your current password securely</p>
          </div>
        </div>

        <div className="p-6">
          {successMessage && (
            <div className="mb-4">
              <Message severity="success" text={successMessage} />
            </div>
          )}

          {errorMessage && (
            <div className="mb-4">
              <Message severity="error" text={errorMessage} />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="oldPassword" className="text-sm font-semibold text-gray-700">
                Old Password <span className="text-red-500">*</span>
              </label>
              {passwordInput("oldPassword", "Enter old password", showOldPassword, setShowOldPassword)}
              {errors.oldPassword && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.oldPassword.message}
                </small>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="newPassword" className="text-sm font-semibold text-gray-700">
                New Password <span className="text-red-500">*</span>
              </label>
              {passwordInput("newPassword", "Enter new password", showNewPassword, setShowNewPassword)}
              {errors.newPassword && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.newPassword.message}
                </small>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              {passwordInput("confirmPassword", "Confirm new password", showConfirmPassword, setShowConfirmPassword)}
              {errors.confirmPassword && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.confirmPassword.message}
                </small>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                label={isSubmitting ? "Updating..." : "Update Password"}
                icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl"
                disabled={isSubmitting}
              />
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
