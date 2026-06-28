export interface ScrapedData {
  caption: string;
  transcript: string;
  coverImageUrl: string | null;
  creatorUsername: string | null;
  creatorFullName: string | null;
  creatorId: string | null;
  comments?: string[];
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
  scrapecreatorsCreditsRemaining?: number | null;
}

/**
 * Esegue lo scraping di un post/reel Instagram tramite ScrapeCreators.
 */
export async function scrapeInstagram(url: string): Promise<ScrapedData> {
  const apiKey = Deno.env.get("SCRAPECREATORS_API_KEY");
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente SCRAPECREATORS_API_KEY");
  }

  let creditsRemaining: number | null = null;

  // Eseguiamo la chiamata ai dettagli del post e alla trascrizione in parallelo.
  // La trascrizione ha un timeout di 15 secondi per evitare di bloccare o far fallire l'intera importazione.
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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
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
      if (data.credits_remaining !== undefined) {
        creditsRemaining = data.credits_remaining;
      }
      return data.transcripts?.[0]?.text || "";
    } catch {
      clearTimeout(timeoutId);
      console.warn("Richiesta trascrizione Instagram fallita o scaduta (timeout 15s).");
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
  console.log("=========================================");
  console.log("[scrapeInstagram] RAW RESPONSE FROM SCRAPECREATORS:");
  console.log(JSON.stringify(postData, null, 2));
  console.log("=========================================");
  if (postData.credits_remaining !== undefined) {
    creditsRemaining = postData.credits_remaining;
  }
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

  // Estrai i commenti fissati o regolari dalla risposta del post (Costo 0 crediti aggiuntivi)
  const commentsList: string[] = [];
  const seenCommentIds = new Set<string>();
  const creatorUsernameLower = creatorUsername ? creatorUsername.toLowerCase() : "";

  // 1. Commenti fissati (hoisted): li includiamo tutti indipendentemente dall'autore
  const hoistedEdges = media.edge_media_to_hoisted_comment?.edges || [];
  console.log(`[scrapeInstagram] Pinned comments count in raw response: ${hoistedEdges.length}`);
  
  for (const edge of hoistedEdges) {
    const node = edge?.node;
    if (node?.text) {
      console.log(`[scrapeInstagram] Found pinned comment: ID=${node.id}, Text="${node.text.slice(0, 40)}..."`);
      commentsList.push(node.text);
      if (node.id) {
        seenCommentIds.add(String(node.id));
      }
    }
  }

  // 2. Commenti parent/principali e anteprime: includiamo solo quelli scritti dall'autore del post
  //    Deprioritizziamo le risposte (che iniziano con @username) e ordiniamo per lunghezza
  //    perché il commento con la ricetta è tipicamente il più lungo.
  if (creatorUsernameLower) {
    const parentEdges = media.edge_media_to_parent_comment?.edges || [];
    const previewEdges = media.edge_media_preview_comment?.edges || [];
    const allParentEdges = [...parentEdges, ...previewEdges];
    console.log(`[scrapeInstagram] Parent/Preview comments count in raw response: ${allParentEdges.length} (searching comments by @${creatorUsernameLower})`);

    // Raccogli tutti i commenti del creatore non ancora visti
    const creatorTopLevel: string[] = [];
    const creatorReplies: string[] = [];

    for (const edge of allParentEdges) {
      const node = edge?.node;
      if (node?.text) {
        const commentIdStr = node.id ? String(node.id) : "";
        if (commentIdStr && seenCommentIds.has(commentIdStr)) {
          continue;
        }
        const commentOwner = node.owner?.username;
        if (commentOwner && commentOwner.toLowerCase() === creatorUsernameLower) {
          if (commentIdStr) {
            seenCommentIds.add(commentIdStr);
          }
          // I commenti che iniziano con @username sono risposte ad altri utenti
          const isReply = /^@\w+/.test(node.text.trim());
          if (isReply) {
            creatorReplies.push(node.text);
          } else {
            creatorTopLevel.push(node.text);
          }
        }
      }
    }

    // Ordina per lunghezza decrescente (il commento-ricetta è tipicamente il più lungo)
    creatorTopLevel.sort((a, b) => b.length - a.length);
    creatorReplies.sort((a, b) => b.length - a.length);

    // Prima i top-level, poi le risposte come fallback
    for (const text of creatorTopLevel) {
      console.log(`[scrapeInstagram] Found top-level comment by creator: Text="${text.slice(0, 40)}..."`);
      commentsList.push(text);
    }
    for (const text of creatorReplies) {
      console.log(`[scrapeInstagram] Found reply comment by creator (deprioritized): Text="${text.slice(0, 40)}..."`);
      commentsList.push(text);
    }
  }

  console.log(`[scrapeInstagram] Total comments extracted: ${commentsList.length}`, commentsList);

  return {
    caption,
    transcript: transcriptText,
    coverImageUrl,
    creatorUsername,
    creatorFullName,
    creatorId,
    comments: commentsList,
    scrapecreatorsCreditsRemaining: creditsRemaining,
  };
}

