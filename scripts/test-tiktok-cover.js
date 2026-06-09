const fs = require('fs');
const path = require('path');

// Leggi .env.local per estrarre SCRAPECREATORS_API_KEY
const envPath = path.join(__dirname, '..', '.env.local');
let apiKey = '';
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/SCRAPECREATORS_API_KEY=(.*)/);
  if (match && match[1]) {
    apiKey = match[1].trim().replace(/['"]/g, '');
  }
} catch (e) {
  console.error("Impossibile caricare .env.local:", e);
}

if (!apiKey) {
  console.error("Manca la chiave SCRAPECREATORS_API_KEY.");
  process.exit(1);
}

// URL di test TikTok (esempio da OpenAPI spec)
const tiktokUrl = "https://www.tiktok.com/@randomspamvideos25/video/7251387037834595630";

async function run() {
  console.log(`Chiamata a ScrapeCreators per: ${tiktokUrl}`);
  try {
    const res = await fetch(
      `https://api.scrapecreators.com/v2/tiktok/video?url=${encodeURIComponent(tiktokUrl)}`,
      {
        headers: { "x-api-key": apiKey }
      }
    );

    if (!res.ok) {
      console.error(`Errore API: ${res.status} ${res.statusText}`);
      console.log(await res.text());
      return;
    }

    const data = await res.json();
    const video = data.aweme_detail?.video;

    if (!video) {
      console.error("Nessun dato video trovato.");
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log("=== COVERS TROVATE ===");
    const keys = ['cover', 'dynamic_cover', 'origin_cover', 'ai_dynamic_cover', 'animated_cover'];
    for (const key of keys) {
      const obj = video[key];
      if (obj && obj.url_list && obj.url_list.length > 0) {
        console.log(`\n--- ${key.toUpperCase()} ---`);
        console.log(`URI: ${obj.uri}`);
        for (const url of obj.url_list) {
          console.log(`URL: ${url}`);
          // Fai una richiesta HEAD/GET per vedere il content-type
          try {
            const imgRes = await fetch(url, { method: 'GET' });
            console.log(`Status: ${imgRes.status}, Content-Type: ${imgRes.headers.get('content-type')}`);
          } catch (err) {
            console.error(`Errore nel fetch dell'immagine:`, err.message);
          }
        }
      } else {
        console.log(`\n--- ${key.toUpperCase()}: NON PRESENTE ---`);
      }
    }

  } catch (err) {
    console.error("Errore generico:", err);
  }
}

run();
