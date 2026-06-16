"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile } from "@/store/userSlice";

export function BetterStackScript() {
  const profile = useAppSelector(selectUserProfile);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Check tracking consent
  const dbAllowTracking = profile?.preferences?.allowTracking !== false;
  const localAllowTracking = typeof window !== "undefined" ? localStorage.getItem("gustosmart_allow_tracking") !== "false" : true;
  const allowTracking = profile?.preferences?.hasOwnProperty("allowTracking") ? dbAllowTracking : localAllowTracking;

  useEffect(() => {
    if (!mounted) return;

    if (allowTracking) {
      const b = window as any;
      const e = document;
      const t = "betterstack";
      const r = "yX8MD8d7vZuGCkKMYb9QYW2P";

      b[t] = b[t] || function(...args: any[]) {
        (b[t].q = b[t].q || []).push(args);
      };
      b[t].l = +new Date();

      // Check if script is already present
      if (!e.getElementById("betterstack-script")) {
        const s = e.createElement("script");
        s.id = "betterstack-script";
        s.async = true;
        s.crossOrigin = "anonymous";
        s.src = "https://betterstack.net/b.js?t=" + r;
        (e.head || e.getElementsByTagName("head")[0]).appendChild(s);

        b[t]("init", { environment: "production" });
      }
    } else {
      // If tracking is disabled, remove script if it exists
      const script = document.getElementById("betterstack-script");
      if (script) {
        script.remove();
      }
      const b = window as any;
      if (b.betterstack) {
        delete b.betterstack;
      }
    }
  }, [allowTracking, mounted]);

  return null;
}
