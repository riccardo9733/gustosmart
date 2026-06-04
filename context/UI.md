# Specifiche UI & UX - Applicazione Ricette Smart (GustoSmart)

Questo documento definisce la guida di stile visiva, la struttura dettagliata delle pagine e la roadmap di design (TODO checklist) per lo sviluppo dell'interfaccia utente di **GustoSmart**, l'applicazione web per l'importazione e la gestione intelligente delle ricette basata su [Analisi Funzionale](file:///Users/riccardo-z/Documents/dev/analisiFunzionale.md) e [Analisi Tecnica Stack](file:///Users/riccardo-z/Documents/dev/analisiTecnicaStack.md).

---

## 1. Design System & Identità Visiva

Il design dell'applicazione deve essere **Mobile-First**, estremamente fluido, pulito e "Premium". L'obiettivo è offrire un'esperienza utente moderna che trasmetta calore, amore per il cibo e innovazione tecnologica, combinando elementi di *Glassmorphism* con micro-animazioni.

### 1.1 Tavolozza Colori (Curata e Armoniosa)
Evitare colori piatti e basici. Utilizzeremo palette HSL calibrate per supportare in modo ottimale il passaggio tra **Light Mode** (caldo ed elegante) e **Dark Mode** (profondo e rilassante).

| Ruolo | Light Mode | Dark Mode | Descrizione / Utilizzo |
| :--- | :--- | :--- | :--- |
| **Primary (Brand)** | `hsl(12, 85%, 53%)` (Warm Terracotta / Coral) | `hsl(12, 90%, 58%)` (Vibrant Saffron) | Colore principale per pulsanti d'azione (CTA), accenti e elementi attivi. |
| **Secondary** | `hsl(162, 60%, 41%)` (Sage Green) | `hsl(162, 70%, 45%)` (Teal Mint) | Utilizzato per badge, successo, e per la spunta di elementi completati nella lista della spesa. |
| **Background** | `hsl(28, 20%, 98%)` (Warm Cream / Off-White) | `hsl(222, 47%, 9%)` (Deep Slate Navy) | Sfondo principale dell'applicazione. |
| **Card / Surface** | `hsl(0, 0%, 100%)` (Pure White) | `hsl(223, 40%, 14% / 70%)` (Semitransparent Slate) | Superfici di card e pannelli con effetto vetro (*backdrop-blur*). |
| **Border** | `hsl(20, 10%, 90%)` (Light Gray-Warm) | `hsl(217, 30%, 20%)` (Subtle Navy Border) | Bordi sottili per dividere le sezioni. |
| **Text Primary** | `hsl(222, 47%, 12%)` (Charcoal) | `hsl(210, 40%, 98%)` (Soft White) | Testo principale ad alto contrasto. |
| **Text Secondary** | `hsl(215, 16%, 47%)` (Muted Slate) | `hsl(215, 20%, 65%)` (Muted Gray) | Testo secondario, didascalie e placeholder. |

### 1.2 Tipografia (Google Fonts)
*   **Titoli (Heading):** **Outfit** (Alternativa: *Plus Jakarta Sans*). Una font geometrica, moderna e amichevole.
*   **Corpo del Testo:** **Inter** (Alternativa: *SF Pro Display*). Ottimizzata per la leggibilità anche a piccole dimensioni su dispositivi mobili.

### 1.3 Layout & Navigazione
*   **Mobile (Bottom Navigation Bar):** Fissata in basso con effetto sfocato (*Glassmorphism* - `backdrop-blur-md bg-opacity-70`). Icone minimali (Home, Ricettario, Spesa, Profilo).
*   **Desktop/Tablet (Sidebar):** Barra laterale sinistra collassabile con animazione fluida.
*   **Card & Componenti:** Angoli arrotondati ampi (`rounded-2xl` / `rounded-3xl`), ombreggiature morbide e diffuse (`shadow-sm` per il giorno, bagliori impercettibili `shadow-[0_0_15px_rgba(255,255,255,0.02)]` per la notte).

