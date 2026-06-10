import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// Lazy-initialized S3 client to avoid build-time issues if env vars are missing
let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;
  const endpoint = process.env.B2_ENDPOINT;
  const region = process.env.B2_REGION;

  if (!keyId || !applicationKey || !endpoint || !region) {
    throw new Error(
      "Credenziali Backblaze B2 mancanti. Verifica B2_KEY_ID, B2_APPLICATION_KEY, B2_ENDPOINT e B2_REGION in .env.local"
    );
  }

  s3ClientInstance = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: applicationKey,
    },
    // Backblaze B2 supporta ed è ottimizzato per l'accesso path-style
    forcePathStyle: true,
  });

  return s3ClientInstance;
}

/**
 * Mappa un contentType all'estensione del file corretta.
 */
export function getExtensionFromContentType(contentType: string): string {
  const cleanType = contentType.toLowerCase();
  if (cleanType.includes("image/png")) return "png";
  if (cleanType.includes("image/webp")) return "webp";
  if (cleanType.includes("image/gif")) return "gif";
  return "jpg"; // Default standard
}

/**
 * Carica un buffer di un'immagine direttamente sul bucket Backblaze B2.
 * Ritorna l'URL completo del file caricato.
 */
export async function uploadBufferToB2(buffer: Buffer, fileKey: string, contentType: string): Promise<string> {
  const bucketName = process.env.B2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("Manca la chiave d'ambiente B2_BUCKET_NAME");
  }

  const client = getS3Client();

  console.log(`B2: Avvio caricamento buffer su B2 con chiave: ${fileKey}`);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);
  console.log("B2: Caricamento completato con successo!");

  // Costruisce l'URL S3 completo
  const endpoint = process.env.B2_ENDPOINT?.replace(/\/$/, "");
  return `${endpoint}/${bucketName}/${fileKey}`;
}

/**
 * Scarica un'immagine da un URL remoto e la carica sul bucket Backblaze B2.
 * Ritorna l'URL completo del file caricato.
 */
export async function uploadImageToB2(imageUrl: string, recipeId: string): Promise<string> {
  const bucketName = process.env.B2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("Manca la chiave d'ambiente B2_BUCKET_NAME");
  }

  console.log(`B2: Scaricamento immagine da URL: ${imageUrl}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 secondi di timeout per evitare hang indefiniti

  try {
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Impossibile scaricare l'immagine originale (${response.status} ${response.statusText})`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = getExtensionFromContentType(contentType);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileKey = `recipes/${recipeId}.${ext}`;
    const client = getS3Client();

    console.log(`B2: Avvio caricamento su B2 con chiave: ${fileKey}`);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);
    console.log("B2: Caricamento completato con successo!");

    // Costruisce l'URL S3 completo
    // Es: https://s3.eu-central-003.backblazeb2.com/gustosmart/recipes/recipeId.jpg
    const endpoint = process.env.B2_ENDPOINT?.replace(/\/$/, "");
    return `${endpoint}/${bucketName}/${fileKey}`;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`[B2 Upload] Errore o timeout durante il download/upload dell'immagine:`, err.message || err);
    throw err;
  }
}

/**
 * Recupera un oggetto dal bucket Backblaze B2 e restituisce il buffer e il contentType.
 */
export async function getB2Image(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const bucketName = process.env.B2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("Manca la chiave d'ambiente B2_BUCKET_NAME");
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await client.send(command);
  
  if (!response.Body) {
    throw new Error(`Corpo del file ${key} vuoto o non trovato su B2`);
  }

  const bytes = await response.Body.transformToByteArray();
  const buffer = Buffer.from(bytes);
  const contentType = response.ContentType || "image/jpeg";

  return { buffer, contentType };
}
