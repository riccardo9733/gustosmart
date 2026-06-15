import { type ScrapedData } from "./scrapecreators";

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
  "isRecipeDetailsPresent": "Imposta su true se e solo se la Caption o la Trascrizione Audio contengono dettagli effettivi sulla ricetta come ingredienti o passaggi di cottura. Imposta su false se non ci sono informazioni utili, se l'input contiene solo un titolo o parola chiave generica (es. 'Waffle') senza dettagli o se le informazioni fornite non permettono di ricreare fedelmente la ricetta (boolean)",
  "title": "Il titolo accattivante e descrittivo della ricetta (string)",
  "sourceLanguage": "Il codice lingua ISO a due lettere rilevato del post sorgente, es. 'it', 'en', 'es', 'fr' (string)",
  "servings": "Numero di porzioni per cui sono calibrati gli ingredienti (integer, default: 2 se non specificato)",
  "prepTimeMinutes": "Tempo totale di preparazione e cottura in minuti (integer, nullo o non inserito se non deducibile)",
  "category": "La categoria della ricetta. Deve essere esattamente una tra: 'first_courses', 'second_courses', 'desserts', 'appetizers', 'sides', 'single_dishes', 'other' (string)",
  "kcal": "Calorie medie stimate per 100g di ricetta pronta/finita in kcal (integer, null se non calcolabile)",
  "proteins": "Stima dei grammi di proteine per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "carbs": "Stima dei grammi di carboidrati per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "fats": "Stima dei grammi di grassi per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "fiber": "Stima dei grammi di fibre per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "sugar": "Stima dei grammi di zuccheri per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "nutritionalRating": "Valutazione sintetica della ricetta in scala da 'A' (molto salutare) a 'E' (poco salutare) in stile Nutri-Score (string: 'A', 'B', 'C', 'D' o 'E', null se non calcolabile)",
  "nutritionalAssessment": "Breve frase di commento nutrizionale sulla ricetta nella stessa lingua originale del post, max 120 caratteri (string, null se non calcolabile)",
  "isGlutenFree": "true se la ricetta è senza glutine (gluten-free) basandoti sugli ingredienti indicati, false altrimenti (boolean)",
  "isVegan": "true se la ricetta è vegana (nessun ingrediente di origine animale) basandoti sugli ingredienti, false altrimenti (boolean)",
  "isVegetarian": "true se la ricetta è vegetariana (niente carne o pesce) basandoti sugli ingredienti, false altrimenti (boolean)",
  "isLactoseFree": "true se la ricetta è priva di lattosio (lactose-free) o se non contiene latte/derivati, false altrimenti (boolean)",
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
3. Stima accuratamente le calorie (kcal) medie e i macronutrienti (proteins, carbs, fats, fiber, sugar) per 100g DI PRODOTTO FINITO (ricetta pronta), basandoti sul tipo e la quantità degli ingredienti totali. Sii quanto più realistico e preciso possibile. Se è impossibile stimarle, imposta i relativi campi a null.
4. Identifica le dosi e le unità di misura corrette.
   - Converti tassativamente le unità volumetriche o non empiriche (like 'cucchiai', 'cucchiaini', 'tazze', 'bicchieri', 'manciate', 'pizzichi') nel loro peso equivalente in grammi (g) o volume in millilitri (ml) in base al tipo di ingrediente (es. 1 cucchiaio d'olio -> 10g o 12ml; 1 tazza di farina -> 120g).
   - Per ingredienti contabili e specifici interi (es. 'uova', 'carota', 'limone', 'spicchio d'aglio'), imposta il numero come 'quantity' (es. 2) e usa come 'unit' una stringa vuota (""). Non usare mai unità generiche come 'pezzo' o 'pezzi'.
   - Se le dosi non sono espresse o sono a sentimento, non specificare 'quantity' (impostalo a null) e imposta 'unit' come 'q.b.'.
5. Se non trovi indicazioni sul numero di porzioni, imposta 'servings' a 2 di default.
6. Ordina i passaggi delle istruzioni in ordine cronologico e logico chiaro.
7. Rileva la lingua principale del post/sorgente (es. Italiano, Inglese, Spagnolo) e compila tutti i campi di testo ('title', 'ingredients', 'instructions', 'nutritionalAssessment') direttamente in tale lingua originale del post. Imposta il relativo codice lingua a due lettere in 'sourceLanguage' (es. 'it', 'en', 'es', 'fr', 'de').
8. Valuta attentamente se nei dati di input (Caption o Trascrizione Audio) sono presenti informazioni utili per estrarre una ricetta (almeno qualche ingrediente o qualche passaggio di preparazione). Se le informazioni sono insufficienti, o se è presente solo un titolo o una parola chiave generica (es. "waffle") senza nessun ingrediente o procedimento utile, imposta tassativamente il campo "isRecipeDetailsPresent" a false.
9. Assicurati che l'output sia solo ed esclusivamente il JSON richiesto. Non includere blocchi di markdown o testo aggiuntivo al di fuori dell'oggetto JSON.
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
    return { recipe: JSON.parse(cleanText), generationId: resJson.id || "", usage: resJson.usage || null };
  } catch {
    console.error("Errore di parsing del JSON di OpenRouter. Output grezzo:", responseText);
    throw new Error("Il testo generato dall'IA tramite OpenRouter non è un JSON valido");
  }
}

