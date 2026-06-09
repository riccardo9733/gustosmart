"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { useRecipe, useRemoveFromUserRecipes, useRecipes, useAddToUserRecipes } from "@/hooks/useRecipes";
import { useShoppingList, useUpdateShoppingList } from "@/hooks/useShoppingList";
import { recalculateShoppingItems } from "@/lib/firestore/shopping-list";
import {
  ArrowLeft,
  Clock,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  ExternalLink,
  Flame,
  Loader2,
  Globe,
  Bookmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile } from "@/store/userSlice";
import { convertToImperial } from "@/lib/units";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const YouTubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

export default function RecipeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const profile = useAppSelector(selectUserProfile);
  const measurementSystem = profile?.preferences?.measurementSystem || "metric";

  const t = useTranslations("Details");
  const tRecipes = useTranslations("Recipes");
  const tShopping = useTranslations("Shopping");

  // TanStack Query: one-shot getDoc (no open WebSocket), 10-min staleTime
  const { data: recipe, isLoading: loading } = useRecipe(id);
  const { data: shoppingList } = useShoppingList();
  const { data: allRecipes = [] } = useRecipes();
  const updateShoppingList = useUpdateShoppingList();

  const [currentServings, setCurrentServings] = useState(2);

  // Cooking checklist state (temporary in-memory)
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const [displayData, setDisplayData] = useState<{
    title: string;
    ingredients: any[];
    instructions: string[];
    nutritionalAssessment?: string | null;
    isTranslated: boolean;
  } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const [scrollY, setScrollY] = useState(0);

  // Mutations
  const { mutateAsync: removeRecipe } = useRemoveFromUserRecipes();
  const { mutateAsync: addRecipe, isPending: addingRecipe } = useAddToUserRecipes();

  const isSaved = !!recipe?.addedAt;

  const isSelectedInShopping = shoppingList?.selectedRecipes.some(
    (r) => r.recipeId === id
  ) ?? false;

  const handleToggleShoppingList = () => {
    if (!shoppingList) return;

    let updatedRecipes = [...shoppingList.selectedRecipes];
    if (isSelectedInShopping) {
      updatedRecipes = updatedRecipes.filter((r) => r.recipeId !== id);
    } else {
      updatedRecipes.push({ recipeId: id, servings: currentServings });
    }

    // Ensure the current recipe is included in the list passed to recalculateShoppingItems,
    // in case allRecipes (useRecipes query) hasn't finished refetching yet.
    const recipesForCalculation = [...allRecipes];
    if (recipe && !recipesForCalculation.some((r) => r.id === recipe.id)) {
      recipesForCalculation.push(recipe);
    }

    const newItems = recalculateShoppingItems(updatedRecipes, shoppingList.items, recipesForCalculation);
    
    updateShoppingList.mutate({
      selectedRecipes: updatedRecipes,
      items: newItems,
    }, {
      onSuccess: () => {
        if (isSelectedInShopping) {
          toast.success(tShopping("removeFromShoppingSuccess"));
        } else {
          toast.success(tShopping("addToShoppingSuccess"));
        }
      },
      onError: (err) => {
        console.error("Errore aggiornamento spesa:", err);
        toast.error("Impossibile aggiornare la lista della spesa.");
      }
    });
  };

  // Update servings when recipe loads
  useEffect(() => {
    if (recipe) {
      setCurrentServings(recipe.servings || 2);
    }
  }, [recipe?.id]);

  // Parallax Scroll Listener
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Translation Sync & Fetch
  useEffect(() => {
    if (!recipe) return;

    const sourceLang = recipe.sourceLanguage || "it";
    const userLanguage = profile?.preferences?.language || "it";

    if (sourceLang === userLanguage) {
      setDisplayData({
        title: recipe.title,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        nutritionalAssessment: recipe.nutritionalAssessment || null,
        isTranslated: false
      });
      setIsTranslating(false);
    } else {
      const fetchTranslation = async () => {
        try {
          const db = getFirebaseDb();
          // Translations live on the GLOBAL recipe — shared across all users
          const translationRef = doc(db, "recipes", recipe.id, "translations", userLanguage);
          const transSnap = await getDoc(translationRef);

          if (transSnap.exists()) {
            const transData = transSnap.data();
            setDisplayData({
              title: transData.title,
              ingredients: transData.ingredients || [],
              instructions: transData.instructions || [],
              nutritionalAssessment: transData.nutritionalAssessment || null,
              isTranslated: true
            });
            setIsTranslating(false);
          } else {
            // Show original language while translating
            setDisplayData({
              title: recipe.title,
              ingredients: recipe.ingredients || [],
              instructions: recipe.instructions || [],
              nutritionalAssessment: recipe.nutritionalAssessment || null,
              isTranslated: false
            });

            setIsTranslating(true);
            const res = await fetch("/api/recipes/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: recipe.title,
                ingredients: recipe.ingredients || [],
                instructions: recipe.instructions || [],
                targetLanguage: userLanguage,
                nutritionalAssessment: recipe.nutritionalAssessment || null
              })
            });

            if (!res.ok) throw new Error("Errore chiamata API di traduzione");

            const resJson = await res.json();
            if (resJson.success && resJson.translation) {
              const translationDoc = {
                title: resJson.translation.title,
                ingredients: resJson.translation.ingredients || [],
                instructions: resJson.translation.instructions || [],
                nutritionalAssessment: resJson.translation.nutritionalAssessment || null,
                translatedAt: new Date().toISOString()
              };

              // Save translation on the GLOBAL recipe — accessible by all users
              await setDoc(translationRef, translationDoc);

              setDisplayData({
                title: resJson.translation.title,
                ingredients: resJson.translation.ingredients || [],
                instructions: resJson.translation.instructions || [],
                nutritionalAssessment: resJson.translation.nutritionalAssessment || null,
                isTranslated: true
              });
            } else {
              toast.error("Errore di traduzione. Visualizzazione in lingua originale.");
            }
            setIsTranslating(false);
          }
        } catch (error) {
          console.error("Errore traduzione:", error);
          setIsTranslating(false);
          if (recipe) {
            setDisplayData({
              title: recipe.title,
              ingredients: recipe.ingredients || [],
              instructions: recipe.instructions || [],
              nutritionalAssessment: recipe.nutritionalAssessment || null,
              isTranslated: false
            });
          }
        }
      };

      fetchTranslation();
    }
  }, [recipe?.id, profile?.preferences?.language]);

  const updateServings = (delta: number) => {
    const newVal = currentServings + delta;
    if (newVal < 1) return;
    setCurrentServings(newVal);

    // Se la ricetta è già in spesa, aggiorna le porzioni anche lì!
    if (isSelectedInShopping && shoppingList) {
      const updatedRecipes = shoppingList.selectedRecipes.map((r) => {
        if (r.recipeId === id) {
          return { ...r, servings: newVal };
        }
        return r;
      });
      
      // Ensure the current recipe is included in the list passed to recalculateShoppingItems
      const recipesForCalculation = [...allRecipes];
      if (recipe && !recipesForCalculation.some((r) => r.id === recipe.id)) {
        recipesForCalculation.push(recipe);
      }

      const newItems = recalculateShoppingItems(updatedRecipes, shoppingList.items, recipesForCalculation);
      updateShoppingList.mutate({
        selectedRecipes: updatedRecipes,
        items: newItems,
      });
    }
  };

  const handleDeleteRecipe = async () => {
    const toastId = toast.loading(t("removingRecipeProgress"));
    try {
      await removeRecipe(id);
      toast.success(t("recipeRemovedSuccess"), { id: toastId });
      router.push("/recipes");
    } catch (error) {
      console.error("Errore durante la rimozione:", error);
      toast.error(t("recipeRemoveFailed"), { id: toastId });
    }
  };

  const handleAddToRecipes = async () => {
    const toastId = toast.loading(t("addingRecipeProgress"));
    try {
      await addRecipe(id);
      toast.success(t("addToRecipesSuccess"), { id: toastId });
    } catch (error) {
      console.error("Errore durante l'aggiunta:", error);
      toast.error(t("addToRecipesFailed"), { id: toastId });
    }
  };

  const formatQuantity = (qty: number) => {
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "first_courses": return tRecipes("primi");
      case "second_courses": return tRecipes("secondi");
      case "desserts": return tRecipes("dolci");
      case "appetizers": return tRecipes("antipasti");
      case "sides": return tRecipes("contorni");
      case "single_dishes": return tRecipes("singleDishes");
      default: return tRecipes("other");
    }
  };

  // ----------------------------------------------------
  // RENDER LOADING / SKELETON
  // ----------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto pb-32 animate-in fade-in duration-500">
        <Skeleton className="w-full h-[40vh] rounded-[24px] bg-muted/20" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-2/3 bg-muted/20" />
          <Skeleton className="h-5 w-1/3 bg-muted/20" />
          <div className="flex gap-4">
            <Skeleton className="h-12 w-24 rounded-full bg-muted/20" />
            <Skeleton className="h-12 w-24 rounded-full bg-muted/20" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          <div className="lg:col-span-5 flex flex-col gap-4">
            <Skeleton className="h-8 w-1/2 bg-muted/20" />
            <Skeleton className="h-48 w-full rounded-[24px] bg-muted/20" />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-4">
            <Skeleton className="h-8 w-1/2 bg-muted/20" />
            <Skeleton className="h-64 w-full rounded-[24px] bg-muted/20" />
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ChefHat className="w-16 h-16 text-primary/20 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">{t("recipeNotFound")}</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {t("recipeNotFoundDesc")}
        </p>
        <Button onClick={() => router.push("/recipes")} variant="outline" className="rounded-full">
          {t("backToRecipes")}
        </Button>
      </div>
    );
  }

  const baseServings = recipe.servings || 2;
  const imageSrc = recipe.imageUrl
    ? `/api/proxy-image?url=${encodeURIComponent(recipe.imageUrl)}`
    : null;

  const displayedTitle = displayData?.title || recipe.title || "";
  const displayedIngredients = displayData?.ingredients || recipe.ingredients || [];
  const displayedInstructions = displayData?.instructions || recipe.instructions || [];

  const platform = recipe.sourcePlatform?.toLowerCase() || "instagram";
  let bgClass = "bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 text-white shadow-pink-500/10";
  let SocialIcon: React.ComponentType<{ className?: string }> = InstagramIcon;
  let profileUrl = recipe.creatorUsername ? `https://www.instagram.com/${recipe.creatorUsername}` : "#";

  if (platform === "tiktok") {
    bgClass = "bg-black dark:bg-zinc-800 text-white shadow-zinc-950/20";
    SocialIcon = TikTokIcon;
    profileUrl = recipe.creatorUsername ? `https://www.tiktok.com/@${recipe.creatorUsername}` : "#";
  } else if (platform === "youtube") {
    bgClass = "bg-red-600 text-white shadow-red-600/10";
    SocialIcon = YouTubeIcon;
    profileUrl = recipe.creatorUsername ? `https://www.youtube.com/@${recipe.creatorUsername}` : "#";
  } else if (platform === "web") {
    bgClass = "bg-teal-600 text-white shadow-teal-600/10";
    SocialIcon = Globe;
    profileUrl = recipe.sourceUrl || "#";
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto pb-32 animate-in fade-in duration-500">

      {/* Hero Section */}
      <div className="relative overflow-hidden w-[calc(100%+3rem)] -mx-6 -mt-20 h-[50vh] md:h-[55vh] rounded-b-[40px] shadow-lg shadow-primary/5 bg-muted/10">
        {imageSrc ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-100 ease-out"
            style={{
              backgroundImage: `url(${imageSrc})`,
              transform: `translateY(${scrollY * 0.4}px)`,
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary/30">
            <ChefHat className="w-24 h-24 stroke-[1.2]" />
            <span className="font-heading text-sm mt-3 font-semibold tracking-wider uppercase">GustoSmart Recipe</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/25" />

        {/* Back Button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute top-24 left-6 z-40 rounded-full bg-background/60 backdrop-blur-md border-white/10 hover:bg-background/80 shadow-md text-primary active:scale-95 transition-all"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Remove from collection button */}
        {isSaved && (
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button
                variant="outline"
                size="icon"
                className="absolute top-24 right-6 z-40 rounded-full bg-background/60 backdrop-blur-md border-white/10 hover:bg-background/80 shadow-md text-destructive active:scale-95 transition-all"
                aria-label={t("removeFromRecipes")}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            } />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("removeDialogTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("removeDialogDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRecipe} className="bg-destructive hover:bg-destructive/90 text-white">
                  {t("remove")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Main Content */}
      <main className="relative -mt-24 px-2">

        {/* Header Glass Card */}
        <div className="glass-panel rounded-[32px] p-6 md:p-8 shadow-2xl shadow-primary/5 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  {recipe.category && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold border-primary/20 text-primary">
                      {getCategoryLabel(recipe.category)}
                    </Badge>
                  )}
                  {recipe.kcal && (
                    <Drawer>
                      <DrawerTrigger asChild>
                        <Badge variant="secondary" className="bg-primary/10 hover:bg-primary/15 transition-all text-primary rounded-full px-3 py-1 font-semibold flex items-center gap-1 cursor-pointer select-none active:scale-95 duration-100">
                          <Flame className="w-3.5 h-3.5 fill-primary animate-pulse" />
                          {t("kcalCount", { count: recipe.kcal })}
                        </Badge>
                      </DrawerTrigger>
                      <DrawerContent className="max-w-md mx-auto rounded-t-[32px] p-6 pb-8 border-t border-border bg-background/95 backdrop-blur-md">
                        <DrawerHeader className="p-0 mb-4 text-left">
                          <DrawerTitle className="font-heading text-xl font-bold flex items-center gap-2">
                            <Flame className="w-5 h-5 text-primary fill-primary" />
                            {t("nutritionTitle")}
                          </DrawerTitle>
                          <DrawerDescription className="text-xs text-muted-foreground">
                            {t("nutritionSub")}
                          </DrawerDescription>
                        </DrawerHeader>

                        {(() => {
                          const hasNutritionDetails = 
                            (recipe.proteins !== undefined && recipe.proteins !== null) ||
                            (recipe.carbs !== undefined && recipe.carbs !== null) ||
                            (recipe.fats !== undefined && recipe.fats !== null);

                          if (!hasNutritionDetails) {
                            return (
                              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                <div className="p-3 rounded-full bg-amber-500/10 text-amber-500 mb-3">
                                  <Flame className="w-6 h-6 fill-amber-500" />
                                </div>
                                <h4 className="font-heading font-semibold text-foreground mb-1">
                                  Dettagli non disponibili
                                </h4>
                                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                                  Questa ricetta è stata scansionata in precedenza o non ha sufficienti informazioni per stimare i macronutrienti. Le calorie stimate sono pari a <span className="font-bold text-primary">{recipe.kcal} kcal/100g</span>.
                                </p>
                                <DrawerClose asChild>
                                  <Button className="mt-6 rounded-full w-full">Chiudi</Button>
                                </DrawerClose>
                              </div>
                            );
                          }

                          const pGrams = recipe.proteins ?? 0;
                          const cGrams = recipe.carbs ?? 0;
                          const fGrams = recipe.fats ?? 0;
                          const totalGrams = pGrams + cGrams + fGrams;

                          const pPct = totalGrams > 0 ? Math.round((pGrams / totalGrams) * 100) : 0;
                          const cPct = totalGrams > 0 ? Math.round((cGrams / totalGrams) * 100) : 0;
                          const fPct = totalGrams > 0 ? Math.max(0, 100 - pPct - cPct) : 0;

                          const ratingColors: Record<string, string> = {
                            A: "bg-emerald-600 text-white shadow-emerald-500/30",
                            B: "bg-green-500 text-white shadow-green-400/30",
                            C: "bg-amber-400 text-black shadow-amber-300/30",
                            D: "bg-orange-500 text-white shadow-orange-400/30",
                            E: "bg-rose-600 text-white shadow-rose-500/30",
                          };

                          const ratingLabels = ['A', 'B', 'C', 'D', 'E'];

                          return (
                            <div className="flex flex-col">
                              {/* Nutri-Score Rating Row */}
                              {recipe.nutritionalRating && (
                                <div className="flex flex-col gap-2 items-center justify-center p-3 rounded-2xl bg-muted/20 border border-border/30">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {t("nutritionRating")}
                                  </span>
                                  <div className="flex gap-1 items-center">
                                    {ratingLabels.map((label) => {
                                      const isActive = recipe.nutritionalRating?.toUpperCase() === label;
                                      return (
                                        <div
                                          key={label}
                                          className={`w-8 h-8 rounded-lg font-heading text-base font-black flex items-center justify-center transition-all duration-300 ${
                                            isActive
                                              ? `${ratingColors[label]} scale-110 ring-2 ring-primary/20 shadow-md`
                                              : "bg-muted/40 text-muted-foreground/30 opacity-40 scale-95"
                                          }`}
                                        >
                                          {label}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* AI Assessment Comment */}
                              {displayData?.nutritionalAssessment && (
                                <div className="bg-primary/5 dark:bg-white/5 border border-primary/10 rounded-2xl p-4 text-xs leading-relaxed text-muted-foreground flex gap-2.5 items-start mt-4 shadow-sm">
                                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  <p>{displayData.nutritionalAssessment}</p>
                                </div>
                              )}

                              {/* Macro Chart Title & Graph */}
                              <div className="mt-5 flex flex-col gap-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  {t("macroDistribution")}
                                </span>
                                
                                {/* CSS flex-based horizontal bar */}
                                <div className="w-full h-4 rounded-full overflow-hidden flex bg-muted/30 border border-border/10">
                                  {cPct > 0 && (
                                    <div
                                      style={{ width: `${cPct}%` }}
                                      className="bg-amber-400 h-full transition-all"
                                      title={`${t("carbsLabel")}: ${cPct}%`}
                                    />
                                  )}
                                  {pPct > 0 && (
                                    <div
                                      style={{ width: `${pPct}%` }}
                                      className="bg-emerald-500 h-full transition-all"
                                      title={`${t("proteinsLabel")}: ${pPct}%`}
                                    />
                                  )}
                                  {fPct > 0 && (
                                    <div
                                      style={{ width: `${fPct}%` }}
                                      className="bg-rose-500 h-full transition-all"
                                      title={`${t("fatsLabel")}: ${fPct}%`}
                                    />
                                  )}
                                </div>

                                {/* Graph Legenda */}
                                <div className="flex justify-between items-center text-xs mt-1.5 px-1 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                    <span className="text-muted-foreground">{t("carbsLabel")}</span>
                                    <span className="font-bold text-foreground">{cPct}%</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                    <span className="text-muted-foreground">{t("fatsLabel")}</span>
                                    <span className="font-bold text-foreground">{fPct}%</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-muted-foreground">{t("proteinsLabel")}</span>
                                    <span className="font-bold text-foreground">{pPct}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Detailed Table */}
                              <div className="border border-border/40 rounded-2xl overflow-hidden mt-5 bg-muted/5">
                                <div className="grid grid-cols-2 p-3 border-b border-border/40 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  <span>Nutriente (per 100g)</span>
                                  <span className="text-right">Valore</span>
                                </div>
                                
                                <div className="grid grid-cols-2 p-3 border-b border-border/20 text-xs items-center">
                                  <span className="font-semibold flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                    {t("carbsLabel")}
                                  </span>
                                  <span className="text-right font-bold">{recipe.carbs ?? 0} g</span>
                                </div>
                                
                                {recipe.sugar !== null && recipe.sugar !== undefined && (
                                  <div className="grid grid-cols-2 py-2 px-5 border-b border-border/20 text-[11px] text-muted-foreground items-center bg-muted/5">
                                    <span>— {t("sugarLabel")}</span>
                                    <span className="text-right font-semibold">{recipe.sugar} g</span>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 p-3 border-b border-border/20 text-xs items-center">
                                  <span className="font-semibold flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                    {t("fatsLabel")}
                                  </span>
                                  <span className="text-right font-bold">{recipe.fats ?? 0} g</span>
                                </div>

                                <div className="grid grid-cols-2 p-3 border-b border-border/20 text-xs items-center">
                                  <span className="font-semibold flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    {t("proteinsLabel")}
                                  </span>
                                  <span className="text-right font-bold">{recipe.proteins ?? 0} g</span>
                                </div>

                                {recipe.fiber !== null && recipe.fiber !== undefined && (
                                  <div className="grid grid-cols-2 p-3 text-xs items-center">
                                    <span className="font-semibold flex items-center gap-2 text-muted-foreground">
                                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                      {t("fiberLabel")}
                                    </span>
                                    <span className="text-right font-bold text-muted-foreground">{recipe.fiber} g</span>
                                  </div>
                                )}
                              </div>

                              <DrawerClose asChild>
                                <Button variant="outline" className="mt-5 rounded-full">
                                  Chiudi
                                </Button>
                              </DrawerClose>
                            </div>
                          );
                        })()}
                      </DrawerContent>
                    </Drawer>
                  )}
                  {recipe.prepTimeMinutes && (
                    <Badge variant="secondary" className="bg-secondary-container text-on-secondary-container rounded-full px-3 py-1 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t("minutesCount", { count: recipe.prepTimeMinutes })}
                    </Badge>
                  )}
                  {recipe.sourceUrl && (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline ml-2"
                    >
                      {t("originalSource")}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {displayData?.isTranslated && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold border-secondary/20 text-secondary flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-secondary fill-secondary" />
                      {t("translated")}
                    </Badge>
                  )}
                </div>

                {isTranslating && (
                  <div className="flex items-center gap-2.5 mb-3 p-3 rounded-xl bg-primary/10 text-primary border border-primary/15 animate-pulse text-xs font-semibold max-w-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t("translating")}</span>
                  </div>
                )}

                <h2 className="font-heading text-3xl font-bold text-on-surface mb-2">
                  {displayedTitle}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("smartOptimized")}
                </p>
              </div>

              {/* Servings Counter & Shopping List Toggle */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-3 shrink-0 self-center md:self-start w-full sm:w-auto md:w-auto">
                <div className="bg-surface-container rounded-full p-2 flex items-center justify-between gap-4 shadow-inner border border-white/5 shrink-0 h-14">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 transition-all shrink-0"
                    onClick={() => updateServings(-1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col items-center min-w-[48px]">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("servings")}</span>
                    <span className="font-heading text-xl font-bold text-primary leading-none mt-0.5">
                      {currentServings}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 transition-all shrink-0"
                    onClick={() => updateServings(1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {isSaved ? (
                  <Button
                    onClick={handleToggleShoppingList}
                    variant={isSelectedInShopping ? "secondary" : "default"}
                    className="rounded-full w-full flex items-center justify-center gap-2 h-14 px-6 active:scale-95 transition-transform"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>
                      {isSelectedInShopping ? tShopping("inShoppingList") : tShopping("addToShopping")}
                    </span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleAddToRecipes}
                    disabled={addingRecipe}
                    variant="default"
                    className="rounded-full w-full flex items-center justify-center gap-2 h-14 px-6 active:scale-95 transition-transform bg-primary hover:bg-primary/90 text-white"
                  >
                    {addingRecipe ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                    <span>{t("addToRecipes")}</span>
                  </Button>
                )}
              </div>
            </div>
        </div>

        {/* Dynamic Lists Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Ingredients Section */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold text-on-surface flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                {t("ingredientsTitle")}
              </h3>
            </div>

            <div className="glass-panel rounded-[24px] p-6">
              <div className="flex flex-col gap-4">
                {displayedIngredients && displayedIngredients.length > 0 ? (
                  displayedIngredients.map((ing: any, idx: number) => {
                    const baseQty = ing.quantity;
                    let calculatedQty = baseQty !== null
                      ? baseQty * (currentServings / baseServings)
                      : null;

                    let displayedUnit = ing.unit || "";

                    if (calculatedQty !== null && measurementSystem === "imperial" && displayedUnit) {
                      const converted = convertToImperial(calculatedQty, displayedUnit);
                      calculatedQty = converted.quantity;
                      displayedUnit = converted.unit;
                    }

                    const isChecked = !!checkedIngredients[idx];

                    return (
                      <label
                        key={idx}
                        className="flex items-center gap-3 cursor-pointer group select-none py-1"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setCheckedIngredients(prev => ({
                              ...prev,
                              [idx]: !!checked
                            }));
                          }}
                        />
                        <span className={`text-sm text-foreground transition-all duration-200 ${
                          isChecked ? "line-through opacity-60 text-muted-foreground" : "group-hover:text-primary"
                        }`}>
                          {calculatedQty !== null && (
                            <span className="font-bold text-primary mr-1">
                              {formatQuantity(calculatedQty)}
                            </span>
                          )}
                          {displayedUnit && displayedUnit !== "q.b." && (
                            <span className="text-muted-foreground mr-1">{displayedUnit}</span>
                          )}
                          <span>{ing.name}</span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground">{t("noIngredients")}</span>
                )}
              </div>
            </div>
          </section>

          {/* Instructions Section */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold text-on-surface flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                {t("instructionsTitle")}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                  {t("activeCooking")}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {displayedInstructions && displayedInstructions.length > 0 ? (
                displayedInstructions.map((step: string, idx: number) => {
                  const isChecked = !!completedSteps[idx];

                  return (
                    <div key={idx} className="group flex gap-4 items-start">
                      <div className="flex flex-col items-center shrink-0">
                        <button
                          onClick={() => {
                            setCompletedSteps(prev => ({
                              ...prev,
                              [idx]: !prev[idx]
                            }));
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md transition-all active:scale-90 ${
                            isChecked
                              ? "bg-secondary text-white shadow-secondary/20"
                              : "bg-primary text-white shadow-primary/20"
                          }`}
                        >
                          {idx + 1}
                        </button>
                        {idx < displayedInstructions.length - 1 && (
                          <div className="w-0.5 h-16 bg-border/40 mt-2" />
                        )}
                      </div>

                      <div className={`glass-panel rounded-[24px] p-6 flex-1 transition-all duration-300 hover:shadow-lg ${
                        isChecked ? "opacity-60 line-through text-muted-foreground bg-secondary/5" : ""
                      }`}>
                        <p className="text-sm text-on-surface leading-relaxed">
                          {step}
                        </p>
                        <label className="flex items-center gap-2 mt-4 text-xs font-bold text-secondary cursor-pointer select-none">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              setCompletedSteps(prev => ({
                                ...prev,
                                [idx]: !!checked
                              }));
                            }}
                          />
                          <span>{t("stepCompleted")}</span>
                        </label>
                      </div>
                    </div>
                  );
                })
              ) : (
                <span className="text-sm text-muted-foreground">{t("noInstructions")}</span>
              )}
            </div>
          </section>

        </div>

        {/* Creator Attribution Section */}
        {(recipe.creatorUsername || (platform === "web" && recipe.creatorFullName)) && (
          <Card className="rounded-[24px] p-6 mt-8 border border-primary/10 bg-primary/5 dark:bg-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl shadow-primary/5 animate-in fade-in duration-300 min-w-0">
            <div className="flex-1 flex gap-4 items-start min-w-0 w-full">
              <div className={`p-2.5 rounded-2xl ${bgClass} shrink-0`}>
                <SocialIcon className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 w-full">
                <h4 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  {t("creatorCreditTitle")}
                </h4>
                <div className="text-xs font-semibold text-primary flex flex-wrap items-center gap-1.5 mb-1.5 min-w-0">
                  {platform !== "web" ? (
                    <>
                      <span className="font-bold">{recipe.creatorFullName || recipe.creatorUsername}</span>
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-0.5 text-muted-foreground break-all"
                      >
                        @{recipe.creatorUsername}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </>
                  ) : (
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1.5 text-primary font-bold break-all"
                    >
                      {recipe.creatorFullName}
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed break-words">
                  {platform === "web"
                    ? t("webCreatorCreditDisclaimer", { creator: recipe.creatorFullName || "" })
                    : t("creatorCreditDisclaimer", { creator: recipe.creatorFullName || `@${recipe.creatorUsername}` })}
                </p>
              </div>
            </div>
            <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
              {platform === "web" ? (
                <Button
                  variant="outline"
                  className="rounded-full flex-1 md:flex-initial flex items-center gap-2 hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold"
                  onClick={() => window.open(profileUrl, "_blank")}
                >
                  <Globe className="w-4 h-4 text-primary" />
                  {t("visitWebsite")}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="rounded-full flex-1 md:flex-initial flex items-center gap-2 hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold"
                    onClick={() => window.open(profileUrl, "_blank")}
                  >
                    <SocialIcon className="w-4 h-4 text-primary" />
                    {t("viewOriginalProfile")}
                  </Button>
                  {recipe.sourceUrl && (
                    <Button
                      variant="outline"
                      className="rounded-full flex-1 md:flex-initial flex items-center gap-2 hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold"
                      onClick={() => window.open(recipe.sourceUrl, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 text-primary" />
                      {t("originalSource")}
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

      </main>



    </div>
  );
}
