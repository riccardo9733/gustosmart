import { getAnalytics, logEvent as fbLogEvent, isSupported } from "firebase/analytics";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import getFirebaseApp from "@/lib/firebase";

let analyticsPromise: Promise<any> | null = null;

// Lazy initialize Firebase Analytics on client side only
const getFbAnalytics = async () => {
  if (typeof window === "undefined") return null;
  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => {
      if (supported) {
        return getAnalytics(getFirebaseApp());
      }
      return null;
    }).catch((err) => {
      console.warn("Analytics initialization failed: ", err);
      return null;
    });
  }
  return analyticsPromise;
};

interface TrackEventParams {
  userId?: string;
  userEmail?: string;
  [key: string]: any;
}

/**
 * Logs an event to GA4/Firebase Analytics and optionally mirrors it to Firestore analytics_events.
 */
export async function trackEvent(eventName: string, params: TrackEventParams = {}) {
  // Check tracking consent
  if (typeof window !== "undefined") {
    const allowTracking = localStorage.getItem("gustosmart_allow_tracking") !== "false";
    if (!allowTracking) {
      return;
    }
  }

  // 1. Log to GA4 (Firebase Analytics) if supported on client
  try {
    const analytics = await getFbAnalytics();
    if (analytics) {
      fbLogEvent(analytics, eventName, params);
    }
  } catch (error) {
    console.error("Error logging to Firebase Analytics: ", error);
  }

  // 2. Mirror event to Supabase SQL database for the admin dashboard
  try {
    const { userId, userEmail, ...eventParams } = params;
    const uid = userId || null;
    const email = userEmail || null;

    const { supabase } = await import("@/lib/supabase");

    if (["recipe_import_initiated", "recipe_import_completed", "recipe_import_failed", "scrapecreators_credits"].includes(eventName)) {
      const status = eventName === "recipe_import_initiated"
        ? "initiated"
        : eventName === "recipe_import_completed"
        ? "completed"
        : eventName === "recipe_import_failed"
        ? "failed"
        : null;

      await supabase.from("ingestion_events").insert({
        event_name: eventName,
        user_id: uid,
        user_email: email,
        platform: (eventParams.source_platform as string) || null,
        status,
        is_cached: eventParams.is_cached_hit === true,
        error_type: (eventParams.error_type as string) || null,
        credits_remaining: typeof eventParams.credits_remaining === "number" ? eventParams.credits_remaining : null,
      });
    } else if (["openrouter_call", "recipe_translated", "recipe_transformed", "dietary_analyzed"].includes(eventName)) {
      await supabase.from("ai_usage_events").insert({
        event_name: eventName,
        user_id: uid,
        user_email: email,
        action_type: (eventParams.type as string) || (eventParams.action_type as string) || eventName,
        model: (eventParams.model as string) || null,
        prompt_tokens: typeof eventParams.prompt_tokens === "number" ? eventParams.prompt_tokens : 0,
        completion_tokens: typeof eventParams.completion_tokens === "number" ? eventParams.completion_tokens : 0,
        cost: typeof eventParams.cost === "number" ? eventParams.cost : 0,
        latency_ms: typeof eventParams.latency === "number" ? eventParams.latency : null,
      });
    } else {
      await supabase.from("engagement_events").insert({
        event_name: eventName,
        user_id: uid,
        user_email: email,
        params: eventParams,
      });
    }
  } catch (error) {
    console.error("Error logging event to Supabase: ", error);
  }
}
