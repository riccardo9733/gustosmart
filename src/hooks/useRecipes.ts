"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useAuth } from "@/contexts/auth-context";
import {
  getUserRecipeOverrides,
  getGlobalRecipe,
  getUserRecipeOverride,
  addToUserRecipes,
  removeFromUserRecipes,
  saveUserRecipeCustomizations,
  mergeRecipe,
  type MergedRecipe,
  type Ingredient,
  type GlobalRecipe,
} from "@/lib/firestore/recipes";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const recipeKeys = {
  all: (userId: string) => ["recipes", userId] as const,
  detail: (userId: string, recipeId: string) => ["recipes", userId, recipeId] as const,
};

// ---------------------------------------------------------------------------
// useRecipes — lista del ricettario personale dell'utente
// ---------------------------------------------------------------------------

/**
 * Fetches all recipes in the user's personal collection.
 * Strategy:
 * 1. getDocs on /users/{uid}/recipes/ (all user's recipe references)
 * 2. For each ref, getDoc on /recipes/{id} (global recipe data)
 *    — TanStack Query deduplicates if a recipe detail was already fetched.
 * 3. Merge global + personal override into MergedRecipe[]
 *
 * staleTime: 5 minutes (from defaultOptions) — no re-fetch on navigation.
 */
export function useRecipes() {
  const { user } = useAuth();

  return useQuery<MergedRecipe[]>({
    queryKey: recipeKeys.all(user?.uid ?? ""),
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      // 1. Fetch all personal override docs (one query, returns only refs + customizations)
      const overrides = await getUserRecipeOverrides(user.uid);
      if (overrides.length === 0) return [];

      // 2. Fetch all global recipe docs in parallel
      const globals = await Promise.all(
        overrides.map((o) => getGlobalRecipe(o.recipeId))
      );

      // 3. Merge and sort by addedAt descending
      const merged: MergedRecipe[] = overrides
        .map((override, idx) => {
          const global = globals[idx];
          if (!global) return null;
          return mergeRecipe(global, override);
        })
        .filter((r): r is MergedRecipe => r !== null)
        .sort((a, b) => {
          const aMs = a.addedAt?.toMillis?.() ?? 0;
          const bMs = b.addedAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });

      return merged;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useRecipe — dettaglio singola ricetta (merge globale + override personale)
// ---------------------------------------------------------------------------

/**
 * Fetches a single merged recipe for the current user.
 * Uses getDoc (one-shot) instead of onSnapshot to avoid open WebSocket connections.
 * staleTime: 10 minutes for the detail view.
 */
export function useRecipe(recipeId: string) {
  const { user } = useAuth();

  return useQuery<MergedRecipe | null>({
    queryKey: recipeKeys.detail(user?.uid ?? "", recipeId),
    enabled: !!user && !!recipeId,
    queryFn: async () => {
      if (!user) return null;

      // Fetch global + personal in parallel
      const [global, override] = await Promise.all([
        getGlobalRecipe(recipeId),
        getUserRecipeOverride(user.uid, recipeId),
      ]);

      if (!global) return null;
      return mergeRecipe(global, override);
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useAddToUserRecipes — mutation per aggiungere una ricetta al ricettario
// ---------------------------------------------------------------------------

export function useAddToUserRecipes() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (recipeId: string) => {
      if (!user) throw new Error("Not authenticated");
      return addToUserRecipes(user.uid, recipeId);
    },
    onSuccess: (_data, recipeId) => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: recipeKeys.all(user.uid) });
        queryClient.invalidateQueries({ queryKey: recipeKeys.detail(user.uid, recipeId) });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useRemoveFromUserRecipes — mutation per rimuovere dal ricettario
// ---------------------------------------------------------------------------

export function useRemoveFromUserRecipes() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (recipeId: string) => {
      if (!user) throw new Error("Not authenticated");
      return removeFromUserRecipes(user.uid, recipeId);
    },
    onSuccess: (_data, recipeId) => {
      if (user) {
        // Remove from list cache
        queryClient.invalidateQueries({ queryKey: recipeKeys.all(user.uid) });
        // Remove detail cache
        queryClient.removeQueries({ queryKey: recipeKeys.detail(user.uid, recipeId) });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useSaveRecipeCustomizations — mutation per salvare modifiche personali
// ---------------------------------------------------------------------------

export function useSaveRecipeCustomizations(recipeId: string) {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (overrides: {
      customTitle?: string | null;
      customIngredients?: Ingredient[] | null;
      customInstructions?: string[] | null;
      personalNotes?: string | null;
      rating?: number | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      return saveUserRecipeCustomizations(user.uid, recipeId, overrides);
    },
    onSuccess: () => {
      if (user) {
        // Invalidate both list and detail so they re-fetch with updated data
        queryClient.invalidateQueries({ queryKey: recipeKeys.all(user.uid) });
        queryClient.invalidateQueries({
          queryKey: recipeKeys.detail(user.uid, recipeId),
        });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useGlobalRecipes — lista di tutte le ricette nel catalogo globale
// ---------------------------------------------------------------------------
export function useGlobalRecipes() {
  return useQuery<GlobalRecipe[]>({
    queryKey: ["global-recipes"],
    queryFn: async () => {
      const db = getFirebaseDb();
      const q = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GlobalRecipe));
    },
    staleTime: 2 * 60 * 1000, // 2 minuti
  });
}

// ---------------------------------------------------------------------------
// useUserProfile — recupera il profilo utente (displayName, photoURL) da ID
// ---------------------------------------------------------------------------
export function useUserProfile(uid: string) {
  return useQuery({
    queryKey: ["user-profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        displayName: data.displayName || "Chef Gusto",
        photoURL: data.photoURL || null,
      };
    },
    staleTime: 24 * 60 * 60 * 1000, // cache 24 ore
  });
}