---

## 2. Descrizione Dettagliata delle Pagine

### 2.1 Pagina di Login & Registrazione (Autenticazione)
*   **Obiettivo:** Consentire un accesso rapido ed elegante.
*   **Layout:** Centrato con un'illustrazione astratta di cibo/cucina sul lato (desktop) o un gradiente animato di sfondo (mobile).
*   **Elementi Interfaccia:**
    *   Logo dell'app "GustoSmart" stilizzato.
    *   Pulsante **Social Login con Google** (Stile Premium, con logo SVG originale Google).
    *   Form di accesso tradizionale (Email, Password) con validazione real-time sui campi.
    *   Link di switch tra "Accedi" e "Registrati" con transizione orizzontale.
*   **Dettagli UX:** I campi di input utilizzano un bordo color Terracotta quando selezionati (*focus*). Messaggi d'errore integrati (Zod validation) che appaiono in dissolvenza.

### 2.2 Pagina Home (Dashboard di Importazione)
*   **Obiettivo:** Incollare il link social e avviare l'ingestione della ricetta.
*   **Layout:** Pulito, incentrato su un unico box di input prominente.
*   **Elementi Interfaccia:**
    *   **Hero Message:** "Trasforma i tuoi Reel in ricette reali".
    *   **Input Box Principale:** Un grande campo di testo arrotondato (`rounded-full` o `rounded-2xl`) con pulsante interno "Importa" (Icona di un fulmine o di una bacchetta magica).
    *   **Area Suggerimenti:** Badge cliccabili sotto l'input (es. "Instagram Reel", "TikTok Video", "Link Web") per mostrare il tipo di URL supportati.
    *   **Sezione Ultimi Arrivi (Preview):** Una mini-lista orizzontale (carousel) delle ultime 3 ricette importate per un rapido accesso.

#### 💡 Stato di Caricamento Interattivo (Ingestion Loader)
Poiché l'elaborazione (Apify + Gemini + Upload Storage) richiede dai 10 ai 20 secondi, l'interfaccia deve catturare l'attenzione dell'utente:
1.  Al clic su "Importa", la schermata mostra una transizione fluida verso un overlay a tutto schermo.
2.  Un'animazione 3D o Lottie mostra degli ingredienti che cadono in una pentola magica (o un cerchio di caricamento orbitale).
3.  **Indicatore di Progresso Dinamico:** Messaggi testuali che cambiano nel tempo (es. *"Scaricamento del video..."* ➔ *"Ascolto della trascrizione audio..."* ➔ *"L'IA sta strutturando gli ingredienti..."* ➔ *"Salvataggio nel ricettario..."*).
4.  Al completamento, un feedback visivo positivo (segno di spunta verde che pulsa) anticipa il reindirizzamento alla pagina di dettaglio.

### 2.3 Pagina Ricettario Personale (Ricette Salvate)
*   **Obiettivo:** Sfogliare, cercare e gestire le ricette dell'utente.
*   **Layout:** Griglia flessibile a 2 o 3 colonne (desktop) o lista a colonna singola (mobile).
*   **Elementi Interfaccia:**
    *   **Barra di Ricerca:** Input in alto con icona di lente d'ingrandimento. Ricerca in tempo reale su titoli e ingredienti.
    *   **Chip di Filtro Rapido:** Categorie di ricette (es. Primi, Secondi, Dolci) o fonti (Instagram, Web).
    *   **Grid delle Card Ricetta:**
        *   Immagine di copertina (caricata da Firebase Storage) con un leggero gradiente nero inferiore per la leggibilità del titolo.
        *   Overlay con l'icona della sorgente (es. logo Instagram o icona link).
        *   Titolo della ricetta, porzioni originali e tempo di preparazione (se disponibili).
        *   Menu a scomparsa (tre puntini) per eliminare o condividere la ricetta.
    *   **Empty State:** Se non ci sono ricette, mostrare un'illustrazione accattivante con un CTA gigante: "Importa la tua prima ricetta!".

