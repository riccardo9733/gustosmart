# Refactor — da Glassmorphism a superfici solide

Obiettivo: allineare il codice al nuovo `context/pages/gustosmart_design_system/DESIGN.md` (Warm Solid Minimalism, superfici opache, niente blur da vetro).

Regola di sostituzione globale:
- `surface-panel` → `bg-card` + `border-border` (light: card bianca, dark: token `surface-container` già solido)
- `bg-background/60|70|80|95` → `bg-background`
- `bg-surface-container/60|95` → `bg-surface-container`
- `bg-card/10|25|40` → `bg-card`
- `bg-white/5|10|40` + `hover:bg-white/...` → rimuovere o usare `hover:bg-muted`
- `backdrop-blur-*`, `backdrop-filter`, `bg-opacity-70` → rimuovere
- `border-white/10|20` → `border-border`
- Rinforzare profondità con bordo + ombra `shadow-primary/5` già in uso dove si toglie il blur

> Nota: `blur: 40px` resta valido solo per ombre ambientali. `background-blob` con `blur(80px)` va valutato nella Fase 1.

## Fase 0 — Baseline e inventario
- [x] `npm run build` verde prima di iniziare — BLOCCATO: `next: command not found`, `npm install` fallisce per permessi cache (`ENOTEMPTY uhyphen`, `EPERM ~/.npm`, file root-owned). Da rilanciare con `sudo chown -R 502:20 ~/.npm`
- [ ] Screenshot light/dark di: home feed, lista ricette, dettaglio ricetta, shopping, profilo, login, admin, import drawer
- [x] Riferimenti design: `context/pages/gustosmart_design_system/DESIGN.md` (sezioni Brand, Surface Treatment, Elevation, Solid Cards, Inputs)
- [x] Token: `src/app/globals.css` (`--background`, `--card`, `--border`, `--surface-container-*`, `--radius`)

## Fase 1 — Token globali e utility — FATTA
- [x] `src/app/globals.css`: `.surface-panel` ora superficie solida (`background: var(--card)`, `border: var(--border)` anche in dark)
- [x] `src/app/globals.css`: `background-blob` senza `blur(80px)`, solo `opacity 0.08` come tinta tenue
- [x] `src/app/globals.css`: `.terracotta-gradient` tenuto (non è vetro)
- [ ] Grep di controllo finale: `grep -rn "surface-panel\|backdrop-blur\|backdrop-filter" src --include="*.tsx" --include="*.css"` (da fare in Fase 11)

## Fase 2 — Shell app (header, nav, overlay) — FATTA
- [x] `src/components/header.tsx`: ora `border-border bg-background dark:bg-surface-container`, senza blur
- [x] `src/components/bottom-nav.tsx`: ora `border-border bg-card dark:bg-surface-container`, senza blur
- [x] `src/components/ui/dialog.tsx`, `src/components/ui/drawer.tsx`, `src/components/ui/alert-dialog.tsx`: overlay `bg-black/40` senza blur
- [x] `src/components/policy-drawer.tsx` (content, header, card, tabella, footer solidi), `src/components/profile-image-drawer.tsx` (content solido), `src/contexts/pwa-context.tsx` (modale iOS solida)
- [ ] `src/components/import-drawer.tsx` rimandato alla Fase 10
- [ ] Verificare sticky/fixed in scroll: devono restare leggibili senza trasparenza (da fare con verifica visiva)

## Fase 3 — Home feed — FATTA
- [x] `src/app/(protected)/page.tsx`: 2 usi `surface-panel` (filtri/chip riga ~446,468) + 2 `backdrop-blur` (splash riga ~185, sticky bar riga ~433)
- [x] Splash double-click `bg-background/60 backdrop-blur-sm` → `bg-background` solido
- [x] Sticky bar `bg-background/80 backdrop-blur-md` → `bg-background` + `border-b border-border` + `shadow-sm`
- [x] Chip/filtri `hover:bg-white/40` → `hover:bg-muted`

## Fase 4 — Ricettario e cartelle — FATTA
- [x] `src/app/(protected)/recipes/page.tsx`: 2 `surface-panel` (card cartella riga ~237, riga ricetta ~321) + sticky `bg-background/80 backdrop-blur-md` riga ~433
- [x] `src/app/(protected)/recipes/folder/[id]/page.tsx`: 1 `surface-panel` riga ~375
- [x] Sostituire `border-white/10` → `border-border`, mantenere `hover:translate` e ombre esistenti

