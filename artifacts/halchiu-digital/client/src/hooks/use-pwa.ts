import { useState, useEffect } from "react";

// ── Online / Offline ──────────────────────────────────────────────────────────
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

// ── Service Worker Registration ──────────────────────────────────────────────
export function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(reg => {
        // Check for updates every 60s
        const interval = setInterval(() => reg.update(), 60_000);
        // Background refresh every 5 min
        const refresh = () => reg.active?.postMessage("REFRESH_CACHE");
        const refreshInterval = setInterval(refresh, 5 * 60_000);
        return () => { clearInterval(interval); clearInterval(refreshInterval); };
      })
      .catch(() => {});
  }, []);
}

// ── Platform detection ────────────────────────────────────────────────────────
export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

export function isMobile(): boolean {
  return isIOS() || isAndroid() || /mobi|tablet/i.test(navigator.userAgent);
}

export function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as any).standalone === true)
  );
}

// ── Install Prompt ────────────────────────────────────────────────────────────
const INSTALL_DISMISSED_KEY = "halchiu_install_dismissed_v2";
const INSTALL_SHOWN_KEY = "halchiu_install_shown";

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return;

    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === "true";
    if (dismissed) return;

    const alreadyShown = localStorage.getItem(INSTALL_SHOWN_KEY) === "true";

    if (isIOS()) {
      setPlatform("ios");
      // On iOS, show after a short delay on first visit (no event available)
      if (!alreadyShown) {
        const t = setTimeout(() => {
          setShowPrompt(true);
          localStorage.setItem(INSTALL_SHOWN_KEY, "true");
        }, 4000);
        return () => clearTimeout(t);
      }
    } else if (isAndroid() || isMobile()) {
      setPlatform("android");
    }

    // Chrome / Android: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!alreadyShown) {
        setTimeout(() => {
          setShowPrompt(true);
          localStorage.setItem(INSTALL_SHOWN_KEY, "true");
        }, 3000);
      }
    };
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  const install = async () => {
    if (platform === "ios") {
      // iOS: just dismiss, user follows manual steps
      setShowPrompt(false);
      localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
    if (outcome === "accepted") {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    }
  };

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
  };

  const resetDismissed = () => {
    localStorage.removeItem(INSTALL_DISMISSED_KEY);
    localStorage.removeItem(INSTALL_SHOWN_KEY);
  };

  const isInstalled = isInStandaloneMode();
  const canInstall = !isInstalled && (deferredPrompt !== null || platform === "ios");

  return { showPrompt, install, dismiss, platform, isIOS: platform === "ios", isInstalled, canInstall, resetDismissed, deferredPrompt };
}

// ── Haptic feedback ───────────────────────────────────────────────────────────
export function vibrate(ms: number | number[] = 40) {
  if ("vibrate" in navigator) (navigator as any).vibrate(ms);
}

// ── Web Push Notifications ────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isSupported = typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setIsPushEnabled(!!sub))
    ).catch(() => {});
  }, [isSupported]);

  const requestPush = async () => {
    if (!isSupported || isLoading) return;
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setIsLoading(false); return; }

      const { publicKey } = await fetch("/api/push/public-key").then(r => r.json());
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      setIsPushEnabled(true);
    } catch { /* ignore */ }
    setIsLoading(false);
  };

  const disablePush = async () => {
    if (!isSupported || isLoading) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setIsPushEnabled(false);
    } catch { /* ignore */ }
    setIsLoading(false);
  };

  return { isSupported, isPushEnabled, isLoading, requestPush, disablePush };
}
