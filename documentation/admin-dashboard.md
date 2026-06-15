# Admin Dashboard — GustoSmart

**Route:** `/admin`  
**File:** `src/app/(protected)/admin/page.tsx`  
**Type:** Real-time KPI & analytics dashboard  
**Access:** Admin only (`profile.role === "admin"`)

---

## Purpose

Real-time monitoring dashboard for app analytics, ingestion metrics, AI spending (OpenRouter), user management, and event logs.

---

## Tab Structure

```
┌──────────────────────────────────────────────────┐
│  🛡 Area Amministrativa                          │
│  Dashboard KPI & Analytics                       │
│  Real-time data (last 7 days) [🟢 Live Sync]     │
├──────────────────────────────────────────────────┤
│  [Panoramica] [Analisi Ingest] [Spese OpenRouter]│
│  [Utenti (42)] [Registro Eventi (1,234)]         │
├──────────────────────────────────────────────────┤
│                                                  │
│         (content varies by active tab)            │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Tab 1: Panoramica (Overview)

### KPI Stat Cards

| Card | Metric | Icon |
|---|---|---|
| Scansioni Avviate | `initiatedImports.length` | `Zap` |
| Tasso di Successo | `(completed / initiated) × 100` | `CheckCircle2` |
| Salvataggi Ricettario | `recipesSaved` count | `Bookmark` |
| Installazioni PWA | `pwaInstalls` (with accepted/shown breakdown) | `Smartphone` |

### Charts

#### Ingestion Trend (AreaChart)

- **Type:** `AreaChart` with 2 series (success + failure)
- **Period:** Last 7 days (daily buckets)
- **Visual:** Gradient fill under each line, legend

#### OpenRouter Cost (AreaChart)

- **Type:** `AreaChart` 
- **Period:** Last 7 days (daily buckets)
- **Format:** `$0.000` tick formatting
- **Visual:** Amber gradient fill

#### Platform Distribution (PieChart, donut)

- **Type:** `PieChart` with `innerRadius={50} outerRadius={75}`
- **Segments:** Instagram (pink), TikTok (teal), YouTube (red), Facebook (blue), Web (primary)
- **Legend:** Shows only platforms with data

#### Feature Engagement (BarChart, horizontal)

| Action | Color |
|---|---|
| Checklist Cottura | Primary |
| Porzioni Ricalcolate | Blue |
| Traduzioni AI | Teal |
| Info Nutrizionali | Amber |
| Modifiche Spesa | Pink |

---

## Tab 2: Analisi Ingest

### Platform Distribution Bars

Horizontal bar chart with:

| Platform | Bar Color |
|---|---|
| Instagram | `bg-pink-500` |
| TikTok | `bg-teal-400` |
| YouTube | `bg-red-500` |
| Facebook | `bg-blue-500` |
| Web | `bg-primary` |

Each row shows: platform icon + name, proportional bar, count, percentage.

### Cache Hit Rate

Shown at bottom: `X ricette (Y% dei successi)`.

### Global Ingestion Status

| Metric | Display |
|---|---|
| Import Completati | Large emerald number |
| Import Falliti | Large rose number |
| ScrapeCreators Tokens | Badge with remaining credits |

### Recent Failures

Last 5 failed imports shown with:
- Platform icon
- Error type
- User email
- Timestamp

---

## Tab 3: Spese OpenRouter

### Loading / Error States

| State | Display |
|---|---|
| **Loading** | Spinner + "Caricamento crediti..." |
| **Error** | `AlertTriangle` + error message + "Riprova" button |

### Credits & Balance Cards

| Card | Detail |
|---|---|
| Acquistati | `total_credits` from OpenRouter API |
| Spesi | `total_usage` from OpenRouter API |
| Residuo | `total_remaining` (emerald) |

### Key Info Card

| Detail | Source |
|---|---|
| Label | `key.label` |
| Limit | `key.limit` (null = unlimited) |
| Usage | `key.usage` |
| Daily usage | `key.usage_daily` |
| Weekly usage | `key.usage_weekly` |
| Monthly usage | `key.usage_monthly` |
| Rate limit | `key.rate_limit.requests` per `key.rate_limit.interval` |
| Free tier | `key.is_free_tier` |

### Generation Detail Modal

Click a generation ID to open modal showing:

| Field | Detail |
|---|---|
| Model | `data.model` |
| Total cost | `data.total_cost` |
| Prompt tokens | `data.tokens_prompt` |
| Completion tokens | `data.tokens_completion` |
| Latency | `data.latency` |

### Call Log

Filtered by type (`all` / `ingest` / `translate`), paginated (15 per page).

---

## Tab 4: Utenti (Users)

### Features

| Feature | Detail |
|---|---|
| Search | By display name or email |
| Sort | Scans, Events, Date (registration), Tokens |
| Pagination | 12 users per page |
| Real-time | `onSnapshot` on Firestore `users` collection |

### User KPI Summary

| KPI | Calculation |
|---|---|
| Total users | `users.length` |
| Active users | Unique userIds in analytics events (last 7 days) |
| Added last 7 days | `createdAt` within 7 days |
| Added last 24h | `createdAt` within 24 hours |

### User Row Display

| Column | Detail |
|---|---|
| Avatar | Gradient avatar based on UID hash |
| Name | `displayName` |
| Email | `email` |
| Role | `role` (admin/user) |
| Scans | From analytics events (`recipe_import_completed`) |
| Saves | From analytics events (`recipe_saved`) |
| Events | Total event count |
| Tokens | From user document |
| Language | `preferences.language` |
| Registered | `createdAt` date |

---

## Tab 5: Registro Eventi (Logs)

### Features

| Feature | Detail |
|---|---|
| Search | By event name, user email, or user ID |
| Pagination | 20 events per page |
| Real-time | `onSnapshot` on Firestore `analytics_events` (last 500) |

### Log Entry Display

| Column | Detail |
|---|---|
| Event | `eventName` |
| User | `userEmail` or "Anonimo" |
| Timestamp | Formatted date/time |

---

## Role Protection

```typescript
useEffect(() => {
  if (!loadingUser) {
    if (!profile || profile.role !== "admin") {
      router.replace("/");
    }
  }
}, [profile, loadingUser, router]);
```

Non-admin users are redirected to home. A loading spinner shows during permission check.

---

## Data Sources

| Source | Method | Collection |
|---|---|---|
| Analytics events | `onSnapshot` real-time | `analytics_events` (limit 500) |
| Users | `onSnapshot` real-time | `users` |
| OpenRouter credits | `fetch /api/admin/openrouter?endpoint=credits` | OpenRouter API proxy |
| OpenRouter key info | `fetch /api/admin/openrouter?endpoint=key` | OpenRouter API proxy |
| Generation detail | `fetch /api/admin/openrouter?endpoint=generation&id=X` | OpenRouter API proxy |

---

## Dependencies

| import | Usage |
|---|---|
| `recharts` | `AreaChart`, `BarChart`, `PieChart` |
| `@/components/ui/chart` | `ChartContainer`, `ChartTooltip`, `ChartLegend` (shadcn wrappers) |
| `@/components/ui/card` | KPIs and section cards |
| `@/components/ui/button` | Actions |
| `@/components/ui/input` | Search fields |
| `@/store/userSlice` | `selectUserProfile`, `selectUserLoading` |
| `firebase/firestore` | `onSnapshot`, `collection`, `query`, `orderBy`, `limit` |
| `lucide-react` | Icons |
