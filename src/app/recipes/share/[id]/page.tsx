"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  usePublicRecipe,
  useCheckUserHasRecipe,
  useAddToUserRecipes,
} from "@/hooks/useRecipes";
import {
  ArrowLeft,
  Clock,
  Plus,
  Minus,
  ChefHat,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Flame,
  Loader2,
  Globe,
  Leaf,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Link from "next/link";

// Custom SVG components for Social platforms
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

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export default function SharedRecipePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const t = useTranslations("Details");
  const tRecipes = useTranslations("Recipes");

  // Fetch recipe
  const { data: recipe, isLoading: loading } = usePublicRecipe(id);
  const { data: hasRecipe, isLoading: checkingHasRecipe } = useCheckUserHasRecipe(id);
  const addRecipeMutation = useAddToUserRecipes();

  const [currentServings, setCurrentServings] = useState(2);
  const [scrollY, setScrollY] = useState(0);

  // Scroll effect for parallax image
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync default servings
  useEffect(() => {
    if (recipe) {
      setCurrentServings(recipe.servings || 2);
    }
  }, [recipe]);

  // Handle redirect if user already has it
  useEffect(() => {
    if (!authLoading && user && hasRecipe) {
      router.replace(`/recipes/${id}`);
    }
  }, [user, authLoading, hasRecipe, id, router]);

  const handleAddToRecipes = async () => {
    if (!user) return;
    const toastId = toast.loading(t("addingRecipeProgress"));
    try {
      await addRecipeMutation.mutateAsync(id);
      
      const { trackEvent } = await import("@/lib/analytics");
      await trackEvent("recipe_saved", {
        recipe_id: id,
        source_platform: recipe?.sourcePlatform || "web",
        method: "share_page_import",
        userId: user.uid,
        userEmail: user.email || undefined,
      });

      toast.success(t("addToRecipesSuccess"), { id: toastId });
      router.push(`/recipes/${id}`);
    } catch (error) {
      console.error("Errore importazione ricetta:", error);
      toast.error(t("addToRecipesFailed"), { id: toastId });
    }
  };

  const updateServings = (delta: number) => {
    const newVal = currentServings + delta;
    if (newVal < 1) return;
    setCurrentServings(newVal);
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

  // Redirecting overlay
  if (authLoading || (user && checkingHasRecipe) || (user && hasRecipe)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Reindirizzamento in corso...</p>
        </div>
      </div>
    );
  }

  // Loading Skeleton
  if (loading) {
    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto pb-32 px-6 pt-24 animate-in fade-in duration-500 bg-background">
        <Skeleton className="w-full h-[40vh] rounded-[24px] bg-muted/20" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-2/3 bg-muted/20" />
          <Skeleton className="h-5 w-1/3 bg-muted/20" />
          <div className="flex gap-4">
            <Skeleton className="h-12 w-24 rounded-full bg-muted/20" />
            <Skeleton className="h-12 w-24 rounded-full bg-muted/20" />
          </div>
        </div>
      </div>
    );
  }

  // Not Found
  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6 bg-background">
        <ChefHat className="w-16 h-16 text-primary/20 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">{t("recipeNotFound")}</h2>
        <p className="text-muted-foreground text-sm mb-6">{t("recipeNotFoundDesc")}</p>
        <Button onClick={() => router.push("/")} variant="outline" className="rounded-full">
          Vai alla Home
        </Button>
      </div>
    );
  }

  const baseServings = recipe.servings || 2;
  const imageSrc = recipe.imageUrl
    ? `/api/proxy-image?url=${encodeURIComponent(recipe.imageUrl)}`
    : null;

  const platform = recipe.sourcePlatform?.toLowerCase() || "instagram";
  let SocialIcon: React.ComponentType<{ className?: string }> = InstagramIcon;
  let profileUrl = recipe.creatorUsername ? `https://www.instagram.com/${recipe.creatorUsername}` : "#";

  if (platform === "tiktok") {
    SocialIcon = TikTokIcon;
    profileUrl = recipe.creatorUsername ? `https://www.tiktok.com/@${recipe.creatorUsername}` : "#";
  } else if (platform === "youtube") {
    SocialIcon = YouTubeIcon;
    profileUrl = recipe.creatorUsername ? `https://www.youtube.com/@${recipe.creatorUsername}` : "#";
  } else if (platform === "facebook") {
    SocialIcon = FacebookIcon;
    profileUrl = recipe.creatorUsername ? `https://www.facebook.com/${recipe.creatorUsername}` : "#";
  } else if (platform === "web") {
    SocialIcon = Globe;
    profileUrl = recipe.sourceUrl || "#";
  }

  return (
    <div className="relative w-full min-h-screen bg-background pb-32">
      {/* Branding Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-background/60 px-6 shadow-xl shadow-primary/5 backdrop-blur-xl dark:bg-surface-container/60">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <Leaf className="h-6 w-6 text-primary" strokeWidth={2.5} />
          <h1 className="font-heading text-xl font-bold tracking-tight text-primary">GustoSmart</h1>
        </Link>
        <div>
          {user ? (
            <Link
              href="/recipes"
              className="text-xs font-semibold text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-full px-4 py-2 transition-colors"
            >
              Miei Piatti
            </Link>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(`/recipes/share/${id}`)}`}
              className="text-xs font-semibold text-white terracotta-gradient rounded-full px-4 py-2 shadow-sm transition-transform hover:scale-[1.02]"
            >
              Accedi
            </Link>
          )}
        </div>
      </header>

      {/* Main Details Wrapper */}
      <div className="pt-16 max-w-4xl mx-auto px-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden w-[calc(100%+3rem)] -mx-6 h-[45vh] md:h-[50vh] rounded-b-[40px] shadow-lg shadow-primary/5 bg-muted/10">
          {imageSrc ? (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-100 ease-out"
              style={{
                backgroundImage: `url(${imageSrc})`,
                transform: `translateY(${scrollY * 0.3}px)`,
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary/30">
              <ChefHat className="w-24 h-24 stroke-[1.2]" />
              <span className="font-heading text-sm mt-3 font-semibold tracking-wider uppercase">
                GustoSmart Recipe
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/25" />

          {/* Back Button */}
          <Button
            variant="outline"
            size="icon"
            className="absolute top-8 left-6 z-40 rounded-full bg-background/60 backdrop-blur-md border-white/10 hover:bg-background/80 shadow-md text-primary active:scale-95 transition-all"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Info Box */}
        <main className="relative -mt-24 px-2">
          {/* Header Glass Card */}
          <div className="glass-panel rounded-[32px] p-6 md:p-8 shadow-2xl shadow-primary/5 mb-8 bg-card/40 backdrop-blur-md border border-border/10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  {recipe.category && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold border-primary/20 text-primary">
                      {getCategoryLabel(recipe.category)}
                    </Badge>
                  )}
                  {recipe.isGlutenFree && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold border-emerald-500/20 text-emerald-600 bg-emerald-500/5 dark:text-emerald-400">
                      {t("glutenFree")}
                    </Badge>
                  )}
                  {recipe.isVegan && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold border-green-500/20 text-green-600 bg-green-500/5 dark:text-green-400">
                      {t("vegan")}
                    </Badge>
                  )}
                  {recipe.isVegetarian && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold border-teal-500/20 text-teal-600 bg-teal-500/5 dark:text-teal-400">
                      {t("vegetarian")}
                    </Badge>
                  )}
                  {recipe.isLactoseFree && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold border-blue-500/20 text-blue-600 bg-blue-500/5 dark:text-blue-400">
                      {t("lactoseFree")}
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
                                  Calorie stimate pari a <span className="font-bold text-primary">{recipe.kcal} kcal/100g</span>.
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

                              {recipe.nutritionalAssessment && (
                                <div className="bg-primary/5 dark:bg-white/5 border border-primary/10 rounded-2xl p-4 text-xs leading-relaxed text-muted-foreground flex gap-2.5 items-start mt-4 shadow-sm">
                                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  <p>{recipe.nutritionalAssessment}</p>
                                </div>
                              )}

                              <div className="mt-5 flex flex-col gap-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  {t("macroDistribution")}
                                </span>
                                
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
                                <Button variant="outline" className="mt-5 rounded-full">Chiudi</Button>
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
                </div>

                <h2 className="font-heading text-3xl font-bold text-on-surface mb-2 mt-4">
                  {recipe.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("smartOptimized")}
                </p>
              </div>

              {/* Servings Counter & Main CTA Action */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-3 shrink-0 self-center md:self-start w-full sm:w-auto md:w-auto">
                <div className="bg-surface-container rounded-full p-2 flex items-center justify-between gap-4 shadow-inner border border-white/5 shrink-0 h-14 bg-muted/20">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 transition-all shrink-0"
                    onClick={() => updateServings(-1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col items-center min-w-[48px]">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t("servings")}
                    </span>
                    <span className="font-heading text-xl font-bold text-primary leading-none mt-0.5">
                      {currentServings}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 transition-all shrink-0"
                    onClick={() => updateServings(1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {user ? (
                  <Button
                    onClick={handleAddToRecipes}
                    disabled={addRecipeMutation.isPending}
                    variant="default"
                    className="rounded-full w-full flex items-center justify-center gap-2 h-14 px-6 active:scale-95 transition-transform bg-primary hover:bg-primary/90 text-white"
                  >
                    {addRecipeMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                    <span>{t("addToRecipes")}</span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/recipes/share/${id}`)}`)}
                    variant="default"
                    className="rounded-full w-full flex items-center justify-center gap-2 h-14 px-6 active:scale-95 transition-transform bg-primary hover:bg-primary/90 text-white font-semibold text-sm"
                  >
                    <Bookmark className="w-5 h-5" />
                    <span>{t("loginToSave")}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Recipe Content: Ingredients & Instructions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Ingredients column */}
            <section className="lg:col-span-5 flex flex-col gap-4">
              <h3 className="font-heading text-xl font-bold text-on-surface flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                {t("ingredientsTitle")}
              </h3>
              <div className="glass-panel rounded-[24px] p-6 bg-card/25 border border-border/5">
                <div className="flex flex-col gap-4">
                  {recipe.ingredients && recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((ing: any, idx: number) => {
                      const baseQty = ing.quantity;
                      const calculatedQty = baseQty !== null
                        ? baseQty * (currentServings / baseServings)
                        : null;

                      const displayedUnit = ing.unit || "";

                      return (
                        <div key={idx} className="flex items-center gap-3 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-sm text-foreground">
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
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("noIngredients")}</span>
                  )}
                </div>
              </div>
            </section>

            {/* Instructions column */}
            <section className="lg:col-span-7 flex flex-col gap-4">
              <h3 className="font-heading text-xl font-bold text-on-surface flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                {t("instructionsTitle")}
              </h3>
              <div className="flex flex-col gap-6">
                {recipe.instructions && recipe.instructions.length > 0 ? (
                  recipe.instructions.map((step: string, idx: number) => (
                    <div key={idx} className="group flex gap-4 items-start">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md bg-primary text-white shadow-primary/20">
                          {idx + 1}
                        </div>
                        {idx < recipe.instructions.length - 1 && (
                          <div className="w-0.5 h-16 bg-border/40 mt-2" />
                        )}
                      </div>
                      <div className="glass-panel rounded-[24px] p-6 flex-1 bg-card/25 border border-border/5">
                        <p className="text-sm text-on-surface leading-relaxed">
                          {step}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">{t("noInstructions")}</span>
                )}
              </div>
            </section>
          </div>

          {/* Social Credits Footer */}
          {recipe.creatorUsername && (
            <div className="mt-12 glass-panel rounded-[24px] p-6 bg-card/10 border border-border/5">
              <div className="flex items-center gap-3 mb-4">
                <SocialIcon className="w-6 h-6 text-primary" />
                <h4 className="font-heading font-bold text-sm text-foreground">
                  {t("creatorCreditTitle")}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {recipe.sourcePlatform === "web"
                  ? t("webCreatorCreditDisclaimer", { creator: recipe.creatorFullName || recipe.creatorUsername })
                  : t("creatorCreditDisclaimer", { creator: `@${recipe.creatorUsername}` })}
              </p>
              <div className="mt-4 flex gap-4">
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  {recipe.sourcePlatform === "web" ? t("visitWebsite") : t("viewOriginalProfile")}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
