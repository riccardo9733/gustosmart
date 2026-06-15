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

    // Log OpenRouter Call Event to Firestore
    const usage = analysisResult.usage;
    if (usage) {
      try {
        const db = getFirebaseDb();
        const expireAt = new Date();
        expireAt.setDate(expireAt.getDate() + 7);

        await addDoc(collection(db, "analytics_events"), {
          eventName: "openrouter_call",
          userId: userId || null,
          userEmail: userEmail || null,
          timestamp: serverTimestamp(),
          expireAt,
          params: {
            generation_id: analysisResult.generationId || "",
            type: "dietary_analysis",
            prompt_tokens: usage.prompt_tokens ?? 0,
            completion_tokens: usage.completion_tokens ?? 0,
            cost: usage.cost ?? 0
          }
        });
      } catch (fsErr) {
        console.error("[Analyze Route] Errore nel salvataggio del log di chiamata OpenRouter su Firestore:", fsErr);
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
