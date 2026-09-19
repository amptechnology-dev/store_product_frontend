"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@/helper/schema/Schema";
import axiosInstance from "@/service/axios.service";
import { useAppDispatch } from "@/lib/store/hooks";
import { tokenSlice } from "../../lib/store/features/storeToken";
import Link from "next/link";

const AUTH_TOKEN_KEY = "login-token";
const AUTH_USER_KEY = "login-user";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const dispatch = useAppDispatch();

  type LoginForm = z.infer<typeof LoginSchema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError("");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/login", data);
      const token = res.data.token;
      dispatch(tokenSlice.actions.saveToken(token));
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      try {
        const profileResponse = await axiosInstance.get(
          "/api/login/profile-page",
        );
        const user = profileResponse.data?.user;
        if (user) {
          localStorage.setItem(
            AUTH_USER_KEY,
            JSON.stringify({
              id: user._id || user.id,
              name: user.name || user.email || "User",
              email: user.email || "",
              role: user.role,
              picture: user.picture,
            }),
          );
        }
      } catch (profileError) {
        console.error("Unable to load profile after login:", profileError);
      }
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/dashboard/store");
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
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
          {/* Top accent bar */}
          <div
            className="h-1.5 w-full"
            style={{
              background:
                "linear-gradient(110deg, var(--brand-primary), var(--brand-blue), var(--brand-orange))",
            }}
          />

          <div className="p-5">
            {/* Logo + Brand */}
            {/* Logo + Brand */}
            <div className="flex flex-col items-center text-center mb-3">
              <img
                src="/img/photos/amp-logo.png"
                alt="AMP Logo"
                className="h-12 w-12 rounded-2xl object-contain shadow-md mb-2"
                style={{ border: "1px solid var(--border)" }}
              />
              <p
                className="text-xl font-black tracking-tight leading-none"
                style={{ color: "var(--brand-primary)" }}
              >
                AMP{" "}
                <span style={{ color: "var(--brand-orange)" }}>Shopping</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                Product Management Portal
              </p>
              <p
                className="text-sm font-bold mt-0.5"
                style={{ color: "var(--brand-primary-dark)" }}
              >
                Welcome back 👋
              </p>
              <div
                className="w-full h-px mt-2.5"
                style={{ background: "var(--border)" }}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="mb-4 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  color: "#b91c1c",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
              {/* Email */}
              <div>
                <label
                  className="text-sm font-semibold block mb-1"
                  style={{ color: "var(--brand-primary-dark)" }}
                >
                  Email address
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none"
                    style={{ color: "var(--muted)" }}
                  >
                    ✉️
                  </span>
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full rounded-xl text-sm outline-none transition-all"
                    style={{
                      height: 44,
                      paddingLeft: 36,
                      paddingRight: 12,
                      border: errors.email
                        ? "1.5px solid #ef4444"
                        : "1.5px solid var(--border)",
                      background: "var(--surface-soft)",
                      color: "var(--foreground)",
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
                  <small className="text-red-500 text-xs mt-1 block">
                    ⚠️ {errors.email.message}
                  </small>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  className="text-sm font-semibold block mb-1"
                  style={{ color: "var(--brand-primary-dark)" }}
                >
                  Password
                </label>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none"
                        style={{ color: "var(--muted)" }}
                      >
                        🔒
                      </span>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="w-full rounded-xl text-sm outline-none transition-all"
                        style={{
                          height: 44,
                          paddingLeft: 36,
                          paddingRight: 48,
                          border: errors.password
                            ? "1.5px solid #ef4444"
                            : "1.5px solid var(--border)",
                          background: "var(--surface-soft)",
                          color: "var(--foreground)",
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  )}
                />
                {errors.password && (
                  <small className="text-red-500 text-xs mt-1 block">
                    ⚠️ {errors.password.message}
                  </small>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  height: 44,
                  background:
                    "linear-gradient(110deg, var(--brand-primary), var(--brand-blue))",
                  boxShadow: "0 4px 18px rgba(26,58,107,0.3)",
                }}
              >
                {loading ? "⏳ Signing in..." : "→ Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