/**
 * Esegue lo scraping dei commenti di un post Instagram tramite l'endpoint dedicato
 * /v2/instagram/post/comments di ScrapeCreators (1 credito, 1 pagina).
 * Filtra e restituisce solo i commenti rilevanti per l'estrazione della ricetta:
 * - Commenti fissati (pinned)
 * - Commenti top-level dell'autore del post (non risposte @username)
 */
export async function scrapeInstagramComments(
  url: string,
  creatorUsername: string | null
): Promise<{ comments: string[]; creditsRemaining: number | null }> {
  const apiKey = Deno.env.get("SCRAPECREATORS_API_KEY");
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente SCRAPECREATORS_API_KEY");
  }

  const creatorUsernameLower = creatorUsername ? creatorUsername.toLowerCase() : "";
  let creditsRemaining: number | null = null;
  let cursor = "";
  let page = 1;
  const maxPages = 6;
  const seenTexts = new Set<string>();

  const creatorTopLevel: string[] = [];
  const creatorReplies: string[] = [];
  const pinnedComments: string[] = [];
  let foundRecipe = false;

  do {
    console.log(`[scrapeInstagramComments] Fetching page ${page} for ${url} (cursor: ${cursor})`);
    const fetchUrl = `https://api.scrapecreators.com/v2/instagram/post/comments?url=${encodeURIComponent(url)}${
      cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
    }`;

    let res: Response | null = null;
    let attempt = 0;
    const maxAttempts = 5;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        console.log(`[scrapeInstagramComments] Attempt ${attempt}/${maxAttempts} for page ${page}`);
        res = await fetch(fetchUrl, {
          headers: {
            "x-api-key": apiKey,
          },
        });

        if (res.ok) {
          break;
        }

        console.warn(`[scrapeInstagramComments] Attempt ${attempt} failed with status ${res.status}`);
        const errText = await res.text();
        console.warn(`[scrapeInstagramComments] Error response body: ${errText}`);

        if ((res.status === 500 || res.status === 429) && attempt < maxAttempts) {
          const delay = attempt * 2000; // 2s, 4s, 6s, 8s
          console.log(`[scrapeInstagramComments] Retrying in ${delay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      } catch (err: any) {
        console.error(`[scrapeInstagramComments] Network error on attempt ${attempt}:`, err);
        if (attempt < maxAttempts) {
          const delay = attempt * 2000;
          console.log(`[scrapeInstagramComments] Retrying in ${delay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }

    if (!res || !res.ok) {
      console.error(`[scrapeInstagramComments] Failed to fetch comments page ${page} after ${maxAttempts} attempts`);
      break;
    }

    const data = await res.json();
    if (data.credits_remaining !== undefined) {
      creditsRemaining = data.credits_remaining;
    }

    const pageComments = data.comments || [];
    console.log(`[scrapeInstagramComments] Page ${page} returned ${pageComments.length} comments`);

    for (const comment of pageComments) {
      const text = comment?.text || comment?.comment_text || "";
      if (!text || seenTexts.has(text)) continue;

      const username = (
        comment?.user?.username ||
        comment?.owner?.username ||
        comment?.username ||
        ""
      ).toLowerCase();
      const isPinned = comment?.is_pinned || comment?.pinned || false;

      if (isPinned) {
        console.log(`[scrapeInstagramComments] Found PINNED comment: "${text.slice(0, 60)}..."`);
        pinnedComments.push(text);
        seenTexts.add(text);

        // Se il commento fissato sembra la ricetta, possiamo fermarci per risparmiare crediti/tempo
        if (text.length > 150 || /ingredienti|ricetta|procedimento/i.test(text)) {
          foundRecipe = true;
        }
        continue;
      }

      if (creatorUsernameLower && username === creatorUsernameLower) {
        seenTexts.add(text);
        const isReply = /^@\w+/.test(text.trim());
        if (isReply) {
          creatorReplies.push(text);
          console.log(`[scrapeInstagramComments] Found creator REPLY: "${text.slice(0, 60)}..."`);
        } else {
          creatorTopLevel.push(text);
          console.log(`[scrapeInstagramComments] Found creator TOP-LEVEL: "${text.slice(0, 60)}..."`);

          // Se il commento del creatore sembra la ricetta, fermiamo la paginazione
          if (text.length > 150 || /ingredienti|ricetta|procedimento/i.test(text)) {
            foundRecipe = true;
          }
        }
      }
    }

    if (foundRecipe) {
      console.log(`[scrapeInstagramComments] Found creator/pinned comment that looks like a recipe, stopping pagination early`);
      break;
    }

    cursor = data.cursor || "";
    page++;
  } while (cursor && page <= maxPages);

  // Ordina per lunghezza decrescente (il commento-ricetta è il più lungo)
  creatorTopLevel.sort((a, b) => b.length - a.length);
  creatorReplies.sort((a, b) => b.length - a.length);

  // Priorità: fissati > top-level del creatore > risposte del creatore
  const commentsList: string[] = [];
  commentsList.push(...pinnedComments, ...creatorTopLevel, ...creatorReplies);

  console.log(`[scrapeInstagramComments] Total filtered comments collected: ${commentsList.length}`);
  if (commentsList.length > 0) {
    console.log(`[scrapeInstagramComments] First comment preview: "${commentsList[0].slice(0, 100)}..."`);
  }

  return { comments: commentsList, creditsRemaining };
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
  const apiKey = Deno.env.get("SCRAPECREATORS_API_KEY");
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
  const creditsRemaining = data.credits_remaining !== undefined ? data.credits_remaining : null;
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
    scrapecreatorsCreditsRemaining: creditsRemaining,
  };
}

