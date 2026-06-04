"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

/* -------------------------------------------------- */
/*  Types                                             */
/* -------------------------------------------------- */
interface AuthContextValue {
  /** The currently signed-in Firebase user, or `null`. */
  user: User | null;
  /** `true` while Firebase is resolving the initial auth state. */
  loading: boolean;
}

/* -------------------------------------------------- */
/*  Context                                           */
/* -------------------------------------------------- */
const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

/* -------------------------------------------------- */
/*  Provider                                          */
/* -------------------------------------------------- */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const authInstance = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });
      return unsubscribe;
    } catch {
      // Firebase not configured yet (missing API key) — treat as "not authenticated"
      console.warn(
        "[AuthProvider] Firebase is not configured. Auth features will be unavailable until you set the NEXT_PUBLIC_FIREBASE_* env vars in .env.local."
      );
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/* -------------------------------------------------- */
/*  Hook                                              */
/* -------------------------------------------------- */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
