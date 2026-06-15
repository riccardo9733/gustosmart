"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  useRecipes,
  useRemoveFromUserRecipes,
  useUserFolders,
  useCreateFolder,
  useMoveRecipeToFolder,
} from "@/hooks/useRecipes";
import type { Ingredient } from "@/lib/firestore/recipes";
import {
  Search,
  Clock,
  Users,
  Film,
  Link as LinkIcon,
  MoreVertical,
  Trash2,
  ChefHat,
  Folder,
  FolderPlus,
  FolderOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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

export default function RecipesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations("Recipes");
  const tDetails = useTranslations("Details");

  const [searchQuery, setSearchQuery] = useState("");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [moveRecipeOpen, setMoveRecipeOpen] = useState(false);
  const [selectedRecipeForFolder, setSelectedRecipeForFolder] = useState<string | null>(null);

  // Queries e Mutations
  const { data: recipes = [], isLoading: loading } = useRecipes();
  const { data: folders = [], isLoading: foldersLoading } = useUserFolders();
  const { mutateAsync: removeRecipe } = useRemoveFromUserRecipes();
  const createFolderMutation = useCreateFolder();
  const moveRecipeMutation = useMoveRecipeToFolder();

  const handleDeleteRecipe = async (id: string, title: string) => {
    const toastId = toast.loading(t("removingRecipeProgress", { title }));
    try {
      await removeRecipe(id);

      const { trackEvent } = await import("@/lib/analytics");
      await trackEvent("recipe_removed", {
        recipe_id: id,
        userId: user?.uid,
        userEmail: user?.email || undefined,
      });

      toast.success(t("recipeRemovedSuccess"), { id: toastId });
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast.error(t("recipeRemoveFailed"), { id: toastId });
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      toast.error(t("folderNameRequired"));
      return;
    }
    try {
      await createFolderMutation.mutateAsync(newFolderName.trim());
      toast.success(t("folderCreated"));
      setNewFolderName("");
      setCreateFolderOpen(false);
    } catch (error) {
      console.error("Errore creazione cartella:", error);
      toast.error(t("saveFailed"));
    }
  };

  const handleMoveRecipe = async (folderId: string | null) => {
    if (!selectedRecipeForFolder) return;
    try {
      await moveRecipeMutation.mutateAsync({
        recipeId: selectedRecipeForFolder,
        folderId,
      });
      toast.success(t("recipeMoved"));
      setMoveRecipeOpen(false);
      setSelectedRecipeForFolder(null);
    } catch (error) {
      console.error("Errore spostamento ricetta:", error);
      toast.error(t("saveFailed"));
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
  };

  // Client-side filtering (all data already in cache)
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients?.some((ing: Ingredient) =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesSearch;
  });

  const getFolderRecipeCount = (folderId: string) => {
    return recipes.filter((r) => r.folderId === folderId).length;
  };

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
      </section>

      {/* Folders Section */}
      <section className="flex flex-col gap-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {t("foldersTitle")}
        </h3>
        
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-none items-center">
          {/* Add Folder Button/Card */}
          <button
            onClick={() => setCreateFolderOpen(true)}
            className="flex flex-col items-center justify-center border border-dashed border-muted-foreground/30 rounded-[20px] size-28 shrink-0 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 active:scale-95 group cursor-pointer"
          >
            <FolderPlus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-primary mt-2 text-center px-1">
              {t("addFolderBtn")}
            </span>
          </button>

          {/* User Folders List */}
          {foldersLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="rounded-[20px] size-28 shrink-0 animate-pulse bg-muted/20" />
            ))
          ) : (
            folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => router.push(`/recipes/folder/${folder.id}`)}
                className="flex flex-col items-center justify-between p-4 glass-panel border-white/10 rounded-[20px] size-28 shrink-0 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer active:scale-95 group relative"
              >
                <Folder className="h-7 w-7 text-primary group-hover:scale-110 transition-transform duration-200" />
                <div className="flex flex-col items-center w-full text-center">
                  <span className="text-[11px] font-bold text-foreground line-clamp-1 w-full px-1">
                    {folder.name}
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground mt-0.5">
                    {getFolderRecipeCount(folder.id) === 1
                      ? t("recipeCount")
                      : t("recipesCount", { count: getFolderRecipeCount(folder.id) })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recipes Section */}
      <section className="w-full flex flex-col gap-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {t("recent")}
        </h3>

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
          <div className="flex flex-col gap-3">
            {filteredRecipes.map((recipe) => {
              const getCategoryLabel = (category: string) => {
                switch (category) {
                  case "first_courses": return t("primi");
                  case "second_courses": return t("secondi");
                  case "desserts": return t("dolci");
                  case "appetizers": return t("antipasti");
                  case "sides": return t("contorni");
                  case "single_dishes": return t("singleDishes");
                  default: return t("other");
                }
              };

              return (
                <div
                  key={recipe.id}
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                  className="flex items-center gap-4 p-3 rounded-2xl glass-panel border-white/10 hover:translate-x-1.5 hover:shadow-lg transition-all duration-200 cursor-pointer w-full group"
                >
                  {/* Middle Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <h4 className="font-heading font-semibold text-sm sm:text-base text-foreground leading-snug truncate">
                      {recipe.title}
                    </h4>

                    <div className="flex flex-wrap gap-2 items-center text-muted-foreground text-[10px] sm:text-xs">
                      {recipe.category && (
                        <Badge variant="outline" className="rounded-full px-2 py-0 h-4.5 font-bold border-primary/25 text-[9px] uppercase tracking-wider text-primary bg-primary/5">
                          {getCategoryLabel(recipe.category)}
                        </Badge>
                      )}
                      {recipe.isGlutenFree && (
                        <Badge variant="outline" className="rounded-full px-2 py-0 h-4.5 font-bold border-emerald-500/25 text-[9px] uppercase tracking-wider text-emerald-500 bg-emerald-500/5">
                          {tDetails("glutenFree")}
                        </Badge>
                      )}
                      {recipe.isVegan && (
                        <Badge variant="outline" className="rounded-full px-2 py-0 h-4.5 font-bold border-green-500/25 text-[9px] uppercase tracking-wider text-green-500 bg-green-500/5">
                          {tDetails("vegan")}
                        </Badge>
                      )}
                      {recipe.isVegetarian && (
                        <Badge variant="outline" className="rounded-full px-2 py-0 h-4.5 font-bold border-teal-500/25 text-[9px] uppercase tracking-wider text-teal-500 bg-teal-500/5">
                          {tDetails("vegetarian")}
                        </Badge>
                      )}
                      {recipe.isLactoseFree && (
                        <Badge variant="outline" className="rounded-full px-2 py-0 h-4.5 font-bold border-blue-500/25 text-[9px] uppercase tracking-wider text-blue-500 bg-blue-500/5">
                          {tDetails("lactoseFree")}
                        </Badge>
                      )}
                      {recipe.prepTimeMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t("minCount", { count: recipe.prepTimeMinutes })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {t("servingsCount", { count: recipe.servings || 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions & Source */}
                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="text-muted-foreground/50 p-1.5">
                      {recipe.sourcePlatform === "instagram" ? (
                        <Film className="h-4 w-4 text-pink-500/80 fill-pink-500/5" />
                      ) : recipe.sourcePlatform === "tiktok" ? (
                        <Film className="h-4 w-4 text-teal-500/80" />
                      ) : recipe.sourcePlatform === "youtube" ? (
                        <YouTubeIcon className="h-4 w-4 text-red-500/80 fill-red-500/5" />
                      ) : recipe.sourcePlatform === "facebook" ? (
                        <FacebookIcon className="h-4 w-4 text-blue-500/80 fill-blue-500/5" />
                      ) : (
                        <LinkIcon className="h-4 w-4 text-secondary/80" />
                      )}
                    </div>

                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger nativeButton={true} render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-white/5 dark:bg-black/10 border border-white/10 hover:bg-white/10 text-foreground active:scale-95 transition-all"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRecipeForFolder(recipe.id);
                              setMoveRecipeOpen(true);
                            }}
                            className="cursor-pointer flex gap-2"
                          >
                            <FolderOpen className="h-4 w-4" />
                            {t("moveRecipeBtn")}
                          </DropdownMenuItem>
                          
                          <AlertDialogTrigger nativeButton={false} render={
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
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Dialog: Crea Cartella */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="max-w-xs">
          <form onSubmit={handleCreateFolder}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{t("addFolderTitle")}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t("addFolderPlaceholder")}
                className="w-full rounded-xl"
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2">
              <DialogClose render={<Button type="button" variant="ghost" className="rounded-xl">{t("cancelBtn")}</Button>} />
              <Button type="submit" disabled={createFolderMutation.isPending} className="rounded-xl bg-primary text-white">
                {t("createBtn")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Sposta in Cartella */}
      <Dialog open={moveRecipeOpen} onOpenChange={setMoveRecipeOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("moveRecipeTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 py-4 max-h-[300px] overflow-y-auto">
            {/* Opzione nessuna cartella */}
            <button
              onClick={() => handleMoveRecipe(null)}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted text-left transition-colors text-sm font-semibold cursor-pointer active:scale-98"
            >
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              <span>{t("noFolder")}</span>
            </button>
            {/* Lista delle cartelle */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMoveRecipe(folder.id)}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted text-left transition-colors text-sm font-semibold cursor-pointer active:scale-98"
              >
                <Folder className="h-5 w-5 text-primary" />
                <span>{folder.name}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" className="rounded-xl w-full">{t("cancelBtn")}</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
