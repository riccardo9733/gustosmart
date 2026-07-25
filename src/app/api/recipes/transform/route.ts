import { NextResponse } from "next/server";
import { transformRecipe } from "@/lib/scraping/gemini";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipe, targetType, userId, userEmail } = body;

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: "La ricetta è obbligatoria" },
        { status: 400 }
      );
    }
    if (!targetType || !["vegan", "vegetarian", "lactose_free", "gluten_free", "light"].includes(targetType)) {
      return NextResponse.json(
        { success: false, error: "Il tipo di adattamento non è valido" },
        { status: 400 }
      );
    }

    console.log(`Avvio trasformazione ricetta tramite Gemini in versione: ${targetType}`);
    const transformedJson = await transformRecipe(recipe, targetType);
    console.log(`Trasformazione completata con successo`);

    // Log OpenRouter Call Event to Supabase
    const usage = transformedJson.usage;
    if (usage) {
      try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        await supabase.from("ai_usage_events").insert({
          event_name: "openrouter_call",
          user_id: userId || null,
          user_email: userEmail || null,
          action_type: `transform_${targetType}`,
          model: transformedJson.model || null,
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
          cost: usage.cost ?? 0,
        });
      } catch (sbErr) {
        console.error("Errore nel salvataggio del log di chiamata OpenRouter su Supabase:", sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      transformation: transformedJson.transformation,
      generationId: transformedJson.generationId
    });
  } catch (error: unknown) {
    console.error("Errore nell'endpoint /api/recipes/transform:", error);
    const errorMsg = error instanceof Error ? error.message : "Errore interno del server";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
