"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  useGlobalRecipes,
  useRecipes,
  useUserProfile,
  useAddToUserRecipes,
  useRemoveFromUserRecipes,
} from "@/hooks/useRecipes";
import {
  Search,
  Clock,
  Flame,
  Users,
  Film,
  Video,
  Link as LinkIcon,
  ChefHat,
  Bookmark,
  BookmarkCheck,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { GlobalRecipe } from "@/lib/firestore/recipes";

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

// sub-component to fetch and render the user who scanned/imported the recipe
function ScannerHeader({ userId }: { userId: string }) {
  const { data: profile, isLoading } = useUserProfile(userId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Skeleton className="size-6 rounded-full bg-muted/20 animate-pulse" />
        <Skeleton className="h-3 w-16 bg-muted/20 animate-pulse" />
      </div>
    );
  }

  const name = profile?.displayName || "Chef Gusto";
  const photo = profile?.photoURL;
  const initials = name
    .split(" ")
    .map((n: string) => n[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 mt-2">
      {photo ? (
        <img
          src={photo.includes("backblazeb2.com") ? `/api/proxy-image?url=${encodeURIComponent(photo)}` : photo}
          alt={name}
          className="size-6 rounded-full object-cover border border-white/10 shadow-sm"
        />
      ) : (
        <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[9px] shadow-sm">
          {initials || "CG"}
        </div>
      )}
      <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[120px]">
        {name}
      </span>
    </div>
  );
}

interface FeedCardProps {
  recipe: GlobalRecipe;
  isSaved: boolean;
  onToggleSave: (method?: string) => void;
  onViewDetails: () => void;
  tRecipes: (key: string, values?: { count?: number }) => string;
  tDetails: (key: string, values?: { count?: number }) => string;
}

function FeedCard({
  recipe,
  isSaved,
  onToggleSave,
  onViewDetails,
  tRecipes,
  tDetails,
}: FeedCardProps) {
  const [showSplash, setShowSplash] = useState(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSaved) {
      onToggleSave("double_click");
      setShowSplash(true);
      setTimeout(() => setShowSplash(false), 800);
    }
  };

  return (
    <Card 
      onClick={onViewDetails}
      onDoubleClick={handleDoubleClick}
      className="group relative w-full overflow-hidden rounded-3xl border border-border/40 bg-card/40 dark:bg-surface-container/20 shadow-md hover:-translate-y-1 hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer select-none flex flex-col p-3.5 gap-3.5"
    >
      {/* Card Header (Source Platform & Save Button) */}
      <div className="flex items-center justify-between w-full">
        {/* Source Platform Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted/40 dark:bg-surface-container/60 border border-border/20 text-[9px] font-bold text-muted-foreground shadow-sm">
          {recipe.sourcePlatform === "instagram" ? (
            <Film className="size-3 text-pink-500 fill-pink-500/10" />
          ) : recipe.sourcePlatform === "tiktok" ? (
            <Video className="size-3 text-teal-400" />
          ) : recipe.sourcePlatform === "youtube" ? (
            <YouTubeIcon className="size-3 text-red-500 fill-red-500/10" />
          ) : recipe.sourcePlatform === "facebook" ? (
            <FacebookIcon className="size-3 text-blue-500 fill-blue-500/10" />
          ) : (
            <LinkIcon className="size-3 text-primary" />
          )}
          <span className="capitalize">{recipe.sourcePlatform || "Web"}</span>
        </div>

        {/* Bookmark/Save button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave("button_click");
          }}
          className={cn(
            "size-8 rounded-full bg-muted/30 hover:bg-muted/50 border border-border/10 hover:scale-105 active:scale-95 transition-all text-foreground",
            isSaved ? "text-primary" : "text-muted-foreground"
          )}
        >
          {isSaved ? (
            <BookmarkCheck data-icon="inline-start" className="fill-primary text-primary" />
          ) : (
            <Bookmark data-icon="inline-start" />
          )}
        </Button>
      </div>

      {/* Double click animated splash */}
      {showSplash && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in-0 duration-200 z-20">
          <div className="p-3 rounded-full bg-background/95 dark:bg-surface-container/90 shadow-xl scale-0 animate-bounce border border-primary/20">
            <BookmarkCheck className="size-6 text-primary fill-primary" />
          </div>
        </div>
      )}

      {/* Card Body */}
      <div className="flex flex-col gap-2">
        <h4 className="font-heading text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 text-left">
          {recipe.title}
        </h4>

        {/* Recipe Tags */}
        {(recipe.prepTimeMinutes || recipe.kcal || recipe.servings || (recipe.ingredients && recipe.ingredients.length > 0)) && (
          <div className="flex flex-wrap gap-1.5 items-center text-[10px] font-semibold mt-1">
            {recipe.prepTimeMinutes && (
              <span className="flex items-center gap-0.5 bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded-full border border-border/10">
                <Clock className="size-3 text-primary" />
                {tRecipes("minCount", { count: recipe.prepTimeMinutes })}
              </span>
            )}
            {recipe.kcal && (
              <span className="flex items-center gap-0.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/10">
                <Flame className="size-3 fill-primary/10" />
                {tDetails("kcalCount", { count: recipe.kcal })}
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-0.5 bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded-full border border-border/10">
                <Users className="size-3 text-primary" />
                {tRecipes("servingsCount", { count: recipe.servings })}
              </span>
            )}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <span className="flex items-center gap-0.5 bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded-full border border-border/10">
                <ChefHat className="size-3 text-primary" />
                {tRecipes("ingredients", { count: recipe.ingredients.length })}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function HomeFeed() {
  const router = useRouter();
  const { user } = useAuth();
  
  const t = useTranslations("Home");
  const tRecipes = useTranslations("Recipes");
  const tDetails = useTranslations("Details");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");

  // Fetch all global recipes
  const { data: globalRecipes = [], isLoading: globalLoading } = useGlobalRecipes();

  // Fetch user's saved recipes to determine bookmark state
  const { data: userRecipes = [], isLoading: userLoading } = useRecipes();

  // Mutations
  const { mutateAsync: saveRecipe } = useAddToUserRecipes();
  const { mutateAsync: unsaveRecipe } = useRemoveFromUserRecipes();

  const CATEGORIES = [
    { key: "all", label: tRecipes("all") },
    { key: "first_courses", label: tRecipes("primi") },
    { key: "second_courses", label: tRecipes("secondi") },
    { key: "desserts", label: tRecipes("dolci") },
    { key: "appetizers", label: tRecipes("antipasti") },
    { key: "sides", label: tRecipes("contorni") },
    { key: "single_dishes", label: tRecipes("singleDishes") },
    { key: "other", label: tRecipes("other") },
  ];

  const handleToggleSave = async (recipe: GlobalRecipe, isSaved: boolean, method = "button_click") => {
    if (!user) {
      toast.error("Effettua l'accesso per salvare le ricette.");
      return;
    }
    const toastId = toast.loading(isSaved ? "Rimozione..." : "Salvataggio...");
    try {
      const { trackEvent } = await import("@/lib/analytics");
      if (isSaved) {
        await unsaveRecipe(recipe.id);
        
        await trackEvent("recipe_removed", {
          recipe_id: recipe.id,
          userId: user.uid,
          userEmail: user.email || undefined,
        });

        toast.success(t("removeSuccess") || "Ricetta rimossa dal ricettario!", { id: toastId });
      } else {
        await saveRecipe(recipe.id);

        await trackEvent("recipe_saved", {
          recipe_id: recipe.id,
          source_platform: recipe.sourcePlatform || "web",
          method,
          userId: user.uid,
          userEmail: user.email || undefined,
        });

        toast.success(t("saveSuccess") || "Ricetta salvata nel ricettario!", { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error("Errore durante l'operazione.", { id: toastId });
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSource("all");
  };

  // Client-side filtering
  const filteredRecipes = globalRecipes.filter((recipe) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients?.some((ing) =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" || recipe.category === selectedCategory;

    let matchesSource = true;
    if (selectedSource === "social") {
      matchesSource =
        recipe.sourcePlatform === "instagram" ||
        recipe.sourcePlatform === "tiktok" ||
        recipe.sourcePlatform === "youtube" ||
        recipe.sourcePlatform === "facebook" ||
        !recipe.sourceUrl?.includes(".");
    } else if (selectedSource === "web") {
      matchesSource =
        recipe.sourcePlatform === "web" ||
        !!(recipe.sourceUrl &&
          !recipe.sourceUrl.includes("instagram.com") &&
          !recipe.sourceUrl.includes("tiktok.com") &&
          !recipe.sourceUrl.includes("youtube.com") &&
          !recipe.sourceUrl.includes("youtu.be") &&
          !recipe.sourceUrl.includes("facebook.com"));
    }

    return matchesSearch && matchesCategory && matchesSource;
  });

  const loading = globalLoading || userLoading;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 relative w-full pb-16">
      {/* Header Info */}
      <section className="flex flex-col gap-2 text-center items-center mt-2">
        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2 justify-center">
          <Sparkles className="h-7 w-7 text-primary fill-primary/15" />
          <span>{t("feedTitle") || "Cosa si cucina oggi?"}</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("feedSubtitle") || "Scopri le ricette scansionate dagli altri utenti della community"}
        </p>
      </section>

      {/* Sticky Search and Filters */}
      <div className="sticky top-16 z-30 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/40 flex flex-col gap-3 transition-shadow">
        {/* Search Input */}
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 transition-colors group-focus-within:text-primary" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("feedSearchPlaceholder") || "Cerca ricette o ingredienti..."}
            className="w-full pl-12 pr-4 py-6 rounded-2xl bg-surface-container/60 border-0 focus-visible:ring-2 focus-visible:ring-primary/20 text-sm placeholder:text-muted-foreground transition-all"
          />
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col gap-3">
          {/* Categories Horizontal Scroller */}
          <div className="flex overflow-x-auto gap-2 scrollbar-none pb-1 shrink-0">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 duration-200 border border-white/5",
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/25"
                      : "glass-panel text-foreground hover:bg-white/40 dark:hover:bg-white/10"
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Source Filter Badges */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setSelectedSource("all")}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 border border-white/5",
                selectedSource === "all"
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "glass-panel text-foreground hover:bg-white/40 dark:hover:bg-white/10"
              )}
            >
              {tRecipes("allSources")}
            </button>
            <button
              onClick={() => setSelectedSource("social")}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 border border-white/5",
                selectedSource === "social"
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "glass-panel text-foreground hover:bg-white/40 dark:hover:bg-white/10"
              )}
            >
              <Film className="h-3 w-3" />
              {tRecipes("socialSource")}
            </button>
            <button
              onClick={() => setSelectedSource("web")}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 border border-white/5",
                selectedSource === "web"
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "glass-panel text-foreground hover:bg-white/40 dark:hover:bg-white/10"
              )}
            >
              <LinkIcon className="h-3 w-3" />
              {tRecipes("webSource")}
            </button>
          </div>
        </div>
      </div>

      {/* Feed List */}
      <section className="w-full mt-2">
        {loading ? (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 w-full">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="break-inside-avoid mb-4 w-full">
                <Card className="overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-3.5 flex flex-col gap-3.5">
                  <div className="flex justify-between items-center w-full">
                    <Skeleton className="h-5 w-16 bg-muted/20 rounded-full animate-pulse" />
                    <Skeleton className="h-8 w-8 bg-muted/20 rounded-full animate-pulse" />
                  </div>
                  <Skeleton className="h-4 w-3/4 bg-muted/20 animate-pulse" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-4 w-12 bg-muted/20 rounded-full animate-pulse" />
                    <Skeleton className="h-4 w-12 bg-muted/20 rounded-full animate-pulse" />
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : globalRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-700 max-w-md mx-auto">
            <div className="w-48 h-48 mb-8 rounded-full bg-primary/5 flex items-center justify-center relative shadow-inner">
              <ChefHat className="w-24 h-24 stroke-[1] text-primary/20 relative z-10" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">
              {t("noRecipesYet") || "Nessuna ricetta globale"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {t("noRecipesYetDesc") || "Nessuna ricetta è stata scansionata sul server. Usa il tasto '+' in basso per importare la prima!"}
            </p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500 max-w-sm mx-auto">
            <ChefHat className="h-16 w-16 text-primary/40 mb-4 stroke-[1.2]" />
            <h3 className="text-lg font-bold text-foreground mb-2">{tRecipes("noResultsTitle")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {tRecipes("noResultsDesc")}
            </p>
            <Button
              onClick={resetFilters}
              variant="outline"
              className="border-primary/20 text-primary hover:bg-primary/5 rounded-full px-6"
            >
              {tRecipes("clearFilters")}
            </Button>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 w-full">
            {filteredRecipes.map((recipe) => {
              const isSaved = userRecipes.some((ur) => ur.id === recipe.id);
              return (
                <div key={recipe.id} className="break-inside-avoid mb-4 w-full">
                  <FeedCard
                    recipe={recipe}
                    isSaved={isSaved}
                    onToggleSave={(method) => handleToggleSave(recipe, isSaved, method)}
                    onViewDetails={() => router.push(`/recipes/${recipe.id}`)}
                    tRecipes={tRecipes}
                    tDetails={tDetails}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
