"use client";

import React, { createContext, useContext, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile } from "@/store/userSlice";
import { useAddToUserRecipes } from "@/hooks/useRecipes";
import { doc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { identifyPlatform } from "@/lib/scraping/detector";
import { toast } from "sonner";
import { ImportDrawer } from "@/components/import-drawer";
import { trackEvent } from "@/lib/analytics";

export type IngestStep = "idle" | "scraping" | "extracting" | "saving" | "completed" | "failed";

interface IngestContextType {
  isIngesting: boolean;
  isDrawerOpen: boolean;
  url: string;
  step: IngestStep;
  progress: number;
  error: string | null;
  recipeResult: any | null;
  recipeId: string | null;
  startIngest: (targetUrl: string) => Promise<void>;
  openImportDrawer: () => void;
  closeImportDrawer: () => void;
  resetIngest: () => void;
}

const IngestContext = createContext<IngestContextType | undefined>(undefined);

export function IngestProvider({ children }: { children: React.ReactNode }) {
  const [isIngesting, setIsIngesting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<IngestStep>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recipeResult, setRecipeResult] = useState<any | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);

  const { user } = useAuth();
  const profile = useAppSelector(selectUserProfile);
  const { mutateAsync: addToUserRecipes } = useAddToUserRecipes();

  // Reset states
  const resetIngest = () => {
    setIsIngesting(false);
    setUrl("");
    setStep("idle");
    setProgress(0);
    setError(null);
    setRecipeResult(null);
    setRecipeId(null);
  };

  const openImportDrawer = () => setIsDrawerOpen(true);
  const closeImportDrawer = () => {
    setIsDrawerOpen(false);
    // Se l'ingestione è terminata (con successo o errore), resetta lo stato all'idle
    // dopo l'animazione di chiusura per evitare sfarfallii visivi.
    if (step === "completed" || step === "failed") {
      setTimeout(() => {
        resetIngest();
      }, 300);
    }
  };

  const startIngest = async (targetUrl: string) => {
    if (!user) {
      toast.error("Utente non autenticato.");
      return;
    }

    // Reset pre-esistenza
    resetIngest();
    setUrl(targetUrl);
    setIsIngesting(true);
    setStep("scraping");
    setProgress(5);
    setIsDrawerOpen(true); // Apre il drawer per mostrare il progresso iniziale

    // Rileva piattaforma prima delle verifiche
    let detectedPlatform = "web";
    try {
      detectedPlatform = identifyPlatform(targetUrl);
    } catch (e) {
      console.error("Errore identificazione piattaforma:", e);
    }

    try {
      // 1. Check client-side: esiste già una ricetta globale con questo URL?
      const { checkRecipeExistsByUrl } = await import("@/lib/firestore/recipes");
      const existingRecipeId = await checkRecipeExistsByUrl(targetUrl);

      if (existingRecipeId) {
        // Traccia avvio con cache hit
        await trackEvent("recipe_import_initiated", {
          source_platform: detectedPlatform,
          is_cached_hit: true,
          userId: user.uid,
          userEmail: user.email || undefined,
        });

        setStep("saving");
        setProgress(75);
        
        // Ricetta già nel catalogo globale → aggiungila direttamente al ricettario personale
        await addToUserRecipes(existingRecipeId);
        
        setStep("completed");
        setProgress(100);
        setRecipeId(existingRecipeId);
        
        // Traccia successo cache hit
        await trackEvent("recipe_import_completed", {
          source_platform: detectedPlatform,
          is_cached_hit: true,
          userId: user.uid,
          userEmail: user.email || undefined,
        });

        toast.success("Ricetta aggiunta al tuo ricettario!", {
          description: "La ricetta era già presente nel nostro catalogo ed è stata aggiunta istantaneamente.",
        });
        
        setIsIngesting(false);
        return;
      }

      // Traccia avvio senza cache hit
      const startTime = Date.now();
      await trackEvent("recipe_import_initiated", {
        source_platform: detectedPlatform,
        is_cached_hit: false,
        userId: user.uid,
        userEmail: user.email || undefined,
      });

      if (detectedPlatform !== "web") {
        const tokens = profile?.tokens ?? 10;
        if (tokens <= 0) {
          setError("NO_TOKENS");
          setStep("failed");
          setIsIngesting(false);
          setIsDrawerOpen(true);
          toast.error("Importazione fallita.");
          
          await trackEvent("recipe_import_failed", {
            source_platform: detectedPlatform,
            error_type: "NO_TOKENS",
            userId: user.uid,
            userEmail: user.email || undefined,
          });
          return;
        }
      }

      // 3. Esegue la chiamata all'API per lo streaming SSE
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, userId: user.uid, userEmail: user.email || null }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        const errType = errJson.error || "Impossibile avviare l'importazione.";
        setError(errType);
        setStep("failed");
        setIsIngesting(false);
        setIsDrawerOpen(true);
        toast.error("Importazione fallita.");

        await trackEvent("recipe_import_failed", {
          source_platform: detectedPlatform,
          error_type: errType,
          userId: user.uid,
          userEmail: user.email || undefined,
        });
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        setError("Impossibile leggere lo stream di risposta.");
        setStep("failed");
        setIsIngesting(false);
        setIsDrawerOpen(true);
        toast.error("Importazione fallita.");

        await trackEvent("recipe_import_failed", {
          source_platform: detectedPlatform,
          error_type: "STREAM_READ_ERROR",
          userId: user.uid,
          userEmail: user.email || undefined,
        });
        return;
      }

      let currentStep: IngestStep = "scraping";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n");
            let eventName = "";
            let dataStr = "";

            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventName = line.replace("event:", "").trim();
              } else if (line.startsWith("data:")) {
                dataStr = line.replace("data:", "").trim();
              }
            }

            if (eventName && dataStr) {
              const data = JSON.parse(dataStr);

              if (eventName === "status") {
                const nextStep = data.step as IngestStep;
                setStep(nextStep);
                currentStep = nextStep;
                setProgress(data.progress);
              } else if (eventName === "success") {
                const { recipe, recipeId: newRecipeId, generationId } = data;
                setStep("saving");
                currentStep = "saving";
                setProgress(95);

                // 4. Salva la ricetta globale in /recipes/{recipeId} (lato client)
                const db = getFirebaseDb();
                const recipeDoc = {
                  sourceUrl: targetUrl,
                  sourcePlatform: detectedPlatform,
                  title: recipe.title,
                  sourceLanguage: recipe.sourceLanguage || "it",
                  servings: recipe.servings,
                  ingredients: recipe.ingredients,
                  instructions: recipe.instructions,
                  imageUrl: recipe.imageUrl || null,
                  prepTimeMinutes: recipe.prepTimeMinutes,
                  category: recipe.category || "other",
                  kcal: recipe.kcal !== undefined && recipe.kcal !== null ? recipe.kcal : null,
                  proteins: recipe.proteins !== undefined && recipe.proteins !== null ? recipe.proteins : null,
                  carbs: recipe.carbs !== undefined && recipe.carbs !== null ? recipe.carbs : null,
                  fats: recipe.fats !== undefined && recipe.fats !== null ? recipe.fats : null,
                  fiber: recipe.fiber !== undefined && recipe.fiber !== null ? recipe.fiber : null,
                  sugar: recipe.sugar !== undefined && recipe.sugar !== null ? recipe.sugar : null,
                  nutritionalRating: recipe.nutritionalRating || null,
                  nutritionalAssessment: recipe.nutritionalAssessment || null,
                  createdAt: serverTimestamp(),
                  createdBy: user.uid,
                  creatorUsername: recipe.creatorUsername || null,
                  creatorFullName: recipe.creatorFullName || null,
                  creatorId: recipe.creatorId || null,
                };

                await setDoc(doc(db, "recipes", newRecipeId), recipeDoc);

                // 5. Aggiunge al ricettario personale
                const { addToUserRecipes: addFn } = await import("@/lib/firestore/recipes");
                await addFn(user.uid, newRecipeId);

                // 6. Invalida cache QueryClient
                const { queryClient } = await import("@/lib/query-client");
                const { recipeKeys } = await import("@/hooks/useRecipes");
                queryClient.invalidateQueries({ queryKey: recipeKeys.all(user.uid) });
                queryClient.invalidateQueries({ queryKey: recipeKeys.detail(user.uid, newRecipeId) });

                // 7. Detrae 1 token all'utente (solo se non è web)
                if (detectedPlatform !== "web") {
                  const userRef = doc(db, "users", user.uid);
                  await updateDoc(userRef, {
                    tokens: increment(-1),
                    updatedAt: new Date().toISOString(),
                  });
                }

                // Fine successo
                setRecipeId(newRecipeId);
                setRecipeResult(recipe);
                setStep("completed");
                currentStep = "completed";
                setProgress(100);
                setIsIngesting(false);
                setIsDrawerOpen(true); // Forza la riapertura del drawer per mostrare il successo

                // Traccia successo
                const durationSeconds = Math.round((Date.now() - startTime) / 1000);
                await trackEvent("recipe_import_completed", {
                  source_platform: detectedPlatform,
                  is_cached_hit: false,
                  duration_seconds: durationSeconds,
                  generation_id: generationId || null,
                  userId: user.uid,
                  userEmail: user.email || undefined,
                });

                toast.success("Ricetta importata con successo!");
              } else if (eventName === "error") {
                const errType = data.error || "Errore durante l'elaborazione.";
                setError(errType);
                setStep("failed");
                currentStep = "failed";
                setIsIngesting(false);
                setIsDrawerOpen(true);
                toast.error("Importazione fallita.");

                await trackEvent("recipe_import_failed", {
                  source_platform: detectedPlatform,
                  error_type: errType,
                  userId: user.uid,
                  userEmail: user.email || undefined,
                });

                reader.cancel();
                return;
              }
            }
          }
        }

        // Se usciamo dal loop e lo step non è completed o failed, significa che lo stream
        // si è chiuso in modo anomalo senza inviare un evento di successo o errore.
        if (currentStep !== "completed" && currentStep !== "failed") {
          throw new Error("La connessione con il server si è interrotta inaspettatamente.");
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err: any) {
      console.error("Errore durante l'ingest:", err);
      const errType = err.message || "Errore imprevisto durante l'elaborazione";
      setError(errType);
      setStep("failed");
      setIsIngesting(false);
      setIsDrawerOpen(true); // Forza la riapertura del drawer per mostrare l'errore
      toast.error("Importazione fallita.");

      await trackEvent("recipe_import_failed", {
        source_platform: detectedPlatform,
        error_type: errType,
        userId: user.uid,
        userEmail: user.email || undefined,
      });
    }
  };

  return (
    <IngestContext.Provider
      value={{
        isIngesting,
        isDrawerOpen,
        url,
        step,
        progress,
        error,
        recipeResult,
        recipeId,
        startIngest,
        openImportDrawer,
        closeImportDrawer,
        resetIngest,
      }}
    >
      {children}
      {/* Drawer montato globalmente all'interno del provider */}
      <ImportDrawer />
    </IngestContext.Provider>
  );
}

export function useIngest() {
  const context = useContext(IngestContext);
  if (context === undefined) {
    throw new Error("useIngest deve essere usato all'interno di un IngestProvider");
  }
  return context;
}
