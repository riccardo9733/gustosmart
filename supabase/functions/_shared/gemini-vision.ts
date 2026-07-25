/**
 * Utilizza OpenRouter (modello google/gemini-2.0-flash-001 o google/gemini-1.5-flash) per analizzare
 * un'immagine (screenshot o foto di ricetta) ed estrarre/completare una ricetta strutturata.
 * Traccia esattamente quali campi sono stati estratti dall'immagine (isAiGenerated: false)
 * e quali sono stati generati o ricostruiti dall'IA (isAiGenerated: true).
 */
export async function generateRecipeFromImage(imageBase64DataUrl: string): Promise<any> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente OPENROUTER_API_KEY");
  }

  const modelId = "google/gemini-3-flash-preview";
  console.log(`Chiamata a OpenRouter Vision con modello: ${modelId}`);

  const promptText = `
Sei un assistente culinario esperto e meticoloso dotato di capacità di Visione Artificiale e OCR.
Analizza attentamente l'immagine fornita (che rappresenta uno screenshot di un social network, una foto di un libro di cucina, una scheda ricetta o un appunto).

Compito:
1. Riconosci ed estrai il titolo, il numero di porzioni, il tempo di preparazione/cottura, gli ingredienti (con quantità e unità) e la procedura passo-passo visibili nell'immagine.
2. SE l'immagine è parziale o incompleta (ad esempio mancano i passaggi dettagliati della preparazione, mancano le porzioni, i tempi o alcune dosi), COMPLETA E RIGENERA AUTONOMAMENTE ciò che manca per rendere la ricetta completamente eseguibile e valida.
3. Calcola o stima le calorie (kcal) e i macronutrienti per 100g di prodotto finito.

REGLA FONDAMENTALE SULLA PROVENIENZA DEI DATI (isAiGenerated):
Devi specificare la provenienza di ciascun elemento principale:
- "isTitleAiGenerated": true se il titolo è stato inventato da te; false se scritto nell'immagine.
- "isServingsAiGenerated": true se le porzioni sono state stimate da te; false se scritte nell'immagine.
- "isPrepTimeAiGenerated": true se il tempo di preparazione è stato stimato da te; false se scritto nell'immagine.
- "isNutritionalAiGenerated": true se i macronutrienti/calorie sono stati stimati da te (solitamente true per le foto).
- Per ciascun ingrediente in "ingredients": imposta "isAiGenerated": false se l'ingrediente ed la sua dose erano presenti nell'immagine; true se l'ingrediente o le dosi sono state da te aggiunte o stimate.
- Per ciascun passaggio in "instructions": imposta "isAiGenerated": false se il passaggio era chiaramente descritto nel testo dell'immagine; true se lo hai generato o arricchito tu.

Devi restituire esclusivamente un oggetto JSON che rispetta esattamente il seguente schema:
{
  "isRecipeDetailsPresent": true (boolean, imposta a false se l'immagine non è una ricetta o non contiene informazioni culinarie),
  "title": "Titolo della ricetta (string)",
  "isTitleAiGenerated": boolean,
  "sourceLanguage": "Codice lingua ISO a due lettere, es. 'it', 'en', 'es' (string)",
  "servings": 2 (integer),
  "isServingsAiGenerated": boolean,
  "prepTimeMinutes": 30 (integer o null),
  "isPrepTimeAiGenerated": boolean,
  "category": "Una tra: 'first_courses', 'second_courses', 'desserts', 'appetizers', 'sides', 'single_dishes', 'other' (string)",
  "kcal": 250 (integer o null per 100g),
  "proteins": 12.5 (number o null per 100g),
  "carbs": 30.0 (number o null per 100g),
  "fats": 8.0 (number o null per 100g),
  "fiber": 2.5 (number o null per 100g),
  "sugar": 3.0 (number o null per 100g),
  "isNutritionalAiGenerated": boolean,
  "nutritionalRating": "A" | "B" | "C" | "D" | "E" o null,
  "nutritionalAssessment": "Breve commento nutrizionale max 120 caratteri (string o null)",
  "isGlutenFree": boolean,
  "isVegan": boolean,
  "isVegetarian": boolean,
  "isLactoseFree": boolean,
  "ingredients": [
    {
      "name": "Nome dell'ingrediente (string)",
      "quantity": 100 (number o null),
      "unit": "g" | "ml" | "q.b." | "" (string),
      "isAiGenerated": boolean
    }
  ],
  "instructions": [
    {
      "text": "Descrizione ordinata del passaggio (string)",
      "isAiGenerated": boolean
    }
  ]
}

Assicurati che l'output sia solo ed esclusivamente l'oggetto JSON richiesto senza blocchi markdown aggiuntivi.
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://gustosmart.it",
      "X-Title": "GustoSmart Image Ingestion Pipeline"
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64DataUrl
              }
            }
          ]
        }
      ],
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Errore risposta OpenRouter Vision:", errorText);
    throw new Error(`Errore OpenRouter Vision API: ${response.status} - ${errorText}`);
  }

  const resJson = await response.json();
  const responseText = resJson.choices?.[0]?.message?.content;

  if (!responseText) {
    throw new Error("Risposta vuota da parte del servizio di analisi immagine.");
  }

  try {
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();
    }
    return {
      recipe: JSON.parse(cleanJson),
      usage: resJson.usage || null,
      model: resJson.model || modelId,
      generationId: resJson.id || null,
    };
  } catch (err: any) {
    console.error("Errore nel parsing del JSON di Gemini Vision:", responseText);
    throw new Error("Impossibile decodificare la ricetta estratta dall'immagine.");
  }
}
