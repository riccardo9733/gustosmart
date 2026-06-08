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
    throw new Error(`Impossibile scaricare la pagina web (status ${response.status})`);
  }

  const html = await response.text();

  // Parsing del DOM con linkedom
  const { document } = parseHTML(html);

  // 1. Estrazione dell'immagine di copertina dai tag Open Graph
  let coverImageUrl: string | null = null;

  const ogImage = document.querySelector('meta[property="og:image"]');
  const twitterImage = document.querySelector('meta[name="twitter:image"]');

  if (ogImage) {
    coverImageUrl = ogImage.getAttribute("content");
  } else if (twitterImage) {
    coverImageUrl = twitterImage.getAttribute("content");
  }

  // 2. Parsing con @mozilla/readability
  // Castiamo a unknown e poi a Document per soddisfare il compilatore TypeScript ed evitare "any"
  const reader = new Readability((document as unknown) as Document);
  const article = reader.parse();

  if (!article) {
    throw new Error("Impossibile estrarre il testo principale dalla ricetta web");
  }

  // Se non abbiamo trovato l'immagine nei meta tag, facciamo il fallback sulla prima immagine dell'articolo
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
  };
}
