// @ts-nocheck
import "../polyfill.ts";
import "@supabase/functions-js/edge-runtime.d.ts";

import { getFirebaseDb } from "../_shared/firebase.ts";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { generateRecipeFromImage } from "../_shared/gemini-vision.ts";
import { uploadBufferToB2, getExtensionFromContentType } from "../_shared/b2.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
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
    const { imageBase64, userId, userEmail } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ success: false, error: "L'immagine è obbligatoria per l'ingest da foto/screenshot" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "L'ID utente è obbligatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Genera l'ID della ricetta su Firestore
    const db = getFirebaseDb();
    const newRecipeRef = doc(collection(db, "recipes"));
    const recipeId = newRecipeRef.id;

    const encoder = new TextEncoder();

    // 2. Crea lo stream SSE
    const stream = new ReadableStream({
      async start(controller) {
        let isFinished = false;
        const sendEvent = (event: string, data: any) => {
          if (isFinished) return;
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error("Errore invio evento SSE:", e);
          }
        };

        const timeoutId = setTimeout(() => {
          if (!isFinished) {
            isFinished = true;
            console.error(`[Ingest Image Function] Timeout per recipeId: ${recipeId}`);
            sendEvent("error", { error: "L'analisi dell'immagine ha impiegato troppo tempo." });
            try {
              controller.close();
            } catch (_) {}
          }
        }, 120000); // 120 secondi timeout

        try {
          console.log(`[Ingest Image Function] Avvio analisi per userId: ${userId}, recipeId: ${recipeId}`);
          sendEvent("status", { step: "scraping", progress: 20 });

          // STEP 1: Analisi Gemini Vision & Upload B2 in parallelo
          console.log(`[Ingest Image Function] Esecuzione Gemini Vision API`);
          sendEvent("status", { step: "extracting", progress: 50 });

          // Estraggo eventuale content-type dal data URL (es. data:image/png;base64,...)
          let contentType = "image/jpeg";
          let rawBase64 = imageBase64;
          if (imageBase64.startsWith("data:")) {
            const matches = imageBase64.match(/^data:(image\/[a-zA-Z0-9\+\-]+);base64,(.+)$/);
            if (matches) {
              contentType = matches[1];
              rawBase64 = matches[2];
            }
          }

          const imageBuffer = Buffer.from(rawBase64, "base64");
          const ext = getExtensionFromContentType(contentType);
          const fileKey = `recipes/${recipeId}/cover.${ext}`;

          const geminiPromise = generateRecipeFromImage(imageBase64);
          const uploadPromise = uploadBufferToB2(imageBuffer, fileKey, contentType).catch((err) => {
            console.error("[Ingest Image Function] Upload immagine B2 fallito:", err);
            return null;
          });

          const [geminiResult, b2ImageUrl] = await Promise.all([geminiPromise, uploadPromise]);
          const geminiOutput = geminiResult?.recipe;
          const usage = geminiResult?.usage;
          const model = geminiResult?.model;

          if (!geminiOutput || geminiOutput.isRecipeDetailsPresent === false) {
            throw new Error("L'immagine caricata non sembra contenere una ricetta leggibile o sufficienti dettagli culinari.");
          }

          // Log dell'evento OpenRouter Call su Supabase ai_usage_events
          if (usage) {
            try {
              const supabase = getSupabaseClient();
              await supabase.from("ai_usage_events").insert({
                event_name: "openrouter_call",
                user_id: userId || null,
                user_email: userEmail || null,
                action_type: "ingest_image",
                model: model || "google/gemini-3-flash-preview",
                prompt_tokens: usage.prompt_tokens ?? 0,
                completion_tokens: usage.completion_tokens ?? 0,
                cost: usage.cost ?? 0,
              });
            } catch (sbErr) {
              console.error("[Ingest Image Function] Errore nel salvataggio del log di chiamata OpenRouter su Supabase:", sbErr);
            }
          }

          sendEvent("status", { step: "saving", progress: 85 });

          // Format degli ingredienti e istruzioni per Firestore
          const formattedIngredients = Array.isArray(geminiOutput.ingredients)
            ? geminiOutput.ingredients.map((ing: any) => ({
                name: String(ing.name || "").trim(),
                quantity: ing.quantity !== undefined && ing.quantity !== null ? Number(ing.quantity) : null,
                unit: ing.unit !== undefined && ing.unit !== null ? String(ing.unit) : "q.b.",
                isAiGenerated: Boolean(ing.isAiGenerated),
              }))
            : [];

          const formattedInstructions = Array.isArray(geminiOutput.instructions)
            ? geminiOutput.instructions.map((inst: any) => {
                if (typeof inst === "object" && inst !== null) {
                  return {
                    text: String(inst.text || "").trim(),
                    isAiGenerated: Boolean(inst.isAiGenerated),
                  };
                }
                return {
                  text: String(inst).trim(),
                  isAiGenerated: false,
                };
              })
            : [];

          const finalRecipeData = {
            id: recipeId,
            title: geminiOutput.title || "Ricetta da Immagine",
            isTitleAiGenerated: Boolean(geminiOutput.isTitleAiGenerated),
            sourceUrl: "",
            sourcePlatform: "image",
            sourceType: "image_upload",
            sourceImageUrl: b2ImageUrl || null,
            imageUrl: b2ImageUrl || null,
            isPublic: false, // RICETTA PRIVATA - non va nel feed pubblico!
            sourceLanguage: geminiOutput.sourceLanguage || "it",
            servings: geminiOutput.servings ? Number(geminiOutput.servings) : 2,
            isServingsAiGenerated: Boolean(geminiOutput.isServingsAiGenerated),
            prepTimeMinutes: geminiOutput.prepTimeMinutes ? Number(geminiOutput.prepTimeMinutes) : null,
            isPrepTimeAiGenerated: Boolean(geminiOutput.isPrepTimeAiGenerated),
            category: geminiOutput.category || "other",
            ingredients: formattedIngredients,
            instructions: formattedInstructions,
            kcal: geminiOutput.kcal ? Number(geminiOutput.kcal) : null,
            proteins: geminiOutput.proteins ? Number(geminiOutput.proteins) : null,
            carbs: geminiOutput.carbs ? Number(geminiOutput.carbs) : null,
            fats: geminiOutput.fats ? Number(geminiOutput.fats) : null,
            fiber: geminiOutput.fiber ? Number(geminiOutput.fiber) : null,
            sugar: geminiOutput.sugar ? Number(geminiOutput.sugar) : null,
            isNutritionalAiGenerated: Boolean(geminiOutput.isNutritionalAiGenerated),
            nutritionalRating: geminiOutput.nutritionalRating || null,
            nutritionalAssessment: geminiOutput.nutritionalAssessment || null,
            isGlutenFree: geminiOutput.isGlutenFree ?? null,
            isVegan: geminiOutput.isVegan ?? null,
            isVegetarian: geminiOutput.isVegetarian ?? null,
            isLactoseFree: geminiOutput.isLactoseFree ?? null,
            createdBy: userId,
            createdAt: new Date().toISOString(),
          };

          // Log su Supabase
          try {
            const supabase = getSupabaseClient();
            await supabase.from("ingestion_events").insert({
              event_name: "recipe_import_completed",
              user_id: userId || null,
              user_email: userEmail || null,
              platform: "image",
              status: "completed",
              is_cached: false,
              credits_used: 0,
            });
          } catch (e) {
            console.error("[Ingest Image Function] Errore log import_completed:", e);
          }

          sendEvent("success", {
            recipe: finalRecipeData,
            recipeId,
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
          console.error(`[Ingest Image Function] Errore durante l'elaborazione dell'immagine:`, errorMessage);

          sendEvent("error", { error: errorMessage || "Impossibile elaborare la foto della ricetta." });
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
    console.error("Errore nell'endpoint ingest-image:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Errore interno del server" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
