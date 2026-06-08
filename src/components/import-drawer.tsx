"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc, increment } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useAddToUserRecipes } from "@/hooks/useRecipes";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile } from "@/store/userSlice";
import { identifyPlatform } from "@/lib/scraping/detector";
import {
  Sparkles,
  Film,
  Video,
  Link as LinkIcon,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

interface ImportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDrawer({ open, onOpenChange }: ImportDrawerProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [activeCleanup, setActiveCleanup] = useState<(() => void) | null>(null);

  const { user } = useAuth();
  const router = useRouter();
  const profile = useAppSelector(selectUserProfile);
  
  const t = useTranslations("Home");

  // Mutation per aggiungere una ricetta al ricettario personale
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
    // Close the drawer immediately to let user explore the feed while importing in background
    onOpenChange(false);

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

      // Controlla la disponibilità dei token prima dell'ingest (se la ricetta non esiste già e non è web)
      let detectedPlatform = "web";
      try {
        detectedPlatform = identifyPlatform(targetUrl);
      } catch (e) {
        console.error("Errore identificazione piattaforma:", e);
      }

      if (detectedPlatform !== "web") {
        const tokens = profile?.tokens ?? 10;
        if (tokens <= 0) {
          cleanup();
          toast.error(t("noTokensErrorTitle"), {
            id: toastId,
            description: t("noTokensErrorDesc"),
          });
          return;
        }
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
            // Ferma subito il polling per evitare chiamate concorrenti/multiple
            if (pollingIntervalId) {
              clearInterval(pollingIntervalId);
            }

            try {
              // Salva la ricetta globale in /recipes/{recipeId} (senza userId)
              let detectedPlatform = "web";
              try {
                detectedPlatform = identifyPlatform(targetUrl);
              } catch (e) {
                console.error("Errore identificazione piattaforma:", e);
              }

              const recipeDoc = {
                sourceUrl: targetUrl,
                sourcePlatform: detectedPlatform,
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
                creatorUsername: statusJson.recipe.creatorUsername || null,
                creatorFullName: statusJson.recipe.creatorFullName || null,
                creatorId: statusJson.recipe.creatorId || null,
              };

              await setDoc(doc(db, "recipes", recipeId), recipeDoc);

              // Crea il documento personale in /users/{uid}/recipes/{recipeId}
              const { addToUserRecipes: addFn } = await import("@/lib/firestore/recipes");
              await addFn(user.uid, recipeId);

              // Detrai 1 token all'utente per aver scansionato una nuova ricetta (solo se non è web)
              if (detectedPlatform !== "web") {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                  tokens: increment(-1),
                  updatedAt: new Date().toISOString(),
                });
              }
            } catch (dbErr: any) {
              console.error("Errore salvataggio dati ricetta su Firestore:", dbErr);
              cleanup();
              toast.error(t("importFailed"), {
                id: toastId,
                description: dbErr.message || t("importFailedDesc"),
              });
            }
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] p-6 rounded-t-[32px] border-t border-white/20 bg-background dark:bg-surface-container/95 backdrop-blur-xl">
        <div className="flex flex-col gap-6 max-w-lg mx-auto w-full pb-10">
          <DrawerHeader className="p-0 text-center flex flex-col gap-2">
            <DrawerTitle className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {t("drawerTitle") || "Importa una Ricetta"}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground leading-relaxed">
              {t("drawerDesc") || "Incolla il link di un Reel di Instagram, un video TikTok o una ricetta web per scansionarla e aggiungerla al catalogo."}
            </DrawerDescription>
          </DrawerHeader>

          {/* Form */}
          <form onSubmit={handleImport} className="relative group w-full mt-2">
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
                disabled={isImporting || !videoUrl.trim()}
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

          {/* Platform Suggestion Badges */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setPlatformUrl("instagram")}
              type="button"
              className="glass-panel px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all border border-white/10"
            >
              <Film className="h-4 w-4 text-primary" />
              {t("instagram")}
            </button>
            <button
              onClick={() => setPlatformUrl("tiktok")}
              type="button"
              className="glass-panel px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all border border-white/10"
            >
              <Video className="h-4 w-4 text-primary" />
              {t("tiktok")}
            </button>
            <button
              onClick={() => setPlatformUrl("web")}
              type="button"
              className="glass-panel px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all border border-white/10"
            >
              <LinkIcon className="h-4 w-4 text-primary" />
              {t("web")}
            </button>
          </div>

          <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/10 mt-2">
            <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">Come funziona?</span>
              <span className="text-xs text-muted-foreground leading-snug">
                I nostri sistemi analizzeranno la trascrizione del video o la pagina web per estrarre dosi, ingredienti e passaggi con l'intelligenza artificiale.
              </span>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
