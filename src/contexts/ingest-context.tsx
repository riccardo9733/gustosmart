"use client";

import React, { createContext, useContext, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile } from "@/store/userSlice";
import { useAddToUserRecipes } from "@/hooks/useRecipes";
import { doc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { identifyPlatform } from "@/lib/scraping/detector";
import { cleanUrl } from "@/lib/scraping/urlCleaner";
import { toast } from "sonner";
import { ImportDrawer } from "@/components/import-drawer";
import { trackEvent } from "@/lib/analytics";

export type IngestStep = "idle" | "scraping" | "extracting" | "saving" | "completed" | "failed" | "needsCommentSearch";

interface CommentSearchData {
  caption: string;
  transcript: string;
  b2ImageUrl: string | null;
  finalUrl: string;
  recipeId: string;
  creatorUsername: string | null;
  creatorFullName: string | null;
  creatorId: string | null;
}

interface IngestContextType {
  isIngesting: boolean;
  isDrawerOpen: boolean;
  url: string;
  step: IngestStep;
  progress: number;
  error: string | null;
  recipeResult: any | null;
  recipeId: string | null;
  commentSearchData: CommentSearchData | null;
  startIngest: (targetUrl: string) => Promise<void>;
  startImageIngest: (imageFile: File) => Promise<void>;
  startCommentSearch: () => Promise<void>;
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
  const [commentSearchData, setCommentSearchData] = useState<CommentSearchData | null>(null);

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
    setCommentSearchData(null);
  };

  const openImportDrawer = () => setIsDrawerOpen(true);
  const closeImportDrawer = () => {
    setIsDrawerOpen(false);
    // Se l'ingestione è terminata (con successo o errore), resetta lo stato all'idle
    // dopo l'animazione di chiusura per evitare sfarfallii visivi.
    if (step === "completed" || step === "failed" || step === "needsCommentSearch") {
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

    const cleanedUrl = cleanUrl(targetUrl);

    // Reset pre-esistenza
    resetIngest();
    setUrl(cleanedUrl);
    setIsIngesting(true);
    setStep("scraping");
    setProgress(5);
    setIsDrawerOpen(true); // Apre il drawer per mostrare il progresso iniziale

    // Rileva piattaforma prima delle verifiche
    let detectedPlatform = "web";
    try {
      detectedPlatform = identifyPlatform(cleanedUrl);
    } catch (e) {
      console.error("Errore identificazione piattaforma:", e);
    }

    try {
      // 1. Check client-side: esiste già una ricetta globale con questo URL?
      const { checkRecipeExistsByUrl } = await import("@/lib/firestore/recipes");
      const existingRecipeId = await checkRecipeExistsByUrl(cleanedUrl);

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
      const supabaseFunctionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || "http://127.0.0.1:54321/functions/v1";
      const response = await fetch(`${supabaseFunctionsUrl}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanedUrl, userId: user.uid, userEmail: user.email || null }),
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

      let currentStep: string = "scraping";

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
                const { recipe, recipeId: newRecipeId, generationId, scrapecreatorsCreditsRemaining, scrapecreatorsCreditsUsed } = data;
                setStep("saving");
                currentStep = "saving";
                setProgress(95);

                // 4. Salva la ricetta globale in /recipes/{recipeId} (lato client)
                const db = getFirebaseDb();
                const recipeDoc = {
                  sourceUrl: recipe.sourceUrl || cleanedUrl,
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
                  isGlutenFree: recipe.isGlutenFree !== undefined && recipe.isGlutenFree !== null ? recipe.isGlutenFree : null,
                  isVegan: recipe.isVegan !== undefined && recipe.isVegan !== null ? recipe.isVegan : null,
                  isVegetarian: recipe.isVegetarian !== undefined && recipe.isVegetarian !== null ? recipe.isVegetarian : null,
                  isLactoseFree: recipe.isLactoseFree !== undefined && recipe.isLactoseFree !== null ? recipe.isLactoseFree : null,
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
                  scrapecreators_credits_remaining: scrapecreatorsCreditsRemaining !== undefined ? scrapecreatorsCreditsRemaining : null,
                  scrapecreators_credits_used: scrapecreatorsCreditsUsed !== undefined ? scrapecreatorsCreditsUsed : (detectedPlatform === "web" ? 0 : 1),
                  userId: user.uid,
                  userEmail: user.email || undefined,
                });

                toast.success("Ricetta importata con successo!");
              } else if (eventName === "needsCommentSearch") {
                // Instagram: la ricetta non è stata trovata nel video/caption, proponi ricerca nei commenti
                console.log("[IngestContext] Ricevuto evento needsCommentSearch");
                setCommentSearchData({
                  caption: data.caption || "",
                  transcript: data.transcript || "",
                  b2ImageUrl: data.b2ImageUrl || null,
                  finalUrl: data.finalUrl || "",
                  recipeId: data.recipeId || "",
                  creatorUsername: data.creatorUsername || null,
                  creatorFullName: data.creatorFullName || null,
                  creatorId: data.creatorId || null,
                });
                setStep("needsCommentSearch");
                currentStep = "needsCommentSearch";
                setIsIngesting(false);
                setIsDrawerOpen(true);

                await trackEvent("recipe_comment_search_prompted", {
                  source_platform: detectedPlatform,
                  userId: user.uid,
                  userEmail: user.email || undefined,
                });

                reader.cancel();
                return;
              }
            }
          }
        }

        // Se usciamo dal loop e lo step non è completed, failed o needsCommentSearch,
        // significa che lo stream si è chiuso in modo anomalo.
        if (currentStep !== "completed" && currentStep !== "failed" && currentStep !== "needsCommentSearch") {
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

  /**
   * Ricerca approfondita nei commenti Instagram.
   * Viene invocata dall'utente dopo che il primo ingest ha restituito needsCommentSearch.
   */
  const startCommentSearch = async () => {
    if (!user || !commentSearchData) return;

    const tokens = profile?.tokens ?? 10;
    if (tokens <= 0) {
      setError("NO_TOKENS");
      setStep("failed");
      setIsIngesting(false);
      setIsDrawerOpen(true);
      toast.error("Token esauriti.");
      return;
    }

    setIsIngesting(true);
    setStep("scraping");
    setProgress(10);
    setError(null);

    const startTime = Date.now();

    await trackEvent("recipe_comment_search_accepted", {
      source_platform: "instagram",
      userId: user.uid,
      userEmail: user.email || undefined,
    });

    try {
      const supabaseFunctionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || "http://127.0.0.1:54321/functions/v1";
      const response = await fetch(`${supabaseFunctionsUrl}/ingest-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: commentSearchData.finalUrl,
          userId: user.uid,
          userEmail: user.email || null,
          caption: commentSearchData.caption,
          transcript: commentSearchData.transcript,
          b2ImageUrl: commentSearchData.b2ImageUrl,
          recipeId: commentSearchData.recipeId,
          creatorUsername: commentSearchData.creatorUsername,
          creatorFullName: commentSearchData.creatorFullName,
          creatorId: commentSearchData.creatorId,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Errore nella ricerca commenti.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        throw new Error("Impossibile leggere lo stream di risposta.");
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
                const { recipe, recipeId: newRecipeId, generationId, scrapecreatorsCreditsRemaining, scrapecreatorsCreditsUsed } = data;
                setStep("saving");
                currentStep = "saving";
                setProgress(95);

                const db = getFirebaseDb();
                const recipeDoc = {
                  sourceUrl: recipe.sourceUrl || commentSearchData.finalUrl,
                  sourcePlatform: "instagram",
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
                  isGlutenFree: recipe.isGlutenFree !== undefined && recipe.isGlutenFree !== null ? recipe.isGlutenFree : null,
                  isVegan: recipe.isVegan !== undefined && recipe.isVegan !== null ? recipe.isVegan : null,
                  isVegetarian: recipe.isVegetarian !== undefined && recipe.isVegetarian !== null ? recipe.isVegetarian : null,
                  isLactoseFree: recipe.isLactoseFree !== undefined && recipe.isLactoseFree !== null ? recipe.isLactoseFree : null,
                  createdAt: serverTimestamp(),
                  createdBy: user.uid,
                  creatorUsername: recipe.creatorUsername || commentSearchData.creatorUsername || null,
                  creatorFullName: recipe.creatorFullName || commentSearchData.creatorFullName || null,
                  creatorId: recipe.creatorId || commentSearchData.creatorId || null,
                };

                await setDoc(doc(db, "recipes", newRecipeId), recipeDoc);

                const { addToUserRecipes: addFn } = await import("@/lib/firestore/recipes");
                await addFn(user.uid, newRecipeId);

                const { queryClient } = await import("@/lib/query-client");
                const { recipeKeys } = await import("@/hooks/useRecipes");
                queryClient.invalidateQueries({ queryKey: recipeKeys.all(user.uid) });
                queryClient.invalidateQueries({ queryKey: recipeKeys.detail(user.uid, newRecipeId) });

                // Detrae 2 token: 1 per lo scrape iniziale + 1 per la ricerca commenti
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                  tokens: increment(-2),
                  updatedAt: new Date().toISOString(),
                });

                setRecipeId(newRecipeId);
                setRecipeResult(recipe);
                setStep("completed");
                currentStep = "completed";
                setProgress(100);
                setIsIngesting(false);
                setCommentSearchData(null);
                setIsDrawerOpen(true);

                const durationSeconds = Math.round((Date.now() - startTime) / 1000);
                await trackEvent("recipe_import_completed", {
                  source_platform: "instagram",
                  is_cached_hit: false,
                  is_comment_search: true,
                  duration_seconds: durationSeconds,
                  generation_id: generationId || null,
                  scrapecreators_credits_remaining: scrapecreatorsCreditsRemaining !== undefined ? scrapecreatorsCreditsRemaining : null,
                  scrapecreators_credits_used: scrapecreatorsCreditsUsed !== undefined ? scrapecreatorsCreditsUsed : 1,
                  userId: user.uid,
                  userEmail: user.email || undefined,
                });

                toast.success("Ricetta importata con successo!");
              } else if (eventName === "error") {
                const errType = data.error || "Errore durante la ricerca nei commenti.";
                setError(errType);
                setStep("failed");
                currentStep = "failed";
                setIsIngesting(false);
                setCommentSearchData(null);
                setIsDrawerOpen(true);

                // Detrae 1 token per lo scrape iniziale (il retry ha fallito)
                try {
                  const db = getFirebaseDb();
                  const userRef = doc(db, "users", user.uid);
                  await updateDoc(userRef, {
                    tokens: increment(-1),
                    updatedAt: new Date().toISOString(),
                  });
                } catch (tokenErr) {
                  console.error("Errore detrazione token post-fallimento:", tokenErr);
                }

                toast.error("Importazione fallita.");

                await trackEvent("recipe_import_failed", {
                  source_platform: "instagram",
                  error_type: errType,
                  is_comment_search: true,
                  userId: user.uid,
                  userEmail: user.email || undefined,
                });

                reader.cancel();
                return;
              }
            }
          }
        }

        if (currentStep !== "completed" && currentStep !== "failed") {
          throw new Error("La connessione con il server si è interrotta inaspettatamente.");
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err: any) {
      console.error("Errore durante la ricerca nei commenti:", err);
      const errType = err.message || "Errore imprevisto durante la ricerca nei commenti";
      setError(errType);
      setStep("failed");
      setIsIngesting(false);
      setCommentSearchData(null);
      setIsDrawerOpen(true);
      toast.error("Importazione fallita.");

      // Detrae 1 token per lo scrape iniziale
      try {
        const db = getFirebaseDb();
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          tokens: increment(-1),
          updatedAt: new Date().toISOString(),
        });
      } catch (tokenErr) {
        console.error("Errore detrazione token post-fallimento:", tokenErr);
      }

      await trackEvent("recipe_import_failed", {
        source_platform: "instagram",
        error_type: errType,
        is_comment_search: true,
        userId: user.uid,
        userEmail: user.email || undefined,
      });
    }
  };

  const compressImageFile = (file: File, maxWidth = 1560, maxHeight = 1560, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const startImageIngest = async (imageFile: File) => {
    if (!user) {
      toast.error("Utente non autenticato.");
      return;
    }

    resetIngest();
    setUrl(imageFile.name);
    setIsIngesting(true);
    setStep("scraping");
    setProgress(10);
    setIsDrawerOpen(true);

    await trackEvent("recipe_import_initiated", {
      source_platform: "image",
      is_cached_hit: false,
      userId: user.uid,
      userEmail: user.email || undefined,
    });

    try {
      // Compressione client-side per evitare di superare il limite di payload dell'API Gateway
      const base64DataUrl = await compressImageFile(imageFile);

      setStep("extracting");
      setProgress(40);

      const supabaseFunctionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || "http://127.0.0.1:54321/functions/v1";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (supabaseAnonKey) {
        headers["apikey"] = supabaseAnonKey;
        headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
      }

      const response = await fetch(`${supabaseFunctionsUrl}/ingest-image`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          imageBase64: base64DataUrl,
          userId: user.uid,
          userEmail: user.email || null,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errType = errJson.error || "Impossibile elaborare l'immagine della ricetta.";
        setError(errType);
        setStep("failed");
        setIsIngesting(false);
        setIsDrawerOpen(true);
        toast.error("Importazione immagine fallita.");

        await trackEvent("recipe_import_failed", {
          source_platform: "image",
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
          source_platform: "image",
          error_type: "READ_STREAM_ERROR",
          userId: user.uid,
          userEmail: user.email || undefined,
        });
        return;
      }

      let currentStep: string = "extracting";

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
                const { recipe, recipeId: newRecipeId } = data;
                setStep("saving");
                currentStep = "saving";
                setProgress(95);

                // Salva la ricetta su Firestore dal client browser
                const db = getFirebaseDb();
                const recipeDoc = {
                  ...recipe,
                  createdAt: serverTimestamp(),
                  createdBy: user.uid,
                };
                await setDoc(doc(db, "recipes", newRecipeId), recipeDoc);

                // Aggiunge la ricetta al ricettario personale dell'utente
                await addToUserRecipes(newRecipeId);

                await trackEvent("recipe_import_completed", {
                  source_platform: "image",
                  is_cached_hit: false,
                  userId: user.uid,
                  userEmail: user.email || undefined,
                });

                const { queryClient } = await import("@/lib/query-client");
                const { recipeKeys } = await import("@/hooks/useRecipes");
                queryClient.invalidateQueries({ queryKey: recipeKeys.all(user.uid) });

                setRecipeResult(recipe);
                setRecipeId(newRecipeId);
                setStep("completed");
                currentStep = "completed";
                setProgress(100);
                setIsIngesting(false);

                toast.success("Ricetta privata importata con successo!");
                return;
              } else if (eventName === "error") {
                const errMsg = data.error || "Errore durante l'elaborazione dell'immagine";
                setError(errMsg);
                setStep("failed");
                currentStep = "failed";
                setIsIngesting(false);
                toast.error(errMsg);

                await trackEvent("recipe_import_failed", {
                  source_platform: "image",
                  error_type: errMsg,
                  userId: user.uid,
                  userEmail: user.email || undefined,
                });
                return;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err: any) {
      console.error("Errore ingest-image:", err);
      const errMsg = err.message || "Errore imprevisto durante l'analisi dell'immagine.";
      setError(errMsg);
      setStep("failed");
      setIsIngesting(false);
      toast.error(errMsg);

      await trackEvent("recipe_import_failed", {
        source_platform: "image",
        error_type: errMsg,
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
        commentSearchData,
        startIngest,
        startImageIngest,
        startCommentSearch,
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
