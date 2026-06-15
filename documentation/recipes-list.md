# My Cookbook — GustoSmart

**Route:** `/recipes`  
**File:** `src/app/(protected)/recipes/page.tsx`  
**Type:** Personal recipe collection manager

---

## Purpose

User's saved recipes organized with search and folders. Provides full CRUD for recipes and folder management.

---

## Architecture

```
┌──────────────────────────────────┐
│  Le mie ricette                  │
│  ┌──────────────────────────┐    │
│  │ 🔍 Cerca nelle ricette   │    │
│  └──────────────────────────┘    │
├──────────────────────────────────┤
│  Cartelle                        │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│  │ [+ │ │ 📁 │ │ 📁 │ │ 📁 │    │
│  │Add]│ │Nome│ │Nome│ │Nome│    │
│  └────┘ └────┘ └────┘ └────┘    │
│  (horizontal scroll)             │
├──────────────────────────────────┤
│  Recenti                         │
│  ┌──────────────────────────┐    │
│  │ Titolo Ricetta           │    │
│  │ [Primo] [Vegano]         │    │
│  │ ⏱ 15 min 👥 2 porzioni  │    │
│  │              [icona]  ⋮  │    │
│  ├──────────────────────────┤    │
│  │ Titolo Ricetta           │    │
│  │ [Dolce] [Gluten-Free]    │    │
│  │ ...                      │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

---

## Sections

### Search

Full-text search filtering on client side:

```typescript
filteredRecipes = recipes.filter(recipe =>
  recipe.title.includes(query) ||
  recipe.ingredients.some(ing => ing.name.includes(query))
)
```

### Folders

Horizontal scrollable row with:

| Element | Action |
|---|---|
| `[+FolderPlus] Add` button | Opens "Create Folder" dialog |
| Folder card | Click → `/recipes/folder/[id]` |
| Folder card shows | Folder name + recipe count |

#### Create Folder Dialog

```
┌──────────────────────┐
│  Nuova Cartella       │
│  ┌────────────────┐   │
│  │ Nome cartella  │   │
│  └────────────────┘   │
│     [Annulla] [Crea]  │
└──────────────────────┘
```

### Recipe List

Each recipe row includes:

| Element | Detail |
|---|---|
| **Title** | Truncated, clickable → `/recipes/[id]` |
| **Category badge** | `[Primi]` `[Dolci]` etc. |
| **Dietary badges** | Color-coded (emerald/green/teal/blue) |
| **Prep time** | `⏱ 15 min` |
| **Servings** | `👥 2 porzioni` |
| **Source icon** | Platform icon (Instagram/TikTok/YouTube/Facebook/Web) |
| **⋮ Menu** | Move to folder / Delete |

#### Row Actions

| Action | Implementation |
|---|---|
| **Move to folder** | `DropdownMenu` → `Dialog` with folder list → `useMoveRecipeToFolder()` |
| **Delete** | `DropdownMenu` → `AlertDialog` confirmation → `useRemoveFromUserRecipes()` |

---

## States

| State | Handling |
|---|---|
| **Loading** | Grid of 6 skeleton aspect-[4/5] cards |
| **Empty cookbook** | Large `ChefHat` illustration + "Import your first recipe" CTA button |
| **Empty search results** | `ChefHat` icon + "Clear filters" button |
| **Normal** | List of recipe rows |

---

## Data Flow

```
useRecipes() → all user's saved recipes
useUserFolders() → user's folders
  → client-side search filtering
  → render rows + folder cards
```

---

## Analytics Events

| Event | Trigger |
|---|---|
| `recipe_removed` | Recipe deleted from cookbook |

---

## Dependencies

| import | Usage |
|---|---|
| `@/hooks/useRecipes` | `useRecipes`, `useRemoveFromUserRecipes`, `useUserFolders`, `useCreateFolder`, `useMoveRecipeToFolder` |
| `next-intl` | `useTranslations` |
| `@/components/ui/alert-dialog` | Delete confirmation |
| `@/components/ui/dialog` | Folder create + move dialogs |
| `@/components/ui/dropdown-menu` | Recipe action menu |
| `@/components/ui/input` | Search field |
| `@/components/ui/badge` | Category/dietary badges |
| `lucide-react` | Icons |
