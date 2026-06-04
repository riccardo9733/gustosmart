# ANALISI FUNZIONALE: Applicazione di Gestione e Importazione Ricette Smart

## 1. Introduzione e Obiettivi del Progetto

### 1.1 Il Problema

Attualmente, gli utenti che scoprono ricette su piattaforme social (Instagram, TikTok, Facebook) o siti web (es. GialloZafferano) tendono a salvarle tramite "I piace", inviandole a amici o salvando il link. Questo metodo rende estremamente difficile ritrovare la ricetta in un secondo momento. Inoltre, durante la pianificazione della spesa settimanale o giornaliera, è frequente dimenticare ingredienti necessari o calcolare erroneamente le dosi in base al numero di invitati.

### 1.2 La Soluzione

L'applicazione web proposta centralizza il salvataggio delle ricette partendo da un semplice URL social/web. Attraverso un'elaborazione automatica, l'applicazione trasforma il contenuto multimediale o testuale della sorgente in una ricetta strutturata (Ingredienti, Dosi, Procedimento). L'applicazione permette inoltre di:

1. Modificare dinamicamente le dosi in base al numero di commensali.
2. Selezionare più ricette contemporaneamente per generare una lista della spesa unificata e cumulativa.

---

## 2. Architettura Funzionale (Mappa delle Pagine)

L'applicazione è composta dalle seguenti macro-aree ed interfacce:

1. **Pagina di Login / Registrazione**: Autenticazione dell'utente.
2. **Pagina Home (Dashboard di Importazione)**: Area di input per i link e avvio del processo di estrazione.
3. **Pagina Ricettario Personale (Ricette Salvate)**: Lista di tutte le ricette salvate dall'utente, con filtri e ricerca.
4. **Pagina Dettaglio Ricetta**: Visualizzazione completa della singola ricetta con funzionalità di ricalcolo porzioni.
5. **Pagina Lista della Spesa**: Strumento di selezione delle ricette ed elaborazione della spesa totale.
6. **Pagina Impostazioni e Profilo**: Gestione dei dati utente e preferenze.

---

## 3. Descrizione Dettagliata delle Funzionalità

### 3.1 Autenticazione

* L'utente deve poter creare un account o accedere tramite credenziali (Email e Password) o Social Login.
* L'accesso è necessario per garantire che ogni utente veda esclusivamente il proprio ricettario e la propria lista della spesa.

### 3.2 Importazione Ricetta (Home Page)

* **Input**: Un campo di testo in cui l'utente incolla l'URL (es. Reel di Instagram).
* **Azione**: Un pulsante "Importa" o "Genera Ricetta" avvia il processo.
* **Feedback**: Durante l'elaborazione (estrazione di testo/audio, analisi del contenuto e strutturazione dei dati), l'utente visualizza un indicatore di caricamento (loader) animato.
* **Risultato**: Al termine, l'utente viene reindirizzato automaticamente alla *Pagina Dettaglio Ricetta* appena creata.

### 3.3 Visualizzazione e Ricalcolo Dosi (Dettaglio Ricetta)

* La pagina mostra: Titolo della ricetta, Immagine/Anteprima (se disponibile), Elenco Ingredienti con quantità, e Passaggi del procedimento.
* **Selettore Commensali**: Un elemento d'interfaccia (es. counter `+` / `-`) impostato di default sul numero di porzioni originali della ricetta.
* **Ricalcolo Dinamico**: Modificando il numero di commensali, l'applicazione ricalcola istantaneamente le quantità di tutti gli ingredienti in modo proporzionale.
* **Salvataggio definitivo**: La ricetta viene inserita automaticamente nel Ricettario.

### 3.4 Gestione Ricettario (Ricette Salvate)

* Visualizzazione a griglia o a elenco delle ricette importate dall'utente.
* Ogni ricetta mostra un'anteprima (Titolo, data di inserimento, fonte originale).
* Funzionalità di ricerca testuale per titolo o ingrediente.
* Possibilità di eliminare una ricetta dal ricettario.

### 3.5 Generazione Lista della Spesa Smart

Questa è la funzionalità core per la gestione della spesa. La pagina è divisa in due fasi logiche:

1. **Selezione**: L'utente vede la lista delle sue ricette salvate. Può selezionarne una o più tramite checkbox. Per ogni ricetta selezionata, l'utente definisce il numero di persone per cui intende cucinarla.
2. **Generazione della Lista**: Cliccando su "Genera Spesa", il sistema unifica gli ingredienti.
* *Logica di Somma*: Se la Ricetta A richiede "100g di Farina" e la Ricetta B richiede "200g di Farina", la lista mostrerà un'unica voce: `Farina: 300g`.
* *Spunta degli elementi*: L'utente può interagire con la lista della spesa al supermercato, "accendendo" o "spegnendo" i prodotti già presi (funzione checklist).



