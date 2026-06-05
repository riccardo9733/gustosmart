import { NextResponse } from "next/server";
import { getRunStatus, getDatasetItems } from "@/lib/scraping/apify";
import { generateRecipeFromText } from "@/lib/scraping/gemini";
import { validateAndFormatRecipe } from "@/lib/scraping/validation";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");
    const datasetId = searchParams.get("datasetId");
    const recipeId = searchParams.get("recipeId");
    const userId = searchParams.get("userId");
    const sourceUrl = searchParams.get("sourceUrl");

    if (!runId || !datasetId || !recipeId || !userId || !sourceUrl) {
      return NextResponse.json(
        { success: false, error: "Parametri obbligatori mancanti: runId, datasetId, recipeId, userId, sourceUrl" },
        { status: 400 }
      );
    }

    // 1. Controlla lo stato del run di Apify
    const runStatus = await getRunStatus(runId);

    if (runStatus === "RUNNING") {
      return NextResponse.json({ success: true, status: "processing" });
    }

    if (runStatus === "FAILED" || runStatus === "OTHER") {
      return NextResponse.json(
        { success: false, status: "failed", error: "Lo scraping su Apify è fallito o è stato annullato." },
        { status: 200 } // Restituiamo 200 così il client gestisce lo stato di errore nel polling
      );
    }

    // 2. Se completato con successo, procedi con l'elaborazione
    console.log(`Apify run completato. Recupero dati dataset: ${datasetId}`);
    const scrapedData = await getDatasetItems(datasetId);
    
    console.log("Dati recuperati da Apify. Avvio estrazione con Gemini...");
    const geminiOutput = await generateRecipeFromText(scrapedData.caption, scrapedData.transcript);
    
    console.log("Risposta Gemini ottenuta. Validazione e formattazione con Zod...");
    const validatedRecipe = validateAndFormatRecipe(geminiOutput, sourceUrl, scrapedData.coverImageUrl);

    return NextResponse.json({
      success: true,
      status: "succeeded",
      recipe: validatedRecipe
    });

  } catch (error: any) {
    console.error("Errore nell'endpoint /api/ingest/status:", error);
    return NextResponse.json(
      { success: false, status: "failed", error: error.message || "Errore durante l'elaborazione della ricetta" },
      { status: 200 }
    );
  }
}
