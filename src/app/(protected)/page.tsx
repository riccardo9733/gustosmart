"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc, increment } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useRecipes, useAddToUserRecipes } from "@/hooks/useRecipes";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile } from "@/store/userSlice";
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
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [activeCleanup, setActiveCleanup] = useState<(() => void) | null>(null);

  const { user } = useAuth();
  const router = useRouter();
  const profile = useAppSelector(selectUserProfile);
  
  const t = useTranslations("Home");
  const tRecipes = useTranslations("Recipes");

  // TanStack Query: condivide la stessa cache con /recipes page → zero letture extra
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();

  // Mutation per aggiungere una ricetta già esistente al ricettario
  const { mutateAsync: addToUserRecipes } = useAddToUserRecipes();

  // Cleanup listener on unmount
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
    setVideoUrl("");

    const toastId = toast.loading(t("importing"), {
      description: t("importingDesc"),
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

    setActiveCleanup(() => cleanup);

    try {
      // 0. Check client-side: esiste già una ricetta globale con questo URL?
      const { checkRecipeExistsByUrl } = await import("@/lib/firestore/recipes");
      const existingRecipeId = await checkRecipeExistsByUrl(targetUrl);

      if (existingRecipeId) {
        // Ricetta già nel catalogo globale → aggiungila direttamente al ricettario
        await addToUserRecipes(existingRecipeId);
        cleanup();
        toast.success(t("recipeExists"), {
          id: toastId,
          description: t("recipeExistsDesc"),
          duration: 6000,
          action: {
            label: t("view"),
            onClick: () => router.push(`/recipes/${existingRecipeId}`),
          },
        });
        return;
      }

      // Controlla la disponibilità dei token prima dell'ingest (se la ricetta non esiste già)
      const tokens = profile?.tokens ?? 10;
      if (tokens <= 0) {
        cleanup();
        toast.error(t("noTokensErrorTitle"), {
          id: toastId,
          description: t("noTokensErrorDesc"),
        });
        return;
      }

      // 1. Invia il trigger al backend (solo se la ricetta non esiste già)
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, userId: user.uid }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Impossibile avviare l'importazione.");
      }

      const json = await response.json();

      // Nuova ricetta: avvia polling Apify e ascolta Firestore per il completamento
      const { runId, datasetId, recipeId } = json;

      // Listener one-shot su /users/{uid}/recipes/{recipeId}
      const db = getFirebaseDb();
      unsubscribeFirestore = onSnapshot(doc(db, "users", user.uid, "recipes", recipeId), (docSnap) => {
        if (docSnap.exists()) {
          cleanup();
          toast.success(t("importedSuccess"), {
            id: toastId,
            description: t("importedSuccessDesc"),
            duration: 8000,
            action: {
              label: t("view"),
              onClick: () => router.push(`/recipes/${recipeId}`),
            },
          });
        }
      });

      // 3. Polling per far progredire lo scraping Apify
      pollingIntervalId = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/ingest/status?runId=${runId}&datasetId=${datasetId}&recipeId=${recipeId}&userId=${user.uid}&sourceUrl=${encodeURIComponent(targetUrl)}`
          );
          if (!statusRes.ok) return;

          const statusJson = await statusRes.json();
          if (statusJson.status === "failed") {
            cleanup();
            toast.error(t("importFailed"), {
              id: toastId,
              description: statusJson.error || t("importFailedDesc"),
            });
            return;
          }

          if (statusJson.status === "succeeded") {
            // Salva la ricetta globale in /recipes/{recipeId} (senza userId)
            const recipeDoc = {
              sourceUrl: targetUrl,
              sourcePlatform: "instagram",
              title: statusJson.recipe.title,
              sourceLanguage: statusJson.recipe.sourceLanguage || "it",
              servings: statusJson.recipe.servings,
              ingredients: statusJson.recipe.ingredients,
              instructions: statusJson.recipe.instructions,
              imageUrl: statusJson.recipe.imageUrl || null,
              prepTimeMinutes: statusJson.recipe.prepTimeMinutes,
              category: statusJson.recipe.category || "other",
              kcal: statusJson.recipe.kcal !== undefined && statusJson.recipe.kcal !== null
                ? statusJson.recipe.kcal
                : null,
              createdAt: serverTimestamp(),
              createdBy: user.uid,
            };

            await setDoc(doc(db, "recipes", recipeId), recipeDoc);

            // Crea il documento personale in /users/{uid}/recipes/{recipeId}
            const { addToUserRecipes: addFn } = await import("@/lib/firestore/recipes");
            await addFn(user.uid, recipeId);

            // Detrai 1 token all'utente per aver scansionato una nuova ricetta
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
              tokens: increment(-1),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (pollErr) {
          console.error("Errore nel polling dello stato:", pollErr);
        }
      }, 4000);

    } catch (error: any) {
      console.error("Errore durante il flusso di importazione:", error);
      cleanup();
      toast.error(t("importFailed"), {
        id: toastId,
        description: error.message || t("importFailedDesc"),
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

  // Mostra solo le ultime 10 ricette nella home
  const recentRecipes = recipes.slice(0, 10);

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl lg:max-w-2xl">
          {t.rich("title", {
            highlight: (chunks) => <span className="text-primary">{chunks}</span>
          })}
        </h2>

        {/* URL Import Input */}
        <form onSubmit={handleImport} className="relative group w-full max-w-lg mt-8">
          <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full -z-10 transition-all duration-500 group-focus-within:bg-primary/20"></div>
          <div className="flex items-center glass-panel rounded-full p-1.5 shadow-xl shadow-primary/5 border border-primary/20 focus-within:border-primary transition-all">
            <Input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={t("placeholder")}
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
            {t("instagram")}
          </button>
          <button
            onClick={() => setPlatformUrl("tiktok")}
            className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <Video className="h-4 w-4 text-primary" />
            {t("tiktok")}
          </button>
          <button
            onClick={() => setPlatformUrl("web")}
            className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <LinkIcon className="h-4 w-4 text-primary" />
            {t("web")}
          </button>
        </div>
      </section>

      {/* Ultimi Arrivi Carousel */}
      <section className="w-full">
        <div className="flex justify-between items-end mb-6">
          <h3 className="font-heading text-xl font-semibold text-foreground">{t("recent")}</h3>
          <Link href="/recipes" className="text-primary font-semibold text-sm flex items-center gap-1 hover:underline">
            {t("seeAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Carousel Container */}
        <div className="flex overflow-x-auto gap-6 snap-x snap-mandatory scrollbar-none pb-4 -mx-6 px-6">
          {recipesLoading ? (
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
          ) : recentRecipes.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center text-center p-8 glass-panel rounded-[24px] border border-white/40 dark:border-white/10 shadow-lg max-w-lg mx-auto py-12">
              <ChefHat className="h-12 w-12 text-primary/60 mb-4" />
              <h4 className="text-lg font-bold text-foreground mb-2">{t("noRecipesTitle")}</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t("noRecipesDesc")}
              </p>
            </div>
          ) : (
            recentRecipes.map((recipe) => {
              const tags = [];
              if (recipe.prepTimeMinutes && recipe.prepTimeMinutes <= 20) {
                tags.push(tRecipes("fast"));
              }
              if (recipe.ingredients && recipe.ingredients.length > 0) {
                tags.push(tRecipes("ingredients", { count: recipe.ingredients.length }));
              }
              if (recipe.sourcePlatform) {
                tags.push(recipe.sourcePlatform.charAt(0).toUpperCase() + recipe.sourcePlatform.slice(1));
              }

              const descText = `${tRecipes("ingredients", { count: recipe.ingredients?.length || 0 })} · ${tRecipes("instructions", { count: recipe.instructions?.length || 0 })}`;

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
          <h4 className="text-sm font-bold text-foreground">{t("smartTip")}</h4>
          <p className="text-sm text-muted-foreground leading-tight mt-0.5">
            {t("smartTipDesc")}
          </p>
        </div>
      </section>
    </div>
  );
}
