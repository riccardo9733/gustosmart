import { NextResponse } from "next/server";
import { getB2Image } from "@/lib/scraping/b2";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "L'URL dell'immagine è obbligatorio" },
        { status: 400 }
      );
    }

    // 1. Controlla se l'URL appartiene al nostro bucket privato Backblaze B2
    const b2Endpoint = process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com";
    const b2Bucket = process.env.B2_BUCKET_NAME || "gustosmart";
    const b2Prefix = `${b2Endpoint.replace(/\/$/, "")}/${b2Bucket}/`;

    if (url.startsWith(b2Prefix)) {
      const key = url.substring(b2Prefix.length);
      if (!key) {
        return NextResponse.json(
          { error: "Chiave immagine Backblaze B2 non valida" },
          { status: 400 }
        );
      }

      console.log(`Proxy: recupero immagine B2 per chiave: ${key}`);
      const { buffer, contentType } = await getB2Image(key);

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable", // Cache a lungo termine per immagini B2
        },
      });
    }

    // 2. Se è un URL pubblico esterno (es. Instagram CDN temporaneo), effettua la fetch classica
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      console.error(`Errore nel recupero dell'immagine da proxy (status: ${res.status}):`, url);
      return NextResponse.json(
        { error: `Impossibile caricare l'immagine (${res.status})` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await res.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, must-revalidate", // Cache per 24 ore per CDN esterni
      },
    });
  } catch (error: any) {
    console.error("Errore nell'endpoint /api/proxy-image:", error);
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}
