import { NextResponse } from "next/server";
import { translateRecipe } from "@/lib/scraping/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, ingredients, instructions, targetLanguage, nutritionalAssessment } = body;

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

    return NextResponse.json({
      success: true,
      translation: {
        title: translatedJson.title,
        ingredients: translatedJson.ingredients || [],
        instructions: translatedJson.instructions || [],
        nutritionalAssessment: translatedJson.nutritionalAssessment || null,
      }
    });
  } catch (error: any) {
    console.error("Errore nell'endpoint /api/recipes/translate:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}
