import { initializeApp, getApps } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let messagingInstance: Messaging | null = null;

const getMessagingInstance = async (): Promise<Messaging | null> => {
  const supported = await isSupported();
  if (!supported) return null;
  if (!messagingInstance) messagingInstance = getMessaging(app);
  return messagingInstance;
};

export const getFcmToken = async (): Promise<string | null> => {
  try {
    if (typeof window === "undefined") return null;
    if (!("serviceWorker" in navigator)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (err) {
    console.error("getFcmToken error:", err);
    return null;
  }
};

export const listenForegroundMessages = async (
  callback: (payload: any) => void,
) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  onMessage(messaging, callback);
};