/**
 * Esegue lo scraping di un post/reel Facebook tramite ScrapeCreators.
 */
export async function scrapeFacebook(url: string): Promise<ScrapedData> {
  const apiKey = Deno.env.get("SCRAPECREATORS_API_KEY");
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente SCRAPECREATORS_API_KEY");
  }

  let creditsRemaining: number | null = null;

  // Eseguiamo la chiamata ai dettagli del post e alla trascrizione in parallelo.
  const fetchPost = fetch(
    `https://api.scrapecreators.com/v1/facebook/post?url=${encodeURIComponent(url)}`,
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
        `https://api.scrapecreators.com/v1/facebook/post/transcript?url=${encodeURIComponent(url)}`,
        {
          headers: {
            "x-api-key": apiKey,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      if (!res.ok) {
        console.warn(`Errore recupero trascrizione Facebook (status ${res.status})`);
        return "";
      }
      const data = await res.json();
      if (data.credits_remaining !== undefined) {
        creditsRemaining = data.credits_remaining;
      }
      return data.transcript || "";
    } catch {
      clearTimeout(timeoutId);
      console.warn("Richiesta trascrizione Facebook fallita o scaduta (timeout 5s).");
      return "";
    }
  };

  const [postResponse, transcriptText] = await Promise.all([
    fetchPost,
    fetchTranscriptWithTimeout(),
  ]);

  if (!postResponse.ok) {
    const errorText = await postResponse.text();
    console.error("Errore ScrapeCreators Facebook:", errorText);
    throw new Error(`Errore durante lo scraping di Facebook (status ${postResponse.status})`);
  }

  const postData = await postResponse.json();
  if (postData.credits_remaining !== undefined) {
    creditsRemaining = postData.credits_remaining;
  }
  if (!postData.success) {
    console.error("Risposta ScrapeCreators Facebook fallita:", postData);
    throw new Error("Lo scraping di Facebook ha restituito esito negativo.");
  }

  const caption = postData.description || "";
  const coverImageUrl = postData.video?.thumbnail || postData.image_url || null;

  let creatorUsername = postData.author?.id || null;
  if (postData.author?.url) {
    try {
      const parts = postData.author.url.split("/").filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && !lastPart.includes("facebook.com")) {
        creatorUsername = lastPart;
      }
    } catch (e) {
      // ignore
    }
  }

  const creatorFullName = postData.author?.name || null;
  const creatorId = postData.author?.id || null;

  return {
    caption,
    transcript: transcriptText,
    coverImageUrl,
    creatorUsername,
    creatorFullName,
    creatorId,
    scrapecreatorsCreditsRemaining: creditsRemaining,
  };
}

