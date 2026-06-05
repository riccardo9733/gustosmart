"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { doc, onSnapshot, setDoc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { 
  Sparkles, 
  Film, 
  Video, 
  Link as LinkIcon, 
  Clock, 
  ArrowRight, 
  ChefHat,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [activeCleanup, setActiveCleanup] = useState<(() => void) | null>(null);
  
  const { user } = useAuth();
  const router = useRouter();

  // Effetto per ascoltare le ricette reali dell'utente
  useEffect(() => {
    if (!user) {
      setRecipes([]);
      setRecipesLoading(false);
      return;
    }

    const db = getFirebaseDb();
    const q = query(
      collection(db, "recipes"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecipes = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAtMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0
        };
      });

      // Ordina client-side decrescente per createdAtMs
      fetchedRecipes.sort((a: any, b: any) => b.createdAtMs - a.createdAtMs);

      // Limita a 10 elementi
      setRecipes(fetchedRecipes.slice(0, 10));
      setRecipesLoading(false);
    }, (error) => {
      console.error("Errore ascolto ricette:", error);
      setRecipesLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Effetto di pulizia per evitare memory leak se l'utente naviga via durante l'importazione
  useEffect(() => {
    return () => {
      if (activeCleanup) activeCleanup();
    };
  }, [activeCleanup]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return;
    if (!user) {
      toast.error("Utente non autenticato.");
      return;
    }

    setIsImporting(true);
    const targetUrl = videoUrl;
    setVideoUrl(""); // Svuota l'input per lasciare libero l'utente

    // Mostra il toast di caricamento iniziale persistente
    const toastId = toast.loading("Importazione in corso", {
      description: "Stiamo elaborando il video. La ricetta sarà disponibile a breve.",
      duration: Infinity,
    });

    let pollingIntervalId: NodeJS.Timeout | null = null;
    let unsubscribeFirestore: (() => void) | null = null;

    const cleanup = () => {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      if (unsubscribeFirestore) unsubscribeFirestore();
      setIsImporting(false);
      setActiveCleanup(null);
    };

    // Salva la funzione di cleanup nello stato
    setActiveCleanup(() => cleanup);

    try {
      // 1. Invia il trigger al backend
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, userId: user.uid }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Impossibile avviare l'importazione.");
      }

      const { runId, datasetId, recipeId } = await response.json();

      // 2. Ascolta in tempo reale la creazione della ricetta in Firestore
      const db = getFirebaseDb();
      unsubscribeFirestore = onSnapshot(doc(db, "recipes", recipeId), (docSnap) => {
        if (docSnap.exists()) {
          const recipeData = docSnap.data();
          const recipeTitle = recipeData.title || "Nuova Ricetta";

          cleanup();

          toast.success("Ricetta Importata!", {
            id: toastId, // Sostituisce il toast precedente
            description: `"${recipeTitle}" è pronta!`,
            duration: 8000,
            action: {
              label: "Visualizza",
              onClick: () => router.push(`/recipes/${recipeId}`),
            },
          });
        }
      });

      // 3. Esegui il polling lato client per far progredire lo scraping in serverless
      pollingIntervalId = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/ingest/status?runId=${runId}&datasetId=${datasetId}&recipeId=${recipeId}&userId=${user.uid}&sourceUrl=${encodeURIComponent(targetUrl)}`
          );
          if (!statusRes.ok) return;

          const statusJson = await statusRes.json();
          if (statusJson.status === "failed") {
            cleanup();
            toast.error("Errore di importazione", {
              id: toastId,
              description: statusJson.error || "Impossibile completare lo scraping.",
            });
            return;
          }

          if (statusJson.status === "succeeded") {
            // Abbiamo i dati della ricetta! Ora li salviamo con le credenziali del client
            console.log("Salvataggio ricetta su Firestore...");
            const recipeDoc = {
              id: recipeId,
              userId: user.uid,
              title: statusJson.recipe.title,
              sourceUrl: targetUrl,
              sourcePlatform: "instagram",
              servings: statusJson.recipe.servings,
              ingredients: statusJson.recipe.ingredients,
              instructions: statusJson.recipe.instructions,
              imageUrl: statusJson.recipe.imageUrl || null,
              prepTimeMinutes: statusJson.recipe.prepTimeMinutes,
              category: statusJson.recipe.category || "other",
              kcal: statusJson.recipe.kcal !== undefined && statusJson.recipe.kcal !== null ? statusJson.recipe.kcal : null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, "recipes", recipeId), recipeDoc);
            console.log("Salvataggio completato lato client.");
            // onSnapshot intercetterà la scrittura e farà scattare il cleanup + toast di successo
          }
        } catch (pollErr) {
          console.error("Errore nel polling dello stato:", pollErr);
        }
      }, 4000);

    } catch (error: any) {
      console.error("Errore durante il flusso di importazione:", error);
      cleanup();
      toast.error("Errore di importazione", {
        id: toastId,
        description: error.message || "Impossibile avviare l'importazione. Riprova più tardi.",
      });
    }
  };

  const setPlatformUrl = (platform: string) => {
    if (platform === "instagram") {
      setVideoUrl("https://www.instagram.com/reel/example");
    } else if (platform === "tiktok") {
      setVideoUrl("https://www.tiktok.com/@example/video/12345");
    } else {
      setVideoUrl("https://giallozafferano.it/ricette/example");
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl lg:max-w-2xl">
          Trasforma i tuoi Reel in <span className="text-primary">ricette reali</span>
        </h2>
        
        {/* URL Import Input */}
        <form onSubmit={handleImport} className="relative group w-full max-w-lg mt-8">
          <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full -z-10 transition-all duration-500 group-focus-within:bg-primary/20"></div>
          <div className="flex items-center glass-panel rounded-full p-1.5 shadow-xl shadow-primary/5 border border-primary/20 focus-within:border-primary transition-all">
            <Input 
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Incolla il link del video qui..." 
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-5 text-sm h-11"
              disabled={isImporting}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={isImporting}
              className="bg-primary hover:bg-primary/95 text-white rounded-full h-11 w-11 shadow-lg active:scale-95 transition-all"
            >
              {isImporting ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Sparkles className="fill-white" data-icon="inline-start" />
              )}
            </Button>
          </div>
        </form>

        {/* Suggestion Badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button 
            onClick={() => setPlatformUrl("instagram")}
            className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <Film className="h-4 w-4 text-primary" />
            Instagram Reel
          </button>
          <button 
            onClick={() => setPlatformUrl("tiktok")}
            className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <Video className="h-4 w-4 text-primary" />
            TikTok Video
          </button>
          <button 
            onClick={() => setPlatformUrl("web")}
            className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <LinkIcon className="h-4 w-4 text-primary" />
            Link Web
          </button>
        </div>
      </section>

      {/* Ultimi Arrivi Carousel */}
      <section className="w-full">
        <div className="flex justify-between items-end mb-6">
          <h3 className="font-heading text-xl font-semibold text-foreground">Ultimi Arrivi</h3>
          <Link href="/recipes" className="text-primary font-semibold text-sm flex items-center gap-1 hover:underline">
            Vedi tutto <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        {/* Carousel Container */}
        <div className="flex overflow-x-auto gap-6 snap-x snap-mandatory scrollbar-none pb-4 -mx-6 px-6">
          {recipesLoading ? (
            // Skeleton Loader
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="min-w-[280px] max-w-[280px] snap-start relative pt-0 border border-white/40 dark:border-white/10 shadow-xl shadow-primary/5 flex flex-col justify-between">
                <div className="relative w-full aspect-video bg-muted/20 overflow-hidden">
                  <div className="absolute inset-0 z-30 bg-black/35 pointer-events-none" />
                  <Skeleton className="relative z-20 aspect-video w-full h-full rounded-none animate-pulse bg-muted brightness-60 grayscale dark:brightness-40" />
                </div>
                <CardHeader>
                  <CardTitle className="min-h-[44px]">
                    <Skeleton className="h-5 w-5/6 animate-pulse bg-muted mb-1" />
                    <Skeleton className="h-5 w-2/3 animate-pulse bg-muted" />
                  </CardTitle>
                  <CardDescription>
                    <Skeleton className="h-3 w-1/2 animate-pulse bg-muted" />
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          ) : recipes.length === 0 ? (
            // Premium Empty State
            <div className="w-full flex flex-col items-center justify-center text-center p-8 glass-panel rounded-[24px] border border-white/40 dark:border-white/10 shadow-lg max-w-lg mx-auto py-12">
              <ChefHat className="h-12 w-12 text-primary/60 mb-4" />
              <h4 className="text-lg font-bold text-foreground mb-2">Ancora nessuna ricetta</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                Incolla il link di un Reel di Instagram qui sopra per iniziare ad importare le tue ricette!
              </p>
            </div>
          ) : (
            // Real User Recipes
            recipes.map((recipe) => {
              // Calcolo dei tag dinamici
              const tags = [];
              if (recipe.prepTimeMinutes && recipe.prepTimeMinutes <= 20) {
                tags.push("Rapido");
              }
              if (recipe.ingredients && recipe.ingredients.length > 0) {
                tags.push(`${recipe.ingredients.length} ing.`);
              }
              if (recipe.sourcePlatform) {
                tags.push(recipe.sourcePlatform.charAt(0).toUpperCase() + recipe.sourcePlatform.slice(1));
              }

              const mainTag = tags[0] || "Ricetta";
              const descText = `${recipe.ingredients?.length || 0} ingredienti · ${recipe.instructions?.length || 0} passaggi`;

              return (
                <Card 
                  key={recipe.id} 
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                  className="min-w-[280px] max-w-[280px] snap-start relative pt-0 border border-white/40 dark:border-white/10 shadow-xl shadow-primary/5 hover:scale-[1.02] transition-transform duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative w-full aspect-video bg-muted/20 overflow-hidden">
                    {recipe.imageUrl ? (
                      <img 
                        src={`/api/proxy-image?url=${encodeURIComponent(recipe.imageUrl)}`}
                        alt={recipe.title}
                        className="relative z-20 aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="relative z-20 w-full h-full flex items-center justify-center text-muted-foreground/30 aspect-video">
                        <ChefHat className="h-10 w-10 text-primary/20" />
                      </div>
                    )}
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="font-heading text-base font-bold text-foreground leading-snug line-clamp-2 min-h-[44px] tracking-tight">
                      {recipe.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {descText}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* Smart Tip Banner */}
      <section className="glass-panel rounded-[24px] p-5 flex items-center gap-4 border-l-4 border-l-primary shadow-lg shadow-primary/5">
        <div className="bg-primary/10 p-3 rounded-2xl">
          <ChefHat className="h-7 w-7 text-primary" />
        </div>
        <div className="flex flex-col">
          <h4 className="text-sm font-bold text-foreground">Suggerimento Smart</h4>
          <p className="text-sm text-muted-foreground leading-tight mt-0.5">
            Il tuo forno è preriscaldato? Sincronizza le ricette con GustoHub.
          </p>
        </div>
      </section>
    </div>
  );
}
