"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    const isSecureOrigin = window.location.protocol === "https:" || isLocalhost;
    if (!isSecureOrigin) {
      console.warn("Skipping service worker registration on insecure origin:", window.location.origin);
      return;
    }

    const registerWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });
        console.log("Service worker registered:", registration);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              console.log("New service worker installed. Current page will use it on reload.");
            }
          });
        });

        if (navigator.serviceWorker.controller) {
          registration.update().catch((error) => {
            console.warn("Service worker update check failed:", error);
          });
        }
      } catch (error) {
        console.warn("Service worker registration failed:", error);
      }
    };

    registerWorker();
  }, []);

  return null;
}
