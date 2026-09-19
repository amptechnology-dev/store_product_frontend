"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import axiosInstance from "@/service/axios.service";

const resetPasswordSchema = z
	.object({
		password: z.string().min(6, "Password must be at least 6 characters"),
		confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match",
	});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
	const router = useRouter();
	const params = useParams<{ userId: string; token: string }>();

	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [successMessage, setSuccessMessage] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

	const {
		control,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<ResetPasswordForm>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	});

	const onSubmit = async (data: ResetPasswordForm) => {
		setSuccessMessage("");
		setErrorMessage("");
		setLoading(true);

		try {
			const userId = params?.userId;
			const token = params?.token;

			if (!userId || !token) {
				setErrorMessage("Invalid reset password link.");
				return;
			}

			const endpoint = `/api/login/forget-password/${userId}/${token}`;
			const res = await axiosInstance.post(endpoint, {
				password: data.password,
				confirmPassword: data.confirmPassword,
			});

			setSuccessMessage(res.data?.message || "Password reset successfully");
			reset();
		} catch (error: any) {
			setErrorMessage(
				error?.response?.data?.message ||
					"Failed to reset password. The link may be expired or invalid."
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<main
			style={{
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "20px 14px",
				background:
					"radial-gradient(900px 480px at 8% 12%, rgba(16,80,102,0.14), transparent 60%), radial-gradient(800px 420px at 88% 88%, rgba(3,87,74,0.11), transparent 60%), linear-gradient(160deg,#f3f7fb 0%, #edf4fb 42%, #e9f3f2 100%)",
			}}
		>
			<section style={{ width: "100%", maxWidth: 560 }}>
				<Card
					style={{
						borderRadius: 16,
						overflow: "hidden",
						border: "1px solid #dde7f0",
						boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
						background: "linear-gradient(180deg,#ffffff,#f9fbfe)",
					}}
				>
					<div style={{ padding: 22 }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 12,
							}}
						>
							<div>
								<h3 style={{ margin: 0, color: "#072033", fontSize: 26 }}>Set New Password</h3>
								<p style={{ marginTop: 6, marginBottom: 0, color: "#64748b", fontSize: 15 }}>
									Enter your new password to complete reset.
								</p>
							</div>
							<div
								style={{
									width: 48,
									height: 48,
									borderRadius: 12,
									display: "grid",
									placeItems: "center",
									background: "rgba(2,48,64,0.07)",
									border: "1px solid rgba(2,48,64,0.12)",
								}}
							>
								<i className="pi pi-lock" aria-hidden="true" style={{ color: "#023040", fontSize: 19 }} />
							</div>
						</div>

						{errorMessage && (
							<div style={{ marginTop: 14 }}>
								<Message severity="error" text={errorMessage} />
							</div>
						)}

						{successMessage && (
							<div style={{ marginTop: 14 }}>
								<Message severity="success" text={successMessage} />
							</div>
						)}

						<form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: 18, display: "grid", gap: 14 }}>
							<div>
								<label
									htmlFor="password"
									style={{ display: "block", fontWeight: 600, marginBottom: 7, color: "#334155" }}
								>
									New Password
								</label>
								<Controller
									name="password"
									control={control}
									render={({ field }) => (
										<div style={{ position: "relative", width: "100%" }}>
											<InputText
												id="password"
												type={showPassword ? "text" : "password"}
												value={field.value}
												onChange={(e) => field.onChange(e.target.value)}
												placeholder="Enter new password"
												autoComplete="new-password"
												style={{ width: "100%", paddingRight: 42 }}
												className={errors.password ? "p-invalid" : ""}
											/>
											<button
												type="button"
												onClick={() => setShowPassword((prev) => !prev)}
												aria-label={showPassword ? "Hide password" : "Show password"}
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
												}}
											>
												<i className={`pi ${showPassword ? "pi-eye-slash" : "pi-eye"}`} aria-hidden="true" />
											</button>
										</div>
									)}
								/>
								{errors.password && (
									<small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
										{errors.password.message}
									</small>
								)}
							</div>

							<div>
								<label
									htmlFor="confirmPassword"
									style={{ display: "block", fontWeight: 600, marginBottom: 7, color: "#334155" }}
								>
									Confirm Password
								</label>
								<Controller
									name="confirmPassword"
									control={control}
									render={({ field }) => (
										<div style={{ position: "relative", width: "100%" }}>
											<InputText
												id="confirmPassword"
												type={showConfirmPassword ? "text" : "password"}
												value={field.value}
												onChange={(e) => field.onChange(e.target.value)}
												placeholder="Confirm your password"
												autoComplete="new-password"
												style={{ width: "100%", paddingRight: 42 }}
												className={errors.confirmPassword ? "p-invalid" : ""}
											/>
											<button
												type="button"
												onClick={() => setShowConfirmPassword((prev) => !prev)}
												aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
												}}
											>
												<i
													className={`pi ${showConfirmPassword ? "pi-eye-slash" : "pi-eye"}`}
													aria-hidden="true"
												/>
											</button>
										</div>
									)}
								/>
								{errors.confirmPassword && (
									<small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
										{errors.confirmPassword.message}
									</small>
								)}
							</div>

							<Button
								type="submit"
								label={loading ? "Resetting password..." : "Reset Password"}
								icon="pi pi-check"
								loading={loading}
								className="p-button-primary"
								style={{ width: "100%", fontWeight: 700, padding: "11px 14px" }}
							/>
						</form>

						<div style={{ marginTop: 12, textAlign: "center" }}>
							<Button
								type="button"
								label="Back to Login"
								icon="pi pi-arrow-left"
								className="p-button-text"
								onClick={() => router.push("/login")}
							/>
						</div>
					</div>
				</Card>
			</section>
		</main>
	);
}
