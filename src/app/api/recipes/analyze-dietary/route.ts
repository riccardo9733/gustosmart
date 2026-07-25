import { NextResponse } from "next/server";
import { analyzeDietaryFlags } from "@/lib/scraping/gemini";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipe, userId, userEmail } = body;

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: "La ricetta è obbligatoria per l'analisi" },
        { status: 400 }
      );
    }

    console.log(`Avvio analisi dietetica della ricetta: "${recipe.title || 'Senza titolo'}" tramite Gemini`);
    const analysisResult = await analyzeDietaryFlags(recipe);
    console.log(`Analisi completata con successo: isVegan=${analysisResult.isVegan}, isVegetarian=${analysisResult.isVegetarian}, isLactoseFree=${analysisResult.isLactoseFree}, isGlutenFree=${analysisResult.isGlutenFree}`);

    // Log OpenRouter Call Event to Supabase
    const usage = analysisResult.usage;
    if (usage) {
      try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        await supabase.from("ai_usage_events").insert({
          event_name: "openrouter_call",
          user_id: userId || null,
          user_email: userEmail || null,
          action_type: "dietary_analysis",
          model: (analysisResult as any).model || null,
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
          cost: usage.cost ?? 0,
        });
      } catch (sbErr) {
        console.error("[Analyze Route] Errore nel salvataggio del log di chiamata OpenRouter su Supabase:", sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        isVegan: analysisResult.isVegan,
        isVegetarian: analysisResult.isVegetarian,
        isLactoseFree: analysisResult.isLactoseFree,
        isGlutenFree: analysisResult.isGlutenFree
      },
      generationId: analysisResult.generationId
    });
  } catch (error: unknown) {
    console.error("Errore nell'endpoint /api/recipes/analyze-dietary:", error);
    const errorMsg = error instanceof Error ? error.message : "Errore interno del server";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
