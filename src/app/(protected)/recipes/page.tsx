"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRecipes, useRemoveFromUserRecipes } from "@/hooks/useRecipes";
import {
  Search,
  Clock,
  Users,
  Flame,
  Film,
  Link as LinkIcon,
  MoreVertical,
  Trash2,
  Plus,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function RecipesPage() {
  const router = useRouter();
  const t = useTranslations("Recipes");
  const tDetails = useTranslations("Details");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");

  // TanStack Query: stessa cache della Home → zero letture extra su navigazione
  const { data: recipes = [], isLoading: loading } = useRecipes();

  // Mutation per rimuovere dal ricettario personale (non tocca la ricetta globale)
  const { mutateAsync: removeRecipe } = useRemoveFromUserRecipes();

  const CATEGORIES = [
    { key: "all", label: t("all") },
    { key: "first_courses", label: t("primi") },
    { key: "second_courses", label: t("secondi") },
    { key: "desserts", label: t("dolci") },
    { key: "appetizers", label: t("antipasti") },
    { key: "sides", label: t("contorni") },
    { key: "single_dishes", label: t("singleDishes") },
    { key: "other", label: t("other") },
  ];

  const handleDeleteRecipe = async (id: string, title: string) => {
    const toastId = toast.loading(t("removingRecipeProgress", { title }));
    try {
      await removeRecipe(id);
      toast.success(t("recipeRemovedSuccess"), { id: toastId });
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast.error(t("recipeRemoveFailed"), { id: toastId });
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSource("all");
  };

  // Client-side filtering (all data already in cache)
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients?.some((ing: any) =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" || recipe.category === selectedCategory;

    let matchesSource = true;
    if (selectedSource === "social") {
      matchesSource =
        recipe.sourcePlatform === "instagram" ||
        recipe.sourcePlatform === "tiktok" ||
        !recipe.sourceUrl?.includes(".");
    } else if (selectedSource === "web") {
      matchesSource =
        recipe.sourcePlatform === "web" ||
        !!(recipe.sourceUrl &&
          !recipe.sourceUrl.includes("instagram.com") &&
          !recipe.sourceUrl.includes("tiktok.com"));
    }

    return matchesSearch && matchesCategory && matchesSource;
  });

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 relative">

      {/* Title & Search Panel */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {t("title")}
        </h2>

        {/* Search Input */}
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 transition-colors group-focus-within:text-primary" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-12 pr-4 py-6 rounded-2xl bg-surface-container/60 border-0 focus-visible:ring-2 focus-visible:ring-primary/20 text-sm placeholder:text-muted-foreground transition-all"
          />
        </div>

        {/* Filters Panel */}
        <div className="flex overflow-x-auto gap-2 py-2 scrollbar-none items-center">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 duration-200 ${
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "glass-panel border-white/10 text-foreground hover:bg-white/40 dark:hover:bg-white/10"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="w-px h-6 bg-border mx-2 shrink-0" />

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedSource("all")}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 duration-200 ${
                selectedSource === "all"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "glass-panel border-white/10 text-foreground hover:bg-white/40 dark:hover:bg-white/10"
              }`}
            >
              {t("allSources")}
            </button>
            <button
              onClick={() => setSelectedSource("social")}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 duration-200 ${
                selectedSource === "social"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "glass-panel border-white/10 text-foreground hover:bg-white/40 dark:hover:bg-white/10"
              }`}
            >
              <Film className="h-3.5 w-3.5" />
              {t("socialSource")}
            </button>
            <button
              onClick={() => setSelectedSource("web")}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 duration-200 ${
                selectedSource === "web"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "glass-panel border-white/10 text-foreground hover:bg-white/40 dark:hover:bg-white/10"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {t("webSource")}
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid Content */}
      <section className="w-full">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="relative overflow-hidden rounded-[24px] aspect-[4/5] border border-white/10 shadow-lg bg-muted/10">
                <Skeleton className="w-full h-full animate-pulse bg-muted/20" />
              </Card>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-700 max-w-md mx-auto">
            <div className="w-64 h-64 mb-8 rounded-full bg-primary/5 flex items-center justify-center relative shadow-inner">
              <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse" />
              <ChefHat className="w-32 h-32 stroke-[1] text-primary/20 relative z-10" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-foreground mb-2">{t("noRecipesYet")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              {t("noRecipesYetDesc")}
            </p>
            <Button
              onClick={() => router.push("/")}
              className="bg-primary hover:bg-primary/95 text-white px-8 py-6 rounded-full font-heading text-base shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              {t("importFirstRecipe")}
            </Button>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500 max-w-sm mx-auto">
            <ChefHat className="h-16 w-16 text-primary/40 mb-4 stroke-[1.2]" />
            <h3 className="text-xl font-bold text-foreground mb-2">{t("noResultsTitle")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {t("noResultsDesc")}
            </p>
            <Button
              onClick={resetFilters}
              variant="outline"
              className="border-primary/20 text-primary hover:bg-primary/5 rounded-full px-6"
            >
              {t("clearFilters")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => {
              const isSocial =
                recipe.sourcePlatform === "instagram" ||
                recipe.sourcePlatform === "tiktok" ||
                !recipe.sourceUrl?.includes(".");
              const imageSrc = recipe.imageUrl
                ? `/api/proxy-image?url=${encodeURIComponent(recipe.imageUrl)}`
                : null;

              return (
                <div
                  key={recipe.id}
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                  className="group relative overflow-hidden rounded-[24px] aspect-[4/5] glass-panel border-white/10 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer"
                >
                  {imageSrc ? (
                    <img
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      src={imageSrc}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center text-primary/20">
                      <ChefHat className="w-16 h-16 stroke-[1.2]" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none" />

                  {/* Dropdown Menu */}
                  <div className="absolute top-4 left-4 z-30" onClick={(e) => e.stopPropagation()}>
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl bg-white/10 dark:bg-black/20 text-white backdrop-blur border border-white/15 hover:bg-white/25 active:scale-90 transition-all shadow-md"
                          >
                            <MoreVertical className="h-4.5 w-4.5" />
                          </Button>
                        } />
                        <DropdownMenuContent align="start" className="w-40 rounded-xl">
                          <AlertDialogTrigger render={
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer flex gap-2">
                              <Trash2 className="h-4 w-4" />
                              {t("removeBtn")}
                            </DropdownMenuItem>
                          } />
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("removeRecipeConfirmTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("removeRecipeConfirmDesc", { title: recipe.title })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancelBtn")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRecipe(recipe.id, recipe.title)}
                            className="bg-destructive hover:bg-destructive/95 text-white"
                          >
                            {t("removeBtn")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Platform Source Icon */}
                  <div className="absolute top-4 right-4 bg-white/10 dark:bg-black/20 text-white backdrop-blur border border-white/15 p-2 rounded-xl flex items-center justify-center shadow-md">
                    {isSocial ? (
                      <Film className="h-4.5 w-4.5 text-primary" />
                    ) : (
                      <LinkIcon className="h-4.5 w-4.5 text-secondary" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-3 z-10 pointer-events-none">
                    <h4 className="font-heading text-lg font-bold text-white leading-snug tracking-wide line-clamp-2">
                      {recipe.title}
                    </h4>

                    <div className="flex flex-wrap gap-2 items-center text-white/95 text-xs font-semibold">
                      {recipe.prepTimeMinutes && (
                        <span className="flex items-center gap-1 bg-white/10 dark:bg-black/35 px-2.5 py-1 rounded-full backdrop-blur border border-white/5">
                          <Clock className="h-3.5 w-3.5" />
                          {t("minCount", { count: recipe.prepTimeMinutes })}
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-white/10 dark:bg-black/35 px-2.5 py-1 rounded-full backdrop-blur border border-white/5">
                        <Users className="h-3.5 w-3.5" />
                        {t("servingsCount", { count: recipe.servings || 2 })}
                      </span>
                      {recipe.kcal && (
                        <span className="flex items-center gap-1 bg-primary/20 px-2.5 py-1 rounded-full border border-primary/20">
                          <Flame className="h-3.5 w-3.5 fill-primary text-primary" />
                          {tDetails("kcalCount", { count: recipe.kcal })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FAB */}
      <button
        onClick={() => router.push("/")}
        className="fixed bottom-32 right-6 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/30 z-40 hover:scale-110 active:scale-90 transition-all duration-300"
        aria-label={t("addRecipeAria")}
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}
