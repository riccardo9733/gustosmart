import { NextResponse } from "next/server";
import { scrapeInstagram, scrapeTikTok } from "@/lib/scraping/scrapecreators";
import { scrapeWebPage } from "@/lib/scraping/web";
import { identifyPlatform } from "@/lib/scraping/detector";
import { generateRecipeFromText } from "@/lib/scraping/gemini";
import { validateAndFormatRecipe } from "@/lib/scraping/validation";
import { uploadImageToB2 } from "@/lib/scraping/b2";

interface ScrapingJob {
  status: "processing" | "succeeded" | "failed";
  recipe?: Record<string, unknown>;
  error?: string;
}

// Registro in-memory globale per evitare esecuzioni duplicate dello scraping dovute al polling ravvicinato del client.
// Usiamo globalThis per mantenere lo stato persistente durante l'hot-reload in sviluppo locale.
const activeJobs = ((globalThis as unknown) as { activeJobs?: Map<string, ScrapingJob> }).activeJobs || new Map<string, ScrapingJob>();
((globalThis as unknown) as { activeJobs?: Map<string, ScrapingJob> }).activeJobs = activeJobs;

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

    // 1. Controlla prima se il processo è già registrato in memoria
    if (activeJobs.has(recipeId)) {
      const job = activeJobs.get(recipeId) as ScrapingJob;
      if (job.status === "processing") {
        return NextResponse.json({ success: true, status: "processing" });
      }
      if (job.status === "failed") {
        return NextResponse.json({
          success: false,
          status: "failed",
          error: job.error || "Errore durante l'importazione"
        });
      }
      if (job.status === "succeeded") {
        return NextResponse.json({
          success: true,
          status: "succeeded",
          recipe: job.recipe
        });
      }
    }
    // 2. È il primo poll per questa ricetta: inizializziamo il processo in background
    activeJobs.set(recipeId, { status: "processing" });

    // Avvio asincrono dell'elaborazione per non bloccare la prima risposta al client
    (async () => {
      try {
        console.log(`[Scraper API] Avvio dello scraping ScrapeCreators per recipeId: ${recipeId}, URL: ${sourceUrl}`);
        const platform = identifyPlatform(sourceUrl);

        // A. Recupero dati tramite ScrapeCreators o Scraper Web
        const scrapedData = platform === "instagram"
          ? await scrapeInstagram(sourceUrl)
          : platform === "tiktok"
          ? await scrapeTikTok(sourceUrl)
          : await scrapeWebPage(sourceUrl);

        console.log(`[Scraper API] Dati ottenuti. Avvio dell'estrazione ricetta con Gemini...`);
        const geminiOutput = await generateRecipeFromText(scrapedData.caption, scrapedData.transcript);

        console.log(`[Scraper API] Risposta Gemini ottenuta. Caricamento immagine di copertina su B2...`);
        let b2ImageUrl: string | null = null;
        if (scrapedData.coverImageUrl) {
          try {
            b2ImageUrl = await uploadImageToB2(scrapedData.coverImageUrl, recipeId);
            console.log(`[Scraper API] Immagine caricata su B2: ${b2ImageUrl}`);
          } catch (b2Err) {
            console.error("[Scraper API] Caricamento immagine su B2 fallito, uso fallback URL originale:", b2Err);
            b2ImageUrl = scrapedData.coverImageUrl;
          }
        }

        console.log(`[Scraper API] Validazione e formattazione dei dati con Zod...`);
        const validatedRecipe = validateAndFormatRecipe(
          geminiOutput,
          sourceUrl,
          b2ImageUrl,
          {
            username: scrapedData.creatorUsername,
            fullName: scrapedData.creatorFullName,
            id: scrapedData.creatorId
          }
        );

        // Impostiamo lo stato di successo in memoria
        activeJobs.set(recipeId, {
          status: "succeeded",
          recipe: validatedRecipe as Record<string, unknown>
        });
        console.log(`[Scraper API] Elaborazione completata per recipeId: ${recipeId}`);

        // Rimuove il job dalla cache in memoria dopo 30 secondi
        setTimeout(() => {
          activeJobs.delete(recipeId);
        }, 30000);

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Scraper API] Errore durante lo scraping asincrono per recipeId ${recipeId}:`, err);
        activeJobs.set(recipeId, {
          status: "failed",
          error: errorMessage || "Errore imprevisto durante l'elaborazione della ricetta"
        });

        // Rimuove il job fallito dopo 30 secondi
        setTimeout(() => {
          activeJobs.delete(recipeId);
        }, 30000);
      }
    })();

    // Risponde subito "processing" al primo poll per non rischiare il timeout
    return NextResponse.json({ success: true, status: "processing" });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Errore nell'endpoint /api/ingest/status:", error);
    return NextResponse.json(
      { success: false, status: "failed", error: errorMessage || "Errore generico durante l'elaborazione" },
      { status: 200 }
    );
  }
}
