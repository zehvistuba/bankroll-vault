import { useEffect, useCallback } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { app, db } from "../firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function usePushNotifications(user) {
  const isSupported = typeof window !== "undefined"
    && "Notification" in window
    && "serviceWorker" in navigator
    && !!VAPID_KEY;

  const registerToken = useCallback(async () => {
    if (!user || !isSupported) return false;
    try {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        await updateDoc(doc(db, "users", user.uid), { fcmToken: token });
        return true;
      }
    } catch (err) {
      console.warn("FCM token registration failed:", err.message);
    }
    return false;
  }, [user, isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    return registerToken();
  }, [isSupported, registerToken]);

  // Se já tem permissão, atualiza o token silenciosamente
  useEffect(() => {
    if (!user || !isSupported) return;
    if (Notification.permission === "granted") registerToken();
  }, [user]);

  // Notificação em foreground
  useEffect(() => {
    if (!user || !isSupported || Notification.permission !== "granted") return;
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      const title = payload.notification?.title || "Banca Lógica";
      const body = payload.notification?.body || "";
      new Notification(title, { body, icon: "/icon-192x192.png" });
    });
  }, [user, isSupported]);

  return {
    isSupported,
    permission: typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "denied",
    requestPermission,
  };
}
