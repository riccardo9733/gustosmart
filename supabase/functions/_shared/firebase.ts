import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: Deno.env.get("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: Deno.env.get("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: Deno.env.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: Deno.env.get("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: Deno.env.get("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: Deno.env.get("NEXT_PUBLIC_FIREBASE_APP_ID"),
  measurementId: Deno.env.get("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
