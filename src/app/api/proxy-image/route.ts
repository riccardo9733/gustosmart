import { NextResponse } from "next/server";

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

    // Effettua la richiesta all'URL dell'immagine dal server
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
        "Cache-Control": "public, max-age=86400, must-revalidate", // Cache per 24 ore
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
