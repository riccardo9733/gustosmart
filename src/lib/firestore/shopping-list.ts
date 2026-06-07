import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface ShoppingRecipe {
  recipeId: string;
  servings: number;
}

export interface ShoppingItem {
  name: string;
  quantity: number | null;
  unit: string;
  checked: boolean;
  isCustom?: boolean;
  cleared?: boolean;
  recipes?: string[];
}

export interface ShoppingList {
  userId: string;
  selectedRecipes: ShoppingRecipe[];
  items: ShoppingItem[];
  updatedAt?: any;
}

/**
 * Legge la lista della spesa dell'utente da /shopping_lists/{userId}.
 * Se non esiste, ritorna un oggetto vuoto predefinito.
 */
export async function getShoppingList(userId: string): Promise<ShoppingList> {
  const db = getFirebaseDb();
  const docRef = doc(db, "shopping_lists", userId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return {
      userId,
      selectedRecipes: [],
      items: [],
    };
  }

  const data = snap.data();
  return {
    userId,
    selectedRecipes: data.selectedRecipes || [],
    items: data.items || [],
    updatedAt: data.updatedAt,
  };
}

/**
 * Salva lo stato della lista della spesa dell'utente.
 */
export async function saveShoppingList(
  userId: string,
  data: Omit<ShoppingList, "userId" | "updatedAt">
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, "shopping_lists", userId);

  await setDoc(
    docRef,
    {
      ...data,
      userId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Ricalcola la lista della spesa sommando gli ingredienti delle ricette selezionate.
 */
import { type MergedRecipe } from "./recipes";

export function recalculateShoppingItems(
  selectedRecipes: ShoppingRecipe[],
  currentItems: ShoppingItem[],
  allRecipes: MergedRecipe[]
): ShoppingItem[] {
  const groups: Record<
    string,
    { name: string; quantity: number | null; unit: string; recipeTitles: string[] }
  > = {};

  // 1. Aggrega ingredienti dalle ricette selezionate
  selectedRecipes.forEach((sel) => {
    const recipe = allRecipes.find((r) => r.id === sel.recipeId);
    if (!recipe) return;

    const baseServings = recipe.servings || 2;
    const factor = sel.servings / baseServings;

    recipe.ingredients.forEach((ing) => {
      const normName = ing.name.trim();
      const normUnit = ing.unit.trim();
      const key = `${normName.toLowerCase()}||${normUnit.toLowerCase()}`;

      const qty = ing.quantity !== null ? ing.quantity * factor : null;

      if (!groups[key]) {
        groups[key] = {
          name: normName,
          quantity: qty,
          unit: ing.unit,
          recipeTitles: [recipe.title],
        };
      } else {
        if (groups[key].quantity !== null && qty !== null) {
          groups[key].quantity = (groups[key].quantity || 0) + qty;
        } else if (qty !== null) {
          groups[key].quantity = qty;
        }
        if (!groups[key].recipeTitles.includes(recipe.title)) {
          groups[key].recipeTitles.push(recipe.title);
        }
      }
    });
  });

  // 2. Mappa stato degli elementi precedenti (checked e cleared)
  const prevStatusMap = new Map<string, { checked: boolean; cleared: boolean }>();
  currentItems.forEach((item) => {
    if (!item.isCustom) {
      const key = `${item.name.toLowerCase().trim()}||${item.unit.toLowerCase().trim()}`;
      prevStatusMap.set(key, { checked: item.checked, cleared: !!item.cleared });
    }
  });

  // 3. Costruisci lista degli ingredienti aggiornati
  const recipeItems: ShoppingItem[] = Object.values(groups).map((g) => {
    const key = `${g.name.toLowerCase().trim()}||${g.unit.toLowerCase().trim()}`;
    const status = prevStatusMap.get(key);
    const checked = status ? status.checked : false;
    const cleared = status ? status.cleared : false;

    return {
      name: g.name,
      quantity: g.quantity !== null ? Number(g.quantity.toFixed(1)) : null,
      unit: g.unit,
      checked,
      cleared,
      isCustom: false,
      recipes: g.recipeTitles,
    } as ShoppingItem;
  });

  // 4. Mantieni tutti gli articoli custom manuali
  const manualItems = currentItems.filter((item) => item.isCustom);

  return [...recipeItems, ...manualItems];
}

