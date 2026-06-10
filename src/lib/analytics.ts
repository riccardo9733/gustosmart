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
  // 1. Log to GA4 (Firebase Analytics) if supported on client
  try {
    const analytics = await getFbAnalytics();
    if (analytics) {
      fbLogEvent(analytics, eventName, params);
    }
  } catch (error) {
    console.error("Error logging to Firebase Analytics: ", error);
  }

  // 2. Mirror event to Firestore analytics_events for the admin dashboard
  try {
    if (typeof window !== "undefined") {
      const db = getFirebaseDb();
      const analyticsCol = collection(db, "analytics_events");
      
      const { userId, userEmail, ...eventParams } = params;
      
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + 7);
      
      await addDoc(analyticsCol, {
        eventName,
        params: eventParams,
        userId: userId || null,
        userEmail: userEmail || null,
        timestamp: serverTimestamp(),
        expireAt,
      });
    }
  } catch (error) {
    console.error("Error mirroring event to Firestore: ", error);
  }
}
