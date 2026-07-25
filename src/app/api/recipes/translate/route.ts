import { NextResponse } from "next/server";
import { translateRecipe } from "@/lib/scraping/gemini";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, ingredients, instructions, targetLanguage, nutritionalAssessment, userId, userEmail } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Il titolo è obbligatorio" },
        { status: 400 }
      );
    }
    if (!targetLanguage) {
      return NextResponse.json(
        { success: false, error: "La lingua di destinazione è obbligatoria" },
        { status: 400 }
      );
    }

    // Effettua la traduzione tramite l'utility Gemini
    console.log(`Avvio traduzione ricetta tramite Gemini in lingua: ${targetLanguage}`);
    const translatedJson = await translateRecipe(
      title,
      ingredients || [],
      instructions || [],
      targetLanguage,
      nutritionalAssessment || null
    );
    console.log(`Traduzione completata con successo`);

    // Log OpenRouter Call Event to Supabase
    const usage = translatedJson.usage;
    if (usage) {
      try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        await supabase.from("ai_usage_events").insert({
          event_name: "openrouter_call",
          user_id: userId || null,
          user_email: userEmail || null,
          action_type: "translate",
          model: translatedJson.model || null,
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
          cost: usage.cost ?? 0,
        });
      } catch (sbErr) {
        console.error("[Translate Route] Errore nel salvataggio del log di chiamata OpenRouter su Supabase:", sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      translation: {
        title: translatedJson.translation.title,
        ingredients: translatedJson.translation.ingredients || [],
        instructions: translatedJson.translation.instructions || [],
        nutritionalAssessment: translatedJson.translation.nutritionalAssessment || null,
      },
      generationId: translatedJson.generationId
    });
  } catch (error: unknown) {
    console.error("Errore nell'endpoint /api/recipes/translate:", error);
    const errorMsg = error instanceof Error ? error.message : "Errore interno del server";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
