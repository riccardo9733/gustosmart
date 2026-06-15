# Shopping List — GustoSmart

**Route:** `/shopping`  
**File:** `src/app/(protected)/shopping/page.tsx`  
**Type:** Aggregated ingredient shopping list

---

## Purpose

Auto-generated shopping list that aggregates ingredients from multiple selected recipes. Supports manual items, servings adjustment, unit conversion (metric/imperial), and check-off tracking.

---

## Architecture

```
┌─────────────────────────────────────┐
│  🛒 Lista della Spesa              │
│  5 articoli da comprare   [⟳ Reset]│
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ 🍴 Ricette (collapsible)  ▼│    │
│  │ ┌───────────────────────┐   │    │
│  │ │ 🔍 Cerca ricette...  │   │    │
│  │ └───────────────────────┘   │    │
│  │ ┌───────────────────────┐   │    │
│  │ │ ☑ Pesto Rosso    [−]4[+]│   │    │
│  │ │ ☐ Bowl Mediterranea    │   │    │
│  │ │ ☑ Avocado Toast  [−]2[+]│   │    │
│  │ └───────────────────────┘   │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [+ Aggiungi articolo manuale] [Add]│
├─────────────────────────────────────┤
│  Da Comprare                       │
│  ┌─────────────────────────────┐    │
│  │ ☐ 200g pasta               │    │
│  │    Da: Pesto Rosso          │    │
│  ├─────────────────────────────┤    │
│  │ ☐ 2 cucchiai olio d'oliva  │    │
│  │    Da: Pesto Rosso, Bowl M.│    │
│  ├─────────────────────────────┤    │
│  │ ☐ Sale (manuale)       [✕] │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  ✅ Completati (2)    [🗑 Svuota]   │
│  ┌─────────────────────────────┐    │
│  │ ☑ Acqua                    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## Sections

### Header

| Element | Detail |
|---|---|
| Title | "Lista della Spesa" |
| Description | "X articoli da comprare" |
| Reset button | Clears all recipes and items |

### Recipe Selection (Collapsible Accordion)

| Feature | Detail |
|---|---|
| Search | Client-side filtering of cookbook recipes |
| Toggle | Checkbox to add/remove recipe from list |
| Servings | `[−]` / `[+]` per selected recipe (min 1) |
| Empty state | CTA to import first recipe |

### Custom Item Form

Inline form to add manual items not derived from any recipe.

### Active Items (Da Comprare)

| Element | Detail |
|---|---|
| Checkbox | Click to mark as completed |
| Quantity | Auto-calculated, converted for imperial |
| Unit | Displayed if not `q.b.` |
| Ingredient name | Bold |
| Source label | "Da: Recipe1, Recipe2" or "manuale" for custom items |
| Delete button | Only for custom items (`[✕]`) |

### Completed Items

- Same display as active items but with `line-through` + reduced opacity
- "Svuota" button clears completed items (permanently removes custom, hides recipe-derived)

---

## Features

### Auto-Aggregation

`recalculateShoppingItems()` merges identical ingredients across selected recipes:

```typescript
// Same name + same unit → quantities summed
"olive oil" + "tbsp" from Recipe A (2 tbsp)
"olive oil" + "tbsp" from Recipe B (1 tbsp)
→ "olive oil" 3 tbsp
```

### Missing Recipe Handling

If a shopping list references a recipe no longer in the user's cookbook, it's fetched from the global `recipes` collection via `getGlobalRecipe()`.

### Unit Conversion

When user preference is `imperial`, quantities are converted via `convertToImperial()`.

### Debounced Sync

Local state changes are debounced by 1.5 seconds before writing to Firestore:

```
local state change → setLocalRecipes/Items
  → setIsDirty(true)
  → 1.5s timer
  → updateShoppingList.mutate()
  → isDirty = false
```

---

## States

| State | Handling |
|---|---|
| **Error loading** | ShoppingCart icon + error message + reload button |
| **Loading** | Skeleton layout (title, input, list items) |
| **Empty list** | ShoppingCart icon + "No items" message |
| **Normal** | Active items + optional completed section |

---

## Data Flow

```
useRecipes() → user's cookbook recipes
useShoppingList() → current shopping list from Firestore

localRecipes + localItems ← shoppingList (on load)
  → user interactions mutate localRecipes/localItems
  → recalculateShoppingItems() merges ingredients
  → debounce 1.5s → Firestore update
```

---

## Analytics Events

| Event | Trigger |
|---|---|
| `shopping_recipe_toggled` | Recipe added/removed from list |
| `shopping_custom_item_added` | Manual item added |
| `shopping_list_reset` | List fully reset |

---

## Dependencies

| import | Usage |
|---|---|
| `@/hooks/useShoppingList` | `useShoppingList`, `useUpdateShoppingList` |
| `@/hooks/useRecipes` | `useRecipes` |
| `@/lib/firestore/shopping-list` | `recalculateShoppingItems`, types |
| `@/lib/units` | `convertToImperial` |
| `@/store/userSlice` | `selectUserProfile` for measurement system |
| `@tanstack/react-query` | `useQuery` for missing global recipes |
| `@/components/ui/button` | Action buttons |
| `@/components/ui/checkbox` | Item checkboxes |
| `@/components/ui/input` | Custom item input |
| `@/components/ui/skeleton` | Loading state |
| `lucide-react` | Icons |
