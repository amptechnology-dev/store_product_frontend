"use client";
import { useEffect, useRef } from "react";
import axiosInstance from "@/service/axios.service";
import { getFcmToken, listenForegroundMessages } from "@/service/firebase.service";
import { toast } from "react-toastify";

export const useFcmSetup = (enabled: boolean, onNewNotification: () => void) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!enabled || initialized.current) return;
    initialized.current = true;

    const setup = async () => {
      try {
        const token = await getFcmToken();
        if (token) {
          await axiosInstance.post("/api/notifications/fcm-token", { token });
        }

        await listenForegroundMessages((payload) => {
          toast.info(payload.notification?.body || "New order received");
          onNewNotification();
        });
      } catch (err) {
        console.error("FCM setup failed:", err);
      }
    };

    setup();
  }, [enabled, onNewNotification]);
};