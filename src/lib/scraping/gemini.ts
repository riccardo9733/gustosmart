/**
 * Utilizza OpenRouter (modello google/gemini-3.1-flash-lite) per estrarre una ricetta strutturata 
 * a partire da caption e trascrizione audio.
 */
export async function generateRecipeFromText(caption: string, transcript: string): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente OPENROUTER_API_KEY");
  }

  const modelId = "google/gemini-3.1-flash-lite";
  console.log(`Chiamata a OpenRouter con modello: ${modelId}`);

  const prompt = `
Sei un assistente culinario esperto e meticoloso. Analizza attentamente la descrizione del post (Caption) e la trascrizione audio (Transcript) di un video di cucina per estrarre la ricetta strutturata.

Dati del video:
---
CAPTION:
${caption || "(Nessuna caption fornita)"}

TRASCRIZIONE AUDIO:
${transcript || "(Nessuna trascrizione audio fornita)"}
---

Devi restituire esclusivamente un oggetto JSON che rispetta esattamente il seguente schema:
{
  "title": "Il titolo accattivante e descrittivo della ricetta (string)",
  "sourceLanguage": "Il codice lingua ISO a due lettere rilevato del post sorgente, es. 'it', 'en', 'es', 'fr' (string)",
  "servings": "Numero di porzioni per cui sono calibrati gli ingredienti (integer, default: 2 se non specificato)",
  "prepTimeMinutes": "Tempo totale di preparazione e cottura in minuti (integer, nullo o non inserito se non deducibile)",
  "category": "La categoria della ricetta. Deve essere esattamente una tra: 'first_courses', 'second_courses', 'desserts', 'appetizers', 'sides', 'single_dishes', 'other' (string)",
  "kcal": "Calorie medie stimate per 100g di ricetta pronta/finita in kcal (integer, null se non calcolabile)",
  "ingredients": [
    {
      "name": "Nome dell'ingrediente, es. Farina 00, Uova (string)",
      "quantity": "Quantità numerica, es. 150, 3 (number, null se q.b. o a sentimento)",
      "unit": "Unità di misura, es. 'g', 'ml', oppure stringa vuota '' per ingredienti contabili. Default 'q.b.' se non specificata (string)"
    }
  ],
  "instructions": [
    "Istruzioni ordinate passo dopo passo, come elementi di questo array di stringhe"
  ]
}

Istruzioni per l'estrazione:
1. Deduci gli ingredienti sia dalla Caption che dalla Trascrizione Audio. Unisci le informazioni per avere una lista completa.
2. Identifica la categoria culinaria adatta basandoti sul titolo e gli ingredienti. Deve corrispondere esattamente ad una delle seguenti stringhe:
   - 'first_courses' (primi piatti come pasta, risotti, zuppe, gnocchi)
   - 'second_courses' (secondi piatti di carne, pesce, uova o vegetariani strutturati)
   - 'desserts' (dolci, torte, creme, biscotti)
   - 'appetizers' (antipasti, stuzzichini)
   - 'sides' (contorni come patate, verdure d'accompagnamento, insalate)
   - 'single_dishes' (piatti unici ricchi e nutrizionalmente completi, es. lasagne, parmigiana)
   - 'other' (se non rientra in nessun'altra categoria)
3. Stima le calorie (kcal) medie PER 100G DI PRODOTTO FINITO (ricetta pronta) basandoti sul tipo e la quantità degli ingredienti totali. Sii quanto più realistico e preciso possibile. Se è impossibile stimarle, inserisci null.
4. Identifica le dosi e le unità di misura corrette.
   - Converti tassativamente le unità volumetriche o non empiriche (come 'cucchiai', 'cucchiaini', 'tazze', 'bicchieri', 'manciate', 'pizzichi') nel loro peso equivalente in grammi (g) o volume in millilitri (ml) in base al tipo di ingrediente (es. 1 cucchiaio d'olio -> 10g o 12ml; 1 tazza di farina -> 120g).
   - Per ingredienti contabili e specifici interi (es. 'uova', 'carota', 'limone', 'spicchio d'aglio'), imposta il numero come 'quantity' (es. 2) e usa come 'unit' una stringa vuota (""). Non usare mai unità generiche come 'pezzo' o 'pezzi'.
   - Se le dosi non sono espresse o sono a sentimento, non specificare 'quantity' (impostalo a null) e imposta 'unit' come 'q.b.'.
5. Se non trovi indicazioni sul numero di porzioni, imposta 'servings' a 2 di default.
6. Ordina i passaggi delle istruzioni in ordine cronologico e logico chiaro.
7. Rileva la lingua principale del post/sorgente (es. Italiano, Inglese, Spagnolo) e compila tutti i campi di testo ('title', 'ingredients', 'instructions') direttamente in tale lingua originale del post. Imposta il relativo codice lingua a due lettere in 'sourceLanguage' (es. 'it', 'en', 'es', 'fr', 'de').
8. Assicurati che l'output sia solo ed esclusivamente il JSON richiesto. Non includere blocchi di markdown o testo aggiuntivo al di fuori dell'oggetto JSON.
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://gustosmart.it", // Richiesto da OpenRouter
      "X-Title": "GustoSmart Ingestion Pipeline" // Richiesto da OpenRouter
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Errore risposta OpenRouter:", errorText);
    throw new Error(`Errore OpenRouter API: ${response.status} - ${errorText}`);
  }

  const resJson = await response.json();
  const responseText = resJson.choices?.[0]?.message?.content;

  if (!responseText) {
    console.error("Risposta OpenRouter vuota o non valida:", JSON.stringify(resJson));
    throw new Error("OpenRouter ha restituito una risposta vuota");
  }

  let cleanText = responseText.trim();
  
  // Rimuove eventuali delimitatori di codice markdown (es. ```json ... ```) se presenti
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Errore di parsing del JSON di OpenRouter. Output grezzo:", responseText);
    throw new Error("Il testo generato dall'IA tramite OpenRouter non è un JSON valido");
  }
}

/**
 * Traduce titolo, ingredienti e istruzioni di una ricetta nella lingua indicata.
 */
export async function translateRecipe(
  title: string,
  ingredients: any[],
  instructions: string[],
  targetLanguage: string
): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente OPENROUTER_API_KEY");
  }

  const modelId = "google/gemini-3.1-flash-lite";
  const languageNames: Record<string, string> = {
    it: "Italiano (Italian)",
    en: "Inglese (English)",
    es: "Spagnolo (Spanish)",
    fr: "Francese (French)",
    de: "Tedesco (German)",
  };
  const targetLanguageName = languageNames[targetLanguage.toLowerCase()] || targetLanguage;

  const prompt = `
