"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { createUserSchema, updateUserSchema } from "@/helper/schema/Schema";

type CreateUserFormData = z.infer<typeof createUserSchema>;
type UpdateUserFormData = z.infer<typeof updateUserSchema>;

type UserFormProps = {
    userId: string | null;
    onClose: () => void;
    onSuccess: () => void;
};

const roleOptions = [
    { label: "Manager", value: "MANAGER" },
    { label: "Cashier", value: "CASHIER" },
    { label: "Accountant", value: "ACCOUNTANT" },
];

// Shift field removed from UI — kept out of form controls

function UserForm({ userId, onClose, onSuccess }: UserFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const isEditMode = !!userId;

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreateUserFormData | UpdateUserFormData>({
        resolver: zodResolver(isEditMode ? updateUserSchema : createUserSchema),
        defaultValues: isEditMode
            ? {
                name: "",
                email: "",
                phone: "",
                role: "CASHIER",
                shiftType: "MORNING",
                isActive: true,
            }
            : {
                name: "",
                email: "",
                phone: "",
                password: "",
                role: "CASHIER",
                shiftType: "MORNING",
            },
    });

    // Fetch user data if editing
    useEffect(() => {
        if (userId) {
            fetchUserData();
        }
    }, [userId]);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/api/register/single-user/${userId}`);
            const user = res.data.user;

            // Populate form with user data
            setValue("name", user.name);
            setValue("email", user.email);
            setValue("phone", user.phone);
            setValue("role", user.role);
            setValue("shiftType", user.shiftType);
            if (isEditMode) {
                setValue("isActive", user.isActive);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch user data");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CreateUserFormData | UpdateUserFormData) => {
        setIsSubmitting(true);
        try {
            const url = isEditMode
                ? `/api/register/update-user/${userId}`
                : `/api/register/create-user-for-admin`;

            const method = isEditMode ? 'put' : 'post';

            const res = await axiosInstance[method](url, data);

            toast.success(res.data.message || `User ${isEditMode ? 'updated' : 'created'} successfully!`);
            reset();
            onSuccess();
        } catch (error: any) {
            console.error("User operation error:", error);
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} user`);
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
        <div className="px-4 pt-2 pb-4 max-h-[70vh] overflow-auto">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Personal Information */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <i className="pi pi-user text-blue-600"></i>
                        Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Full Name */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-user text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("name")}
                                    placeholder="Enter full name"
                                    onKeyDown={(e: any) => {
                                        const input = e.currentTarget as HTMLInputElement;
                                        const start = input.selectionStart ?? 0;

                                        // prevent leading space
                                        if (e.key === " ") {
                                            const prefix = input.value.substring(0, start);
                                            if (start === 0 || prefix.trim().length === 0) {
                                                e.preventDefault();
                                            }
                                        }

                                        // prevent numbers
                                        if (e.key >= "0" && e.key <= "9") {
                                            e.preventDefault();
                                        }
                                    }}
                                    onPaste={(e: any) => {
                                        e.preventDefault();
                                        const pastedText = e.clipboardData.getData("text");
                                        const textWithoutNumbers = pastedText.replace(/[0-9]/g, "");
                                        const cleanedInsert = textWithoutNumbers.replace(/^\s+/, "");
                                        const input = e.target as HTMLInputElement;
                                        const start = input.selectionStart || 0;
                                        const end = input.selectionEnd || 0;
                                        const currentValue = input.value;
                                        const newValue =
                                            currentValue.substring(0, start) +
                                            cleanedInsert +
                                            currentValue.substring(end);
                                        const normalized = newValue.replace(/^\s+/, "");
                                        input.value = normalized;
                                        setValue("name", normalized);
                                        input.dispatchEvent(new Event("input", { bubbles: true }));
                                    }}
                                />
                            </div>
                            {errors.name && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.name.message}
                                </small>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-envelope text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("email")}
                                    placeholder="Enter email address"
                                />
                            </div>
                            {errors.email && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.email.message}
                                </small>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <div className="p-inputgroup">
                                <span className="p-inputgroup-addon bg-blue-50">
                                    <i className="pi pi-phone text-blue-600"></i>
                                </span>
                                <InputText
                                    className="w-full"
                                    {...register("phone")}
                                    placeholder="Enter phone number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    onKeyDown={(e) => {
                                        if (e.ctrlKey || e.metaKey || e.altKey) return;
                                        const allowed = ["Backspace", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete", "Tab", "Home", "End"];
                                        if (allowed.includes(e.key)) return;
                                        if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                                    }}
                                />
                            </div>
                            {errors.phone && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.phone.message}
                                </small>
                            )}
                        </div>

                        {/* Password - Only for Add Mode */}
                        {!isEditMode && (
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <Controller
                                    name={"password" as any}
                                    control={control}
                                    render={({ field }) => {
                                        const [showPassword, setShowPassword] = React.useState(false);
                                        const generatePassword = () => {
                                            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789@#_$%&*';
                                            let pass = '';
                                            for (let i = 0; i < 6; i++) {
                                                pass += chars.charAt(Math.floor(Math.random() * chars.length));
                                            }
                                            field.onChange(pass);
                                            setShowPassword(true);
                                        };

                                        return (
                                            <>
                                                <div className="p-inputgroup">
                                                    <span className="p-inputgroup-addon bg-blue-50">
                                                        <i className="pi pi-lock text-blue-600"></i>
                                                    </span>
                                                    <InputText
                                                        {...field}
                                                        type={showPassword ? 'text' : 'password'}
                                                        className="w-full"
                                                        placeholder="Enter password"
                                                    />
                                                    <Button
                                                        type="button"
                                                        icon="pi pi-refresh"
                                                        onClick={generatePassword}
                                                        className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 p-2"
                                                        tooltip="Generate password"
                                                        tooltipOptions={{ position: 'top' }}
                                                    />
                                                </div>
                                                {(errors as any).password && (
                                                    <small className="text-red-500 flex items-center gap-1">
                                                        <i className="pi pi-exclamation-circle"></i>
                                                        {(errors as any).password.message}
                                                    </small>
                                                )}
                                            </>
                                        );
                                    }}
                                />
                            </div>
                        )}

                        {/* Role */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <Controller
                                name="role"
                                control={control}
                                render={({ field }) => (
                                    <Dropdown
                                        {...field}
                                        options={roleOptions}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select role"
                                        className="w-full"
                                    />
                                )}
                            />
                            {errors.role && (
                                <small className="text-red-500 flex items-center gap-1">
                                    <i className="pi pi-exclamation-circle"></i>
                                    {errors.role.message}
                                </small>
                            )}
                        </div>

                        {/* Shift field removed from UI */}
                    </div>

                    {/* Active Status - Only for Edit Mode */}
                    {isEditMode && (
                        <div className="flex items-center gap-2 mt-3">
                            <Controller
                                name="isActive"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        inputId="isActive"
                                        checked={field.value ?? false}
                                        onChange={(e) => field.onChange(e.checked)}
                                    />
                                )}
                            />
                            <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 cursor-pointer">
                                Active User
                            </label>
                        </div>
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
                        label={isSubmitting ? "Saving..." : isEditMode ? "Update User" : "Create User"}
                        icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </div>
    );
}

export default UserForm;