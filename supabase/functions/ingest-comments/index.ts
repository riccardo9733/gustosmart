import "../polyfill.ts";
import "@supabase/functions-js/edge-runtime.d.ts";

import { scrapeInstagramComments } from "../_shared/scrapecreators.ts";
import { generateRecipeFromText } from "../_shared/gemini.ts";
import { validateAndFormatRecipe } from "../_shared/validation.ts";
import { deleteImageByUrl } from "../_shared/b2.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      url,
      userId,
      userEmail,
      caption,
      transcript,
      b2ImageUrl,
      recipeId,
      creatorUsername,
      creatorFullName,
      creatorId,
    } = body;

    if (!url || !userId || !recipeId) {
      return new Response(
        JSON.stringify({ success: false, error: "Parametri obbligatori mancanti (url, userId, recipeId)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("SCRAPECREATORS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Servizio di scraping non configurato" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let isFinished = false;
        const sendEvent = (event: string, data: any) => {
          if (isFinished) return;
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error("[Ingest Comments] Errore invio evento SSE:", e);
          }
        };

        const timeoutId = setTimeout(() => {
          if (isFinished) return;
          isFinished = true;
          console.warn("[Ingest Comments] Timeout globale di 45s superato.");
          sendEvent("error", { error: "ANALYSIS_TIMEOUT" });
          try {
            controller.close();
          } catch (_) {}
        }, 45000);

        try {
          // STEP 1: SCRAPING COMMENTI
          console.log(`[Ingest Comments] STEP 1: Scraping commenti per URL: ${url}`);
          sendEvent("status", { step: "scraping", progress: 15 });

          const { comments, creditsRemaining } = await scrapeInstagramComments(url, creatorUsername);

          // Log crediti ScrapeCreators
          if (creditsRemaining !== null && creditsRemaining !== undefined) {
            try {
              const supabase = getSupabaseClient();
              await supabase.from("ingestion_events").insert({
                event_name: "scrapecreators_credits",
                user_id: userId || null,
                user_email: userEmail || null,
                platform: "instagram",
                credits_remaining: creditsRemaining,
              });
            } catch (sbErr) {
              console.error("[Ingest Comments] Errore log crediti SC su Supabase:", sbErr);
            }
          }

          if (!comments || comments.length === 0) {
            console.log("[Ingest Comments] Nessun commento rilevante trovato.");
            // Cancella immagine B2 orfana
            if (b2ImageUrl) {
              try {
                await deleteImageByUrl(b2ImageUrl);
              } catch (cleanupErr) {
                console.error("[Ingest Comments] Errore cancellazione immagine B2:", cleanupErr);
              }
            }
            sendEvent("error", { error: "INSUFFICIENT_RECIPE_DATA" });
            if (!isFinished) {
              isFinished = true;
              clearTimeout(timeoutId);
              controller.close();
            }
            return;
          }

          // STEP 2: RE-INVOCAZIONE GEMINI CON I COMMENTI
          console.log(`[Ingest Comments] STEP 2: Re-invocazione Gemini con ${comments.length} commenti`);
          sendEvent("status", { step: "extracting", progress: 50 });

          const geminiOutput = await generateRecipeFromText(
            caption || "",
            transcript || "",
            comments
          );

          // Log OpenRouter Call
          const usage = geminiOutput.usage;
          if (usage) {
            try {
              const supabase = getSupabaseClient();
              await supabase.from("ai_usage_events").insert({
                event_name: "openrouter_call",
                user_id: userId || null,
                user_email: userEmail || null,
                action_type: "ingest_comment_search",
                model: geminiOutput.model || null,
                prompt_tokens: usage.prompt_tokens ?? 0,
                completion_tokens: usage.completion_tokens ?? 0,
                cost: usage.cost ?? 0,
              });
            } catch (sbErr) {
              console.error("[Ingest Comments] Errore log OpenRouter su Supabase:", sbErr);
            }
          }

          if (geminiOutput.recipe.isRecipeDetailsPresent === false) {
            console.log("[Ingest Comments] Gemini ha restituito isRecipeDetailsPresent=false anche con i commenti.");
            // Cancella immagine B2 orfana
            if (b2ImageUrl) {
              try {
                await deleteImageByUrl(b2ImageUrl);
              } catch (cleanupErr) {
                console.error("[Ingest Comments] Errore cancellazione immagine B2:", cleanupErr);
              }
            }
            sendEvent("error", { error: "INSUFFICIENT_RECIPE_DATA" });
            if (!isFinished) {
              isFinished = true;
              clearTimeout(timeoutId);
              controller.close();
            }
            return;
          }

          // STEP 3: VALIDAZIONE E SUCCESSO
          console.log(`[Ingest Comments] STEP 3: Validazione e formattazione`);
          sendEvent("status", { step: "saving", progress: 90 });

          const validatedRecipe = validateAndFormatRecipe(
            geminiOutput.recipe,
            url,
            b2ImageUrl || null,
            {
              username: creatorUsername,
              fullName: creatorFullName,
              id: creatorId,
            }
          );

          console.log(`[Ingest Comments] Ricerca commenti completata con successo per recipeId: ${recipeId}`);
          sendEvent("success", {
            recipe: validatedRecipe,
            recipeId,
            generationId: geminiOutput.generationId,
            scrapecreatorsCreditsRemaining: creditsRemaining ?? null,
          });
          if (!isFinished) {
            isFinished = true;
            clearTimeout(timeoutId);
            controller.close();
          }
        } catch (err: any) {
          if (isFinished) return;
          isFinished = true;
          clearTimeout(timeoutId);
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[Ingest Comments] Errore:`, errorMessage);

          // Cancella immagine B2 orfana in caso di errore
          if (b2ImageUrl) {
            try {
              await deleteImageByUrl(b2ImageUrl);
            } catch (cleanupErr) {
              console.error("[Ingest Comments] Errore cancellazione immagine B2:", cleanupErr);
            }
          }

          sendEvent("error", { error: errorMessage || "Errore imprevisto durante la ricerca nei commenti" });
          try {
            controller.close();
          } catch (_) {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("[Ingest Comments] Errore endpoint:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Errore interno del server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
