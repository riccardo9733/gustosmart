import { NextResponse } from "next/server";
import { uploadBufferToB2, getExtensionFromContentType } from "@/lib/scraping/b2";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Nessun file fornito" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "ID utente mancante" },
        { status: 400 }
      );
    }

    // 10MB limit validation
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Il file supera il limite massimo di 10MB" },
        { status: 400 }
      );
    }

    // Image content type validation
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Il file deve essere un'immagine valida (JPG, PNG, WEBP, GIF)" },
        { status: 400 }
      );
    }

    // Convert file data to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resolve extension and unique file key
    const ext = getExtensionFromContentType(file.type);
    const fileKey = `profiles/${userId}_${Date.now()}.${ext}`;

    console.log(`Caricamento immagine del profilo per l'utente ${userId} con estensione: ${ext}`);
    const imageUrl = await uploadBufferToB2(buffer, fileKey, file.type);
    console.log(`Immagine del profilo caricata con successo su B2: ${imageUrl}`);

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Errore interno del server";
    console.error("Errore nell'endpoint /api/profile/upload:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
