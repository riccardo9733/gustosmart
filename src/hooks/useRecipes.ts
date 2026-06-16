"use client";

import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
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
  getUserFolders,
  createUserFolder,
  deleteUserFolder,
  moveRecipeToFolder,
  addRecipesToFolder,
  type MergedRecipe,
  type Ingredient,
  type GlobalRecipe,
  type UserFolder,
} from "@/lib/firestore/recipes";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  limit,
  startAfter,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
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
 * 1. getDocs on /users/{uid}/recipes/ (fetches all personal overrides + denormalized card fields)
 * 2. Self-healing lazy migration: if any document lacks denormalized card fields, fetches the global recipe and updates the override on the fly.
 * 3. Directly maps overrides into MergedRecipe[] without global fetches for migrated recipes.
 *
 * staleTime: Infinity (cached indefinitely in memory, invalidated on mutations)
 */
export function useRecipes() {
  const { user } = useAuth();

  return useQuery<MergedRecipe[]>({
    queryKey: recipeKeys.all(user?.uid ?? ""),
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      // 1. Fetch all personal override docs (one query, returns refs + customizations + denormalized card fields)
      const overrides = await getUserRecipeOverrides(user.uid);
      if (overrides.length === 0) return [];

      const db = getFirebaseDb();
      const merged: MergedRecipe[] = [];

      // 2. Perform a lazy migration on the client for any documents that are missing denormalized fields
      const migrationPromises = overrides.map(async (override) => {
        if (override.title && override.category) {
          merged.push(mergeRecipe(null, override));
          return;
        }

        // Fallback for non-migrated documents: fetch global and update user override document
        try {
          const global = await getGlobalRecipe(override.recipeId);
          if (!global) return;

          merged.push(mergeRecipe(global, override));

          // Save the denormalized fields in the background
          const userRecipeRef = doc(db, "users", user.uid, "recipes", override.recipeId);
          updateDoc(userRecipeRef, {
            title: global.title,
            category: global.category || "other",
            prepTimeMinutes: global.prepTimeMinutes || null,
            servings: global.servings || 2,
            sourcePlatform: global.sourcePlatform || "web",
            ingredients: global.ingredients || [],
            isGlutenFree: global.isGlutenFree ?? null,
            isVegan: global.isVegan ?? null,
            isVegetarian: global.isVegetarian ?? null,
            isLactoseFree: global.isLactoseFree ?? null,
          }).catch((err) => {
            console.error("Error updating denormalized fields in background:", err);
          });
        } catch (error) {
          console.error(`Error fetching fallback global recipe for ID ${override.recipeId}:`, error);
        }
      });

      await Promise.all(migrationPromises);

      // 3. Sort by addedAt descending
      return merged.sort((a, b) => {
        const aMs = a.addedAt?.toMillis?.() ?? 0;
        const bMs = b.addedAt?.toMillis?.() ?? 0;
        return bMs - aMs;
      });
    },
    staleTime: Infinity,
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
// useInfiniteGlobalRecipes — lista paginata e filtrata del catalogo globale
// ---------------------------------------------------------------------------
export interface GlobalRecipesFilters {
  dietaries: Set<string>;
  source: string;
  category: string;
}

export function useInfiniteGlobalRecipes(filters: GlobalRecipesFilters) {
  const { dietaries, source, category } = filters;
  const dietariesArray = Array.from(dietaries).sort();
  const queryKey = ["global-recipes-infinite", dietariesArray, source, category];

  return useInfiniteQuery({
    queryKey,
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    queryFn: async ({ pageParam }) => {
      const db = getFirebaseDb();
      const recipesCol = collection(db, "recipes");
      const constraints: any[] = [];

      // 1. Dietary filters (AND logic)
      if (dietaries.has("gluten_free")) {
        constraints.push(where("isGlutenFree", "==", true));
      }
      if (dietaries.has("vegan")) {
        constraints.push(where("isVegan", "==", true));
      }
      if (dietaries.has("vegetarian")) {
        constraints.push(where("isVegetarian", "==", true));
      }
      if (dietaries.has("lactose_free")) {
        constraints.push(where("isLactoseFree", "==", true));
      }

      // 2. Category filter
      if (category && category !== "all") {
        constraints.push(where("category", "==", category));
      }

      // 3. Source filter
      if (source === "social") {
        constraints.push(
          where("sourcePlatform", "in", ["instagram", "tiktok", "youtube", "facebook"])
        );
      } else if (source === "web") {
        constraints.push(where("sourcePlatform", "==", "web"));
      }

      // 3. Sorting & Pagination limit
      constraints.push(orderBy("createdAt", "desc"));
      constraints.push(limit(20));

      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }

      const q = query(recipesCol, ...constraints);
      const snap = await getDocs(q);

      const recipes = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as GlobalRecipe));

      const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

      return {
        recipes,
        lastDoc,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.lastDoc || undefined;
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

// ---------------------------------------------------------------------------
// Folder hooks
// ---------------------------------------------------------------------------

export const folderKeys = {
  all: (userId: string) => ["folders", userId] as const,
};

export function useUserFolders() {
  const { user } = useAuth();

  return useQuery<UserFolder[]>({
    queryKey: folderKeys.all(user?.uid ?? ""),
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      return getUserFolders(user.uid);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFolder() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (folderName: string) => {
      if (!user) throw new Error("Not authenticated");
      return createUserFolder(user.uid, folderName);
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: folderKeys.all(user.uid) });
      }
    },
  });
}

export function useDeleteFolder() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: (folderId: string) => {
      if (!user) throw new Error("Not authenticated");
      return deleteUserFolder(user.uid, folderId);
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: folderKeys.all(user.uid) });
        queryClient.invalidateQueries({ queryKey: recipeKeys.all(user.uid) });
      }
    },
  });
}

export function useMoveRecipeToFolder() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ recipeId, folderId }: { recipeId: string; folderId: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      return moveRecipeToFolder(user.uid, recipeId, folderId);
    },
    onSuccess: (_data, { recipeId }) => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: recipeKeys.all(user.uid) });
        queryClient.invalidateQueries({ queryKey: recipeKeys.detail(user.uid, recipeId) });
      }
    },
  });
}

export function useAddRecipesToFolder() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ recipeIds, folderId }: { recipeIds: string[]; folderId: string }) => {
      if (!user) throw new Error("Not authenticated");
      return addRecipesToFolder(user.uid, recipeIds, folderId);
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: recipeKeys.all(user.uid) });
      }
    },
  });
}

export function usePublicRecipe(recipeId: string) {
  return useQuery<GlobalRecipe | null>({
    queryKey: ["public-recipe", recipeId],
    enabled: !!recipeId,
    queryFn: () => getGlobalRecipe(recipeId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCheckUserHasRecipe(recipeId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-has-recipe", user?.uid, recipeId],
    enabled: !!user && !!recipeId,
    queryFn: async () => {
      if (!user) return false;
      const override = await getUserRecipeOverride(user.uid, recipeId);
      return !!override;
    },
    staleTime: 5 * 60 * 1000,
  });
}

