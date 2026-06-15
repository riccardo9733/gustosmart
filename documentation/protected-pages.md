# Protected Pages — GustoSmart

**Route group:** `src/app/(protected)/`  
**Auth:** All pages behind `AuthGuard`  
**Layout:** `Header` + `<main>` + `BottomNav` (hidden on `/admin`)

---

## Pages

| Route | File | Document |
|---|---|---|
| `/` | `page.tsx` | [home-feed.md](./home-feed.md) |
| `/recipes` | `recipes/page.tsx` | [recipes-list.md](./recipes-list.md) |
| `/recipes/[id]` | `recipes/[id]/page.tsx` | [recipe-detail.md](./recipe-detail.md) |
| `/recipes/folder/[id]` | `recipes/folder/[id]/page.tsx` | [folder-detail.md](./folder-detail.md) |
| `/shopping` | `shopping/page.tsx` | [shopping-list.md](./shopping-list.md) |
| `/profile` | `profile/page.tsx` | [profile.md](./profile.md) |
| `/admin` | `admin/page.tsx` | [admin-dashboard.md](./admin-dashboard.md) |

---

## Shared Layout

```
<AuthGuard>
  <IngestProvider>
    <Header />                     ← fixed top
    <main className="pt-20 px-6 max-w-5xl mx-auto w-full">
      {children}
    </main>
    {!isAdmin && <BottomNav />}    ← fixed bottom
  </IngestProvider>
</AuthGuard>
```

## Common Patterns

- **Glassmorphism:** Reused `.glass-panel` class across pages
- **Loading:** `Skeleton` components throughout
- **Notifications:** `sonner` toast for all actions
- **Analytics:** `@/lib/analytics` `trackEvent()` for user interactions
- **i18n:** `next-intl` `useTranslations()` for all strings
- **Icons:** `lucide-react` + custom SVG icons (YouTube, Facebook, TikTok, Instagram)
