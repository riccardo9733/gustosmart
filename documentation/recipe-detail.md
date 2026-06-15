# Recipe Detail — GustoSmart

**Route:** `/recipes/[id]`  
**File:** `src/app/(protected)/recipes/[id]/page.tsx`  
**Type:** Full recipe view with AI features

---

## Purpose

Complete recipe display with parallax hero image, ingredient checklist, cooking steps, automatic dietary analysis, AI-powered adaptations (vegan/vegetarian/gluten-free/etc.), translation, and shopping list integration.

---

## Architecture

```
┌─────────────────────────────────────┐
│     ◀ Hero Image (parallax)      ⋮  │
│                                     │
├─────────────────────────────────────┤
│  Recipe Title                       │
│  [Platform Badge]                   │
│  ⏱ 15 min • 🔥 240 kcal • 👥 2    │
│  [Gluten-Free] [Vegan] [Vegetarian] │
├─────────────────────────────────────┤
│  ┌───┐ ┌──────────┐ ┌────────────┐  │
│  │ + │ │ Ricettario│ │ Lista Spesa│  │
│  │Save│ │   Add     │ │   Toggle   │  │
│  └───┘ └──────────┘ └────────────┘  │
├─────────────────────────────────────┤
│  📋 Ingredienti                     │
│  Porzioni: [−] 4 [+]                │
│  ┌─────────────────────────────┐    │
│  │ ☐ 200g pasta               │    │
│  │ ☑ 2 cucchiai olio d'oliva  │    │
│  │ ☐ 1 spicchio aglio         │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  👨‍🍳 Procedimento                  │
│  ┌─────────────────────────────┐    │
│  │ ☐ 1. Porta a ebollizione...│    │
│  │ ☑ 2. Cuoci la pasta...     │    │
│  │ ☐ 3. Salta in padella...    │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  📊 Valori Nutrizionali   [Expand] │
│  Proteine 12g | Carbo 45g | ...    │
├─────────────────────────────────────┤
│  ✨ Adatta la Ricetta              │
│  [🌱 Vegano] [🥬 Vegetariano]      │
│  [💧 No Lattosio] [🌾 No Glutine]  │
│  [🔥 Light]                        │
└─────────────────────────────────────┘
```

---

## Sections

### Hero Image

| Property | Value |
|---|---|
| Height | `h-[50vh] md:h-[55vh]` |
| Overflow | `rounded-b-[40px]` |
| Width | `w-[calc(100%+3rem)] -mx-6` (edge-to-edge) |
| Parallax | `translateY(scrollY * 0.4)` on background image |
| Fallback | `ChefHat` icon on gradient background |
| Gradient overlay | `bg-gradient-to-t from-background via-transparent to-black/25` |

### Recipe Metadata

- **Title** — displayed with translation support
- **Platform badge** — platform-specific gradient/color + SVG icon
- **Stats row** — prep time, kcal, servings
- **Dietary badges** — gluten-free (emerald), vegan (green), vegetarian (teal), lactose-free (blue)

### Action Buttons

| Button | Action |
|---|---|
| **Save / Bookmark** | Toggle recipe in/from cookbook |
| **Add to Shopping List** | Toggle recipe on/off shopping list |
| **Servings control** | `[−]` / `[+]` recalculates ingredient quantities |

### Ingredients Checklist

- In-memory `checkedIngredients` state (temporary, not persisted)
- Ingredients re-quantified based on current servings
- Imperial conversion when user preference is `imperial`

### Instructions Checklist

- In-memory `completedSteps` state (temporary, not persisted)
- Numbered steps with checkbox

### Nutrition Panel

- Expandable section
- Calories, Protein, Carbs, Fats, Fiber, Sugar
- Color-coded progress bars for macronutrient distribution

### AI Adaptations

Version badges shown when alternative exists:

| Version | Icon | Status |
|---|---|---|
| Vegan | Leaf | Available / Generate |
| Vegetarian | Leaf | Available / Generate |
| Lactose-Free | Milk | Available / Generate |
| Gluten-Free | Wheat | Available / Generate |
| Light | Sparkles | Available / Generate |

Generation flow:
1. POST `/api/recipes/transform` with recipe data + target type
2. Save result to Firestore `recipes/{id}/versions/{type}`
3. Display adapted version's ingredients + instructions
4. Track event `recipe_transformed`

---

## AI Features

### Dietary Analysis (Automatic)

On mount, if `isVegan`/`isVegetarian`/`isLactoseFree`/`isGlutenFree` flags are missing:
1. POST `/api/recipes/analyze-dietary`
2. Save flags to Firestore recipe document
3. Invalidate TanStack Query cache

### Translation (Automatic)

When user language ≠ recipe `sourceLanguage`:
1. Check `recipes/{id}/translations/{lang}` subcollection
2. If cached → display translated content
3. If not → POST `/api/recipes/translate`
4. Save translation to Firestore
5. Display with "Translated" badge
6. Track event `recipe_translated`

### Version Translation

When viewing an adapted version:
- Same translation logic, but translations stored in `recipes/{id}/versions/{versionId}/translations/{lang}`

---

## States

| State | Handling |
|---|---|
| **Loading** | Hero skeleton + content skeleton grid |
| **Not found** | `ChefHat` icon + "Recipe not found" + back button |
| **Not saved** | Shows bookmark outline + save button |
| **Saved** | Shows filled bookmark + dropdown (move/delete) |
| **Translated** | Badge indicating translation on title |
| **Pending analysis** | Auto-triggers dietary flag analysis on mount |

---

## Data Flow

```
useRecipe(id) → TanStack Query (10-min stale, one-shot getDoc)
useRecipes() → user's saved recipes (for isSaved check)
useShoppingList() → current shopping list (for toggle)
useUserFolders() → folder list (for move action)

displayData state → resolved title/ingredients/instructions
  (handles original + version + translation resolution)
```

---

## Analytics Events

| Event | Trigger |
|---|---|
| `recipe_servings_changed` | Servings +/- clicked |
| `recipe_translated` | Translation generated |
| `recipe_transformed` | AI adaptation generated |
| `recipe_saved` | Recipe added to cookbook |
| `recipe_removed` | Recipe removed from cookbook |
| `shopping_recipe_toggled` | Shopping list toggle |

---

## Dependencies

| import | Usage |
|---|---|
| `@/hooks/useRecipes` | `useRecipe`, `useAddToUserRecipes`, `useRemoveFromUserRecipes`, `useUserFolders`, `useMoveRecipeToFolder` |
| `@/hooks/useShoppingList` | `useShoppingList`, `useUpdateShoppingList` |
| `@/lib/firestore/shopping-list` | `recalculateShoppingItems` |
| `@/store/userSlice` | `selectUserProfile` for measurement system |
| `@/lib/units` | `convertToImperial` |
| `@/components/ui/button` | Action buttons |
| `@/components/ui/skeleton` | Loading state |
| `@/components/ui/alert-dialog` | Delete confirmation |
| `@/components/ui/dialog` | Folder move dialog |
| `@/components/ui/dropdown-menu` | Recipe actions menu |
| `@/components/ui/drawer` | Mobile-friendly panels |
| `@/components/ui/badge` | Dietary tags |
| `firebase/firestore` | Direct Firestone reads/writes |
