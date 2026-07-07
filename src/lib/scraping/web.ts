import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { type ScrapedData } from "./scrapecreators";

/**
 * Esegue lo scraping di una pagina web generica ed estrae il testo dell'articolo e l'immagine principale.
 */
export async function scrapeWebPage(url: string): Promise<ScrapedData> {
  // Impostiamo uno User-Agent moderno di Chrome su macOS per evitare i blocchi anti-bot
  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("WEBSITE_FORBIDDEN");
    }
    throw new Error(`Impossibile scaricare la pagina web (status ${response.status})`);
  }

  const html = await response.text();

  // Parsing del DOM con linkedom
  const { document } = parseHTML(html);

  // 1. Estrazione dei dati strutturati (LD+JSON)
  let recipeStructuredData: any = null;
  const recipeObject = extractRecipeJsonLd(document);
  if (recipeObject) {
    try {
      const extractedInstructions = extractInstructions(recipeObject.recipeInstructions);
      const ingredients = Array.isArray(recipeObject.recipeIngredient)
        ? recipeObject.recipeIngredient
        : typeof recipeObject.recipeIngredient === "string"
        ? [recipeObject.recipeIngredient]
        : [];

      let recipeImage: string | undefined = undefined;
      if (recipeObject.image) {
        if (typeof recipeObject.image === "string") {
          recipeImage = recipeObject.image;
        } else if (Array.isArray(recipeObject.image) && recipeObject.image.length > 0) {
          recipeImage = typeof recipeObject.image[0] === "string" ? recipeObject.image[0] : recipeObject.image[0].url;
        } else if (typeof recipeObject.image === "object") {
          recipeImage = recipeObject.image.url || recipeObject.image.contentUrl;
        }
      }

      recipeStructuredData = {
        title: recipeObject.name || undefined,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        instructions: extractedInstructions.length > 0 ? extractedInstructions : undefined,
        servings: recipeObject.recipeYield || undefined,
        prepTime: recipeObject.prepTime || undefined,
        cookTime: recipeObject.cookTime || undefined,
        totalTime: recipeObject.totalTime || undefined,
        calories: recipeObject.nutrition?.calories || undefined,
        imageUrl: recipeImage || undefined,
      };
    } catch (err) {
      console.warn("Errore durante il parsing del Recipe LD+JSON:", err);
    }
  }

  // 2. Estrazione dell'immagine di copertina dai tag Open Graph, LD+JSON o fallback
  let coverImageUrl: string | null = null;

  if (recipeStructuredData?.imageUrl) {
    coverImageUrl = recipeStructuredData.imageUrl;
  } else {
    const ogImage = document.querySelector('meta[property="og:image"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');

    if (ogImage) {
      coverImageUrl = ogImage.getAttribute("content");
    } else if (twitterImage) {
      coverImageUrl = twitterImage.getAttribute("content");
    }
  }

  // 3. Parsing con @mozilla/readability (utilizzato come testo o come fallback)
  const reader = new Readability((document as unknown) as any);
  const article = reader.parse();

  if (!article) {
    throw new Error("Impossibile estrarre il testo principale dalla ricetta web");
  }

  // Se non abbiamo trovato l'immagine nei meta tag o ld+json, facciamo il fallback sulla prima immagine dell'articolo
  if (!coverImageUrl) {
    const firstImg = document.querySelector("article img, main img, img");
    if (firstImg) {
      coverImageUrl = firstImg.getAttribute("src");
    }
  }

  // Se l'URL dell'immagine è relativo, lo convertiamo in assoluto
  if (coverImageUrl && !coverImageUrl.startsWith("http://") && !coverImageUrl.startsWith("https://")) {
    try {
      const parsedUrl = new URL(url);
      coverImageUrl = new URL(coverImageUrl, parsedUrl.origin).toString();
    } catch {
      // Ignora l'errore di conversione
    }
  }

  // Prepariamo la descrizione (titolo + estratto o testo completo)
  // Mettiamo il titolo e l'estratto in `caption`, e il corpo completo in `transcript`.
  const caption = `${article.title}\n\n${article.excerpt || ""}`;
  const transcript = article.textContent || "";

  // Estraiamo il nome del dominio dall'URL
  let domain = "";
  try {
    domain = new URL(url).hostname.replace("www.", "");
  } catch {
    domain = "Sito Web";
  }

  return {
    caption,
    transcript,
    coverImageUrl,
    creatorUsername: null,
    creatorFullName: domain,
    creatorId: null,
    recipeStructuredData,
  };
}

// --- Funzioni Helper per l'estrazione di LD+JSON ---

function extractRecipeJsonLd(document: any): any | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const content = script.textContent?.trim();
      if (!content) continue;
      const parsed = JSON.parse(content);
      
      const recipe = findRecipeObject(parsed);
      if (recipe) {
        return recipe;
      }
    } catch (err) {
      console.warn("Failed to parse ld+json script tag:", err);
    }
  }
  return null;
}

function findRecipeObject(obj: any): any | null {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const res = findRecipeObject(item);
      if (res) return res;
    }
  } else {
    const type = obj["@type"];
    if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
      return obj;
    }
    
    if (obj["@graph"] && Array.isArray(obj["@graph"])) {
      for (const item of obj["@graph"]) {
        const res = findRecipeObject(item);
        if (res) return res;
      }
    }

    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        const res = findRecipeObject(obj[key]);
        if (res) return res;
      }
    }
  }
  return null;
}

function extractInstructions(instructions: any): string[] {
  if (!instructions) return [];
  if (typeof instructions === "string") return [instructions];
  if (Array.isArray(instructions)) {
    const result: string[] = [];
    for (const step of instructions) {
      if (typeof step === "string") {
        result.push(step);
      } else if (step && typeof step === "object") {
        if (step["@type"] === "HowToStep") {
          result.push(step.text || step.name || "");
        } else if (step["@type"] === "HowToSection" && Array.isArray(step.itemListElement)) {
          result.push(...extractInstructions(step.itemListElement));
        } else if (step.text) {
          result.push(step.text);
        } else if (step.name) {
          result.push(step.name);
        }
      }
    }
    return result.filter(s => s.trim().length > 0);
  }
  return [];
}