### 3.6 Profilo e Impostazioni

* Visualizzazione informazioni dell'account.
* Configurazione di preferenze (es. unità di misura preferite, gestione intolleranze o filtri futuri).

---

## 4. Casi d'Uso (Use Cases)

Di seguito vengono formalizzati i principali scenari d'uso dell'applicazione dal punto di vista dell'utente finale.

### UC1: Importazione di una nuova ricetta da Social Media

* **Attore Principale**: Utente Registrato
* **Precondizioni**: L'utente ha effettuato l'accesso ed è nella Home Page. Ha copiato un link valido negli appunti.
* **Flusso Principale**:
1. L'utente incolla il link nel campo di input.
2. L'utente clicca sul pulsante "Avvia".
3. Il sistema prende in carico il link, estrae le informazioni (procedimento, ingredienti, dosi) e crea la struttura dati della ricetta.
4. Il sistema reindirizza l'utente alla schermata di Dettaglio della Ricetta.


* **Postcondizioni**: La ricetta è salvata nel database personale dell'utente ed è visibile nel suo Ricettario.

### UC2: Ricalcolo delle porzioni per una cena

* **Attore Principale**: Utente Registrato
* **Precondizioni**: L'utente si trova nella pagina di Dettaglio di una ricetta già salvata.
* **Flusso Principale**:
1. L'utente osserva le dosi standard (es. per 2 persone).
2. L'utente modifica il selettore dei commensali portandolo a 6.
3. Il sistema moltiplica le quantità di ciascun ingrediente per il fattore di conversione appropriato (in questo caso, x3).
4. Il sistema aggiorna l'interfaccia mostrando i nuovi valori numerici affianco agli ingredienti.


* **Postcondizioni**: L'utente visualizza le dosi corrette per 6 persone senza alterare permanentemente la ricetta base.

### UC3: Generazione della Lista della Spesa Unificata

* **Attore Principale**: Utente Registrato
* **Precondizioni**: L'utente ha almeno 2 ricette salvate nel ricettario e si trova nella pagina "Lista della Spesa".
* **Flusso Principale**:
1. L'utente seleziona la "Ricetta Carbonara" e imposta "4 persone".
2. L'utente seleziona la "Ricetta Tiramisù" e imposta "8 persone".
3. L'utente clicca su "Genera Lista".
4. Il sistema calcola le dosi per i rispettivi commensali delle due ricette.
5. Il sistema unisce gli ingredienti uguali (es. somma le uova necessarie per la carbonara e quelle per il tiramisù).
6. Il sistema mostra la schermata della Spesa con l'elenco cumulativo.


* **Postcondizioni**: L'utente ha una lista della spesa interattiva pronta per l'uso.

---

## 5. Flusso dei Dati Funzionale (Modello Concettuale)

Anche senza definire le tecnologie backend, a livello funzionale il flusso segue questo ciclo di vita del dato:

```
[Link Social/Web] 
       │
       ▼ (Azione Utente: Incolla e Avvia)
[Pipeline di Elaborazione] ───> Estrae audio/testo dalla sorgente
       │
       ▼ (Logica Applicativa)
[Parser Organizzatore] ───────> Distingue la "Lista Ingredienti" dalle "Istruzioni"
       │
       ▼ (Output Strutturato)
[Oggetto Ricetta (Modificabile)] ───> Salvataggio nel database Utente
       │
       ├───> Visualizzazione Dettaglio (Ricalcolo Commensali)
       └───> Aggregatore Lista della Spesa (Somma delle quantità)

```

---

## 6. Requisiti di Esperienza Utente (UX) e vincoli funzionali

* **Semplicità d'uso mobile**: Poiché la spesa si fa con il telefono in mano e i link social si copiano spesso da smartphone, l'interfaccia dell'applicazione deve essere *Mobile-First* (perfettamente ottimizzata per schermi verticali).
* **Tolleranza agli errori di Scraping**: Nel caso in cui la pipeline non riesca a decifrare correttamente le dosi (es. la caption del reel era incompleta), la pagina di Dettaglio Ricetta deve permettere all'utente di **modificare manualmente** il testo o le quantità prima o dopo il salvataggio definitivo.
* **Gestione Unità di Misura**: Nella lista della spesa, se un ingrediente è espresso in unità diverse nelle due ricette (es. Ricetta A: "3 cucchiai di olio", Ricetta B: "50ml di olio"), il sistema non potendoli sommare matematicamente in modo sicuro, dovrà mostrarli come due righe distinte o standardizzarli laddove possibile.