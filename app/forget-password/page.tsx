"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/service/axios.service";
import { useAppDispatch } from "@/lib/store/hooks";
import { tokenSlice } from "../../lib/store/features/storeToken";

const AUTH_TOKEN_KEY = "login-token";
const AUTH_USER_KEY = "login-user";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard",
  STORE: "/dashboard/store",
};

const ROLES = [
  { value: "STORE", label: "Store" },
  { value: "ADMIN", label: "Admin" },
];

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const MIN_PASSWORD = 8;

type Step = "EMAIL" | "OTP" | "OPTIONS" | "PASSWORD";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<Step>("EMAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STORE");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [options, setOptions] = useState<string[]>([]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [cooldown, setCooldown] = useState(0);

  // resend OTP countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resetMessages = () => {
    setError("");
    setInfo("");
  };

  // token expire / invalid hole prothom step e fire jabe
  const restartFlow = (message: string) => {
    setStep("EMAIL");
    setOtp("");
    setResetToken("");
    setOptions([]);
    setPassword("");
    setConfirmPassword("");
    setError(message);
  };

  /* ---------------- STEP 1: SEND OTP ---------------- */
  const sendOtp = async (isResend = false) => {
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/login/forgot-password/send-otp", {
        email: cleanEmail,
        role,
      });
      setEmail(cleanEmail);
      setOtp("");
      setStep("OTP");
      setCooldown(RESEND_SECONDS);
      setInfo(
        isResend
          ? "A new OTP has been sent."
          : res.data?.message || "If this email is registered, an OTP has been sent.",
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to send OTP. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- STEP 2: VERIFY OTP ---------------- */
  const verifyOtp = async () => {
    resetMessages();

    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp)) {
      setError(`OTP must be ${OTP_LENGTH} digits`);
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/login/forgot-password/verify-otp", {
        email,
        role,
        otp,
      });

      setResetToken(res.data?.resetToken || "");
      setOptions(
        Array.isArray(res.data?.options) && res.data.options.length
          ? res.data.options
          : ["CHANGE_PASSWORD", "LOGIN_DIRECTLY"],
      );
      setStep("OPTIONS");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- STEP 3A: LOGIN DIRECTLY ---------------- */
  const clearAuth = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0`;
  };

  const loginDirectly = async () => {
    resetMessages();
    setLoading(true);
    try {
      const res = await axiosInstance.post(
        "/api/login/forgot-password/login-with-otp",
        { resetToken },
      );

      const token = res.data?.token;
      if (!token) {
        setError("Login failed. Please try again.");
        return;
      }

      // login page er moto same token save
      dispatch(tokenSlice.actions.saveToken(token));
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      document.cookie = `${AUTH_TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 2}; SameSite=Lax; Secure`;

      let resolvedRole: string | undefined = res.data?.user?.role;
      try {
        const profileResponse = await axiosInstance.get("/api/login/profile-page");
        const user = profileResponse.data?.user;
        if (user) {
          resolvedRole = user.role;
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

      const target = resolvedRole ? ROLE_HOME[resolvedRole] : undefined;
      if (!target) {
        clearAuth();
        setError("This portal is only for Admin and Store accounts.");
        return;
      }
      router.push(target);
    } catch (err: any) {
      restartFlow(
        err?.response?.data?.message ||
          "Session expired. Please request a new OTP.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- STEP 3B: CHANGE PASSWORD ---------------- */
  const changePassword = async () => {
    resetMessages();

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post(
        "/api/login/forgot-password/reset-password",
        { resetToken, password, confirmPassword },
      );
      setInfo(res.data?.message || "Password reset successfully");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Failed to reset password";
      // 400 validation hole ei step e thakbe, token related hole abar suru
      if (status === 401 || status === 403 || /token|expired/i.test(message)) {
        restartFlow("Session expired. Please request a new OTP.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI HELPERS ---------------- */
  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--brand-blue)";
    e.target.style.boxShadow = "0 0 0 3px rgba(33,150,211,0.12)";
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--border)";
    e.target.style.boxShadow = "";
  };

  const inputStyle: React.CSSProperties = {
    height: 40,
    paddingLeft: 36,
    paddingRight: 12,
    border: "1.5px solid var(--border)",
    background: "var(--surface-soft)",
    color: "var(--foreground)",
  };

  const primaryBtnStyle: React.CSSProperties = {
    height: 42,
    background: "linear-gradient(110deg, var(--brand-primary), var(--brand-blue))",
    boxShadow: "0 4px 18px rgba(26,58,107,0.3)",
  };

  const secondaryBtnStyle: React.CSSProperties = {
    height: 42,
    background: "#fff",
    border: "1.5px solid var(--brand-blue)",
    color: "var(--brand-primary)",
  };

  const titles: Record<Step, { title: string; sub: string }> = {
    EMAIL: {
      title: "Forgot password?",
      sub: "Enter your email and we'll send you an OTP",
    },
    OTP: {
      title: "Verify OTP",
      sub: `Enter the ${OTP_LENGTH}-digit code sent to ${email}`,
    },
    OPTIONS: {
      title: "OTP verified",
      sub: "How would you like to continue?",
    },
    PASSWORD: {
      title: "Set new password",
      sub: "Choose a strong password for your account",
    },
  };

  return (
    <main
      className="min-h-dvh flex items-center justify-center px-4 py-3"
      style={{
        background:
          "radial-gradient(circle at 10% 12%, rgba(26,58,107,0.12), transparent 40%), radial-gradient(circle at 90% 88%, rgba(33,150,211,0.14), transparent 40%), linear-gradient(145deg, #f5f8ff 0%, #eef4ff 50%, #f0f6ff 100%)",
      }}
    >
      <div className="w-full" style={{ maxWidth: 480 }}>
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
            background: "var(--surface)",
          }}
        >
          <div
            className="h-1.5 w-full"
            style={{
              background:
                "linear-gradient(110deg, var(--brand-primary), var(--brand-blue), var(--brand-orange))",
            }}
          />

          <div className="px-5 pt-4 pb-5">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-3">
              <img
                src="/img/photos/amp-logo.png"
                alt="AMP Logo"
                className="h-10 w-10 rounded-xl object-contain shadow-md mb-1.5"
                style={{ border: "1px solid var(--border)" }}
              />
              <p
                className="text-lg font-black tracking-tight leading-tight"
                style={{ color: "var(--brand-primary)" }}
              >
                {titles[step].title}
              </p>
              <p
                className="text-xs mt-0.5 break-all"
                style={{ color: "var(--muted)" }}
              >
                {titles[step].sub}
              </p>
              <div
                className="w-full h-px mt-3"
                style={{ background: "var(--border)" }}
              />
            </div>

            {/* Messages */}
            {error && (
              <div
                className="mb-3 rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  color: "#b91c1c",
                }}
              >
                ⚠️ {error}
              </div>
            )}
            {info && !error && (
              <div
                className="mb-3 rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#15803d",
                }}
              >
                ✅ {info}
              </div>
            )}

            {/* ---------- STEP 1: EMAIL ---------- */}
            {step === "EMAIL" && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendOtp();
                }}
              >
                <div>
                  <label
                    className="text-sm font-semibold block mb-1"
                    style={{ color: "var(--brand-primary-dark)" }}
                  >
                    Account type
                  </label>
                  <div className="flex gap-2">
                    {ROLES.map((r) => {
                      const active = role === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRole(r.value)}
                          className="flex-1 rounded-xl font-bold text-sm transition-all"
                          style={{
                            height: 40,
                            background: active ? "var(--brand-primary)" : "#fff",
                            color: active ? "#fff" : "var(--brand-primary)",
                            border: "1.5px solid var(--brand-blue)",
                          }}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

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
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                      className="w-full rounded-xl text-sm outline-none transition-all"
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  style={primaryBtnStyle}
                >
                  {loading ? "⏳ Sending OTP..." : "Send OTP"}
                </button>
              </form>
            )}

            {/* ---------- STEP 2: OTP ---------- */}
            {step === "OTP" && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyOtp();
                }}
              >
                <div>
                  <label
                    className="text-sm font-semibold block mb-1"
                    style={{ color: "var(--brand-primary-dark)" }}
                  >
                    One-time password
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none"
                      style={{ color: "var(--muted)" }}
                    >
                      🔑
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
                      }
                      maxLength={OTP_LENGTH}
                      placeholder="------"
                      className="w-full rounded-xl text-sm outline-none transition-all"
                      style={{
                        ...inputStyle,
                        letterSpacing: "0.5em",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== OTP_LENGTH}
                  className="w-full rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  style={primaryBtnStyle}
                >
                  {loading ? "⏳ Verifying..." : "Verify OTP"}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      resetMessages();
                      setStep("EMAIL");
                    }}
                    style={{ color: "var(--muted)" }}
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={() => sendOtp(true)}
                    className="font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: "var(--brand-blue)" }}
                  >
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* ---------- STEP 3: OPTIONS ---------- */}
            {step === "OPTIONS" && (
              <div className="space-y-2">
                {options.includes("LOGIN_DIRECTLY") && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={loginDirectly}
                    className="w-full rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    style={primaryBtnStyle}
                  >
                    {loading ? "⏳ Signing in..." : "→ Login directly"}
                  </button>
                )}

                {options.includes("CHANGE_PASSWORD") && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      resetMessages();
                      setStep("PASSWORD");
                    }}
                    className="w-full rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={secondaryBtnStyle}
                  >
                    🔒 Change password
                  </button>
                )}
              </div>
            )}

            {/* ---------- STEP 4: NEW PASSWORD ---------- */}
            {step === "PASSWORD" && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  changePassword();
                }}
              >
                <div>
                  <label
                    className="text-sm font-semibold block mb-1"
                    style={{ color: "var(--brand-primary-dark)" }}
                  >
                    New password
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none"
                      style={{ color: "var(--muted)" }}
                    >
                      🔒
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={`At least ${MIN_PASSWORD} characters`}
                      autoComplete="new-password"
                      className="w-full rounded-xl text-sm outline-none transition-all"
                      style={{ ...inputStyle, paddingRight: 48 }}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    className="text-sm font-semibold block mb-1"
                    style={{ color: "var(--brand-primary-dark)" }}
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none"
                      style={{ color: "var(--muted)" }}
                    >
                      🔒
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      className="w-full rounded-xl text-sm outline-none transition-all"
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !!info}
                  className="w-full rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  style={primaryBtnStyle}
                >
                  {loading ? "⏳ Saving..." : "Reset password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setStep("OPTIONS");
                  }}
                  className="w-full text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  ← Back
                </button>
              </form>
            )}

            {/* Back to login */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-xs font-semibold"
                style={{ color: "var(--brand-blue)" }}
              >
                ← Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}