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
  "servings": "Numero di porzioni per cui sono calibrati gli ingredienti (integer, default: 2 se non specificato)",
  "prepTimeMinutes": "Tempo totale di preparazione e cottura in minuti (integer, nullo o non inserito se non deducibile)",
  "ingredients": [
    {
      "name": "Nome dell'ingrediente, es. Farina 00, Uova (string)",
      "quantity": "Quantità numerica, es. 150, 3 (number, null se q.b. o a sentimento)",
      "unit": "Unità di misura, es. g, ml, cucchiai, pezzi. Default 'q.b.' se non specificata (string)"
    }
  ],
  "instructions": [
    "Istruzioni ordinate passo dopo passo, come elementi di questo array di stringhe"
  ]
}

Istruzioni per l'estrazione:
1. Deduci gli ingredienti sia dalla Caption che dalla Trascrizione Audio. Unisci le informazioni per avere una lista completa.
2. Identifica le dosi e le unità di misura corrette. Se le dosi non sono espresse o sono a sentimento, non specificare 'quantity' (impostalo a null) e imposta 'unit' come 'q.b.'.
3. Se non trovi indicazioni sul numero di porzioni, imposta 'servings' a 2 di default.
4. Ordina i passaggi delle istruzioni in ordine cronologico e logico chiaro.
5. Traduci i termini culinari in italiano corretto se sono in altre lingue.
6. Assicurati che l'output sia solo ed esclusivamente il JSON richiesto. Non includere blocchi di markdown o testo aggiuntivo al di fuori dell'oggetto JSON.
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
