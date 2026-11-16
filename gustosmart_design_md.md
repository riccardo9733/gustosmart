gust---
version: 1.0.0
name: GustoSmart
website: "https://gustosmart.app"
description: >-
  Una PWA mobile-first dedicata alla raccolta, organizzazione e preparazione di ricette culinarie. Il design abbandona l'estetica "AI-slop" (niente stelline magiche, gradienti artificiali o badge arcobaleno) per abbracciare un'identità editoriale e gastronomica calda, pulita e tattile. Il sistema si basa su superfici neutre ad alto contrasto (carta calda nel tema chiaro, ardesia profonda nel tema scuro), un unico colore primario terracotta vibrante ("#E84E24") riservato esclusivamente alle azioni principali, e una rigorosa disciplina monocromatica per metadati e filtri dietetici.

tags:
  - "Food & Culinary"
  - "Mobile PWA"
  - "Editorial & Minimal"
  - "Dual Theme (Light/Dark)"
lastUpdated: "2026-11-16"

colors:
  # --- LIGHT THEME (Carta Gastronomica Calda) ---
  light-canvas: "#FAF8F5"
  light-surface: "#FFFFFF"
  light-surface-subtle: "#F3EFEA"
  light-ink: "#141413"
  light-ink-secondary: "#57534E"
  light-ink-muted: "#8C867E"
  light-hairline: "#E7E2DA"
  light-brand-soft: "#FCECE8"

  # --- DARK THEME (Ardesia da Cucina Notturna) ---
  dark-canvas: "#111110"
  dark-surface: "#1C1B1A"
  dark-surface-subtle: "#262422"
  dark-ink: "#F5F3EF"
  dark-ink-secondary: "#A8A29E"
  dark-ink-muted: "#78716C"
  dark-hairline: "#2E2B29"
  dark-brand-soft: "#331912"

  # --- BRAND & SEMANTIC TOKENS (Shared across themes) ---
  brand-primary: "#E84E24"
  brand-primary-hover: "#D14019"
  on-brand: "#FFFFFF"
  status-success: "#2E7D32"
  status-warning: "#B45309"
  status-danger: "#C62828"

typography:
  display-lg:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  heading-md:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  heading-sm:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0em"
  label-md:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0em"
  caption:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.02em"
  numeric-tabular:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0em"
    fontVariantNumeric: "tabular-nums"

rounded:
  none: "0px"
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  pill: "9999px"

spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
  safe-bottom: "96px"

components:
  top-app-bar:
    backgroundColor: "{colors.light-canvas} / {colors.dark-canvas}"
    textColor: "{colors.light-ink} / {colors.dark-ink}"
    height: "56px"
    padding: "0 16px"
    borderBottom: "1px solid {colors.light-hairline} / {colors.dark-hairline}"
  token-counter-pill:
    backgroundColor: "{colors.light-surface-subtle} / {colors.dark-surface-subtle}"
    textColor: "{colors.light-ink} / {colors.dark-ink}"
    typography: "{typography.numeric-tabular}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  bottom-tab-bar:
    backgroundColor: "{colors.light-surface} / {colors.dark-surface}"
    border: "1px solid {colors.light-hairline} / {colors.dark-hairline}"
    rounded: "{rounded.pill}"
    height: "64px"
    padding: "6px"
  fab-import:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.pill}"
    width: "48px"
    height: "48px"
  filter-chip:
    backgroundColor: "{colors.light-surface} / {colors.dark-surface}"
    textColor: "{colors.light-ink-secondary} / {colors.dark-ink-secondary}"
    border: "1px solid {colors.light-hairline} / {colors.dark-hairline}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "36px"
  filter-chip-active:
    backgroundColor: "{colors.light-ink} / {colors.dark-ink}"
    textColor: "{colors.light-canvas} / {colors.dark-canvas}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "36px"
  dietary-tag-neutral:
    backgroundColor: "{colors.light-surface-subtle} / {colors.dark-surface-subtle}"
    textColor: "{colors.light-ink-secondary} / {colors.dark-ink-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: "4px 8px"
  recipe-card:
    backgroundColor: "{colors.light-surface} / {colors.dark-surface}"
    border: "1px solid {colors.light-hairline} / {colors.dark-hairline}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.on-brand}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    height: "48px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.light-surface-subtle} / {colors.dark-surface-subtle}"
    textColor: "{colors.light-ink} / {colors.dark-ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    height: "48px"
    padding: "0 20px"
  step-card:
    backgroundColor: "{colors.light-surface} / {colors.dark-surface}"
    border: "1px solid {colors.light-hairline} / {colors.dark-hairline}"
    rounded: "{rounded.md}"
    padding: "16px"
  bottom-sheet:
    backgroundColor: "{colors.light-surface} / {colors.dark-surface}"
    roundedTop: "{rounded.lg}"
    padding: "24px 16px 32px 16px"
