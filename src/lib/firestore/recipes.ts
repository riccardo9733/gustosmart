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
  isAiGenerated?: boolean;
}

export interface InstructionStep {
  text: string;
  isAiGenerated?: boolean;
}

/** The globally shared, immutable recipe document in /recipes/{recipeId} */
export interface GlobalRecipe {
  id: string;
  sourceUrl: string;
  sourcePlatform: string;
  sourceType?: 'url_ingest' | 'image_upload' | 'manual';
  sourceImageUrl?: string | null;
  isPublic?: boolean;
  title: string;
  isTitleAiGenerated?: boolean;
  sourceLanguage: string;
  ingredients: Ingredient[];
  instructions: (string | InstructionStep)[];
  imageUrl: string | null;
  prepTimeMinutes: number | null;
  isPrepTimeAiGenerated?: boolean;
  servings: number;
  isServingsAiGenerated?: boolean;
  category: string;
  kcal: number | null;
  proteins?: number | null;
  carbs?: number | null;
  fats?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  isNutritionalAiGenerated?: boolean;
  nutritionalRating?: string | null;
  nutritionalAssessment?: string | null;
  isGlutenFree?: boolean | null;
  isVegan?: boolean | null;
  isVegetarian?: boolean | null;
  isLactoseFree?: boolean | null;
  createdAt: any;
  createdBy: string;
  creatorUsername?: string | null;
  creatorFullName?: string | null;
  creatorId?: string | null;
}

export interface UserFolder {
  id: string;
  name: string;
  createdAt: any;
}

/** The personal override document in /users/{uid}/recipes/{recipeId} */
export interface UserRecipeOverride {
  recipeId: string;
  recipeRef: DocumentReference;
  addedAt: any;
  customTitle: string | null;
  customIngredients: Ingredient[] | null;
  customInstructions: (string | InstructionStep)[] | null;
  personalNotes: string | null;
  rating: number | null;
  isCustomized: boolean;
  folderId?: string | null;

  // Denormalized fields from GlobalRecipe for card rendering
  title?: string;
  category?: string;
  prepTimeMinutes?: number | null;
  servings?: number;
  sourcePlatform?: string;
  ingredients?: Ingredient[];
  isGlutenFree?: boolean | null;
  isVegan?: boolean | null;
  isVegetarian?: boolean | null;
  isLactoseFree?: boolean | null;
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
  folderId?: string | null;
  // effective display fields (custom or global)
  title: string;
  ingredients: Ingredient[];
  instructions: (string | InstructionStep)[];
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
 * Fetches the global recipe to populate denormalized fields.
 */
export async function addToUserRecipes(userId: string, recipeId: string): Promise<void> {
  const db = getFirebaseDb();
  const globalRef = doc(db, "recipes", recipeId);
  const globalSnap = await getDoc(globalRef);
  if (!globalSnap.exists()) {
    throw new Error(`Global recipe with ID ${recipeId} not found`);
  }
  const globalData = globalSnap.data() as GlobalRecipe;

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
    folderId: null,

    // Denormalized fields
    title: globalData.title,
    category: globalData.category || "other",
    prepTimeMinutes: globalData.prepTimeMinutes || null,
    servings: globalData.servings || 2,
    sourcePlatform: globalData.sourcePlatform || "web",
    ingredients: globalData.ingredients || [],
    isGlutenFree: globalData.isGlutenFree ?? null,
    isVegan: globalData.isVegan ?? null,
    isVegetarian: globalData.isVegetarian ?? null,
    isLactoseFree: globalData.isLactoseFree ?? null,
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
 * Custom fields take precedence; falls back to global/denormalized values.
 */
export function mergeRecipe(
  global: GlobalRecipe | null,
  override: UserRecipeOverride | null
): MergedRecipe {
  const effectiveId = override?.recipeId ?? global?.id ?? "";

  return {
    id: effectiveId,
    sourceUrl: global?.sourceUrl ?? "",
    sourcePlatform: override?.sourcePlatform ?? global?.sourcePlatform ?? "web",
    title: override?.customTitle ?? override?.title ?? global?.title ?? "",
    sourceLanguage: global?.sourceLanguage ?? "it",
    ingredients: override?.customIngredients ?? override?.ingredients ?? global?.ingredients ?? [],
    instructions: override?.customInstructions ?? global?.instructions ?? [],
    imageUrl: global?.imageUrl ?? null,
    prepTimeMinutes: override?.prepTimeMinutes ?? global?.prepTimeMinutes ?? null,
    servings: override?.servings ?? global?.servings ?? 2,
    category: override?.category ?? global?.category ?? "other",
    kcal: global?.kcal ?? null,
    proteins: global?.proteins ?? null,
    carbs: global?.carbs ?? null,
    fats: global?.fats ?? null,
    fiber: global?.fiber ?? null,
    sugar: global?.sugar ?? null,
    nutritionalRating: global?.nutritionalRating ?? null,
    nutritionalAssessment: global?.nutritionalAssessment ?? null,
    isGlutenFree: override?.isGlutenFree ?? global?.isGlutenFree ?? null,
    isVegan: override?.isVegan ?? global?.isVegan ?? null,
    isVegetarian: override?.isVegetarian ?? global?.isVegetarian ?? null,
    isLactoseFree: override?.isLactoseFree ?? global?.isLactoseFree ?? null,
    createdAt: global?.createdAt ?? null,
    createdBy: global?.createdBy ?? "",
    addedAt: override?.addedAt ?? null,
    personalNotes: override?.personalNotes ?? null,
    rating: override?.rating ?? null,
    isCustomized: override?.isCustomized ?? false,
    folderId: override?.folderId ?? null,
    creatorUsername: global?.creatorUsername ?? null,
    creatorFullName: global?.creatorFullName ?? null,
    creatorId: global?.creatorId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Folder Helpers
// ---------------------------------------------------------------------------

/**
 * Fetches all folders created by the user from /users/{uid}/folders.
 */
export async function getUserFolders(userId: string): Promise<UserFolder[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, "users", userId, "folders"));
  const folders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserFolder));
  return folders.sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() ?? 0;
    const bMs = b.createdAt?.toMillis?.() ?? 0;
    return bMs - aMs;
  });
}

