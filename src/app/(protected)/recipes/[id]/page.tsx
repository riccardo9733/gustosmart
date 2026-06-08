"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { useRecipe, useRemoveFromUserRecipes, useRecipes } from "@/hooks/useRecipes";
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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
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
    isTranslated: boolean;
  } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const [scrollY, setScrollY] = useState(0);

  // Mutations
  const { mutateAsync: removeRecipe } = useRemoveFromUserRecipes();

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

    const newItems = recalculateShoppingItems(updatedRecipes, shoppingList.items, allRecipes);
    
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
              isTranslated: true
            });
            setIsTranslating(false);
          } else {
            // Show original language while translating
            setDisplayData({
              title: recipe.title,
              ingredients: recipe.ingredients || [],
              instructions: recipe.instructions || [],
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
                targetLanguage: userLanguage
              })
            });

            if (!res.ok) throw new Error("Errore chiamata API di traduzione");

            const resJson = await res.json();
            if (resJson.success && resJson.translation) {
              const translationDoc = {
                title: resJson.translation.title,
                ingredients: resJson.translation.ingredients || [],
                instructions: resJson.translation.instructions || [],
                translatedAt: new Date().toISOString()
              };

              // Save translation on the GLOBAL recipe — accessible by all users
              await setDoc(translationRef, translationDoc);

              setDisplayData({
                title: resJson.translation.title,
                ingredients: resJson.translation.ingredients || [],
                instructions: resJson.translation.instructions || [],
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
      const newItems = recalculateShoppingItems(updatedRecipes, shoppingList.items, allRecipes);
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
                    <Badge variant="secondary" className="bg-primary/10 text-primary rounded-full px-3 py-1 font-semibold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-primary" />
                      {t("kcalCount", { count: recipe.kcal })}
                    </Badge>
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
        {recipe.creatorUsername && (
          <div className="glass-panel rounded-[24px] p-6 mt-8 border border-primary/10 bg-primary/5 dark:bg-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl shadow-primary/5 animate-in fade-in duration-300">
            <div className="flex-1 flex gap-4 items-start">
              <div className="bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-2.5 rounded-2xl text-white shadow-lg shadow-pink-500/10 shrink-0">
                <Instagram className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  {t("creatorCreditTitle")}
                </h4>
                <div className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-1.5">
                  <span className="font-bold">{recipe.creatorFullName || recipe.creatorUsername}</span>
                  <a
                    href={`https://www.instagram.com/${recipe.creatorUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-0.5 text-muted-foreground"
                  >
                    @{recipe.creatorUsername}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("creatorCreditDisclaimer", { creator: recipe.creatorFullName || `@${recipe.creatorUsername}` })}
                </p>
              </div>
            </div>
            <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
              <Button
                variant="outline"
                className="rounded-full flex-1 md:flex-initial flex items-center gap-2 hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold"
                onClick={() => window.open(`https://www.instagram.com/${recipe.creatorUsername}`, "_blank")}
              >
                <Instagram className="w-4 h-4 text-primary" />
                {t("viewOriginalProfile")}
              </Button>
              {recipe.sourceUrl && (
                <Button
                  variant="outline"
                  className="rounded-full flex-1 md:flex-initial flex items-center gap-2 hover:bg-primary/5 hover:text-primary transition-all text-xs font-bold"
                  onClick={() => window.open(recipe.sourceUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 text-primary" />
                  {t("viewOriginalPost")}
                </Button>
              )}
            </div>
          </div>
        )}
      </main>



    </div>
  );
}
