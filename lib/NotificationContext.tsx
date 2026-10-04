"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import axiosInstance from "@/service/axios.service";
import {
  getFcmToken,
  listenForegroundMessages,
} from "@/service/firebase.service";
import { toast } from "react-toastify";

export interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  orderId: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
  deleteOne: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export const NotificationProvider: React.FC<{
  enabled: boolean;
  children: React.ReactNode;
}> = ({ enabled, children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const fcmInitialized = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await axiosInstance.get("/api/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("fetchNotifications:", err);
    }
  }, [enabled]);

  // initial fetch + polling fallback (push fail korleo count sync thakbe)
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const interval = setInterval(refresh, 45000);
    return () => clearInterval(interval);
  }, [enabled, refresh]);

  // FCM setup — ekbar e initialize hobe
  useEffect(() => {
    if (!enabled || fcmInitialized.current) return;
    fcmInitialized.current = true;

    (async () => {
      try {
        const token = await getFcmToken();
        if (token) {
          await axiosInstance.post("/api/notifications/fcm-token", { token });
        }
        await listenForegroundMessages((payload) => {
          toast.info(payload.notification?.body || "New order received");
          refresh();
        });
      } catch (err) {
        console.error("FCM setup failed:", err);
      }
    })();
  }, [enabled, refresh]);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    try {
      setLoading(true);
      await axiosInstance.patch("/api/notifications/read");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("markAllRead:", err);
    } finally {
      setLoading(false);
    }
  }, [unreadCount]);

  const markOneRead = useCallback(async (id: string) => {
    try {
      await axiosInstance.patch("/api/notifications/read", {
        notificationIds: [id],
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("markOneRead:", err);
    }
  }, []);

  // ekta notification delete
  const deleteOne = useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n._id === id);
      try {
        await axiosInstance.delete(`/api/notifications/clear-single/${id}`);
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        if (target && !target.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        // list e limit (20) ache, tai purono notification gulo backfill korte refresh
        refresh();
      } catch (err) {
        console.error("deleteOne:", err);
        toast.error("Failed to delete notification");
      }
    },
    [notifications, refresh],
  );

  // sob notification delete
  const clearAll = useCallback(async () => {
    if (notifications.length === 0) return;
    try {
      setLoading(true);
      await axiosInstance.delete("/api/notifications/clear-all");
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications cleared");
    } catch (err) {
      console.error("clearAll:", err);
      toast.error("Failed to clear notifications");
    } finally {
      setLoading(false);
    }
  }, [notifications.length]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refresh,
        markAllRead,
        markOneRead,
        deleteOne,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      refresh: async () => {},
      markAllRead: async () => {},
      markOneRead: async () => {},
      deleteOne: async () => {},
      clearAll: async () => {},
    } as NotificationContextValue;
  }
  return ctx;
};