---

## Overview & Filosofia Anti-"AI-Slop"

**GustoSmart** è uno strumento quotidiano da cucina, non una vetrina tecnologica. L'interfaccia deve trasmettere la pulizia e la leggibilità di un libro di cucina contemporaneo unito all'ergonomia di un'app mobile nativa.

Il restyling risolve tre criticità dell'interfaccia attuale:
1. **Eliminazione dell'AI-Slop visivo e testuale:** Rimozione totale delle icone con stelline magiche (*sparkles* `✨`), dei bagliori sfumati rosa/arancio dietro la top-bar e delle micro-copy autoriferite all'intelligenza artificiale (es. *"Trascritto e ottimizzato in formato smart"* o *"I nostri sistemi analizzeranno con l'intelligenza artificiale"*). L'importazione è un'azione funzionale: si incolla un link, si ottiene la ricetta.
2. **Disciplina Cromatica (Addio effetto Arlecchino):** Nelle schermate attuali, le card delle ricette mescolano tag verdi (*Vegana*, *Senza glutine*), azzurri (*Vegetariana*), blu (*Senza lattosio*), arancioni (*kcal*) e rosa (*Instagram*). Nel nuovo sistema, **il colore è riservato esclusivamente all'interazione**. Tutti i metadati informativi e le etichette dietetiche diventano neutri e monocromatici.
3. **Ergonomia Mobile & Doppio Tema:** Ottimizzazione per l'uso con una mano sola (mentre si cucina), touch target minimi di `44px`–`48px`, numeri tabellari per dosi e tempi, e supporto paritario per Tema Chiaro e Tema Scuro.

## Colors & Gestione Dual-Theme

Il sistema adotta una palette **100% neutra per le superfici e i metadati**, lasciando al rosso-terracotta (`#E84E24`) il monopolio dell'attenzione visiva per le Call to Action e gli stati attivi primari.

### Tema Chiaro (Default)
Ispirato alla carta naturale non sbiancata per ridurre l'affaticamento visivo rispetto al bianco puro `#FFFFFF` su schermi OLED.
- **Canvas (`#FAF8F5`):** Sfondo principale delle schermate.
- **Surface (`#FFFFFF`):** Sfondo delle card ricette, della bottom-bar e delle modali.
- **Surface Subtle (`#F3EFEA`):** Sfondo per i tag dietetici, i campi di ricerca e i contenitori secondari.
- **Ink (`#141413`):** Nero caldo per titoli e testi principali (contrasto > 15:1 su canvas).
- **Hairline (`#E7E2DA`):** Bordi sottili da `1px` che definiscono le card senza bisogno di ombre pesanti.

### Tema Scuro (Modalità Cucina / Sera)
Progettato con toni di carbone caldo (evitando il nero assoluto `#000000` che crea effetto *smearing* durante lo scroll e riduce la leggibilità dei bordi).
- **Canvas (`#111110`):** Sfondo principale profondo.
- **Surface (`#1C1B1A`):** Card elevate di un gradino tonale rispetto al canvas.
- **Surface Subtle (`#262422`):** Tag dietetici, input field e pillole inattive.
- **Ink (`#F5F3EF`):** Bianco sporco caldo per evitare l'effetto abbagliamento al buio.
- **Hairline (`#2E2B29`):** Bordi strutturali per separare le card dal fondo.