### 2.4 Pagina Dettaglio Ricetta
*   **Obiettivo:** Leggere la ricetta, adattare le dosi e modificarne il contenuto.
*   **Layout:**
    *   *Mobile:* Grande immagine di intestazione in alto con effetto scorrimento parallasse. Le informazioni scivolano sopra come una scheda.
    *   *Desktop:* Layout a due colonne (Sinistra: Immagine e Ingredienti; Destra: Passaggi del procedimento).
*   **Elementi Interfaccia:**
    *   **Hero Image & Info:** Immagine con badge della sorgente originale. Titolo principale (`h1`).
    *   **Selettore Commensali (Counter):** Un box prominente con pulsanti `-` e `+` per modificare il numero di porzioni (default: quelle della ricetta originale). La transizione dei numeri ricalcolati deve utilizzare un effetto di scorrimento verso l'alto/basso (*number ticker*).
    *   **Lista Ingredienti Dinamica:** Checkbox decorative accanto a ogni ingrediente. Quantità e unità di misura si aggiornano istantaneamente in base al counter.
    *   **Istruzioni Passaggio-Passo:** Lista numerata elegante. Possibilità di "spuntare" i passaggi completati per non perdere il segno durante la preparazione.
    *   **Pulsante Modifica (Edit Mode):** Pulsante flottante o nell'header. Attiva l'editing manuale delle informazioni.

#### ✏️ Interfaccia di Modifica Manuale (Edit Form)
Per correggere eventuali errori dello scraping/IA:
1.  Cliccando su "Modifica", i testi e le quantità si trasformano in campi di input inline.
2.  L'utente può aggiungere/rimuovere ingredienti o passaggi tramite pulsanti dedicati.
3.  I pulsanti "Salva" e "Annulla" appaiono in basso con animazione *slide-up* ancorata alla viewport. Le modifiche vengono salvate in tempo reale su Firestore.

### 2.5 Pagina Lista della Spesa Smart
*   **Obiettivo:** Selezionare le ricette e gestire la lista cumulativa dei prodotti da acquistare.
*   **Layout in due fasi:**

#### Fase 1: Selezione delle Ricette
*   L'utente vede l'elenco delle sue ricette salvate con un checkbox di selezione.
*   Per ogni ricetta selezionata, compare un selettore di porzioni specifico per quella spesa (es. *"Cucino Carbonara per 4 persone e Tiramisù per 8"*).
*   Un pulsante CTA fisso in basso: "Genera Spesa Unificata" con il conteggio delle ricette incluse.

#### Fase 2: Lista della Spesa Interattiva
*   **Visualizzazione Unificata:** Gli ingredienti simili vengono sommati automaticamente dal sistema (es. Farina 300g totale).
*   **Raggruppamento per Categorie:** Gli ingredienti vengono divisi automaticamente in sezioni (es. Frutta e Verdura, Macelleria, Dispensa) per facilitare il giro al supermercato.
*   **Funzionalità Checklist:**
    *   Toccando un ingrediente, questo viene sbarrato con una linea (*strike-through*), la sua opacità scende al 40% e si sposta automaticamente in fondo alla lista sotto una sezione "Presi".
    *   Animazione fluida di spostamento (tramite *Layout Animations* di Framer Motion o transizioni CSS).
*   **Gestione Incompatibilità:** Se due ingredienti non possono essere sommati (es. *"3 cucchiai di olio"* e *"50ml di olio"*), vengono mostrati come sotto-voci all'interno della stessa riga ("Olio di oliva: 50ml + 3 cucchiai") per non creare disordine.
*   **Pulsante Resetta/Svuota:** Per azzerare la lista al termine della spesa.

