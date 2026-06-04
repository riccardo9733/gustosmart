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
import { doc, getDoc } from "firebase/firestore";

export function useSyncUser() {
  const { user, loading: authLoading } = useAuth();
  const dispatch = useAppDispatch();
  const reduxProfile = useAppSelector(selectUserProfile);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      dispatch(clearUser());
      return;
    }

    // Fetch profile if it's not loaded, or belongs to another user
    if (!reduxProfile || reduxProfile.uid !== user.uid) {
      const fetchProfile = async () => {
        dispatch(setUserStart());
        try {
          const db = getFirebaseDb();
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            dispatch(
              setUserSuccess({
                uid: data.uid || user.uid,
                email: data.email || user.email || "",
                displayName: data.displayName || user.displayName || "Chef Gusto",
                photoURL: data.photoURL || user.photoURL || null,
                preferences: {
                  language: data.preferences?.language || "it",
                  measurementSystem: data.preferences?.measurementSystem || "metric",
                },
                createdAt: data.createdAt ? (typeof data.createdAt.toDate === "function" ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
                updatedAt: data.updatedAt ? (typeof data.updatedAt.toDate === "function" ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
              })
            );
          } else {
            // Fallback profile if Firestore document does not exist yet (e.g. sync lag or initial creation in progress)
            dispatch(
              setUserSuccess({
                uid: user.uid,
                email: user.email || "",
                displayName: user.displayName || "Chef Gusto",
                photoURL: user.photoURL || null,
                preferences: {
                  language: "it",
                  measurementSystem: "metric",
                },
                createdAt: null,
                updatedAt: null,
              })
            );
          }
        } catch (err: any) {
          dispatch(setUserFailure(err.message || "Failed to fetch user profile."));
        }
      };

      fetchProfile();
    }
  }, [user, authLoading, reduxProfile, dispatch]);
}
