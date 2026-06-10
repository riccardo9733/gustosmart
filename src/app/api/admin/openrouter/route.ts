import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const endpoint = searchParams.get("endpoint");

    if (!userId) {
      return NextResponse.json({ success: false, error: "Identificativo utente mancante" }, { status: 400 });
    }

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Endpoint di destinazione mancante" }, { status: 400 });
    }

    // 1. Extract Bearer Token from headers
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Token di autorizzazione mancante o non valido" }, { status: 401 });
    }
    const idToken = authHeader.substring(7);

    // 2. Fetch User document from Firestore REST API using the user's ID Token
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({ success: false, error: "Manca la configurazione del Project ID di Firebase" }, { status: 500 });
    }

    const userDocUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
    const userDocRes = await fetch(userDocUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!userDocRes.ok) {
      const errText = await userDocRes.text();
      console.error("Failed to fetch user from Firestore REST API:", errText);
      return NextResponse.json({ success: false, error: "Accesso negato: token scaduto o permessi insufficienti" }, { status: 403 });
    }

    const userDoc = await userDocRes.json();
    const role = userDoc.fields?.role?.stringValue;

    if (role !== "admin") {
      return NextResponse.json({ success: false, error: "Accesso negato: permessi amministratore insufficienti" }, { status: 403 });
    }

    // 2. Fetch OpenRouter API Key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Manca la chiave d'ambiente OPENROUTER_API_KEY" }, { status: 500 });
    }

    // 3. Proxy to OpenRouter based on endpoint parameter
    let targetUrl = "";
    if (endpoint === "credits") {
      targetUrl = "https://openrouter.ai/api/v1/credits";
    } else if (endpoint === "key") {
      targetUrl = "https://openrouter.ai/api/v1/key";
    } else if (endpoint === "generation") {
      const genId = searchParams.get("id");
      if (!genId) {
        return NextResponse.json({ success: false, error: "ID generazione mancante" }, { status: 400 });
      }
      targetUrl = `https://openrouter.ai/api/v1/generation?id=${genId}`;
    } else {
      return NextResponse.json({ success: false, error: "Endpoint non supportato" }, { status: 400 });
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error(`Error querying OpenRouter ${targetUrl}:`, errorMsg);
      return NextResponse.json({ success: false, error: `OpenRouter API Error: ${response.status} - ${errorMsg}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Errore nell'endpoint /api/admin/openrouter:", error);
    const errorMsg = error instanceof Error ? error.message : "Errore interno del server";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
