# Profile — GustoSmart

**Route:** `/profile`  
**File:** `src/app/(protected)/profile/page.tsx`  
**Type:** User profile and settings

---

## Purpose

User profile management with avatar editing, token usage display, app preferences (language, theme, measurement units), PWA installation, and account actions (logout, delete).

---

## Architecture

```
┌──────────────────────────────────┐
│        👤 Profile Avatar         │
│        ✏️ (edit button)         │
│        Riccardo                  │
│        user@email.com            │
├──────────────────────────────────┐
│  USAGE                           │
│  ┌────────────────────────────┐  │
│  │ ⚡ Token Disponibili       │  │
│  │ 85                          │  │
│  │ ████████░░░░░░░░░░░░░░░    │  │
│  │ 0 / 100 Scans               │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  PREFERENZE CUCINA               │
│  ┌────────────────────────────┐  │
│  │ 🌐 Lingua App → Italiano   │  │
│  │    [DropdownMenu] ▶        │  │
│  ├────────────────────────────┤  │
│  │ 🌓 Tema                    │  │
│  │    [Light] [Dark] [System] │  │
│  ├────────────────────────────┤  │
│  │ 📏 Unità di Misura         │  │
│  │    [Metrico] [Imperiale]   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  📱 Installa App                 │
│  (hidden if already installed)   │
├──────────────────────────────────┤
│  🚪 Esci                        │
│  🗑 Elimina Account             │
├──────────────────────────────────┤
│  v1.0.0                         │
│  Designed for Android & iOS     │
└──────────────────────────────────┘
```

---

## Sections

### Profile Header

| Element | Detail |
|---|---|
| **Avatar** | Circular image (proxy via `/api/proxy-image`), clickable → opens `ProfileImageDrawer` |
| **Edit button** | `Pencil` icon overlay on avatar |
| **Display name** | From Firestore user profile, fallback "Chef Gusto" |
| **Email** | From Firestore user profile |

### Token Usage

| Element | Detail |
|---|---|
| Icon | `Zap` with pulse animation |
| Token value | From `profile.tokens`, fallback 100 |
| Progress bar | Custom gradient (`terracotta-gradient`), width = `(tokens / 100) * 100%` |
| Labels | "0 / 100 Scans" — "100 / 100 Scans" |

### Kitchen Preferences

#### Language Selector

| Feature | Detail |
|---|---|
| Trigger | Shows current language flag + name + `ChevronRight` |
| Items | Fetched from Firestore `language` collection where `enabled === true` |
| Selection | Sets `NEXT_LOCALE` cookie + updates Firestore → reloads page |
| Default | Italian (`it`) |

#### Theme Toggle

| Option | Implementation |
|---|---|
| Light | `setTheme("light")` |
| Dark | `setTheme("dark")` |
| System | `setTheme("system")` |
| Library | `next-themes` |
| Active style | `bg-primary text-white` |

#### Measurement Units

| Option | Detail |
|---|---|
| Metrico | `measurementSystem: "metric"` |
| Imperiale | `measurementSystem: "imperial"` |
| Persistence | Saves to Firestore `users/{uid}/preferences` |

### PWA Install

| Property | Value |
|---|---|
| Shown when | `!isInstalled` from `usePWA()` context |
| Icon | `Smartphone` |
| Title | "Installa App" |
| Description | "Aggiungi GustoSmart alla schermata home" |
| Button | `terracotta-gradient` CTA calling `installApp()` |

### Account Actions

| Action | Implementation |
|---|---|
| **Log Out** | `signOut()` from Firebase Auth, loading state with "Uscendo..." |
| **Delete Account** | Button present (handler implementation not shown) |

### Version Info

Shows app version and "Designed for Android & iOS" text.

---

## Features

### Avatar Upload

`ProfileImageDrawer` component (bottom sheet/drawer) for uploading/changing profile photo.

### Language Change Flow

```
User selects language
  → update Firestore user.preferences.language
  → dispatch setUserSuccess() to Redux
  → set NEXT_LOCALE cookie
  → toast.success()
  → window.location.reload() after 500ms
```

---

## States

| State | Handling |
|---|---|
| **Theme not mounted** | Theme toggle hidden until `mounted = true` (SSR hydration guard) |
| **Logging out** | Button shows "Uscendo..." + disabled state |
| **Language loading** | Languages fetched asynchronously from Firestore |

---

## Data Flow

```
Redux store → selectUserProfile
  → display name, email, photo, tokens, preferences

Firestore `language` collection → enabled languages (fetched on mount)

usePWA() → isInstalled, installApp
useTheme() → theme, setTheme
```

---

## Dependencies

| import | Usage |
|---|---|
| `@/store/userSlice` | `selectUserProfile`, `setUserSuccess` |
| `@/store/hooks` | `useAppDispatch`, `useAppSelector` |
| `@/contexts/pwa-context` | `usePWA` for installation |
| `@/components/profile-image-drawer` | Avatar upload drawer |
| `@/components/ui/button` | Action buttons |
| `@/components/ui/dropdown-menu` | Language selector |
| `next-themes` | Theme management |
| `firebase/auth` | `signOut` |
| `firebase/firestore` | Firestore reads/writes |
| `next-intl` | `useTranslations` |
| `lucide-react` | Icons |
