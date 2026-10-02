"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@/helper/schema/Schema";
import axiosInstance from "@/service/axios.service";
import { useAppDispatch } from "@/lib/store/hooks";
import { tokenSlice } from "../../lib/store/features/storeToken";

const AUTH_TOKEN_KEY = "login-token";
const AUTH_USER_KEY = "login-user";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard",
  STORE: "/dashboard/store",
};

// ---------------- CAPTCHA CONFIG ----------------
// Confusing char (0/O, 1/I/L) bad deya hoyeche
const CAPTCHA_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CAPTCHA_LENGTH = 5;
const CAPTCHA_W = 200;
const CAPTCHA_H = 46;

const randInt = (max: number) => {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
};
const randFloat = (min: number, max: number) =>
  min + (randInt(10000) / 10000) * (max - min);

const generateCaptchaText = () =>
  Array.from(
    { length: CAPTCHA_LENGTH },
    () => CAPTCHA_CHARS[randInt(CAPTCHA_CHARS.length)],
  ).join("");

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const dispatch = useAppDispatch();

  // ---------------- CAPTCHA STATE ----------------
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captchaText, setCaptchaText] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  type LoginForm = z.infer<typeof LoginSchema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });

  // Canvas e captcha draw kora
  const drawCaptcha = useCallback((text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Retina / HiDPI screen e sharp rakhar jonno
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CAPTCHA_W * dpr;
    canvas.height = CAPTCHA_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CAPTCHA_W, CAPTCHA_H);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, CAPTCHA_W, CAPTCHA_H);
    bg.addColorStop(0, "#eef4ff");
    bg.addColorStop(0.5, "#f8fbff");
    bg.addColorStop(1, "#e8f2ff");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CAPTCHA_W, CAPTCHA_H);

    // Noise: background dot
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${randInt(160)},${randInt(160)},${randInt(220)},${randFloat(0.15, 0.45)})`;
      ctx.beginPath();
      ctx.arc(
        randFloat(0, CAPTCHA_W),
        randFloat(0, CAPTCHA_H),
        randFloat(0.6, 1.8),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Noise: curve line (text er niche)
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(${randInt(150)},${randInt(150)},${randInt(220)},0.35)`;
      ctx.lineWidth = randFloat(1, 2);
      ctx.beginPath();
      ctx.moveTo(randFloat(0, 30), randFloat(0, CAPTCHA_H));
      ctx.bezierCurveTo(
        randFloat(40, 90),
        randFloat(0, CAPTCHA_H),
        randFloat(110, 160),
        randFloat(0, CAPTCHA_H),
        randFloat(170, CAPTCHA_W),
        randFloat(0, CAPTCHA_H),
      );
      ctx.stroke();
    }

    // Characters
    const slot = CAPTCHA_W / (text.length + 1);
    const palette = ["#1a3a6b", "#2196d3", "#e8590c", "#0b7285", "#862e9c", "#2b8a3e"];
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    text.split("").forEach((ch, i) => {
      const size = Math.round(randFloat(22, 30));
      const x = slot * (i + 1) + randFloat(-4, 4);
      const y = CAPTCHA_H / 2 + randFloat(-4, 4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(randFloat(-0.45, 0.45));
      ctx.transform(1, randFloat(-0.2, 0.2), randFloat(-0.2, 0.2), 1, 0, 0); // skew
      ctx.font = `${randInt(2) ? "bold" : "900"} ${size}px "Courier New", monospace`;
      ctx.fillStyle = palette[randInt(palette.length)];
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });

    // Strike-through wavy lines (text er upore, OCR bot kothate)
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(${randInt(120)},${randInt(120)},${randInt(200)},0.6)`;
      ctx.lineWidth = randFloat(1.2, 2);
      ctx.beginPath();
      const startY = randFloat(10, CAPTCHA_H - 10);
      ctx.moveTo(0, startY);
      for (let x = 0; x <= CAPTCHA_W; x += 10) {
        ctx.lineTo(x, startY + Math.sin(x / randFloat(8, 16) + i) * randFloat(3, 7));
      }
      ctx.stroke();
    }

    // Noise: foreground dot
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(${randInt(120)},${randInt(120)},${randInt(200)},0.5)`;
      ctx.fillRect(randFloat(0, CAPTCHA_W), randFloat(0, CAPTCHA_H), 2, 2);
    }
  }, []);

  const refreshCaptcha = useCallback(
    (errorMessage = "") => {
      const text = generateCaptchaText();
      setCaptchaText(text);
      setCaptchaInput("");
      setCaptchaError(errorMessage);
      drawCaptcha(text);
    },
    [drawCaptcha],
  );

  // Client e-i generate (SSR hydration mismatch ariye cholar jonno)
  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  const onSubmit = async (data: LoginForm) => {
    setError("");

    // Captcha check (API call er age)
    if (!captchaInput.trim()) {
      setCaptchaError("Please enter the captcha");
      return;
    }
    if (captchaInput.trim().toUpperCase() !== captchaText) {
      refreshCaptcha("Captcha does not match. Try a new one.");
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/login", data);
      const token = res.data.token;
      dispatch(tokenSlice.actions.saveToken(token));
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      document.cookie = `${AUTH_TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 2}; SameSite=Lax; Secure`;
      let role: string | undefined;
      try {
        const profileResponse = await axiosInstance.get(
          "/api/login/profile-page",
        );
        const user = profileResponse.data?.user;
        if (user) {
          role = user.role;
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
      const target = role ? ROLE_HOME[role] : undefined;
      if (!target) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0`;
        setError("This portal is only for Admin and Store accounts.");
        refreshCaptcha();
        return;
      }
      router.push(target);
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Login failed. Please try again.",
      );
      // Login fail hole notun captcha
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--brand-blue)";
    e.target.style.boxShadow = "0 0 0 3px rgba(33,150,211,0.12)";
  };

  const blurStyle =
    (hasError: boolean) => (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = hasError ? "#ef4444" : "var(--border)";
      e.target.style.boxShadow = "";
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
          {/* Top accent bar */}
          <div
            className="h-1.5 w-full"
            style={{
              background:
                "linear-gradient(110deg, var(--brand-primary), var(--brand-blue), var(--brand-orange))",
            }}
          />

          <div className="px-5 pt-3 pb-4">
            {/* Logo + Brand */}
            <div className="flex flex-col items-center text-center mb-2">
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
                AMP{" "}
                <span style={{ color: "var(--brand-orange)" }}>
                  Estore Management System
                </span>
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--muted)" }}
              >
                Welcome back 👋 Sign in to continue
              </p>
              <div
                className="w-full h-px mt-2"
                style={{ background: "var(--border)" }}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="mb-2 rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
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
                      height: 40,
                      paddingLeft: 36,
                      paddingRight: 12,
                      border: errors.email
                        ? "1.5px solid #ef4444"
                        : "1.5px solid var(--border)",
                      background: "var(--surface-soft)",
                      color: "var(--foreground)",
                    }}
                    onFocus={focusStyle}
                    onBlur={blurStyle(!!errors.email)}
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
                          height: 40,
                          paddingLeft: 36,
                          paddingRight: 48,
                          border: errors.password
                            ? "1.5px solid #ef4444"
                            : "1.5px solid var(--border)",
                          background: "var(--surface-soft)",
                          color: "var(--foreground)",
                        }}
                        onFocus={focusStyle}
                        onBlur={blurStyle(!!errors.password)}
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

              {/* CAPTCHA */}
              <div>
                <label
                  className="text-sm font-semibold block mb-1"
                  style={{ color: "var(--brand-primary-dark)" }}
                >
                  Security check
                </label>

                <div className="flex items-center gap-2">
                  {/* Canvas wrapper: select / copy / drag / right-click block */}
                  <div
                    className="relative rounded-lg overflow-hidden flex-shrink-0 select-none"
                    style={{
                      width: CAPTCHA_W,
                      maxWidth: "100%",
                      height: CAPTCHA_H,
                      border: "1px solid var(--border)",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                  >
                    <canvas
                      ref={canvasRef}
                      aria-label="Captcha image"
                      draggable={false}
                      style={{
                        width: CAPTCHA_W,
                        height: CAPTCHA_H,
                        display: "block",
                        pointerEvents: "none",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => refreshCaptcha()}
                    title="Refresh captcha"
                    aria-label="Refresh captcha"
                    className="flex items-center justify-center rounded-lg transition-all hover:rotate-180"
                    style={{
                      width: 40,
                      height: 40,
                      minWidth: 40,
                      background: "#fff",
                      border: "1px solid var(--border)",
                      color: "var(--brand-blue)",
                      transitionDuration: "0.4s",
                    }}
                  >
                    <i className="pi pi-refresh" style={{ fontSize: 15 }} />
                  </button>
                </div>

                <div className="relative mt-2">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none"
                    style={{ color: "var(--muted)" }}
                  >
                    🛡️
                  </span>
                  <input
                    id="captcha"
                    type="text"
                    value={captchaInput}
                    onChange={(e) => {
                      setCaptchaInput(e.target.value.toUpperCase());
                      if (captchaError) setCaptchaError("");
                    }}
                    // Paste / copy / cut / drop block: manually type korte hobe
                    onPaste={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    maxLength={CAPTCHA_LENGTH}
                    placeholder="Type the characters shown above"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="w-full rounded-xl text-sm outline-none transition-all"
                    style={{
                      height: 40,
                      paddingLeft: 36,
                      paddingRight: 12,
                      letterSpacing: "0.2em",
                      fontWeight: 600,
                      border: captchaError
                        ? "1.5px solid #ef4444"
                        : "1.5px solid var(--border)",
                      background: "var(--surface-soft)",
                      color: "var(--foreground)",
                    }}
                    onFocus={focusStyle}
                    onBlur={blurStyle(!!captchaError)}
                  />
                </div>
                {captchaError && (
                  <small className="text-red-500 text-xs mt-1 block">
                    ⚠️ {captchaError}
                  </small>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  height: 42,
                  marginTop: 4,
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