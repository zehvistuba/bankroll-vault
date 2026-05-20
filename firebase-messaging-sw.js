importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAUKEC49_R4NAYMcn0VmDA4tnMqQvuxHeQ",
  authDomain: "banca-logica.firebaseapp.com",
  projectId: "banca-logica",
  storageBucket: "banca-logica.firebasestorage.app",
  messagingSenderId: "257701858814",
  appId: "1:257701858814:web:0aa9047e0ea07f01f244af",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Banca Lógica";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192x192.png",
    badge: "/favicon-64.png",
    data: { url: payload.fcmOptions?.link || "/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