### 2.6 Pagina Profilo & Impostazioni
*   **Obiettivo:** Gestire le preferenze dell'account e i parametri dell'applicazione.
*   **Layout:** Lista ordinata a schede (stile iOS/Material Design).
*   **Elementi Interfaccia:**
    *   Avatar utente, nome ed email.
    *   **Selettore Lingua (i18n):** Switch elegante tra "Italiano" ed "English" con bandierine o codici lingua.
    *   **Preferenze Unità di Misura:** Scelta tra sistema metrico (g, kg, ml) e imperiale (oz, lb, cups).
    *   **Sezione Account:** Gestione della disconnessione (Logout) e cancellazione dell'account.
    *   Informazioni sulla versione dell'app e crediti.

---

## 3. TODO List per il Web Designer

Di seguito la checklist operativa per la progettazione e la prima implementazione dei componenti UI.

### 🛠️ Configurazione & Fondamenta (Design System)
- [ ] **Definizione Tokens Tailwind:** Configurare `tailwind.config.js` inserendo la palette HSL personalizzata per Light e Dark Mode e i font *Outfit* e *Inter*.
- [ ] **Configurazione Stile Base:** Creare/modificare `index.css` impostando le transizioni di default per il colore di sfondo e del testo per un cambio tema fluido (`transition-colors duration-300`).
- [ ] **Setup shadcn/ui:** Inizializzare e personalizzare i componenti base (Button, Card, Input, Dialog, Switch, Toast).

### 🖥️ Design delle Schermate (Figma / Mockup)
- [ ] **UI Auth:** Progettare la schermata di Login con il pulsante Google e i campi di input.
- [ ] **UI Home & Loader:** Disegnare l'interfaccia di inserimento link e l'animazione di attesa per l'ingestione della ricetta.
- [ ] **UI Ricettario:** Creare il layout della griglia delle card ricetta sia in versione Desktop sia Mobile.
- [ ] **UI Dettaglio Ricetta:** Strutturare la vista dettagliata con il counter dei commensali, evidenziando il comportamento in modalità di visualizzazione e di modifica (Edit Mode).
- [ ] **UI Lista Spesa:** Definire i flussi visivi della selezione ricette e della checklist spesa con le categorie di ingredienti.

### 💻 Implementazione Componenti React / Next.js
- [ ] **Componente Layout & Navigazione:**
  - [ ] Navbar inferiore mobile con effetto Glassmorphism.
  - [ ] Sidebar desktop collassabile.
  - [ ] Switch rapido per Dark/Light Mode integrato nell'header.
- [ ] **Componente Card Ricetta (`RecipeCard.tsx`):**
  - [ ] Immagine con lazy loading.
  - [ ] Effetto hover con zoom leggero dell'immagine ed evidenziazione dei bordi.
  - [ ] Badge dinamico della sorgente social (Instagram, TikTok, Web).
- [ ] **Componente Ingestion Loader (`IngestionLoader.tsx`):**
  - [ ] Overlay a tutto schermo sfocato.
  - [ ] Animazione di caricamento (Spinner o Lottie).
  - [ ] Testi dinamici temporizzati per simulare gli step dell'IA.
- [ ] **Componente Counter Commensali (`ServingsCounter.tsx`):**
  - [ ] Pulsanti `+` e `-` con feedback al click (scala leggermente al tocco).
  - [ ] Animazione di transizione del numero.
- [ ] **Componente Lista della Spesa Interattiva (`ShoppingList.tsx`):**
  - [ ] Checkbox per sbarrare l'ingrediente.
  - [ ] Transizione fluida dell'ingrediente completato che scivola in fondo alla lista.
  - [ ] Suddivisione visiva in gruppi (categorie).
- [ ] **Form di Modifica Ricetta (`RecipeEditForm.tsx`):**
  - [ ] Campi input inline ad altezza dinamica per i passaggi.
  - [ ] Gestione degli errori a schermo (Zod parsing error highlights).