/**
 * Creates a new folder for the user.
 */
export async function createUserFolder(userId: string, folderName: string): Promise<string> {
  const db = getFirebaseDb();
  const folderRef = doc(collection(db, "users", userId, "folders"));
  await setDoc(folderRef, {
    name: folderName,
    createdAt: serverTimestamp(),
  });
  return folderRef.id;
}

/**
 * Deletes a user folder. Does NOT delete the recipes in the folder; instead,
 * it clears the folderId on all recipes belonging to this folder.
 */
export async function deleteUserFolder(userId: string, folderId: string): Promise<void> {
  const db = getFirebaseDb();
  
  // 1. Fetch all user recipe overrides
  const overridesCollection = collection(db, "users", userId, "recipes");
  const snap = await getDocs(overridesCollection);
  
  // 2. Clear folderId for each matching override
  const batchPromises: Promise<any>[] = [];
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.folderId === folderId) {
      batchPromises.push(
        setDoc(d.ref, { folderId: null }, { merge: true })
      );
    }
  });
  await Promise.all(batchPromises);

  // 3. Delete the folder document itself
  await deleteDoc(doc(db, "users", userId, "folders", folderId));
}

/**
 * Assigns or moves a user recipe override to a folder (or removes it from folder if folderId is null).
 */
export async function moveRecipeToFolder(
  userId: string,
  recipeId: string,
  folderId: string | null
): Promise<void> {
  const db = getFirebaseDb();
  const userRecipeRef = doc(db, "users", userId, "recipes", recipeId);
  await setDoc(userRecipeRef, { folderId }, { merge: true });
}

/**
 * Adds multiple recipes to a folder.
 */
export async function addRecipesToFolder(
  userId: string,
  recipeIds: string[],
  folderId: string
): Promise<void> {
  const db = getFirebaseDb();
  const promises = recipeIds.map((recipeId) => {
    const userRecipeRef = doc(db, "users", userId, "recipes", recipeId);
    return setDoc(userRecipeRef, { folderId }, { merge: true });
  });
  await Promise.all(promises);
}
