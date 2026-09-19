"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(10, "Phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      const normalizedEmail = values.email.trim();
      const response = await axiosInstance.post(
        "/api/register/register-owner",
        {
          name: values.name.trim(),
          email: normalizedEmail,
          phone: values.phone.trim(),
          password: values.password,
        },
      );
      toast.success(response.data?.message || "Registration successful");
      setRegisteredEmail(normalizedEmail);
      setOtp("");
      setIsOtpModalOpen(true);
      reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!registeredEmail.trim()) {
      toast.error("Email missing.");
      return;
    }
    if (!otp.trim()) {
      toast.error("Please enter OTP.");
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const response = await axiosInstance.post(
        "/api/register/verify-email-otp",
        {
          email: registeredEmail.trim(),
          otp: otp.trim(),
        },
      );
      toast.success(response.data?.message || "Email verified!");
      setIsOtpModalOpen(false);
      setRegisteredEmail("");
      setOtp("");
      router.push("/login");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "OTP verification failed.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: `1.5px solid ${hasError ? "#ef4444" : "var(--border)"}`,
    background: "var(--surface-soft)",
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
    color: "var(--foreground)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--brand-primary-dark)",
    marginBottom: 4,
    display: "block",
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-2"
      style={{
        background:
          "radial-gradient(circle at 10% 12%, rgba(26,58,107,0.12), transparent 40%), radial-gradient(circle at 90% 88%, rgba(33,150,211,0.14), transparent 40%), linear-gradient(145deg, #f5f8ff 0%, #eef4ff 50%, #f0f6ff 100%)",
      }}
    >
      <div className="w-full" style={{ maxWidth: 520 }}>
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
            background: "var(--surface)",
          }}
        >
          {/* Accent bar */}
          <div
            className="h-1.5 w-full"
            style={{
              background:
                "linear-gradient(110deg, var(--brand-primary), var(--brand-blue), var(--brand-orange))",
            }}
          />

          <div className="p-4">
            {/* Logo + Brand */}
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/img/photos/amp-logo.png"
                alt="AMP Logo"
                className="h-10 w-10 rounded-xl object-contain shadow-md shrink-0"
                style={{ border: "1px solid var(--border)" }}
              />
              <div>
                <p
                  className="text-base font-black tracking-tight leading-none"
                  style={{ color: "var(--brand-primary)" }}
                >
                  AMP{" "}
                  <span style={{ color: "var(--brand-orange)" }}>Shopping</span>
                </p>
                <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                  Store Management Portal
                </p>
                <p
                  className="text-xs font-bold"
                  style={{ color: "var(--brand-primary-dark)" }}
                >
                  Create your account 🚀
                </p>
              </div>
            </div>

            <div
              className="w-full h-px mb-3"
              style={{ background: "var(--border)" }}
            />

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
              {/* Name */}
              <div>
                <label style={{ ...labelStyle, marginBottom: 2 }}>
                  Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm leading-none"
                    style={{ color: "var(--muted)" }}
                  >
                    👤
                  </span>
                  <input
                    id="name"
                    placeholder="Your full name"
                    autoComplete="name"
                    {...register("name")}
                    style={{
                      ...inputStyle(!!errors.name),
                      height: 40,
                      paddingLeft: 34,
                      fontSize: 13,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--brand-blue)";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(33,150,211,0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.name
                        ? "#ef4444"
                        : "var(--border)";
                      e.target.style.boxShadow = "";
                    }}
                  />
                </div>
                {errors.name && (
                  <small className="text-red-500 text-[11px] block">
                    ⚠️ {errors.name.message}
                  </small>
                )}
              </div>

              {/* Email */}
              <div>
                <label style={{ ...labelStyle, marginBottom: 2 }}>
                  Email <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm leading-none"
                    style={{ color: "var(--muted)" }}
                  >
                    ✉️
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="email"
                    {...register("email")}
                    style={{
                      ...inputStyle(!!errors.email),
                      height: 40,
                      paddingLeft: 34,
                      fontSize: 13,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--brand-blue)";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(33,150,211,0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.email
                        ? "#ef4444"
                        : "var(--border)";
                      e.target.style.boxShadow = "";
                    }}
                  />
                </div>
                {errors.email && (
                  <small className="text-red-500 text-[11px] block">
                    ⚠️ {errors.email.message}
                  </small>
                )}
              </div>

              {/* Phone */}
              <div>
                <label style={{ ...labelStyle, marginBottom: 2 }}>
                  Phone <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm leading-none"
                    style={{ color: "var(--muted)" }}
                  >
                    📱
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="10-digit phone number"
                    autoComplete="tel"
                    {...register("phone")}
                    style={{
                      ...inputStyle(!!errors.phone),
                      height: 40,
                      paddingLeft: 34,
                      fontSize: 13,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--brand-blue)";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(33,150,211,0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.phone
                        ? "#ef4444"
                        : "var(--border)";
                      e.target.style.boxShadow = "";
                    }}
                  />
                </div>
                {errors.phone && (
                  <small className="text-red-500 text-[11px] block">
                    ⚠️ {errors.phone.message}
                  </small>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{ ...labelStyle, marginBottom: 2 }}>
                  Password <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm leading-none"
                        style={{ color: "var(--muted)" }}
                      >
                        🔒
                      </span>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 6 characters"
                        autoComplete="new-password"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        style={{
                          ...inputStyle(!!errors.password),
                          height: 40,
                          paddingLeft: 34,
                          paddingRight: 44,
                          fontSize: 13,
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "var(--brand-blue)";
                          e.target.style.boxShadow =
                            "0 0 0 3px rgba(33,150,211,0.12)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = errors.password
                            ? "#ef4444"
                            : "var(--border)";
                          e.target.style.boxShadow = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-base leading-none"
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  )}
                />
                {errors.password && (
                  <small className="text-red-500 text-[11px] block">
                    ⚠️ {errors.password.message}
                  </small>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  height: 40,
                  background:
                    "linear-gradient(110deg, var(--brand-primary), var(--brand-blue))",
                  boxShadow: "0 4px 18px rgba(26,58,107,0.3)",
                }}
              >
                {isSubmitting ? "⏳ Creating account..." : "→ Create Account"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div
                className="flex-1 h-px"
                style={{ background: "var(--border)" }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--muted)" }}
              >
                OR
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "var(--border)" }}
              />
            </div>

            {/* Login link */}
            <div
              className="rounded-xl px-4 py-2 text-center text-xs"
              style={{
                background: "var(--surface-soft)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ color: "var(--muted)" }}>
                Already have an account?{" "}
              </span>
              <Link
                href="/login"
                className="font-bold hover:underline"
                style={{ color: "var(--brand-orange)" }}
              >
                Sign in →
              </Link>
            </div>

            {/* Back */}
            <div className="mt-1.5 text-center">
              <button
                type="button"
                onClick={() => router.push("/store")}
                className="text-xs font-semibold hover:underline"
                style={{ color: "var(--muted)" }}
              >
                ← Back to Store
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {isOtpModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => {
            if (!isVerifyingOtp) setIsOtpModalOpen(false);
          }}
        >
          <div
            className="w-full rounded-3xl overflow-hidden"
            style={{
              maxWidth: 440,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 28px 80px rgba(15,23,42,0.28)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent bar */}
            <div
              className="h-1.5 w-full"
              style={{
                background:
                  "linear-gradient(110deg, var(--brand-primary), var(--brand-blue), var(--brand-orange))",
              }}
            />

            <div className="p-4">
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-2">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl mb-2 shadow-md"
                  style={{
                    background: "var(--surface-soft)",
                    border: "1px solid var(--border)",
                  }}
                >
                  📧
                </div>
                <p
                  className="text-lg font-black"
                  style={{ color: "var(--brand-primary-dark)" }}
                >
                  Verify your email
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  Enter the OTP sent to your email address
                </p>
                <div
                  className="w-full h-px mt-3"
                  style={{ background: "var(--border)" }}
                />
              </div>

              <div className="space-y-3">
                {/* Email readonly */}
                <div>
                  <label style={labelStyle}>Email</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none">
                      ✉️
                    </span>
                    <input
                      type="email"
                      value={registeredEmail}
                      readOnly
                      style={{
                        ...inputStyle(false),
                        paddingLeft: 36,
                        background: "var(--surface-soft)",
                        color: "var(--muted)",
                        cursor: "not-allowed",
                      }}
                    />
                  </div>
                </div>

                {/* OTP */}
                <div>
                  <label style={labelStyle}>
                    OTP <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none">
                      🔑
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      style={{ ...inputStyle(false), paddingLeft: 36 }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--brand-blue)";
                        e.target.style.boxShadow =
                          "0 0 0 3px rgba(33,150,211,0.12)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--border)";
                        e.target.style.boxShadow = "";
                      }}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isVerifyingOtp}
                    onClick={() => {
                      if (!isVerifyingOtp) {
                        setIsOtpModalOpen(false);
                        setOtp("");
                      }
                    }}
                    className="flex-1 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      height: 44,
                      border: "1.5px solid var(--border)",
                      background: "var(--surface-soft)",
                      color: "var(--muted)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isVerifyingOtp}
                    onClick={handleVerifyOtp}
                    className="flex-1 rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      height: 44,
                      background:
                        "linear-gradient(110deg, var(--brand-primary), var(--brand-blue))",
                      boxShadow: "0 4px 18px rgba(26,58,107,0.3)",
                    }}
                  >
                    {isVerifyingOtp ? "⏳ Verifying..." : "✓ Verify OTP"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" />
    </main>
  );
}
