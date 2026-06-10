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

    // Log OpenRouter Call Event to Firestore
    const usage = translatedJson.usage;
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
            generation_id: translatedJson.generationId || "",
            type: "translate",
            prompt_tokens: usage.prompt_tokens ?? 0,
            completion_tokens: usage.completion_tokens ?? 0,
            cost: usage.cost ?? 0
          }
        });
      } catch (fsErr) {
        console.error("[Translate Route] Errore nel salvataggio del log di chiamata OpenRouter su Firestore:", fsErr);
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
