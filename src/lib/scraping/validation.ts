import { z } from 'zod';

export const IngredientSchema = z.object({
  name: z.string().min(1, "Il nome dell'ingrediente è obbligatorio"),
  quantity: z.number().nonnegative("La quantità deve essere positiva").nullable().optional().default(null),
  unit: z.string().default("q.b.")
});

export const RecipeSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  sourceUrl: z.string().url("URL sorgente non valido"),
  servings: z.number().int().positive().default(2),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(z.string().min(1)),
  imageUrl: z.string().url().nullable().optional().default(null),
  prepTimeMinutes: z.number().int().nonnegative().nullable().optional().default(null),
});

export type RecipeInput = z.infer<typeof RecipeSchema>;

/**
 * Valida l'output grezzo di Gemini aggiungendo l'URL sorgente e l'immagine.
 */
export function validateAndFormatRecipe(
  geminiOutput: any,
  sourceUrl: string,
  imageUrl: string | null
): RecipeInput {
  // Pulisce o normalizza i campi se necessario prima della validazione
  const rawRecipe = {
    title: geminiOutput.title,
    sourceUrl,
    servings: geminiOutput.servings !== undefined ? Number(geminiOutput.servings) : 2,
    ingredients: Array.isArray(geminiOutput.ingredients)
      ? geminiOutput.ingredients.map((ing: any) => ({
          name: ing.name || "",
          quantity: ing.quantity !== undefined && ing.quantity !== null ? Number(ing.quantity) : null,
          unit: ing.unit || "q.b."
        }))
      : [],
    instructions: Array.isArray(geminiOutput.instructions)
      ? geminiOutput.instructions.map((inst: any) => String(inst).trim())
      : [],
    imageUrl: imageUrl || null,
    prepTimeMinutes: geminiOutput.prepTimeMinutes !== undefined && geminiOutput.prepTimeMinutes !== null
      ? Number(geminiOutput.prepTimeMinutes)
      : null
  };

  // Validazione Zod
  const validationResult = RecipeSchema.safeParse(rawRecipe);

  if (!validationResult.success) {
    console.error("Zod Validation Errors:", validationResult.error.format());
    throw new Error("Il JSON generato dall'IA non rispetta lo schema richiesto: " + validationResult.error.message);
  }

  return validationResult.data;
}
