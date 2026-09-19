"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import axiosInstance from "@/service/axios.service";

const forgotPasswordSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [successMessage, setSuccessMessage] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ForgotPasswordForm>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = async (data: ForgotPasswordForm) => {
		setSuccessMessage("");
		setErrorMessage("");
		setLoading(true);

		try {
			const res = await axiosInstance.post("/api/login/reset-password-link", {
				email: data.email,
			});

			setSuccessMessage(
				res.data?.message || "Password reset email sent. Please check your email."
			);
		} catch (error: any) {
			setErrorMessage(
				error?.response?.data?.message ||
					"Failed to send password reset email. Please try again."
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
			<section style={{ width: "100%", maxWidth: 520 }}>
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
								<h3 style={{ margin: 0, color: "#072033", fontSize: 26 }}>
									Reset Password
								</h3>
								<p style={{ marginTop: 6, marginBottom: 0, color: "#64748b", fontSize: 15 }}>
									Enter your email to receive a password reset link.
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
								<i className="pi pi-envelope" aria-hidden="true" style={{ color: "#023040", fontSize: 19 }} />
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
									htmlFor="email"
									style={{ display: "block", fontWeight: 600, marginBottom: 7, color: "#334155" }}
								>
									Email
								</label>
								<InputText
									id="email"
									type="email"
									{...register("email")}
									placeholder="Please enter email address"
									autoComplete="email"
									style={{ width: "100%" }}
									className={errors.email ? "p-invalid" : ""}
								/>
								{errors.email && (
									<small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
										{errors.email.message}
									</small>
								)}
							</div>

							<Button
								type="submit"
								label={loading ? "Sending reset link..." : "Send reset link"}
								icon="pi pi-send"
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
