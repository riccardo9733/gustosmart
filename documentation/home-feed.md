# Home Feed — GustoSmart

**Route:** `/`  
**File:** `src/app/(protected)/page.tsx`  
**Type:** Community recipe discovery feed

---

## Purpose

Infinite-scroll masonry feed showing recipes scanned/imported by all GustoSmart users. Users can browse, filter by category and dietary restrictions, and save recipes to their personal cookbook.

---

## Architecture

```
┌──────────────────────────────────┐
│  ✨ Cosa si cucina oggi?         │
│  Scopri le ricette scansionate   │
│  dagli altri utenti              │
├──────────────────────────────────┤
│  Sticky Filters Bar              │
│  ┌──────────────────────────┐    │
│  │ Tutti | Primi | Secondi  │    │
│  │ ... | Dolci | Altro      │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ Tutte | 🌱 Senza Glutine │    │
│  │ 🌿 Vegano | 🥬 Vegetar. │    │
│  │ 💧 Senza Lattosio        │    │
│  └──────────────────────────┘    │
├──────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ Card │ │ Card │ │ Card │     │
│  └──────┘ └──────┘ └──────┘     │
│  CSS Masonry (columns-2/3/4)     │
│                                  │
│  [ Infinite scroll sentinel ]    │
└──────────────────────────────────┘
```

---

## Components

### `HomeFeed` (default export, line 252)
Main page component managing filters, data fetching, and layout.

### `FeedCard` (line 119)
Individual recipe card with:

| Element | Detail |
|---|---|
| **Source badge** | Platform icon + name (Instagram/TikTok/YouTube/Facebook/Web) |
| **Save button** | `BookmarkCheck` (saved) / `Bookmark` (unsaved) |
| **Title** | `font-heading text-xl font-bold`, line-clamp-2 |
| **Tags row** | Prep time, kcal, servings, ingredients count, dietary flags |
| **Double-click** | Quick-save with animated splash overlay |

### `ScannerHeader` (line 69)
Shows avatar + display name of the user who imported the recipe.

---

## States

| State | Handling |
|---|---|
| **Loading** | 8 skeleton cards in masonry layout |
| **Error** | Error card with Firestore composite index creation link |
| **Empty feed** | `ChefHat` illustration + CTA to import first recipe |
| **Empty with filters** | "No results" message + "Clear filters" button |
| **Normal** | Masonry grid of `FeedCard` components |

---

## Data Flow

```
useInfiniteGlobalRecipes({ dietaries, source: "all", category })
  → Firestore paginated query
  → recipes = data.pages.flatMap(page => page.recipes)
  → rendered in CSS columns layout

useRecipes() → user's saved recipe IDs
  → determines bookmark state per card
```

### Filters

**Category filters** (single-select):

| Key | Label |
|---|---|
| `all` | Tutti |
| `first_courses` | Primi |
| `second_courses` | Secondi |
| `appetizers` | Antipasti |
| `desserts` | Dolci |
| `sides` | Contorni |
| `single_dishes` | Piatti Unici |
| `other` | Altro |

**Dietary filters** (multi-select, colored chips):

| Key | Label | Color |
|---|---|---|
| `gluten_free` | Senza Glutine | Emerald |
| `vegan` | Vegano | Green |
| `vegetarian` | Vegetariano | Teal |
| `lactose_free` | Senza Lattosio | Blue |

---

## Interactions

| Interaction | Effect |
|---|---|
| Click card | Navigate to `/recipes/[id]` |
| Double-click card | Save recipe + splash animation |
| Click bookmark | Toggle save/unsave with toast |
| Click filter chip | Update filter set → feed refreshes |
| Scroll to bottom | Auto-loads next page via `IntersectionObserver` |

---

## Analytics Events

| Event | Trigger |
|---|---|
| `recipe_saved` | Card saved |
| `recipe_removed` | Card unsaved |

---

## Dependencies

| import | Usage |
|---|---|
| `@/hooks/useRecipes` | `useInfiniteGlobalRecipes`, `useRecipes`, `useAddToUserRecipes`, `useRemoveFromUserRecipes` |
| `@/contexts/auth-context` | `useAuth` |
| `next-intl` | `useTranslations` for i18n |
| `lucide-react` | Icons |
| `@/components/ui/card` | Card wrapper |
| `@/components/ui/skeleton` | Loading skeleton |
| `@/components/ui/button` | Bookmark button |
| `@/lib/utils` | `cn()` utility |
