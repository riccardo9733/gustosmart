import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  DocumentReference,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Ingredient {
  name: string;
  quantity: number | null;
  unit: string;
}

/** The globally shared, immutable recipe document in /recipes/{recipeId} */
export interface GlobalRecipe {
  id: string;
  sourceUrl: string;
  sourcePlatform: string;
  title: string;
  sourceLanguage: string;
  ingredients: Ingredient[];
  instructions: string[];
  imageUrl: string | null;
  prepTimeMinutes: number | null;
  servings: number;
  category: string;
  kcal: number | null;
  proteins?: number | null;
  carbs?: number | null;
  fats?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  nutritionalRating?: string | null;
  nutritionalAssessment?: string | null;
  createdAt: any;
  createdBy: string;
  creatorUsername?: string | null;
  creatorFullName?: string | null;
  creatorId?: string | null;
}

/** The personal override document in /users/{uid}/recipes/{recipeId} */
export interface UserRecipeOverride {
  recipeId: string;
  recipeRef: DocumentReference;
  addedAt: any;
  customTitle: string | null;
  customIngredients: Ingredient[] | null;
  customInstructions: string[] | null;
  personalNotes: string | null;
  rating: number | null;
  isCustomized: boolean;
}

/**
 * A merged view of a recipe: the personal override fields take precedence over
 * the global recipe, making this the "effective" recipe for a given user.
 */
export interface MergedRecipe extends GlobalRecipe {
  // personal metadata
  addedAt: any;
  personalNotes: string | null;
  rating: number | null;
  isCustomized: boolean;
  // effective display fields (custom or global)
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
}

// ---------------------------------------------------------------------------
// Global Recipe helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a single global recipe by ID from /recipes/{recipeId}.
 */
export async function getGlobalRecipe(recipeId: string): Promise<GlobalRecipe | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "recipes", recipeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as GlobalRecipe;
}

/**
 * Checks if a global recipe already exists for the given sourceUrl.
 * Returns the recipeId if found, or null.
 */
export async function checkRecipeExistsByUrl(sourceUrl: string): Promise<string | null> {
  const db = getFirebaseDb();
  const q = query(collection(db, "recipes"), where("sourceUrl", "==", sourceUrl));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

// ---------------------------------------------------------------------------
// User recipe subcollection helpers
// ---------------------------------------------------------------------------

/**
 * Fetches the user's personal override for a given recipe.
 * Returns null if the user hasn't added this recipe to their collection.
 */
export async function getUserRecipeOverride(
  userId: string,
  recipeId: string
): Promise<UserRecipeOverride | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "users", userId, "recipes", recipeId));
  if (!snap.exists()) return null;
  return { recipeId: snap.id, ...snap.data() } as UserRecipeOverride;
}

/**
 * Fetches all personal recipe references for a user from /users/{uid}/recipes/.
 */
export async function getUserRecipeOverrides(userId: string): Promise<UserRecipeOverride[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, "users", userId, "recipes"));
  return snap.docs.map((d) => ({ recipeId: d.id, ...d.data() } as UserRecipeOverride));
}

/**
 * Adds a recipe to the user's personal collection by creating
 * /users/{uid}/recipes/{recipeId} with a reference to the global recipe.
 * All custom fields are null (unmodified) on first add.
 */
export async function addToUserRecipes(userId: string, recipeId: string): Promise<void> {
  const db = getFirebaseDb();
  const globalRef = doc(db, "recipes", recipeId);
  const userRecipeRef = doc(db, "users", userId, "recipes", recipeId);

  await setDoc(userRecipeRef, {
    recipeRef: globalRef,
    addedAt: serverTimestamp(),
    customTitle: null,
    customIngredients: null,
    customInstructions: null,
    personalNotes: null,
    rating: null,
    isCustomized: false,
  });
}

/**
 * Removes a recipe from the user's personal collection.
 * The global recipe in /recipes/ is NOT touched.
 */
export async function removeFromUserRecipes(userId: string, recipeId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "users", userId, "recipes", recipeId));
}

/**
 * Saves personal customizations for a recipe in the user's collection.
 * Only provided fields are overridden; pass null to revert to global.
 */
export async function saveUserRecipeCustomizations(
  userId: string,
  recipeId: string,
  overrides: {
    customTitle?: string | null;
    customIngredients?: Ingredient[] | null;
    customInstructions?: string[] | null;
    personalNotes?: string | null;
    rating?: number | null;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const userRecipeRef = doc(db, "users", userId, "recipes", recipeId);
  const isCustomized =
    overrides.customTitle != null ||
    overrides.customIngredients != null ||
    overrides.customInstructions != null;

  await setDoc(
    userRecipeRef,
    { ...overrides, isCustomized },
    { merge: true }
  );
}

// ---------------------------------------------------------------------------
// Merge helper
// ---------------------------------------------------------------------------

/**
 * Merges a global recipe with the user's personal override.
 * Custom fields take precedence; falls back to global values.
 */
export function mergeRecipe(
  global: GlobalRecipe,
  override: UserRecipeOverride | null
): MergedRecipe {
  return {
    ...global,
    addedAt: override?.addedAt ?? null,
    personalNotes: override?.personalNotes ?? null,
    rating: override?.rating ?? null,
    isCustomized: override?.isCustomized ?? false,
    title: override?.customTitle ?? global.title,
    ingredients: override?.customIngredients ?? global.ingredients,
    instructions: override?.customInstructions ?? global.instructions,
  };
}
