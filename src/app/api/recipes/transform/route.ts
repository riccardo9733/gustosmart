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
    if (!targetType || !["vegan", "vegetarian", "lactose_free", "gluten_free"].includes(targetType)) {
      return NextResponse.json(
        { success: false, error: "Il tipo di adattamento non è valido" },
        { status: 400 }
      );
    }

    console.log(`Avvio trasformazione ricetta tramite Gemini in versione: ${targetType}`);
    const transformedJson = await transformRecipe(recipe, targetType);
    console.log(`Trasformazione completata con successo`);

    // Log OpenRouter Call Event to Firestore
    const usage = transformedJson.usage;
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
            generation_id: transformedJson.generationId || "",
            type: `transform_${targetType}`,
            prompt_tokens: usage.prompt_tokens ?? 0,
            completion_tokens: usage.completion_tokens ?? 0,
            cost: usage.cost ?? 0
          }
        });
      } catch (fsErr) {
        console.error("[Transform Route] Errore nel salvataggio del log di chiamata OpenRouter su Firestore:", fsErr);
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