/**
 * Utilizza OpenRouter (modello google/gemini-3.1-flash-lite) per estrarre una ricetta strutturata 
 * a partire dai dati di scraping di una pagina web, preferendo i dati strutturati LD+JSON se presenti.
 */
export async function generateRecipeFromWeb(scrapedData: ScrapedData): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente OPENROUTER_API_KEY");
  }

  const modelId = "google/gemini-3.1-flash-lite";
  console.log(`Chiamata a OpenRouter (Web) con modello: ${modelId}`);

  const hasStructuredData = !!scrapedData.recipeStructuredData;
  
  let dataInput = "";
  if (hasStructuredData) {
    dataInput = `DATI STRUTTURATI ESTRATTI DALLA PAGINA WEB (JSON-LD):
---
${JSON.stringify(scrapedData.recipeStructuredData, null, 2)}
---`;
  } else {
    dataInput = `TESTO ESTRATTO DALLA PAGINA WEB (Readability):
---
CAPTION/TITOLO:
${scrapedData.caption || "(Nessun titolo estratto)"}

TESTO COMPLETO DELLA PAGINA:
${scrapedData.transcript || "(Nessun testo estratto)"}
---`;
  }

  const prompt = `
Sei un assistente culinario esperto e meticoloso. Il tuo compito è formattare e normalizzare le informazioni di una ricetta web in un formato JSON strutturato.

Dati di input:
${dataInput}

Devi restituire esclusivamente un oggetto JSON che rispetta esattamente il seguente schema:
{
  "isRecipeDetailsPresent": "Imposta su true se e solo se la pagina web contiene dettagli effettivi sulla ricetta come ingredienti o passaggi di cottura. Imposta su false se la pagina non contiene informazioni utili a ricreare la ricetta (boolean)",
  "title": "Il titolo della ricetta (string)",
  "sourceLanguage": "Il codice lingua ISO a due lettere della ricetta, es. 'it', 'en', 'es', 'fr' (string)",
  "servings": "Numero di porzioni per cui sono calibrati gli ingredienti (integer, default: 2 se non specificato)",
  "prepTimeMinutes": "Tempo totale di preparazione e cottura in minuti (integer, nullo o non inserito se non deducibile)",
  "category": "La categoria della ricetta. Deve essere esattamente una tra: 'first_courses', 'second_courses', 'desserts', 'appetizers', 'sides', 'single_dishes', 'other' (string)",
  "kcal": "Calorie medie stimate per 100g di ricetta pronta/finita in kcal (integer, null se non calcolabile)",
  "proteins": "Stima dei grammi di proteine per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "carbs": "Stima dei grammi di carboidrati per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "fats": "Stima dei grammi di grassi per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "fiber": "Stima dei grammi di fibre per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "sugar": "Stima dei grammi di zuccheri per 100g di ricetta pronta/finita (number, null se non calcolabile)",
  "nutritionalRating": "Valutazione sintetica della ricetta in scala da 'A' (molto salutare) a 'E' (poco salutare) in stile Nutri-Score (string: 'A', 'B', 'C', 'D' o 'E', null se non calcolabile)",
  "nutritionalAssessment": "Breve frase di commento nutrizionale sulla ricetta nella stessa lingua originale, max 120 caratteri (string, null se non calcolabile)",
  "isGlutenFree": "true se la ricetta è senza glutine (gluten-free) basandoti sugli ingredienti indicati, false altrimenti (boolean)",
  "isVegan": "true se la ricetta è vegana (nessun ingrediente di origine animale) basandoti sugli ingredienti, false altrimenti (boolean)",
  "isVegetarian": "true se la ricetta è vegetariana (niente carne o pesce) basandoti sugli ingredienti, false altrimenti (boolean)",
  "isLactoseFree": "true se la ricetta è priva di lattosio (lactose-free) o se non contiene latte/derivati, false altrimenti (boolean)",
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

REGOLE RIGIDE DI FEDELTÀ (CRITICAL):
1. NON INVENTARE ingredienti o dosi che non siano esplicitamente indicati nei dati di input.
2. Se le dosi di un ingrediente non sono specificate o sono a sentimento, imposta "quantity" a null e "unit" a "q.b.". Non provare a indovinare o stimare quantità arbitrarie se l'input non ne parla.
3. Se i passaggi della ricetta (instructions) non sono specificati o sono del tutto insufficienti, non inventarli da zero. Estrai solo i passaggi realmente descritti.
4. Identifica la categoria culinaria adatta basandoti sul titolo e gli ingredienti. Deve corrispondere esattamente ad una delle seguenti stringhe:
   - 'first_courses' (primi piatti come pasta, risotti, zuppe, gnocchi)
   - 'second_courses' (secondi piatti di carne, pesce, uova o vegetariani strutturati)
   - 'desserts' (dolci, torte, creme, biscotti)
   - 'appetizers' (antipasti, stuzzichini)
   - 'sides' (contorni come patate, verdure d'accompagnamento, insalate)
   - 'single_dishes' (piatti unici ricchi e nutrizionalmente completi, es. lasagne, parmigiana)
   - 'other' (se non rientra in nessun'altra categoria)
5. Stima accuratamente le calorie (kcal) medie e i macronutrienti (proteins, carbs, fats, fiber, sugar) per 100g DI PRODOTTO FINITO (ricetta pronta) basandoti sul tipo e la quantità degli ingredienti totali. Se è impossibile stimarle o le dosi degli ingredienti chiave sono mancanti, imposta i relativi campi a null.
6. Converti le unità volumetriche o non empiriche (come 'cucchiai', 'cucchiaini', 'tazze', 'bicchieri', 'manciate', 'pizzichi') nel loro peso equivalente in grammi (g) o volume in millilitri (ml) in base al tipo di ingrediente (es. 1 cucchiaio d'olio -> 10g o 12ml).
7. Per ingredienti contabili e specifici interi (es. 'uova', 'carota', 'limone'), imposta il numero come 'quantity' (es. 2) e usa come 'unit' una stringa vuota (""). Non usare mai unità generiche come 'pezzo'.
8. Se non trovi indicazioni sul numero di porzioni, imposta 'servings' a 2 di default.
9. Rileva la lingua principale del post/sorgente e compila tutti i campi di testo ('title', 'ingredients', 'instructions', 'nutritionalAssessment') direttamente in tale lingua originale. Imposta il relativo codice lingua a due lettere in 'sourceLanguage'.
10. Valuta attentamente se nei dati di input (dati strutturati o testo) sono realmente presenti informazioni utili per estrarre una ricetta (ingredienti o passaggi). Se le informazioni sono del tutto insufficienti o assenti, imposta tassativamente il campo "isRecipeDetailsPresent" a false.
11. Assicurati che l'output sia solo ed esclusivamente il JSON richiesto. Non includere blocchi di markdown o testo aggiuntivo al di fuori dell'oggetto JSON.
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
    console.error("Errore risposta OpenRouter (Web):", errorText);
    throw new Error(`Errore OpenRouter API per ricetta Web: ${response.status} - ${errorText}`);
  }

  const resJson = await response.json();
  const responseText = resJson.choices?.[0]?.message?.content;

  if (!responseText) {
    console.error("Risposta OpenRouter (Web) vuota o non valida:", JSON.stringify(resJson));
    throw new Error("OpenRouter ha restituito una risposta vuota per la ricetta Web");
  }

  let cleanText = responseText.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return { recipe: JSON.parse(cleanText), generationId: resJson.id || "", usage: resJson.usage || null };
  } catch {
    console.error("Errore di parsing del JSON di OpenRouter (Web). Output grezzo:", responseText);
    throw new Error("Il testo generato dall'IA per la ricetta Web non è un JSON valido");
  }
}

/**
 * Traduce titolo, ingredienti, istruzioni e valutazione nutrizionale di una ricetta nella lingua indicata.
 */
export async function translateRecipe(
  title: string,
  ingredients: any[],
  instructions: string[],
  targetLanguage: string,
  nutritionalAssessment?: string | null
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
- La valutazione nutrizionale (nutritionalAssessment), se presente.

Struttura della ricetta da tradurre (JSON):
\`\`\`json
{
  "title": "${title.replace(/"/g, '\\"')}",
  "ingredients": ${JSON.stringify(ingredients)},
  "instructions": ${JSON.stringify(instructions)},
  "nutritionalAssessment": ${nutritionalAssessment ? JSON.stringify(nutritionalAssessment) : "null"}
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
  ],
  "nutritionalAssessment": "Valutazione nutrizionale tradotta (string o null)"
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
    return { translation: JSON.parse(cleanText), generationId: resJson.id || "", usage: resJson.usage || null };
  } catch {
    console.error("Errore di parsing del JSON di traduzione di OpenRouter. Output grezzo:", responseText);
    throw new Error("Il testo tradotto generato dall'IA non è un JSON valido");
  }
}