### Colore Accento Unico
- **Brand Primary (`#E84E24`):** Utilizzato *solo* per: pulsante primario (`Aggiungi al ricettario`), pulsante centrale `+` nella tab-bar, checkbox completate, numeri delle dosi negli ingredienti e step attivi.
- **Regola di desaturazione Dark Mode:** Nel tema scuro, `#E84E24` mantiene la sua tonalità per garantire riconoscibilità, ma le superfici soft (`dark-brand-soft: #331912`) vengono scurite per evitare aloni luminosi eccessivi.

## Typography & Gerarchia Mobile

Il font di sistema consigliato è **Plus Jakarta Sans** (o **Inter** come fallback), scelto per l'eccellente leggibilità a piccole dimensioni e il supporto nativo ai numeri tabellari.

- **Numeri Tabellari (`tabular-nums`):** Obbligatorio su tutte le quantità degli ingredienti (`20 ml`, `150 ml`), tempi di cottura (`30 min`), porzioni e contatore crediti. Evita che il layout "salti" quando si cambiano le porzioni con `+` e `-`.
- **Nessun testo troncato inutilmente:** Nelle liste del Ricettario, i titoli delle ricette possono andare su 2 righe (`line-clamp-2`) invece di essere troncati su una riga sola con `...`.
- **Niente tutto-maiuscolo aggressivo:** I tag dietetici (`Senza glutine`, `Vegana`) passano dal `TEXT-TRANSFORM: UPPERCASE` attuale al normale *Sentence case* per ridurre il rumore visivo.

## Iconografia (Regole Rigide)

1. **Stile:** Esclusivamente icone lineari (*outline*) con spessore tratto uniforme (`1.75px` o `2px`), estremità arrotondate (es. libreria **Lucide Icons** o **Phosphor Regular**).
2. **Icone Bandite:**
   - **Vietata l'icona Sparkles / Stelline (`✨`):** Rimuoverla accanto al titolo *"Cosa si cucina oggi?"*, dal pulsante di invio nel modale *"Importa una Ricetta"* (sostituire con una freccia `ArrowRight` o `Download`) e dal badge *"Tradotto"* (sostituire con un semplice globo `Globe` o icona lingua `Languages`).
   - **Vietati i loghi social multicolore invasivi:** Nelle card della Home e del Ricettario, sostituire i badge colorati di Instagram/YouTube con un'icona monocromatica discreta (`14px`, colore `ink-muted`) seguita dal nome della fonte in testo semplice. I loghi ufficiali a colori sono ammessi *solo* nella scheda `Attribuzione dell'Autore` in fondo al dettaglio ricetta.

## Mobile Best Practices & Layout

### 1. Spaziatura e Griglia
- **Margini laterali:** `16px` (`{spacing.base}`) fisse su tutte le schermate.
- **Griglia Home:** Evitare card a due colonne troppo strette che costringono i titoli su 3-4 righe e impilano 5 tag uno sotto l'altro. Preferire **card a larghezza piena (1 colonna)** con layout orizzontale compatto (immagine quadrata a sinistra o testata pulita sopra, massimo 2 tag dietetici visibili + `+N`).
- **Safe Area Inferiore:** Ogni schermata scrollabile deve avere un `padding-bottom: 96px` (`{spacing.safe-bottom}`) per garantire che l'ultimo elemento non resti mai coperto dalla floating bottom-bar.

### 2. Touch Target & Ergonomia
- Tutti gli elementi interattivi (checkbox ingredienti, pulsanti `+`/`-` porzioni, chip di filtro, tab di navigazione) devono avere un'area cliccabile minima di **`44px × 44px`**.
- **Modalità Cottura (Procedimento):** Nella schermata di dettaglio ricetta, toccare *l'intera card* dello step (non solo il piccolo quadratino `Passaggio Completato`) deve segnare il passaggio come completato, riducendo l'opacità della card al `50%` per evidenziare subito il passaggio successivo.

### 3. Navigazione (`bottom-tab-bar`)
- Mantenere la barra flottante inferiore a 5 elementi (`Home`, `Ricettario`, `+`, `Spesa`, `Profilo`).
- **Stato Attivo:** Invece di riempire l'intera pillola di arancione brillante per la tab attiva (che compete visivamente con il pulsante centrale `+`), usare icona e testo in `#E84E24` (o `ink` pieno) lasciando il pulsante centrale `+` come unico elemento con riempimento pieno `#E84E24`. Questo riduce immediatamente il peso visivo del 40% in ogni schermata.

