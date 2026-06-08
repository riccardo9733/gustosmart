export interface ApifyRunResult {
  runId: string;
  datasetId: string;
}

export interface ApifyScrapedData {
  caption: string;
  transcript: string;
  coverImageUrl: string | null;
  creatorUsername: string | null;
  creatorFullName: string | null;
  creatorId: string | null;
}

/**
 * Avvia l'actor instagram-reel-scraper su Apify in modo asincrono.
 */
export async function startInstagramScraper(url: string): Promise<ApifyRunResult> {
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    throw new Error("Manca la chiave d'ambiente APIFY_TOKEN");
  }

  const actorId = "apify~instagram-reel-scraper";
  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: [url],
        resultsLimit: 1,
        includeTranscript: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Errore avvio Apify:", errorText);
    throw new Error("Errore durante l'avvio dello scraper Apify");
  }

  const resJson = await response.json();
  const runId = resJson.data.id;
  const datasetId = resJson.data.defaultDatasetId;

  if (!runId || !datasetId) {
    throw new Error("Risposta Apify malformata: runId o datasetId non trovati");
  }

  return { runId, datasetId };
}

/**
 * Controlla lo stato del run su Apify.
 */
export async function getRunStatus(runId: string): Promise<'SUCCEEDED' | 'RUNNING' | 'FAILED' | 'OTHER'> {
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    throw new Error("Manca la chiave d'ambiente APIFY_TOKEN");
  }

  const response = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    console.error(`Errore getRunStatus per run ${runId}:`, await response.text());
    return 'FAILED';
  }

  const resJson = await response.json();
  const status = resJson.data.status;

  if (status === 'SUCCEEDED') {
    return 'SUCCEEDED';
  }
  
  if (status === 'RUNNING' || status === 'READY' || status === 'STARTING') {
    return 'RUNNING';
  }

  if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
    return 'FAILED';
  }

  return 'OTHER';
}

/**
 * Recupera i dati estratti dal dataset del run.
 */
export async function getDatasetItems(datasetId: string): Promise<ApifyScrapedData> {
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    throw new Error("Manca la chiave d'ambiente APIFY_TOKEN");
  }

  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Errore recupero dataset ${datasetId}:`, errorText);
    throw new Error("Impossibile recuperare i dati estratti da Apify");
  }

  const items = await response.json();
  if (!items || items.length === 0) {
    throw new Error("Nessun dato trovato nel dataset di Apify");
  }

  const scrapedData = items[0];
  const caption = scrapedData.caption || "";
  
  // Apify Reel Scraper può memorizzare la trascrizione in diversi campi a seconda della versione
  const transcript = scrapedData.transcript || scrapedData.videoTranscript || "";
  
  // Immagine di copertina
  const coverImageUrl = scrapedData.displayUrl || scrapedData.thumbnailUrl || scrapedData.videoPlayUrl || null;

  // Dati del creator (owner)
  const creatorUsername = scrapedData.ownerUsername || null;
  const creatorFullName = scrapedData.ownerFullName || null;
  const creatorId = scrapedData.ownerId || null;

  return {
    caption,
    transcript,
    coverImageUrl,
    creatorUsername,
    creatorFullName,
    creatorId,
  };
}
