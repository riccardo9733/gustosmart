import { identifyPlatform } from "@/lib/scraping/detector";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, doc } from "firebase/firestore";
import { scrapeInstagram, scrapeTikTok } from "@/lib/scraping/scrapecreators";
import { scrapeWebPage } from "@/lib/scraping/web";
import { generateRecipeFromText, generateRecipeFromWeb } from "@/lib/scraping/gemini";
import { validateAndFormatRecipe } from "@/lib/scraping/validation";
import { uploadImageToB2 } from "@/lib/scraping/b2";

// Forza il tempo massimo di esecuzione a 60 secondi (utile per Vercel/Netlify)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, userId } = body;

    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "L'URL è obbligatorio" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "L'ID utente è obbligatorio" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.SCRAPECREATORS_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Servizio di scraping non configurato: manca SCRAPECREATORS_API_KEY in .env.local" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let platform: string;
    try {
      platform = identifyPlatform(url);
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message || "URL non valido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (platform !== "instagram" && platform !== "tiktok" && platform !== "web") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Al momento supportiamo solo l'importazione da Instagram Reel, TikTok e siti web di ricette.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Genera l'ID della ricetta su Firestore
    const db = getFirebaseDb();
    const newRecipeRef = doc(collection(db, "recipes"));
    const recipeId = newRecipeRef.id;

    const encoder = new TextEncoder();

    // 2. Crea lo stream di risposta (Server-Sent Events)
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error("Errore durante l'invio dell'evento nello stream:", e);
          }
        };

        try {
          // STEP 1: SCRAPING
          console.log(`[Ingest Route] STEP 1: Scraping per URL: ${url}`);
          sendEvent("status", { step: "scraping", progress: 15 });

          const scrapedData = platform === "instagram"
            ? await scrapeInstagram(url)
            : platform === "tiktok"
            ? await scrapeTikTok(url)
            : await scrapeWebPage(url);

          const cleanCaption = (scrapedData.caption || "").trim();
          const cleanTranscript = (scrapedData.transcript || "").trim();
          const hasStructuredData = platform === "web" && !!scrapedData.recipeStructuredData;

          if (!cleanCaption && !cleanTranscript && !hasStructuredData) {
            throw new Error("INSUFFICIENT_RECIPE_DATA");
          }

          // STEP 2: AI & IMAGE UPLOAD (IN PARALLELO)
          console.log(`[Ingest Route] STEP 2: AI Extraction & Cover upload in parallelo`);
          sendEvent("status", { step: "extracting", progress: 50 });

          const geminiPromise = platform === "web"
            ? generateRecipeFromWeb(scrapedData)
            : generateRecipeFromText(scrapedData.caption, scrapedData.transcript);

          const uploadPromise = (async () => {
            if (scrapedData.coverImageUrl) {
              try {
                return await uploadImageToB2(scrapedData.coverImageUrl, recipeId);
              } catch (b2Err) {
                console.error("[Ingest Route] Caricamento immagine su B2 fallito, uso fallback URL originale:", b2Err);
                return scrapedData.coverImageUrl;
              }
            }
            return null;
          })();

          const [geminiOutput, b2ImageUrl] = await Promise.all([geminiPromise, uploadPromise]);

          if (geminiOutput.isRecipeDetailsPresent === false) {
            throw new Error("INSUFFICIENT_RECIPE_DATA");
          }

          // STEP 3: VALIDATION
          console.log(`[Ingest Route] STEP 3: Validazione e formattazione con Zod`);
          sendEvent("status", { step: "saving", progress: 90 });

          const validatedRecipe = validateAndFormatRecipe(
            geminiOutput,
            url,
            b2ImageUrl,
            {
              username: scrapedData.creatorUsername,
              fullName: scrapedData.creatorFullName,
              id: scrapedData.creatorId,
            }
          );

          // SUCCESS
          console.log(`[Ingest Route] Ingest completato per recipeId: ${recipeId}`);
          sendEvent("success", { recipe: validatedRecipe, recipeId });
          controller.close();
        } catch (err: any) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[Ingest Route] Errore durante lo streaming dell'ingest:`, errorMessage);
          sendEvent("error", { error: errorMessage || "Errore imprevisto durante l'elaborazione" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Errore nell'endpoint /api/ingest:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Errore interno del server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
