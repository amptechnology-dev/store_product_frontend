importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyD-4N-auUD63hw6m962oT14RT6S-RyC-F0",
  authDomain: "amp-product-management.firebaseapp.com",
  projectId: "amp-product-management",
  storageBucket: "amp-product-management.firebasestorage.app",
  messagingSenderId: "533323927383",
  appId: "1:533323927383:web:c1fd169f88158630e87812",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "New Order", {
    body: body || "",
    icon: "/logo.png",
    data: payload.data,
  });
});

// notification click করলে dashboard order page এ নিয়ে যাবে
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const orderId = event.notification.data?.orderId;
  const url = orderId ? `/dashboard/orders/${orderId}` : "/dashboard/orders";
  event.waitUntil(clients.openWindow(url));
});