Sei un traduttore culinario esperto. Il tuo compito è tradurre la ricetta fornita nella lingua di destinazione: ${targetLanguageName}.

La traduzione deve essere naturale, accurata e utilizzare la terminologia culinaria corretta per la lingua di destinazione.
Traduci solo i campi di testo:
- Il titolo della ricetta.
- Il nome (name) di ciascun ingrediente. Nota: le quantità e le unità di misura (g, ml, q.b., stringa vuota) devono rimanere identiche e inalterate.
- Ciascun passaggio (stringa) delle istruzioni.

Struttura della ricetta da tradurre (JSON):
\`\`\`json
{
  "title": "${title.replace(/"/g, '\\"')}",
  "ingredients": ${JSON.stringify(ingredients)},
  "instructions": ${JSON.stringify(instructions)}
}
\`\`\`

Devi restituire esclusivamente un oggetto JSON con la stessa identica struttura, contenente i testi tradotti:
{
  "title": "Titolo tradotto (string)",
  "ingredients": [
    {
      "name": "Nome ingrediente tradotto (string)",
      "quantity": "Stessa quantità originale (number, null)",
      "unit": "Stessa unità originale (string)"
    }
  ],
  "instructions": [
    "Istruzioni tradotte passo dopo passo (array of strings)"
  ]
}

Assicurati che l'output sia solo ed esclusivamente il JSON richiesto. Non includere blocchi di markdown o testo aggiuntivo al di fuori dell'oggetto JSON.
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://gustosmart.it",
      "X-Title": "GustoSmart Ingestion Pipeline"
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Errore risposta OpenRouter per traduzione:", errorText);
    throw new Error(`Errore OpenRouter API durante la traduzione: ${response.status} - ${errorText}`);
  }

  const resJson = await response.json();
  const responseText = resJson.choices?.[0]?.message?.content;

  if (!responseText) {
    throw new Error("Risposta OpenRouter vuota durante la traduzione");
  }

  let cleanText = responseText.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Errore di parsing del JSON di traduzione di OpenRouter. Output grezzo:", responseText);
    throw new Error("Il testo tradotto generato dall'IA non è un JSON valido");
  }
}
