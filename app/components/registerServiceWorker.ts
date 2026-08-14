"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    // Only register service worker in production to avoid serving cached
    // dev bundles during local development which can cause runtime module
    // mismatches and intermittent errors on reload.
    if (process.env.NODE_ENV !== "production") return;
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
        // If there's an updated worker waiting, ask it to skipWaiting so it activates immediately
        if (registration.waiting) {
          try {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          } catch (e) {
            console.warn("Failed to postMessage to waiting service worker", e);
          }
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              // If a new worker was installed, tell it to activate and then reload when controller changes
              if (registration.waiting) {
                try {
                  registration.waiting.postMessage({ type: "SKIP_WAITING" });
                } catch (e) {
                  console.warn("Failed to postMessage to waiting service worker", e);
                }
              }
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          // When the new service worker takes control, reload to load fresh assets
          window.location.reload();
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
