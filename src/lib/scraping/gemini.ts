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
    throw new Error("Il testo generato dall'IA non è un JSON valido");
  }
}

/**
 * Trasforma una ricetta in versione vegana, vegetariana o senza lattosio.
 */
export async function transformRecipe(
  recipe: any,
  targetType: "vegan" | "vegetarian" | "lactose_free" | "gluten_free" | "light"
): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente OPENROUTER_API_KEY");
  }

  const modelId = "google/gemini-3.1-flash-lite";
  console.log(`Chiamata a OpenRouter (Transform) con modello: ${modelId} per tipo: ${targetType}`);

  let transformationGuideline = "";
  if (targetType === "vegan") {
    transformationGuideline = "Rendi la ricetta 100% vegana. Sostituisci TUTTI gli ingredienti di origine animale (carne, pesce, pollame, crostacei, uova, latte e derivati come burro, formaggio, yogurt, panna, strutto, miele, ecc.) con i loro equivalenti vegani/vegetali più vicini e adatti (es. latte vaccino -> latte di soia/avena; burro -> burro vegetale/margarina/olio; carne -> tofu/tempeh/seitan/legumi; uova in impasti -> fecola/banana/sostituto dell'uovo o acquafaba; formaggio -> formaggio vegetale, ecc.).";
  } else if (targetType === "vegetarian") {
    transformationGuideline = "Rendi la ricetta vegetariana. Sostituisci tutti gli ingredienti a base di carne, pesce, pollame, strutto, o derivati del pesce (es. colla di pesce) con alternative vegetariane adeguate (es. carne -> soia disidratata/tofu/tempeh/legumi/verdure; strutto -> olio/burro; colla di pesce -> agar agar). Nota: latticini e uova sono ammessi nella cucina vegetariana (latto-ovo-vegetariana).";
  } else if (targetType === "lactose_free") {
    transformationGuideline = "Rendi la ricetta priva di lattosio (lactose-free). Sostituisci tutti i latticini e ingredienti contenenti lattosio (latte vaccino, burro, panna, formaggi frescos come ricotta, mozzarella, ecc.) con le loro versioni delattosate (senza lattosio) o alternative vegetali (es. latte senza lattosio, latte di soia/mandorla, burro senza lattosio o margarina, olio). Nota: i formaggi naturalmente privi di lattosio a causa di lunga stagionatura (es. Parmigiano Reggiano oltre i 24-30 mesi) possono essere mantenuti specificando 'stagionato' o 'senza lattosio'.";
  } else if (targetType === "gluten_free") {
    transformationGuideline = "Rendi la ricetta priva di glutine (gluten-free). Sostituisci tutti gli ingredienti contenenti glutine (grano, farina di grano/frumento, farro, orzo, segale, avena non certificata, pane, pasta tradicional, birra, lievito di birra industriale se non certificato gluten-free, ecc.) con i loro equivalenti certificati senza glutine o alternative naturalmente prive di glutine (es. farina senza glutine / mix universale, pasta di riso/mais/legumi, pane gluten-free, riso, mais, quinoa, ecc.). Assicurati che non vi siano contaminazioni crociate negli ingredienti.";
  } else if (targetType === "light") {
    transformationGuideline = "Rendi la ricetta in versione light, con l'obiettivo di ridurre le calorie (kcal) complessive di almeno il 30-40% rispetto alla ricetta originale. Sostituisci o riduci gli ingredienti ad alto contenuto calorico (es. ridurre o sostituire grassi come burro, olio e panna con yogurt greco magro, ricotta light, purè di mele o grassi insaturi in quantità minore; ridurre gli zuccheri o sostituirli con edulcoranti naturali a zero calorie come eritritolo o stevia). Cerca di massimizzare o preservare le proteine e le fibre alimentari, mantenendo comunque il volume e la consistenza della preparazione finale.";
  }

  const prompt = `
Sei uno chef e nutrizionista esperto. Il tuo compito è trasformare la ricetta originale fornita seguendo questa linea guida dietetica:
${transformationGuideline}

Regole importanti:
1. Compila la ricetta direttamente nella stessa lingua originale in cui è scritta la ricetta di partenza (il campo "sourceLanguage" indica la lingua rilevata, es. 'it' per italiano, 'en' per inglese).
2. Sostituisci solo gli ingredienti non conformi con le alternative più vicine e gustose. Mantieni gli altri ingredienti inalterati.
3. Riscrivi i passaggi delle istruzioni (instructions) per riflettere le sostituzioni degli ingredienti (ad esempio se il burro è sostituito con l'olio d'oliva, le istruzioni dovranno fare riferimento all'aggiunta di olio anziché burro).
4. Stima nuovamente in modo coerente e preciso le calorie (kcal) e i macronutrienti (proteins, carbs, fats, fiber, sugar) per 100g di prodotto finito della nuova ricetta modificata. Sii quanto più realistico possibile. Ricalcola anche la valutazione Nutri-Score ("nutritionalRating": 'A', 'B', 'C', 'D' o 'E') e scrivi una nuova frase sintetica di commento nutrizionale in "nutritionalAssessment" (max 120 caratteri).
5. Mantieni coerenti porzioni (servings), tempo di preparazione (prepTimeMinutes) e categoria (category) a meno che la trasformazione non richieda variazioni significative nei tempi.

Ricetta originale da trasformare (JSON):
\`\`\`json
${JSON.stringify(recipe, null, 2)}
\`\`\`

Devi restituire esclusivamente un oggetto JSON che rispetta esattamente la stessa struttura della ricetta originale, contenente i testi adattati nella lingua originale:
{
  "title": "Titolo adattato, ad esempio includendo il tag (es. 'Tiramisù Vegano' o 'Carbonara senza lattosio' o indicando la variante) (string)",
  "sourceLanguage": "Stesso codice lingua originale (string)",
  "servings": "Numero di porzioni (integer)",
  "prepTimeMinutes": "Tempo totale in minuti (integer, nullo o non inserito se non deducibile)",
  "category": "Stessa categoria della ricetta originale (string)",
  "kcal": "Nuove calorie stimate per 100g di ricetta finita in kcal (integer, null se non calcolabile)",
  "proteins": "Nuova stima proteine per 100g (number, null)",
  "carbs": "Nuova stima carboidrati per 100g (number, null)",
  "fats": "Nuova stima grassi per 100g (number, null)",
  "fiber": "Nuova stima fibre per 100g (number, null)",
  "sugar": "Nuova stima zuccheri per 100g (number, null)",
  "nutritionalRating": "Nuova valutazione sintetica Nutri-Score ('A', 'B', 'C', 'D' o 'E', null)",
  "nutritionalAssessment": "Nuovo commento nutrizionale nella stessa lingua originale, max 120 caratteri (string, null)",
  "ingredients": [
    {
      "name": "Nome dell'ingrediente modificato o mantenuto (string)",
      "quantity": "Quantità numerica (number, null)",
      "unit": "Unità di misura (string)"
    }
  ],
  "instructions": [
    "Istruzioni modificate passo dopo passo in ordine cronologico (array of strings)"
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
      "X-Title": "GustoSmart Recipe Transform"
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
    console.error("Errore risposta OpenRouter per trasformazione:", errorText);
    throw new Error(`Errore OpenRouter API durante la trasformazione: ${response.status} - ${errorText}`);
  }

  const resJson = await response.json();
  const responseText = resJson.choices?.[0]?.message?.content;

  if (!responseText) {
    throw new Error("Risposta OpenRouter vuota durante la trasformazione");
  }

  let cleanText = responseText.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return { transformation: JSON.parse(cleanText), generationId: resJson.id || "", usage: resJson.usage || null };
  } catch {
    console.error("Errore di parsing del JSON di trasformazione di OpenRouter. Output grezzo:", responseText);
    throw new Error("Il testo generato dall'IA per la trasformazione non è un JSON valido");
  }
}

/**
 * Analizza gli ingredienti e la preparazione di una ricetta per determinare i flag dietetici.
 */
export async function analyzeDietaryFlags(recipe: any): Promise<{
  isVegan: boolean;
  isVegetarian: boolean;
  isLactoseFree: boolean;
  isGlutenFree: boolean;
  generationId?: string;
  usage?: any;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente OPENROUTER_API_KEY");
  }

  const modelId = "google/gemini-3.1-flash-lite";
  console.log(`Chiamata a OpenRouter (Dietary Analysis) con modello: ${modelId}`);

  const prompt = `
