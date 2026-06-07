import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setUserStart,
  setUserSuccess,
  setUserFailure,
  clearUser,
  selectUserProfile,
} from "@/store/userSlice";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export function useSyncUser() {
  const { user, loading: authLoading } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      dispatch(clearUser());
      return;
    }

    dispatch(setUserStart());
    const db = getFirebaseDb();
    const docRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const dbLang = data.preferences?.language || "it";

          // Sincronizza cookie NEXT_LOCALE se differisce
          const cookiesMatch = document.cookie.match(/(^|;)\s*NEXT_LOCALE\s*=\s*([^;]+)/);
          const currentCookie = cookiesMatch ? cookiesMatch[2] : null;
          if (currentCookie !== dbLang) {
            document.cookie = `NEXT_LOCALE=${dbLang}; path=/; max-age=31536000; SameSite=Lax`;
            window.location.reload();
            return;
          }

          dispatch(
            setUserSuccess({
              uid: data.uid || user.uid,
              email: data.email || user.email || "",
              displayName: data.displayName || user.displayName || "Chef Gusto",
              photoURL: data.photoURL || user.photoURL || null,
              preferences: {
                language: dbLang,
                measurementSystem: data.preferences?.measurementSystem || "metric",
              },
              tokens: typeof data.tokens === "number" ? data.tokens : 10,
              createdAt: data.createdAt ? (typeof data.createdAt.toDate === "function" ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
              updatedAt: data.updatedAt ? (typeof data.updatedAt.toDate === "function" ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
            })
          );
        } else {
          // Fallback profile if Firestore document does not exist yet (e.g. sync lag or initial creation in progress)
          const dbLang = "it";
          const cookiesMatch = document.cookie.match(/(^|;)\s*NEXT_LOCALE\s*=\s*([^;]+)/);
          const currentCookie = cookiesMatch ? cookiesMatch[2] : null;
          if (currentCookie !== dbLang) {
            document.cookie = `NEXT_LOCALE=${dbLang}; path=/; max-age=31536000; SameSite=Lax`;
            window.location.reload();
            return;
          }

          dispatch(
            setUserSuccess({
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || "Chef Gusto",
              photoURL: user.photoURL || null,
              preferences: {
                language: dbLang,
                measurementSystem: "metric",
              },
              tokens: 10,
              createdAt: null,
              updatedAt: null,
            })
          );
        }
      },
      (err) => {
        dispatch(setUserFailure(err.message || "Failed to fetch user profile."));
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, dispatch]);
}
