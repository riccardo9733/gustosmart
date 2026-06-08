import { z } from 'zod';

export const IngredientSchema = z.object({
  name: z.string().min(1, "Il nome dell'ingrediente è obbligatorio"),
  quantity: z.number().nonnegative("La quantità deve essere positiva").nullable().optional().default(null),
  unit: z.string().default("q.b.")
});

export const RecipeSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  sourceUrl: z.string().url("URL sorgente non valido"),
  sourceLanguage: z.string().min(2).max(5).default("it"),
  servings: z.number().int().positive().default(2),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(z.string().min(1)),
  imageUrl: z.string().url().nullable().optional().default(null),
  prepTimeMinutes: z.number().int().nonnegative().nullable().optional().default(null),
  category: z.enum(['first_courses', 'second_courses', 'desserts', 'appetizers', 'sides', 'single_dishes', 'other']).default('other'),
  kcal: z.number().int().nonnegative().nullable().optional().default(null),
  creatorUsername: z.string().nullable().optional().default(null),
  creatorFullName: z.string().nullable().optional().default(null),
  creatorId: z.string().nullable().optional().default(null),
});

export type RecipeInput = z.infer<typeof RecipeSchema>;

function normalizeCategory(cat: any): 'first_courses' | 'second_courses' | 'desserts' | 'appetizers' | 'sides' | 'single_dishes' | 'other' {
  if (!cat) return "other";
  const normalized = String(cat).toLowerCase().trim().replace(" ", "_").replace("-", "_");
  const mapping: Record<string, 'first_courses' | 'second_courses' | 'desserts' | 'appetizers' | 'sides' | 'single_dishes' | 'other'> = {
    primi: "first_courses",
    primi_piatti: "first_courses",
    primi_piatto: "first_courses",
    primo: "first_courses",
    secondi: "second_courses",
    secondo: "second_courses",
    secondi_piatti: "second_courses",
    dolci: "desserts",
    dolce: "desserts",
    antipasti: "appetizers",
    antipasto: "appetizers",
    contorni: "sides",
    contorno: "sides",
    piatti_unici: "single_dishes",
    piatto_unico: "single_dishes",
    altro: "other",
    first_courses: "first_courses",
    second_courses: "second_courses",
    desserts: "desserts",
    appetizers: "appetizers",
    sides: "sides",
    single_dishes: "single_dishes",
    other: "other"
  };
  return mapping[normalized] || "other";
}

/**
 * Valida l'output grezzo di Gemini aggiungendo l'URL sorgente e l'immagine.
 */
export function validateAndFormatRecipe(
  geminiOutput: any,
  sourceUrl: string,
  imageUrl: string | null,
  creatorInfo?: {
    username?: string | null;
    fullName?: string | null;
    id?: string | null;
  }
): RecipeInput {
  // Pulisce o normalizza i campi se necessario prima della validazione
  const rawRecipe = {
    title: geminiOutput.title,
    sourceUrl,
    sourceLanguage: geminiOutput.sourceLanguage || "it",
    servings: geminiOutput.servings !== undefined ? Number(geminiOutput.servings) : 2,
    ingredients: Array.isArray(geminiOutput.ingredients)
      ? geminiOutput.ingredients.map((ing: any) => ({
          name: ing.name || "",
          quantity: ing.quantity !== undefined && ing.quantity !== null ? Number(ing.quantity) : null,
          unit: ing.unit !== undefined && ing.unit !== null ? String(ing.unit) : "q.b."
        }))
      : [],
    instructions: Array.isArray(geminiOutput.instructions)
      ? geminiOutput.instructions.map((inst: any) => String(inst).trim())
      : [],
    imageUrl: imageUrl || null,
    prepTimeMinutes: geminiOutput.prepTimeMinutes !== undefined && geminiOutput.prepTimeMinutes !== null
      ? Number(geminiOutput.prepTimeMinutes)
      : null,
    category: normalizeCategory(geminiOutput.category),
    kcal: geminiOutput.kcal !== undefined && geminiOutput.kcal !== null
      ? Number(geminiOutput.kcal)
      : null,
    creatorUsername: creatorInfo?.username || null,
    creatorFullName: creatorInfo?.fullName || null,
    creatorId: creatorInfo?.id || null,
  };

  // Validazione Zod
  const validationResult = RecipeSchema.safeParse(rawRecipe);

  if (!validationResult.success) {
    console.error("Zod Validation Errors:", validationResult.error.format());
    throw new Error("Il JSON generato dall'IA non rispetta lo schema richiesto: " + validationResult.error.message);
  }

  return validationResult.data;
}