## Refactoring Specifico per Schermata

- **Top App Bar (Tutte le pagine):** Rimuovere il gradiente sfumato arancio-rosa dietro il logo `GustoSmart`. Usare uno sfondo piatto `canvas` con un bordo inferiore `1px hairline` che appare solo allo scroll. Il contatore crediti (es. `99`) diventa una pillola neutra `surface-subtle` con icona fulmine monocromatica.
- **Home (`Cosa si cucina oggi?`):**
  - Rimuovere l'icona stelline accanto al titolo.
  - Sostituire i chip di filtro verde brillante (`SENZA GLUTINE`, `VEGANA`) con chip neutri (`filter-chip`) che diventano scuri ad alto contrasto (`filter-chip-active`) solo quando selezionati.
- **Importa una Ricetta (Bottom Sheet):**
  - Sostituire il pulsante rosa con stelline accanto all'input URL con un pulsante solido `brand-primary` (`#E84E24`) con icona freccia avanti (`→`).
  - Riscrivere il box informativo *"Come funziona?"* in tono pratico: *"Incolla il link di un video o di un blog: estrarremo automaticamente ingredienti, dosi e passaggi."*
- **Dettaglio Ricetta:**
  - Eliminare il testo *"Trascritto e ottimizzato in formato smart."* sotto il titolo.
  - Raggruppare i metadati (tempo, calorie, porzioni) in una singola riga pulita separata da punti mediani (`30 min · 85 kcal/100g · 2 porz.`), eliminando i 4 mini-box colorati attorno a ogni dato.
- **Lista della Spesa (`Spesa Intelligente`):**
  - Rinominare in *"Lista della Spesa"* (più naturale e meno "AI-slop").
  - Il pulsante `Aggiungi` diventa solido e leggibile quando l'input contiene testo; disabilitato in `surface-subtle` quando vuoto.

## Do's and Don'ts

### Do
- **Usa la gerarchia tipografica al posto del colore:** Distingui titoli, quantità e metadati giocando su peso (`700` vs `400`), dimensione e scala di grigi (`ink` vs `ink-secondary`).
- **Mantieni i tag dietetici neutri:** *Vegana*, *Senza glutine*, *Primi* sono informazioni di classificazione, non allarmi o pulsanti. Usa `dietary-tag-neutral`.
- **Rispetta la regola dell'1-Accento:** In qualsiasi schermata mobile, non devono mai esserci più di 2 elementi colorati in `#E84E24` contemporaneamente (es. il pulsante `+` in basso e la CTA principale della pagina).
- **Testa il contrasto in Dark Mode:** Assicurati che i bordi `dark-hairline` (`#2E2B29`) siano sempre visibili per delimitare le card sullo sfondo `#111110`.

### Don't
- **Non usare mai icone "AI/Magic" (sparkle/stelline):** Trasmettono un senso di prodotto generico e poco curato.
- **Non colorare ogni categoria alimentare con una tinta diversa:** Niente verde per vegano, azzurro per vegetariano, blu per senza lattosio. Crea solo caos visivo e confonde l'utente su cosa sia cliccabile e cosa no.
- **Non usare gradienti radiali o sfumature decorativi dietro gli header:** Sporcano la leggibilità e fanno sembrare l'app datata.
- **Non ridurre i padding interni delle card sotto i `16px`:** Su mobile l'aria tra gli elementi è fondamentale per la scansionabilità rapida mentre si cucina.