/**
 * Esegue lo scraping di un video/short YouTube tramite ScrapeCreators.
 */
export async function scrapeYouTube(url: string): Promise<ScrapedData> {
  const apiKey = Deno.env.get("SCRAPECREATORS_API_KEY");
  if (!apiKey) {
    throw new Error("Manca la chiave d'ambiente SCRAPECREATORS_API_KEY");
  }

  let creditsRemaining: number | null = null;

  const fetchPost = fetch(
    `https://api.scrapecreators.com/v1/youtube/video?url=${encodeURIComponent(url)}`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    }
  );

  const [postResponse] = await Promise.all([fetchPost]);

  if (!postResponse.ok) {
    const errorText = await postResponse.text();
    console.error("Errore ScrapeCreators YouTube:", errorText);
    throw new Error(`Errore durante lo scraping di YouTube (status ${postResponse.status})`);
  }

  const postData = await postResponse.json();
  if (postData.credits_remaining !== undefined) {
    creditsRemaining = postData.credits_remaining;
  }
  if (!postData.success) {
    console.error("Risposta ScrapeCreators YouTube fallita:", postData);
    throw new Error("Lo scraping di YouTube ha restituito esito negativo.");
  }

  const title = postData.title || "";
  const description = postData.description || "";
  const caption = `${title}\n\n${description}`.trim();
  const coverImageUrl = postData.thumbnail || null;

  const creatorUsername = postData.channel?.handle || null;
  const creatorFullName = postData.channel?.title || null;
  const creatorId = postData.channel?.id || null;

  // Se è uno Short o ha durata <= 2 minuti (120000 ms), esegue anche la trascrizione
  const isShort = url.toLowerCase().includes("/shorts/") || (postData.durationMs && postData.durationMs <= 120000);
  let transcriptText = "";

  if (isShort) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(
        `https://api.scrapecreators.com/v1/youtube/video/transcript?url=${encodeURIComponent(url)}`,
        {
          headers: {
            "x-api-key": apiKey,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const transData = await res.json();
        if (transData.credits_remaining !== undefined) {
          creditsRemaining = transData.credits_remaining;
        }
        transcriptText = transData.transcript_only_text || "";
      } else {
        console.warn(`Errore recupero trascrizione YouTube Short (status ${res.status})`);
      }
    } catch {
      clearTimeout(timeoutId);
      console.warn("Richiesta trascrizione YouTube Short fallita o scaduta (timeout 5s).");
    }
  }

  return {
    caption,
    transcript: transcriptText,
    coverImageUrl,
    creatorUsername,
    creatorFullName,
    creatorId,
    scrapecreatorsCreditsRemaining: creditsRemaining,
  };
}