## Fase 5 — Dettaglio ricetta + share pubblica — FATTA
- [x] `src/app/(protected)/recipes/[id]/page.tsx`: 4 `surface-panel` (hero ~999, banner versioni ~1359, sezioni ~1616,~1741) + 4 `backdrop-blur` (back/share buttons ~923,934,951, drawer ~1058)
- [x] `src/app/recipes/share/[id]/page.tsx`: 4 `surface-panel` (~327,645,700,717) + 4 `backdrop-blur` (header ~267, back ~317, hero ~327, drawer ~364)
- [x] Pulsanti floating `bg-background/60 backdrop-blur-md` → `bg-background` + `border-border` + `shadow-md`
- [x] Hero `rounded-[32px]` resta, cambia solo il fill in solido

## Fase 6 — Lista della spesa — FATTA
- [x] `src/app/(protected)/shopping/page.tsx`: 3 `surface-panel` (contenitore ~361, riga attiva ~536, riga completata ~624)
- [x] Righe item: `border-white/10|white/5` → `border-border`, completate `opacity-55 line-through` ok da tenere
- [ ] Controllare contrasto checkbox + testo sbarrato su fondo solido light/dark

## Fase 7 — Profilo — FATTA
- [x] `src/app/(protected)/profile/page.tsx`: 4 `surface-panel` (~227,268,387,413 con `border-white/20`)
- [x] `border-white/20 dark:border-white/10` → `border-border` unico
- [x] Header profilo + card statistiche: fill solido, ombra `shadow-primary/5` esistente ok

## Fase 8 — Login — FATTA
- [x] `src/app/login/page.tsx`: 1 `surface-panel` (card ~379) + 1 `backdrop-blur-xl` (banner PWA ~655)
- [x] Card `rounded-[32px]` → `bg-card border-border shadow-xl`, togliere `border-0` vetro
- [x] Banner PWA `bg-background/80 backdrop-blur-xl border-white/20` → `bg-card border-border`

## Fase 9 — Admin dashboard — FATTA
- [x] `src/app/(protected)/admin/page.tsx`: 23 `surface-panel` (stat card ~947-991, pannelli ~1013-1434, tabelle ~1716-1959) + 1 `backdrop-blur-sm` overlay ~2106
- [x] È la fase più grossa: procedere per blocchi (stat → grafici → tabelle → overlay)
- [x] `rounded-[24px|28px]` restano, cambia solo fill/bordo in solidi
- [x] Overlay modale `bg-black/60 backdrop-blur-sm` → `bg-black/60` senza blur

## Fase 10 — Import drawer (flusso principale) — FATTA
- [x] `src/components/import-drawer.tsx`: 8 `surface-panel` (input pill ~222, bottoni ~269,280, chip ~306,314) + 1 `backdrop-blur-xl` (content ~188)
- [x] `DrawerContent ... bg-background dark:bg-surface-container/95 backdrop-blur-xl` → `bg-background` solido
- [x] Pill input `surface-panel rounded-2xl sm:rounded-full` → `bg-muted` o `bg-card` + `border-border` + `focus-within:border-primary`
- [x] Chip stato con `bg-background/50 dark:bg-white/5` → `bg-muted`

## Fase 11 — Verifica finale
- [ ] Grep zero: `grep -rn "surface-panel" src` deve dare 0 risultati
- [ ] Grep residui: `grep -rn "backdrop-blur\|backdrop-filter\|bg-white/5\|bg-white/10\|bg-white/40\|bg-background/60\|bg-background/80\|bg-card/40\|bg-surface-container/60" src` → valutare uno a uno
- [ ] `npm run lint` + `npm run build` verdi
- [ ] `npm test` (vitest) verde dove tocca UI
- [ ] Ricontrollo visivo light/dark delle 8 schermate della Fase 0, con attenzione a header/nav/drawer in scroll
- [ ] Aggiornare `documentation/protected-pages.md` riga 39 (cita `.surface-panel`) e `context/UI.md` (cita Glassmorphism, `backdrop-blur`, `bg-opacity-70`, navbar con blur, checklist riga 142)

## Fase 12 — Colori caramella e icone — FATTA
- [x] 12a: badge dieta, filtri dieta e bottoni versione unificati a Sage (`secondary`); nutri-score A/B/C/D/E, brand piattaforma, macro chart, badge cartella e warning ambra tenuti (semantica)
- [x] 12a-bis: residui `bg-muted/*` e `border-border/*` solidificati in dettaglio/share/home
- [x] 12b: testi 9/10/11px portati a `text-xs` (12px) in 12 file
- [x] 12c: icone tag/stepper/liste a 16px (`size-4`, `h-4 w-4`); icone inline al testo lasciate invariate
- [x] 12d: rimosse 5 Sparkles dai bottoni versione + 1 dal titolo feed; tenute: header sezione AI, badge traduzione, marcatori IA per-ingrediente, CTA import, nota assessment
- [x] 12d: badge "Ricetta Privata" viola + emoji sostituiti con Sage + icona Lock
- [x] 12e: `npm run build` verde, `vitest` 28/28; lint senza nuovi errori (solo categorie pre-esistenti)