Sei uno chef e nutrizionista esperto. Analizza accuratamente gli ingredienti e la preparazione della seguente ricetta per determinare se rispetta le seguenti caratteristiche dietetiche:
- Vegana (isVegan): non contiene carne, pesce, pollame, uova, latte e derivati, miele o altri ingredienti di origine animale.
- Vegetariana (isVegetarian): non contiene carne, pesce, pollame o altri derivati da macellazione (es. strutto, colla di pesce). Latticini e uova sono ammessi.
- Senza Lattosio (isLactoseFree): non contiene lattosio. Latticini o derivati devono essere assenti o delattosati/vegetali.
- Senza Glutine (isGlutenFree): non contiene glutine. Cereali con glutine (frumento, orzo, farro, segale, avena non certificata) o loro derivati devono essere assenti o sostituiti con varianti gluten-free certificate.

Ricetta da analizzare:
Titolo: ${recipe.title}
Ingredienti:
${(recipe.ingredients || []).map((i: any) => `- ${i.quantity || ""} ${i.unit || ""} ${i.name}`).join("\n")}

Istruzioni:
${(recipe.instructions || []).map((inst: any, idx: number) => `${idx + 1}. ${inst}`).join("\n")}

Restituisci esclusivamente un oggetto JSON con questa struttura esatta:
{
  "isVegan": true/false (boolean),
  "isVegetarian": true/false (boolean),
  "isLactoseFree": true/false (boolean),
  "isGlutenFree": true/false (boolean)
}

Non includere blocchi di markdown o testo al di fuori dell'oggetto JSON.
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://gustosmart.it",
      "X-Title": "GustoSmart Recipe Dietary Analysis"
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
    console.error("Errore risposta OpenRouter per analisi dietetica:", errorText);
    throw new Error(`Errore OpenRouter API durante l'analisi: ${response.status} - ${errorText}`);
  }

  const resJson = await response.json();
  const responseText = resJson.choices?.[0]?.message?.content;

  if (!responseText) {
    throw new Error("Risposta OpenRouter vuota durante l'analisi");
  }

  let cleanText = responseText.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const analysis = JSON.parse(cleanText);
    return {
      isVegan: !!analysis.isVegan,
      isVegetarian: !!analysis.isVegetarian,
      isLactoseFree: !!analysis.isLactoseFree,
      isGlutenFree: !!analysis.isGlutenFree,
      generationId: resJson.id || "",
      usage: resJson.usage || null
    };
  } catch {
    console.error("Errore di parsing del JSON di analisi dietetica di OpenRouter. Output grezzo:", responseText);
    throw new Error("Il testo generato dall'IA per l'analisi dietetica non è un JSON valido");
  }
}
