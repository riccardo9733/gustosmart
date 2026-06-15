# Folder Detail — GustoSmart

**Route:** `/recipes/folder/[id]`  
**File:** `src/app/(protected)/recipes/folder/[id]/page.tsx`  
**Type:** Recipe folder contents manager

---

## Purpose

View, search, and manage recipes within a specific folder. Supports adding/removing recipes, moving recipes between folders, and deleting the folder itself.

---

## Architecture

```
┌──────────────────────────────────┐
│  ◀ 📁 Nome Cartella         [🗑] │
│  ┌──────────────────────────┐    │
│  │ 🔍 Cerca nelle ricette   │    │
│  └──────────────────────────┘    │
├──────────────────────────────────┤
│  5 ricette          [+ Aggiungi] │
│                                  │
│  ┌──────────────────────────┐    │
│  │ Titolo Ricetta           │    │
│  │ [Primo] [Vegano]         │    │
│  │ ⏱ 15 min 👥 2 porzioni  │    │
│  │              [icona]  ⋮  │    │
│  ├──────────────────────────┤    │
│  │ Titolo Ricetta           │    │
│  │ ...                      │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

---

## Sections

### Header

| Element | Detail |
|---|---|
| Back button | `ArrowLeft` → navigates to `/recipes` |
| Folder name | `font-heading text-2xl md:text-3xl` with folder icon |
| Delete button | `Trash2` → `AlertDialog` confirmation → `useDeleteFolder()` → redirect |

### Search

Client-side full-text search on recipe title and ingredient names.

### Action Bar

| Element | Detail |
|---|---|
| Recipe count | "X ricette" or "1 ricetta" |
| Add recipes button | Opens multi-select `Dialog` with candidate recipes |

---

## Features

### Add Recipes Dialog

Multi-select dialog showing recipes not already in this folder:

```
┌──────────────────────────────┐
│  Aggiungi Ricette            │
│                              │
│  ☐ Ricetta A (in Altra Cart)│
│  ☑ Ricetta B                │
│  ☐ Ricetta C                │
│                              │
│     [Annulla]   [Crea]      │
└──────────────────────────────┘
```

- Shows each recipe's current folder if already in one
- Confirm button calls `useAddRecipesToFolder()`

### Move Recipe

Same move dialog as the main recipes page — allows moving to any other folder or to "no folder".

### Delete Recipe

`AlertDialog` confirmation → `useRemoveFromUserRecipes()` — same as main recipes page.

---

## States

| State | Handling |
|---|---|
| **Loading** | Skeleton row with back button skeleton |
| **Folder not found** | `ChefHat` + "Cartella non trovata" + back CTA |
| **Empty folder** | `FolderOpen` icon + "No recipes" + add recipes CTA |
| **Empty search** | `ChefHat` + "No results" |
| **Normal** | List of recipe rows |

---

## Data Flow

```
useParams() → folderId
useRecipes() → all user recipes
useUserFolders() → all folders

folder = folders.find(f => f.id === folderId)
folderRecipes = recipes.filter(r => r.folderId === folderId)
candidateRecipes = recipes.filter(r => r.folderId !== folderId)
```

---

## Analytics Events

| Event | Trigger |
|---|---|
| `recipe_removed` | Recipe deleted from folder |

---

## Dependencies

| import | Usage |
|---|---|
| `@/hooks/useRecipes` | `useRecipes`, `useUserFolders`, `useDeleteFolder`, `useMoveRecipeToFolder`, `useAddRecipesToFolder`, `useRemoveFromUserRecipes` |
| `next-intl` | `useTranslations` |
| `@/components/ui/alert-dialog` | Delete folder/recipe confirmations |
| `@/components/ui/dialog` | Add recipes dialog, move dialog |
| `@/components/ui/dropdown-menu` | Recipe action menu |
| `@/components/ui/button` | Action buttons |
| `@/components/ui/input` | Search field |
| `@/components/ui/badge` | Category/dietary badges |
| `lucide-react` | Icons |
