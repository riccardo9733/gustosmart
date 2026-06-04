import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Lazy-initialize the Firebase app so that importing this module during
 * server-side prerendering (when env vars may be empty) doesn't crash the
 * build. The actual initialization happens on the first client-side call.
 */
function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function lazyAuth(): Auth {
  return getAuth(getFirebaseApp());
}

function lazyDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

function lazyStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

export { lazyAuth as getFirebaseAuth, lazyDb as getFirebaseDb, lazyStorage as getFirebaseStorage };
export default getFirebaseApp;
