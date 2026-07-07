# Risoluzione Problemi di Deploy delle Supabase Edge Functions

Questa guida spiega come diagnosticare e risolvere l'errore `unexpected deploy status 500: {"message":"Function deploy failed due to an internal error"}` durante il deploy delle Edge Functions di GustoSmart su Supabase, e illustra le best practice per i successivi deploy.

---

## Sintomi del Problema

Durante l'esecuzione del comando di deploy tramite l'API remota:

```bash
npx supabase functions deploy ingest --project-ref qhzdvdrcpkpvjjsjvqvq --use-api
```

Il processo si interrompeva restituendo il seguente errore generico:

```json
{"_tag":"Error","error":{"code":"UnknownError","message":"unexpected deploy status 500: {\"message\":\"Function deploy failed due to an internal error\"}"}}
```

Questo comportamento si presentava in maniera apparentemente casuale (es. la funzione `ingest-comments` veniva caricata mentre `ingest` falliva, o viceversa).

---

## Analisi delle Cause

Il problema non era legato a errori di sintassi o bug nel codice TypeScript, bensì a **limiti infrastrutturali del server di bundling remoto di Supabase**:

1. **Timeout del Gateway (30 Secondi)**: Quando si usa il flag `--use-api`, i sorgenti locali vengono inviati grezzi a Supabase, che li compila in un ambiente Deno remoto. Se la funzione importa moduli npm complessi (come `@aws-sdk/client-s3` o `firebase`), il server remoto impiega più di 30 secondi per risolvere le dipendenze e generare l'AST, innescando un timeout di rete (HTTP 500).
2. **Dimensione dei file inviati**: Se nel file `deno.json` è presente un path alias generico verso la cartella frontend (es. `"@/": "../../../src/"`), il CLI di Supabase proverà ad allegare l'intera cartella sorgente del frontend Next.js nel pacchetto di deploy, saturando immediatamente i limiti di upload.

---

## Soluzione Consigliata: Bundling Locale tramite Docker

La soluzione ufficiale per ovviare alle limitazioni del compilatore remoto consiste nell'eseguire il processo di bundling direttamente sulla macchina locale.

### Prerequisiti
* **Docker Desktop** installato e in esecuzione sul proprio computer.

### Procedura passo-passo

1. **Avvia Docker Desktop**:
   Apri l'applicazione Docker dal Finder o tramite Spotlight (`Cmd + Spazio` -> Docker) e attendi che l'icona della balena nella barra dei menu sia verde/stabile.

2. **Esegui il deploy senza il flag `--use-api`**:
   Rimuovendo il flag `--use-api`, la CLI di Supabase utilizzerà automaticamente Docker in locale per compilare e assemblare il codice sorgente (generando un unico file JavaScript autogestito di circa 16-17 MB) ed effettuerà l'upload del file già pronto:

   ```bash
   SUPABASE_ACCESS_TOKEN=IL_TUO_TOKEN npx supabase functions deploy ingest ingest-comments --project-ref qhzdvdrcpkpvjjsjvqvq
   ```

   *Nota: Il tempo di deploy scende a pochi secondi e il successo è garantito, in quanto il compilatore remoto di Supabase non dovrà compiere alcun processo di risoluzione o bundling.*

---

## Ottimizzazioni Applicate al Codice

Per ridurre l'impronta di compilazione e rendere le Edge Function più snelle ed efficienti, abbiamo applicato le seguenti ottimizzazioni:

### 1. Rimozione di Dipendenze Firebase Ridondanti
Nelle Edge Functions non viene più importato l'intero SDK di query di Firestore (`query`, `where`, `getDocs`).
* **Prima**: La funzione `ingest` importava ed eseguiva le query direttamente con i moduli pesanti dell'SDK.
* **Ora (Chiamata REST)**: Il controllo dei duplicati in cache viene eseguito tramite una richiesta HTTP `fetch` standard verso le API REST pubbliche di Google Firestore:
  ```typescript
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const response = await fetch(firestoreUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "recipes" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "sourceUrl" },
            op: "EQUAL",
            value: { stringValue: finalUrl }
          }
        },
        limit: 1
      }
    })
  });
  ```
  Questo approccio riduce drasticamente il tempo di bundling e previene crash della memoria.

### 2. Pulizia di `deno.json`
Abbiamo rimosso l'alias `@/` da `supabase/functions/ingest/deno.json` e `supabase/functions/ingest-comments/deno.json` per evitare che la CLI carichi erroneamente l'intero progetto frontend Next.js.

---

## Cheat Sheet dei Comandi di Deploy

### Deploy di tutte le funzioni (Consigliato)
```bash
SUPABASE_ACCESS_TOKEN=IL_TUO_TOKEN npx supabase functions deploy ingest ingest-comments --project-ref qhzdvdrcpkpvjjsjvqvq
```

### Deploy di una sola funzione (es. ingest)
```bash
SUPABASE_ACCESS_TOKEN=IL_TUO_TOKEN npx supabase functions deploy ingest --project-ref qhzdvdrcpkpvjjsjvqvq
```

### Reset / Rimozione di una funzione bloccata
Se una funzione rimane bloccata in uno stato inconsistente sul cloud, è possibile rimuoverla e ricaricarla da zero:
```bash
# Rimuove la funzione remota (operazione sicura, le Edge Function sono stateless)
SUPABASE_ACCESS_TOKEN=IL_TUO_TOKEN npx supabase functions delete ingest --project-ref qhzdvdrcpkpvjjsjvqvq --yes

# Esegue nuovamente il deploy pulito
SUPABASE_ACCESS_TOKEN=IL_TUO_TOKEN npx supabase functions deploy ingest --project-ref qhzdvdrcpkpvjjsjvqvq
```
