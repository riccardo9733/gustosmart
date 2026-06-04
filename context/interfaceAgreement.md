# Interface Agreement & Database Schema - GustoSmart

Questo documento definisce i contratti di interfaccia (API) tra i vari servizi dell'architettura di GustoSmart e la struttura dati (schema) per l'implementazione del database Cloud Firestore.

---

## 1. Schema Database (Cloud Firestore)

Firestore è un database NoSQL orientato ai documenti. Per garantire la massima flessibilità, performance e sicurezza tramite le *Firestore Security Rules*, adotteremo la seguente struttura a collezioni di primo livello (root-level).

### 1.1 Collezione: `users`
Contiene i dati anagrafici e le preferenze degli utenti registrati. L'ID del documento corrisponderà allo User UID fornito da Firebase Authentication.

*   **Path:** `/users/{userId}`
*   **Document Schema:**
    ```typescript
    {
      uid: string;                 // ID univoco (Auth)
      email: string;               // Indirizzo email
      displayName: string;         // Nome utente
      photoURL: string | null;     // URL avatar (da Google o nullo)
      preferences: {
        language: 'it' | 'en';     // Lingua preferita
        measurementSystem: 'metric' | 'imperial'; // Sistema di misura
      };
      createdAt: timestamp;        // Data di registrazione
      updatedAt: timestamp;        // Data ultimo aggiornamento
    }
    ```

### 1.2 Collezione: `recipes`
Tutte le ricette importate o create manualmente. Mantenere le ricette in una collezione di primo livello (anziché come sub-collection di `users`) facilita future funzionalità come la condivisione pubblica o l'esplorazione globale.

*   **Path:** `/recipes/{recipeId}`
*   **Document Schema:**
    ```typescript
    {
      id: string;                  // Autogenerato da Firestore
      userId: string;              // Riferimento al creatore (per Security Rules)
      title: string;               // Titolo della ricetta
      sourceUrl: string;           // URL originale (Instagram, TikTok, ecc.)
      sourcePlatform: string;      // Es: 'instagram', 'tiktok', 'web'
      servings: number;            // Numero di porzioni base
      ingredients: Array<{
        name: string;
        quantity: number | null;
        unit: string;
      }>;
      instructions: Array<string>; // Passaggi del procedimento
      imageUrl: string | null;     // URL immagine (su Firebase Storage)
      prepTimeMinutes: number | null; // Tempo di preparazione (se deducibile)
      createdAt: timestamp;        // Data importazione/creazione
      updatedAt: timestamp;        // Data ultima modifica
    }
    ```

### 1.3 Collezione: `shopping_lists` (Opzionale/Evolutiva)
Al momento, la lista della spesa viene generata dinamicamente (on-the-fly) a partire dalle ricette selezionate dal client. Tuttavia, se l'utente necessita di salvare lo "stato" della lista (ad es. ingredienti già spuntati al supermercato), potremo usare questa struttura:

*   **Path:** `/shopping_lists/{listId}`
*   **Document Schema:**
    ```typescript
    {
      userId: string;
      active: boolean;             // True se è la spesa in corso
      selectedRecipes: Array<{
        recipeId: string;
        servings: number;
      }>;
      items: Array<{
        ingredientName: string;
        totalQuantity: number | null;
        unit: string;
        checked: boolean;          // True se già messo nel carrello
      }>;
      createdAt: timestamp;
      updatedAt: timestamp;
    }
    ```

---

## 2. Contratti di Interfaccia (API & Servizi)

### 2.1 Interfaccia Client ↔ Next.js Server (Ingestion Trigger)
Poiché l'elaborazione (scraping + IA) può richiedere tempo e incorrere in timeout serverless, il client invoca una Server Action o Route API che **avvia il job in background** (Netlify Background Functions).

*   **Endpoint:** `POST /api/ingest` (o equivalente Server Action)
*   **Request Payload:**
    ```json
    {
      "url": "https://www.instagram.com/reel/XYZ...",
      "userId": "firebase_uid_123"
    }
    ```
*   **Response (202 Accepted):**
    ```json
    {
      "success": true,
      "message": "Job di importazione avviato in background."
    }
    ```
*   **Feedback al Client:** Il client, dopo aver ricevuto il 202, si mette in ascolto tramite Firestore Realtime SDK sulla collezione `recipes` (query filtrata per `userId` e ordinate per data decrescente) per attendere l'apparizione del nuovo documento.

### 2.2 Interfaccia Next.js ↔ Apify
Il server chiama l'API di Apify per estrarre il contenuto.

*   **Input (Parametri Apify Actor):**
    ```json
    {
      "url": "https://www.instagram.com/reel/XYZ..."
    }
    ```
*   **Output (JSON atteso dal Web Scraper / Transcriber):**
    ```json
    {
      "title": "Titolo originale del reel",
      "caption": "Testo della descrizione del post...",
      "transcript": "Testo dell'audio estratto dal video...",
      "coverImageUrl": "https://cdn.instagram.com/..."
    }
    ```

### 2.3 Interfaccia Next.js ↔ Gemini API
Il server passa i dati estratti a Google Gemini per la strutturazione.

*   **Prompt System/User:**
    Fornisce la `caption` e il `transcript` ricevuti da Apify, istruendo Gemini a generare un output JSON aderente allo schema `RecipeSchema` di Zod.
*   **Response (JSON da Gemini):**
    ```json
    {
      "title": "Pasta alla Carbonara Smart",
      "sourceUrl": "https://www.instagram.com/reel/XYZ...",
      "servings": 2,
      "ingredients": [
        { "name": "Guanciale", "quantity": 150, "unit": "g" },
        { "name": "Uova (Tuorli)", "quantity": 3, "unit": "pezzi" }
      ],
      "instructions": [
        "Tagliare il guanciale a listarelle.",
        "Rosolare il guanciale in padella a fuoco basso."
      ],
      "prepTimeMinutes": 15
    }
    ```

### 2.4 Interfaccia Next.js ↔ Firebase Storage & Firestore (Backend Write)
1.  **Storage:** La background function scarica l'immagine da `coverImageUrl` (da Apify) e ne effettua l'upload su Firebase Storage (`/recipes/{recipeId}/cover.jpg`).
2.  **Firestore:** La function scrive il documento finale (unendo i dati di Gemini, l'URL di Firebase Storage, l'ID utente e i timestamp) nella collezione `/recipes`. La scrittura trigghera l'aggiornamento in tempo reale sul client dell'utente.
