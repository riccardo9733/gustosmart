import { NextResponse } from "next/server";
import { identifyPlatform } from "@/lib/scraping/detector";
import { startInstagramScraper, startTikTokScraper } from "@/lib/scraping/apify";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, doc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, userId } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "L'URL è obbligatorio" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "L'ID utente è obbligatorio" },
        { status: 400 }
      );
    }

    // 1. Identifica la piattaforma
    let platform: string;
    try {
      platform = identifyPlatform(url);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "URL non valido" },
        { status: 400 }
      );
    }

    // Supportiamo Instagram Reel e TikTok
    if (platform !== "instagram" && platform !== "tiktok") {
      return NextResponse.json(
        {
          success: false,
          error: "Al momento supportiamo solo l'importazione da Instagram Reel e TikTok.",
        },
        { status: 400 }
      );
    }

    // NOTE: La deduplicazione per sourceUrl viene eseguita lato client (page.tsx)
    // prima di chiamare questa route, dove l'utente è già autenticato e può
    // interrogare Firestore. Il client SDK lato server non ha auth context.

    // 2. Pre-genera l'ID della ricetta su Firestore
    const db = getFirebaseDb();
    const newRecipeRef = doc(collection(db, "recipes"));
    const recipeId = newRecipeRef.id;

    // 3. Avvia Apify in modo asincrono
    console.log(`Avvio scraping Apify (${platform}) per URL: ${url} per utente: ${userId}`);
    const { runId, datasetId } = platform === "instagram"
      ? await startInstagramScraper(url)
      : await startTikTokScraper(url);
    console.log(`Scraping Apify avviato con successo. Run ID: ${runId}, Dataset ID: ${datasetId}`);

    // 4. Risponde immediatamente al client
    return NextResponse.json(
      {
        success: true,
        alreadyExists: false,
        runId,
        datasetId,
        recipeId,
        message: "Scraping avviato con successo",
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Errore nell'endpoint /api/ingest:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}
