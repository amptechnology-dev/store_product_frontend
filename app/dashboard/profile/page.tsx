"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { Button } from "primereact/button";
import axiosInstance from "@/service/axios.service";

type ProfileUser = {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
    updatedAt: string;
};

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [user, setUser] = useState<ProfileUser | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const res = await axiosInstance.get("/api/login/profile-page");
            setUser(res.data?.user || null);
        } catch (error: any) {
            setErrorMessage(error?.response?.data?.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const initials = useMemo(() => {
        if (!user?.name) return "U";
        const parts = user.name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }, [user]);

    const formatDateTime = (dateValue?: string) => {
        if (!dateValue) return "-";
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString();
    };

    const roleLabel = (role?: string) => {
        if (!role) return "-";
        return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    };

    if (loading) {
        return (
            <div className="w-full flex justify-center items-center py-12">
                <i className="pi pi-spin pi-spinner text-4xl text-blue-600"></i>
            </div>
        );
    }

    return (
        <main className="w-full p-4 md:p-6">
            <div className="w-full max-w-5xl mx-auto space-y-4">
                <div className="rounded-xl overflow-hidden border border-blue-200 shadow-sm bg-gradient-to-r from-blue-500 to-indigo-600 p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
                                <i className="pi pi-id-card text-white text-2xl"></i>
                            </div>
                            <div>
                                <h1 className="text-white text-2xl font-bold">Welcome {user?.name || "User"}</h1>
                                <p className="text-white/90 text-sm">Professional account overview and identity details</p>
                            </div>
                        </div>
                    </div>
                </div>

                {errorMessage && <Message severity="error" text={errorMessage} />}

                <Card className="border border-gray-200 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
                        <div className="rounded-xl border border-gray-200 bg-slate-50 p-5 flex flex-col items-center text-center">
                            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold flex items-center justify-center shadow-md">
                                {initials}
                            </div>
                            <h2 className="mt-3 text-lg font-bold text-gray-800">{user?.name || "-"}</h2>
                            <p className="text-sm text-gray-500">{user?.email || "-"}</p>

                            <div className="mt-4 w-full">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                                    <i className="pi pi-verified"></i>
                                    {roleLabel(user?.role)} Account
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-lg border border-gray-200 bg-white p-4">
                                    <div className="text-xs font-semibold text-gray-500 uppercase">Full Name</div>
                                    <div className="mt-1 text-base font-semibold text-gray-800">{user?.name || "-"}</div>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-4">
                                    <div className="text-xs font-semibold text-gray-500 uppercase">Email Address</div>
                                    <div className="mt-1 text-base font-semibold text-gray-800">{user?.email || "-"}</div>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-4">
                                    <div className="text-xs font-semibold text-gray-500 uppercase">Phone Number</div>
                                    <div className="mt-1 text-base font-semibold text-gray-800">{user?.phone || "-"}</div>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-4">
                                    <div className="text-xs font-semibold text-gray-500 uppercase">Role</div>
                                    <div className="mt-1 text-base font-semibold text-gray-800">{roleLabel(user?.role)}</div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <div className="text-xs font-semibold text-blue-700 uppercase">Account Timeline</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                    <div>
                                        <div className="text-sm text-blue-900 font-medium">Created At</div>
                                        <div className="text-sm text-blue-700">{formatDateTime(user?.createdAt)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-blue-900 font-medium">Last Updated</div>
                                        <div className="text-sm text-blue-700">{formatDateTime(user?.updatedAt)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </main>
    );
}
