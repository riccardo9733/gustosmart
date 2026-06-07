"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { X, Smartphone } from "lucide-react";

interface PWAContextValue {
  /** True if the app is running in standalone mode (installed) */
  isInstalled: boolean;
  /** True if the installation can be triggered (either deferred prompt exists or iOS in browser) */
  canInstall: boolean;
  /** True if the user is on an iOS device */
  isIos: boolean;
  /** True if we should display the iOS installation guide modal */
  showIosInstructions: boolean;
  setShowIosInstructions: (show: boolean) => void;
  /** Method to trigger the installation prompt */
  installApp: () => Promise<void>;
  /** True if the user dismissed the installation banner */
  isDismissed: boolean;
  /** Method to dismiss the installation banner */
  dismissPrompt: () => void;
}

const PWAContext = createContext<PWAContextValue>({
  isInstalled: false,
  canInstall: false,
  isIos: false,
  showIosInstructions: false,
  setShowIosInstructions: () => {},
  installApp: async () => {},
  isDismissed: false,
  dismissPrompt: () => {},
});

export function PWAProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("Login");
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandaloneMode);
    };

    checkStandalone();

    // 2. Check device type (iOS)
    const checkIos = () => {
      const userAgent = window.navigator.userAgent || "";
      const isIosDevice =
        /iPad|iPhone|iPod/.test(userAgent) ||
        (userAgent.includes("Mac") && "ontouchend" in document);
      setIsIos(isIosDevice);
    };

    checkIos();

    // 3. Check dismiss state in localStorage
    const dismissed = localStorage.getItem("pwa_install_dismissed") === "true";
    setIsDismissed(dismissed);

    // 4. Listen to standard beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 5. Listen to appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Register manual service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (isIos) {
      // iOS doesn't support native prompt, show helper instructions modal
      setShowIosInstructions(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const dismissPrompt = () => {
    setIsDismissed(true);
    localStorage.setItem("pwa_install_dismissed", "true");
  };

  const canInstall = !isInstalled && (deferredPrompt !== null || isIos);

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        canInstall,
        isIos,
        showIosInstructions,
        setShowIosInstructions,
        installApp,
        isDismissed,
        dismissPrompt,
      }}
    >
      {children}
      
      {/* iOS Installation Instructions Modal */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm rounded-[32px] bg-background p-6 shadow-2xl border border-white/20 dark:border-white/10 animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowIosInstructions(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Content */}
            <div className="text-center space-y-5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl terracotta-gradient shadow-lg shadow-primary/20">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                {t("pwaIosGuideTitle")}
              </h3>
              
              {/* Dynamic steps from translated content */}
              <div className="text-sm text-muted-foreground text-left space-y-4 leading-relaxed">
                {t("pwaIosGuideDesc").split("\n").map((line, idx) => (
                  <div key={idx} className="flex gap-3.5 items-start">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 text-primary font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-foreground/90 font-medium">
                      {line.replace(/^\d+\.\s*/, "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
}
