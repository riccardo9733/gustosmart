export interface ScrapedData {
  caption: string;
  transcript: string;
  coverImageUrl: string | null;
  creatorUsername: string | null;
  creatorFullName: string | null;
  creatorId: string | null;
  recipeStructuredData?: {
    title?: string;
    ingredients?: string[];
    instructions?: string[];
    servings?: string | number;
    prepTime?: string;
    cookTime?: string;
    totalTime?: string;
    calories?: string;
    imageUrl?: string;
  } | null;
}

/**
 * Esegue lo scraping di un post/reel Instagram tramite ScrapeCreators.
 */
export async function scrapeInstagram(url: string): Promise<ScrapedData> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente SCRAPECREATORS_API_KEY");
  }

  // Eseguiamo la chiamata ai dettagli del post e alla trascrizione in parallelo.
  // La trascrizione ha un timeout di 5 secondi per evitare di bloccare o far fallire l'intera importazione.
  const fetchPost = fetch(
    `https://api.scrapecreators.com/v1/instagram/post?url=${encodeURIComponent(url)}`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    }
  );

  const fetchTranscriptWithTimeout = async (): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(
        `https://api.scrapecreators.com/v2/instagram/media/transcript?url=${encodeURIComponent(url)}`,
        {
          headers: {
            "x-api-key": apiKey,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      if (!res.ok) {
        console.warn(`Errore recupero trascrizione Instagram (status ${res.status})`);
        return "";
      }
      const data = await res.json();
      return data.transcripts?.[0]?.text || "";
    } catch {
      clearTimeout(timeoutId);
      console.warn("Richiesta trascrizione Instagram fallita o scaduta (timeout 5s).");
      return "";
    }
  };

  const [postResponse, transcriptText] = await Promise.all([
    fetchPost,
    fetchTranscriptWithTimeout(),
  ]);

  if (!postResponse.ok) {
    const errorText = await postResponse.text();
    console.error("Errore ScrapeCreators Instagram:", errorText);
    throw new Error(`Errore durante lo scraping di Instagram (status ${postResponse.status})`);
  }

  const postData = await postResponse.json();
  const media = postData.data?.xdt_shortcode_media;

  if (!media) {
    console.error("Struttura risposta ScrapeCreators Instagram non valida:", postData);
    throw new Error("Risposta ScrapeCreators Instagram malformata o vuota");
  }

  const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text || "";
  const coverImageUrl = media.display_url || media.thumbnail_src || null;
  const creatorUsername = media.owner?.username || null;
  const creatorFullName = media.owner?.full_name || null;
  const creatorId = media.owner?.id || null;

  return {
    caption,
    transcript: transcriptText,
    coverImageUrl,
    creatorUsername,
    creatorFullName,
    creatorId,
  };
}

/**
 * Trova il primo URL in una lista che non ha estensione HEIC/HEIF (non supportate nativamente dai browser).
 */
function findBrowserCompatibleUrl(urlList: string[] | undefined | null): string | null {
  if (!urlList || urlList.length === 0) return null;
  for (const url of urlList) {
    try {
      const urlWithoutQuery = url.split("?")[0];
      if (!urlWithoutQuery.toLowerCase().endsWith(".heic") && !urlWithoutQuery.toLowerCase().endsWith(".heif")) {
        return url;
      }
    } catch {
      // Ignora errori
    }
  }
  return null;
}

/**
 * Esegue lo scraping di un video TikTok tramite ScrapeCreators.
 */
export async function scrapeTikTok(url: string): Promise<ScrapedData> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente SCRAPECREATORS_API_KEY");
  }

  const response = await fetch(
    `https://api.scrapecreators.com/v2/tiktok/video?url=${encodeURIComponent(url)}&get_transcript=true`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Errore ScrapeCreators TikTok:", errorText);
    throw new Error(`Errore durante lo scraping di TikTok (status ${response.status})`);
  }

  const data = await response.json();
  const detail = data.aweme_detail;

  if (!detail) {
    console.error("Struttura risposta ScrapeCreators TikTok non valida:", data);
    throw new Error("Risposta ScrapeCreators TikTok malformata o vuota");
  }

  const caption = detail.desc || "";
  
  // Seleziona una copertina compatibile con i browser (evitando HEIC)
  const coverImageUrl = findBrowserCompatibleUrl(detail.video?.cover?.url_list)
    || findBrowserCompatibleUrl(detail.video?.dynamic_cover?.url_list)
    || findBrowserCompatibleUrl(detail.video?.origin_cover?.url_list)
    || detail.video?.cover?.url_list?.[0]
    || null;

  const creatorUsername = detail.author?.unique_id || null;
  const creatorFullName = detail.author?.nickname || null;
  const creatorId = detail.author?.uid || null;
  const transcript = data.transcript || "";

  return {
    caption,
    transcript,
    coverImageUrl,
    creatorUsername,
    creatorFullName,
    creatorId,
  };
}
