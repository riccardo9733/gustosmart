"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  useRecipes,
  useUserFolders,
  useDeleteFolder,
  useMoveRecipeToFolder,
  useAddRecipesToFolder,
  useRemoveFromUserRecipes,
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
  Plus,
  ChefHat,
  ArrowLeft,
  FolderOpen,
  Folder,
  Check,
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

export default function FolderDetailPage() {
  const params = useParams();
  const folderId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations("Recipes");
  const tDetails = useTranslations("Details");

  const [searchQuery, setSearchQuery] = useState("");
  const [addRecipesOpen, setAddRecipesOpen] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [moveRecipeOpen, setMoveRecipeOpen] = useState(false);
  const [selectedRecipeForFolder, setSelectedRecipeForFolder] = useState<string | null>(null);

  // Queries e Mutations
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: folders = [], isLoading: foldersLoading } = useUserFolders();
  const deleteFolderMutation = useDeleteFolder();
  const moveRecipeMutation = useMoveRecipeToFolder();
  const addRecipesMutation = useAddRecipesToFolder();
  const { mutateAsync: removeRecipe } = useRemoveFromUserRecipes();

  const folder = folders.find((f) => f.id === folderId);

  const handleDeleteFolder = async () => {
    try {
      await deleteFolderMutation.mutateAsync(folderId);
      toast.success(t("folderDeleted"));
      router.push("/recipes");
    } catch (error) {
      console.error("Errore cancellazione cartella:", error);
      toast.error(tDetails("saveFailed"));
    }
  };

  const handleAddRecipesToFolder = async () => {
    if (selectedRecipeIds.length === 0) return;
    try {
      await addRecipesMutation.mutateAsync({
        recipeIds: selectedRecipeIds,
        folderId,
      });
      toast.success(t("recipeMoved"));
      setAddRecipesOpen(false);
      setSelectedRecipeIds([]);
    } catch (error) {
      console.error("Errore aggiunta ricette:", error);
      toast.error(tDetails("saveFailed"));
    }
  };

  const handleMoveRecipe = async (targetFolderId: string | null) => {
    if (!selectedRecipeForFolder) return;
    try {
      await moveRecipeMutation.mutateAsync({
        recipeId: selectedRecipeForFolder,
        folderId: targetFolderId,
      });
      toast.success(t("recipeMoved"));
      setMoveRecipeOpen(false);
      setSelectedRecipeForFolder(null);
    } catch (error) {
      console.error("Errore spostamento ricetta:", error);
      toast.error(tDetails("saveFailed"));
    }
  };

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
      console.error("Errore eliminazione ricetta:", error);
      toast.error(t("recipeRemoveFailed"), { id: toastId });
    }
  };

  const toggleSelectRecipe = (id: string) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  if (foldersLoading || recipesLoading) {
    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto pb-32 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 pt-4">
          <Skeleton className="h-10 w-10 rounded-full bg-muted/20" />
          <Skeleton className="h-8 w-48 bg-muted/20" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl bg-muted/20" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="relative overflow-hidden rounded-[24px] aspect-[4/5] border border-white/10 shadow-lg bg-muted/10">
              <Skeleton className="w-full h-full animate-pulse bg-muted/20" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
        <ChefHat className="w-16 h-16 text-primary/20 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Cartella non trovata</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Questa cartella non esiste o è stata eliminata.
        </p>
        <Button onClick={() => router.push("/recipes")} variant="outline" className="rounded-full">
          {tDetails("backToRecipes")}
        </Button>
      </div>
    );
  }

  // Filter recipes belonging to this folder
  const folderRecipes = recipes.filter((r) => r.folderId === folderId);

  // Candidate recipes that are NOT in this folder
  const candidateRecipes = recipes.filter((r) => r.folderId !== folderId);

  // Search filter
  const filteredRecipes = folderRecipes.filter((recipe) => {
    return (
      searchQuery.trim() === "" ||
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients?.some((ing: Ingredient) =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  });

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 relative">
      
      {/* Folder Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-muted text-primary active:scale-95 transition-all cursor-pointer"
              onClick={() => router.push("/recipes")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl flex items-center gap-2">
              <Folder className="h-7 w-7 text-primary" />
              {folder.name}
            </h2>
          </div>

          {/* Delete Folder Button */}
          <AlertDialog>
            <AlertDialogTrigger nativeButton={true} render={
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-destructive/10 text-destructive hover:text-destructive active:scale-90 transition-all cursor-pointer"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            } />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteFolderConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteFolderConfirmDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancelBtn")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteFolder}
                  className="bg-destructive hover:bg-destructive/95 text-white"
                >
                  {t("removeBtn")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

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
      </div>

      {/* Action panel & recipes grid */}
      <section className="w-full flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {folderRecipes.length === 1
              ? t("recipeCount")
              : t("recipesCount", { count: folderRecipes.length })}
          </span>

          <Button
            onClick={() => {
              setSelectedRecipeIds([]);
              setAddRecipesOpen(true);
            }}
            size="sm"
            className="rounded-full bg-primary text-white flex items-center gap-1.5 px-4 py-2 hover:bg-primary/95 text-xs font-semibold cursor-pointer active:scale-95 shadow-md shadow-primary/15"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addRecipesToFolderBtn")}
          </Button>
        </div>

        {folderRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
            <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center text-muted-foreground mb-4">
              <FolderOpen className="h-8 w-8 stroke-[1.2]" />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-1">{t("noRecipesInFolder")}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              {t("noRecipesInFolderDesc")}
            </p>
            <Button
              onClick={() => {
                setSelectedRecipeIds([]);
                setAddRecipesOpen(true);
              }}
              className="bg-primary hover:bg-primary/95 text-white rounded-full px-6 text-xs shadow-lg shadow-primary/10"
            >
              {t("addRecipesToFolderBtn")}
            </Button>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-xs mx-auto">
            <ChefHat className="h-12 w-12 text-primary/40 mb-3 stroke-[1.2]" />
            <h3 className="text-lg font-bold text-foreground mb-1">{t("noResultsTitle")}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("noResultsDesc")}
            </p>
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
                            <Folder className="h-4 w-4" />
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

      {/* Dialog: Aggiungi ricette a questa cartella */}
      <Dialog open={addRecipesOpen} onOpenChange={setAddRecipesOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("addRecipesToFolderTitle")}</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-2 py-4 max-h-[300px] overflow-y-auto">
            {candidateRecipes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Tutte le tue ricette sono già in questa cartella.</p>
            ) : (
              candidateRecipes.map((recipe) => {
                const isChecked = selectedRecipeIds.includes(recipe.id);
                return (
                  <div
                    key={recipe.id}
                    onClick={() => toggleSelectRecipe(recipe.id)}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted text-left transition-colors text-xs font-semibold cursor-pointer active:scale-98"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{recipe.title}</p>
                      {recipe.folderId && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Folder className="h-3 w-3 inline" />
                          {folders.find(f => f.id === recipe.folderId)?.name || "Altra cartella"}
                        </p>
                      )}
                    </div>
                    <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-primary border-primary text-white" : "border-muted-foreground/30 bg-background"}`}>
                      {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <DialogClose render={<Button type="button" variant="ghost" className="rounded-xl">{t("cancelBtn")}</Button>} />
            <Button
              onClick={handleAddRecipesToFolder}
              disabled={selectedRecipeIds.length === 0 || addRecipesMutation.isPending}
              className="rounded-xl bg-primary text-white"
            >
              {t("createBtn")}
            </Button>
          </DialogFooter>
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
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => handleMoveRecipe(f.id)}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted text-left transition-colors text-sm font-semibold cursor-pointer active:scale-98"
              >
                <Folder className="h-5 w-5 text-primary" />
                <span>{f.name}</span>
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
