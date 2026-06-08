import { NextResponse } from "next/server";
import { identifyPlatform } from "@/lib/scraping/detector";
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

    // Verifica la chiave API ScrapeCreators all'avvio
    const apiKey = process.env.SCRAPECREATORS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Servizio di scraping non configurato: manca SCRAPECREATORS_API_KEY in .env.local" },
        { status: 500 }
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

    // Supportiamo Instagram Reel, TikTok e Pagine Web di ricette
    if (platform !== "instagram" && platform !== "tiktok" && platform !== "web") {
      return NextResponse.json(
        {
          success: false,
          error: "Al momento supportiamo solo l'importazione da Instagram Reel, TikTok e siti web di ricette.",
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

    console.log(`Inizializzazione sessione scraping ScrapeCreators (${platform}) per URL: ${url} per utente: ${userId}`);
    const runId = recipeId;
    const datasetId = recipeId;

    // 4. Risponde immediatamente al client per avviare il polling
    return NextResponse.json(
      {
        success: true,
        alreadyExists: false,
        runId,
        datasetId,
        recipeId,
        message: "Scraping inizializzato con successo",
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
