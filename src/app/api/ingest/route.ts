import { identifyPlatform } from "@/lib/scraping/detector";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, doc, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { scrapeInstagram, scrapeTikTok, scrapeFacebook, scrapeYouTube } from "@/lib/scraping/scrapecreators";
import { scrapeWebPage } from "@/lib/scraping/web";
import { generateRecipeFromText, generateRecipeFromWeb } from "@/lib/scraping/gemini";
import { validateAndFormatRecipe } from "@/lib/scraping/validation";
import { uploadImageToB2 } from "@/lib/scraping/b2";
import { cleanUrl, resolveRedirect } from "@/lib/scraping/urlCleaner";

// Forza il tempo massimo di esecuzione a 60 secondi (utile per Vercel/Netlify)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, userId, userEmail } = body;

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

    if (platform !== "instagram" && platform !== "tiktok" && platform !== "youtube" && platform !== "facebook" && platform !== "web") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Al momento supportiamo solo l'importazione da Instagram Reel, TikTok, YouTube, Facebook Reel e siti web di ricette.",
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
          // 0. RISOLUZIONE E PULIZIA URL
          console.log(`[Ingest Route] Risoluzione URL originale: ${url}`);
          sendEvent("status", { step: "scraping", progress: 5 });

          const resolvedUrl = await resolveRedirect(url);
          const finalUrl = cleanUrl(resolvedUrl);
          console.log(`[Ingest Route] URL risolto e pulito: ${finalUrl}`);

          const cleanedPlatform = identifyPlatform(finalUrl);

          // Controllo duplicati secondario sul server (dopo la risoluzione dei redirect)
          const firestoreDb = getFirebaseDb();
          const q = query(collection(firestoreDb, "recipes"), where("sourceUrl", "==", finalUrl));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const existingDoc = snap.docs[0];
            const existingId = existingDoc.id;
            const existingRecipe = existingDoc.data();
            console.log(`[Ingest Route] Cache hit server-side per recipeId: ${existingId} e URL: ${finalUrl}`);

            sendEvent("success", { recipe: existingRecipe, recipeId: existingId, generationId: "cache-hit" });
            controller.close();
            return;
          }

          // STEP 1: SCRAPING
          console.log(`[Ingest Route] STEP 1: Scraping per URL: ${finalUrl}`);
          sendEvent("status", { step: "scraping", progress: 15 });

          const scrapedData = cleanedPlatform === "instagram"
            ? await scrapeInstagram(finalUrl)
            : cleanedPlatform === "tiktok"
            ? await scrapeTikTok(finalUrl)
            : cleanedPlatform === "facebook"
            ? await scrapeFacebook(finalUrl)
            : cleanedPlatform === "youtube"
            ? await scrapeYouTube(finalUrl)
            : await scrapeWebPage(finalUrl);

          // Log ScrapeCreators Credit Balance Event if present
          if (scrapedData.scrapecreatorsCreditsRemaining !== undefined && scrapedData.scrapecreatorsCreditsRemaining !== null) {
            try {
              const expireAt = new Date();
              expireAt.setDate(expireAt.getDate() + 7);

              await addDoc(collection(firestoreDb, "analytics_events"), {
                eventName: "scrapecreators_credits",
                userId: userId || null,
                userEmail: userEmail || null,
                timestamp: serverTimestamp(),
                expireAt,
                params: {
                  credits_remaining: scrapedData.scrapecreatorsCreditsRemaining,
                  source_platform: cleanedPlatform
                }
              });
            } catch (fsErr) {
              console.error("[Ingest Route] Errore nel salvataggio del log crediti ScrapeCreators su Firestore:", fsErr);
            }
          }

          const cleanCaption = (scrapedData.caption || "").trim();
          const cleanTranscript = (scrapedData.transcript || "").trim();
          const hasStructuredData = cleanedPlatform === "web" && !!scrapedData.recipeStructuredData;

          if (!cleanCaption && !cleanTranscript && !hasStructuredData) {
            throw new Error("INSUFFICIENT_RECIPE_DATA");
          }

          // STEP 2: AI & IMAGE UPLOAD (IN PARALLELO)
          console.log(`[Ingest Route] STEP 2: AI Extraction & Cover upload in parallelo`);
          sendEvent("status", { step: "extracting", progress: 50 });

          const geminiPromise = cleanedPlatform === "web"
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

          // Log OpenRouter Call Event
          const usage = geminiOutput.usage;
          if (usage) {
            try {
              const expireAt = new Date();
              expireAt.setDate(expireAt.getDate() + 7);

              await addDoc(collection(firestoreDb, "analytics_events"), {
                eventName: "openrouter_call",
                userId: userId || null,
                userEmail: userEmail || null,
                timestamp: serverTimestamp(),
                expireAt,
                params: {
                  generation_id: geminiOutput.generationId || "",
                  type: "ingest",
                  prompt_tokens: usage.prompt_tokens ?? 0,
                  completion_tokens: usage.completion_tokens ?? 0,
                  cost: usage.cost ?? 0
                }
              });
            } catch (fsErr) {
              console.error("[Ingest Route] Errore nel salvataggio del log di chiamata OpenRouter su Firestore:", fsErr);
            }
          }

          if (geminiOutput.recipe.isRecipeDetailsPresent === false) {
            throw new Error("INSUFFICIENT_RECIPE_DATA");
          }

          // STEP 3: VALIDATION
          console.log(`[Ingest Route] STEP 3: Validazione e formattazione con Zod`);
          sendEvent("status", { step: "saving", progress: 90 });

          const validatedRecipe = validateAndFormatRecipe(
            geminiOutput.recipe,
            finalUrl,
            b2ImageUrl,
            {
              username: scrapedData.creatorUsername,
              fullName: scrapedData.creatorFullName,
              id: scrapedData.creatorId,
            }
          );

          // SUCCESS
          console.log(`[Ingest Route] Ingest completato per recipeId: ${recipeId}`);
          sendEvent("success", {
            recipe: validatedRecipe,
            recipeId,
            generationId: geminiOutput.generationId,
            scrapecreatorsCreditsRemaining: scrapedData.scrapecreatorsCreditsRemaining ?? null
          });
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
