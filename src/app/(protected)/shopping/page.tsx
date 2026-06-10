"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRecipes } from "@/hooks/useRecipes";
import { useShoppingList, useUpdateShoppingList } from "@/hooks/useShoppingList";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile } from "@/store/userSlice";
import { convertToImperial } from "@/lib/units";
import { type ShoppingItem, type ShoppingRecipe, recalculateShoppingItems } from "@/lib/firestore/shopping-list";
import { useQuery } from "@tanstack/react-query";
import { type MergedRecipe } from "@/lib/firestore/recipes";
import {
  RotateCcw,
  Trash2,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShoppingPage() {
  const t = useTranslations("Shopping");
  const tRecipes = useTranslations("Recipes");
  const router = useRouter();
  
  const profile = useAppSelector(selectUserProfile);
  const measurementSystem = profile?.preferences?.measurementSystem || "metric";

  const { data: cookbookRecipes = [], isLoading: loadingRecipes, isError: recipesError } = useRecipes();
  const { data: shoppingList, isLoading: loadingList, isError: listError } = useShoppingList();
  const updateShoppingList = useUpdateShoppingList();

  const [isRecipesExpanded, setIsRecipesExpanded] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [recipeSearchQuery, setRecipeSearchQuery] = useState("");

  const [localRecipes, setLocalRecipes] = useState<ShoppingRecipe[]>([]);
  const [localItems, setLocalItems] = useState<ShoppingItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Find any recipe IDs in the shopping list that are not in the user's cookbook
  const missingRecipeIds = React.useMemo(() => {
    if (!shoppingList) return [];
    const cookbookIds = new Set(cookbookRecipes.map((r) => r.id));
    return shoppingList.selectedRecipes
      .map((r) => r.recipeId)
      .filter((id) => !cookbookIds.has(id));
  }, [shoppingList, cookbookRecipes]);

  // Fetch the missing recipes from the global collection
  const { data: missingRecipes = [], isLoading: loadingMissing } = useQuery({
    queryKey: ["shopping-missing-recipes", missingRecipeIds],
    enabled: missingRecipeIds.length > 0,
    queryFn: async () => {
      const { getGlobalRecipe } = await import("@/lib/firestore/recipes");
      const fetched = await Promise.all(
        missingRecipeIds.map(async (id) => {
          const global = await getGlobalRecipe(id);
          if (!global) return null;
          return {
            ...global,
            addedAt: null,
            personalNotes: null,
            rating: null,
            isCustomized: false,
          } as MergedRecipe;
        })
      );
      return fetched.filter((r): r is MergedRecipe => r !== null);
    },
  });

  // Combine cookbook recipes and missing recipes
  const allRecipes = React.useMemo(() => {
    return [...cookbookRecipes, ...missingRecipes];
  }, [cookbookRecipes, missingRecipes]);

  // Espande automaticamente la sezione ricette se il ricettario è vuoto
  useEffect(() => {
    if (cookbookRecipes.length === 0 && !loadingRecipes) {
      setIsRecipesExpanded(true);
    }
  }, [cookbookRecipes.length, loadingRecipes]);

  // Carica i dati iniziali da Firestore solo se non ci sono modifiche locali non salvate
  useEffect(() => {
    if (shoppingList && !isDirty) {
      setLocalRecipes(shoppingList.selectedRecipes || []);
      setLocalItems(shoppingList.items || []);
    }
  }, [shoppingList, isDirty]);

  // Sincronizza lo stato locale su Firestore con un debounce di 1.5 secondi
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      updateShoppingList.mutate(
        {
          selectedRecipes: localRecipes,
          items: localItems,
        },
        {
          onSuccess: () => {
            setIsDirty(false);
          },
        }
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, [localRecipes, localItems, isDirty]);

  if (recipesError || listError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <ShoppingCart className="w-16 h-16 text-destructive/30 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          Impossibile caricare la lista della spesa
        </h2>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Si è verificato un errore nel caricamento dei dati da Firestore. Controlla la tua connessione o ricarica la pagina.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-full">
          Ricarica Pagina
        </Button>
      </div>
    );
  }

  const isLoading = loadingRecipes || loadingList || !shoppingList || (missingRecipeIds.length > 0 && loadingMissing);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto pb-32 animate-in fade-in duration-500">
        <div className="flex justify-between items-end mb-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 bg-muted-foreground/15" />
            <Skeleton className="h-5 w-32 bg-muted-foreground/15" />
          </div>
          <Skeleton className="h-10 w-24 rounded-full bg-muted-foreground/15" />
        </div>
        <Skeleton className="h-14 w-full rounded-2xl bg-muted-foreground/15" />
        <Skeleton className="h-12 w-full rounded-xl bg-muted-foreground/15" />
        <div className="space-y-3 mt-4">
          <Skeleton className="h-16 w-full rounded-xl bg-muted-foreground/15" />
          <Skeleton className="h-16 w-full rounded-xl bg-muted-foreground/15" />
          <Skeleton className="h-16 w-full rounded-xl bg-muted-foreground/15" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Gestione Eventi e Mutazioni
  // ---------------------------------------------------------------------------

  const handleToggleRecipe = (recipeId: string, baseServings: number) => {
    const isSelected = localRecipes.some((r) => r.recipeId === recipeId);
    let updatedRecipes = [...localRecipes];

    if (isSelected) {
      updatedRecipes = updatedRecipes.filter((r) => r.recipeId !== recipeId);
    } else {
      updatedRecipes.push({ recipeId, servings: baseServings || 2 });
    }

    const newItems = recalculateShoppingItems(updatedRecipes, localItems, allRecipes);
    setLocalRecipes(updatedRecipes);
    setLocalItems(newItems);
    setIsDirty(true);

    import("@/lib/analytics").then(({ trackEvent }) => {
      trackEvent("shopping_recipe_toggled", {
        recipe_id: recipeId,
        action: isSelected ? "remove" : "add",
        userId: profile?.uid,
        userEmail: profile?.email || undefined
      });
    });
  };

  const handleUpdateServings = (recipeId: string, delta: number) => {
    const updatedRecipes = localRecipes.map((r) => {
      if (r.recipeId === recipeId) {
        const newServings = Math.max(1, r.servings + delta);
        return { ...r, servings: newServings };
      }
      return r;
    });

    const newItems = recalculateShoppingItems(updatedRecipes, localItems, allRecipes);
    setLocalRecipes(updatedRecipes);
    setLocalItems(newItems);
    setIsDirty(true);
  };

  const handleToggleItem = (item: ShoppingItem) => {
    const updatedItems = localItems.map((it) => {
      if (
        it.name.toLowerCase() === item.name.toLowerCase() &&
        it.unit.toLowerCase() === item.unit.toLowerCase() &&
        !!it.isCustom === !!item.isCustom
      ) {
        return { ...it, checked: !it.checked };
      }
      return it;
    });

    setLocalItems(updatedItems);
    setIsDirty(true);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customItemName.trim();
    if (!name) return;

    const exists = localItems.some(
      (item) => item.name.toLowerCase() === name.toLowerCase() && !(item as any).cleared
    );

    if (exists) {
      toast.error(t("itemExists") || "Articolo già presente");
      return;
    }

    const newItem: ShoppingItem = {
      name,
      quantity: null,
      unit: "",
      checked: false,
      isCustom: true,
    };

    const updatedItems = [...localItems, newItem];
    setLocalItems(updatedItems);
    setIsDirty(true);
    setCustomItemName("");

    import("@/lib/analytics").then(({ trackEvent }) => {
      trackEvent("shopping_custom_item_added", {
        item_name: name,
        userId: profile?.uid,
        userEmail: profile?.email || undefined
      });
    });
  };

  const handleDeleteCustomItem = (name: string) => {
    const updatedItems = localItems.filter(
      (item) => !(item.isCustom && item.name.toLowerCase() === name.toLowerCase())
    );

    setLocalItems(updatedItems);
    setIsDirty(true);
  };

  const handleEmptyCompleted = () => {
    const updatedItems = localItems
      .map((item) => {
        if (item.checked) {
          if (item.isCustom) {
            return null; // Rimuove definitivamente l'articolo custom
          } else {
            return { ...item, cleared: true }; // Nasconde l'articolo derivato da ricetta
          }
        }
        return item;
      })
      .filter((item): item is ShoppingItem => item !== null);

    setLocalItems(updatedItems);
    setIsDirty(true);
  };

  const handleResetList = () => {
    setLocalRecipes([]);
    setLocalItems([]);
    setIsDirty(true);
    toast.success(t("resetSuccess") || "Lista della spesa resettata!");

    import("@/lib/analytics").then(({ trackEvent }) => {
      trackEvent("shopping_list_reset", {
        userId: profile?.uid,
        userEmail: profile?.email || undefined
      });
    });
  };

  // ---------------------------------------------------------------------------
  // Filtraggio e Ordinamento per Visualizzazione
  // ---------------------------------------------------------------------------

  // Costruiamo la mappatura delle fonti ricetta per gli ingredienti visualizzati
  const ingredientRecipeSources: Record<string, string[]> = {};
  localRecipes.forEach((sel) => {
    const recipe = allRecipes.find((r) => r.id === sel.recipeId);
    if (!recipe) return;
    recipe.ingredients.forEach((ing) => {
      const key = `${ing.name.toLowerCase().trim()}||${ing.unit.toLowerCase().trim()}`;
      if (!ingredientRecipeSources[key]) {
        ingredientRecipeSources[key] = [];
      }
      if (!ingredientRecipeSources[key].includes(recipe.title)) {
        ingredientRecipeSources[key].push(recipe.title);
      }
    });
  });

  const activeItems = localItems
    .filter((item) => !item.checked && !(item as any).cleared)
    .sort((a, b) => a.name.localeCompare(b.name));

  const completedItems = localItems
    .filter((item) => item.checked && !(item as any).cleared)
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredRecipes = allRecipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(recipeSearchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full max-w-3xl mx-auto pb-32 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <section className="mb-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="font-heading text-3xl font-bold text-foreground mb-1">
              {t("title")}
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              {t("description", { count: activeItems.length })}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleResetList}
            className="rounded-full flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/5 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t("reset")}</span>
          </Button>
        </div>
      </section>

      {/* Accordion / Collapsible: Cookbook Recipes Selection */}
      <div className="glass-panel rounded-2xl mb-6 border border-white/10 shadow-lg shadow-primary/5 overflow-hidden">
        <button
          onClick={() => setIsRecipesExpanded(!isRecipesExpanded)}
          className="w-full flex justify-between items-center p-5 font-semibold text-foreground hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <span>
              {t("recipesCollapsible", { count: localRecipes.length })}
            </span>
          </div>
          {isRecipesExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {isRecipesExpanded && (
          <div className="p-5 border-t border-border/40 bg-muted/5 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
            {cookbookRecipes.length > 0 && (
              <div className="relative">
                <Input
                  type="text"
                  placeholder={t("searchRecipesPlaceholder")}
                  value={recipeSearchQuery}
                  onChange={(e) => setRecipeSearchQuery(e.target.value)}
                  className="rounded-full h-10 pl-4 pr-10 border-border/70 focus-visible:ring-primary focus-visible:border-primary text-sm bg-background"
                />
                {recipeSearchQuery && (
                  <button
                    onClick={() => setRecipeSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground p-1"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {cookbookRecipes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center max-w-sm mx-auto">
                <p className="text-sm text-muted-foreground">
                  {tRecipes("noRecipesYetDesc")}
                </p>
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="rounded-full border-primary/20 text-primary hover:bg-primary/5 mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
                  <span>{tRecipes("importFirstRecipe")}</span>
                </Button>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {tRecipes("noResultsTitle")}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRecipes.map((recipe) => {
                  const selection = localRecipes.find(
                    (r) => r.recipeId === recipe.id
                  );
                  const isSelected = !!selection;

                  return (
                    <div
                      key={recipe.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? "bg-primary/5 border-primary/30"
                          : "bg-background border-border/50 hover:border-border"
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer select-none flex-1 pr-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            handleToggleRecipe(recipe.id, recipe.servings)
                          }
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground line-clamp-1">
                            {recipe.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {recipe.servings} {t("servings")} base
                          </span>
                        </div>
                      </label>

                      {isSelected && selection && (
                        <div className="bg-surface-container rounded-full p-1 flex items-center gap-2 border border-white/5 shrink-0 scale-90">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 rounded-full bg-background flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition-all shrink-0"
                            onClick={() => handleUpdateServings(recipe.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-heading text-sm font-bold text-primary min-w-[16px] text-center">
                            {selection.servings}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 rounded-full bg-background flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition-all shrink-0"
                            onClick={() => handleUpdateServings(recipe.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form: Add Custom Item */}
      <form onSubmit={handleAddCustomItem} className="flex gap-2 mb-6">
        <Input
          type="text"
          value={customItemName}
          onChange={(e) => setCustomItemName(e.target.value)}
          placeholder={t("addCustomPlaceholder")}
          className="flex-1 rounded-full px-5 h-11 border-border/80 focus-visible:ring-primary focus-visible:border-primary"
        />
        <Button
          type="submit"
          disabled={!customItemName.trim()}
          className="rounded-full px-6 h-11 bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2 active:scale-95 shrink-0 font-semibold"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t("addBtn")}</span>
        </Button>
      </form>

      {/* Main Ingredient Canvas */}
      <div className="space-y-6">
        
        {/* Active Items (To Buy) */}
        <div className="space-y-3">
          {activeItems.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-border/60 bg-muted/5 flex flex-col items-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground max-w-sm">
                {t("noItems")}
              </p>
            </div>
          ) : (
            activeItems.map((item, index) => {
              const key = `${item.name.toLowerCase().trim()}||${item.unit.toLowerCase().trim()}`;
              const sources = ingredientRecipeSources[key] || [];

              // Convert quantities if imperial is preferred
              let qty = item.quantity;
              let unit = item.unit;
              if (qty !== null && measurementSystem === "imperial" && unit) {
                const converted = convertToImperial(qty, unit);
                qty = converted.quantity;
                unit = converted.unit;
              }

              const displayQty = qty !== null ? (qty % 1 === 0 ? qty.toString() : qty.toFixed(1)) : null;

              return (
                <div
                  key={`${key}-${index}`}
                  className="glass-panel p-4 rounded-xl flex items-center justify-between border border-white/10 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/10 group cursor-pointer"
                  onClick={() => handleToggleItem(item)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => handleToggleItem(item)}
                      onClick={(e) => e.stopPropagation()} // prevent triggering outer div click
                    />
                    <div className="flex flex-col">
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {displayQty && (
                          <span className="text-primary font-bold mr-1">{displayQty}</span>
                        )}
                        {unit && unit !== "q.b." && (
                          <span className="text-muted-foreground text-xs mr-1">{unit}</span>
                        )}
                        <span>{item.name}</span>
                      </p>
                      {item.isCustom ? (
                        <span className="text-[10px] text-muted-foreground/80 font-medium italic">
                          {t("manualItem")}
                        </span>
                      ) : (
                        sources.length > 0 && (
                          <span className="text-[10px] text-muted-foreground leading-none">
                            {t("unifiedFrom", { recipes: sources.join(", ") })}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {item.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomItem(item.name);
                      }}
                      className="text-muted-foreground/40 hover:text-destructive active:scale-90 transition-colors p-1"
                      aria-label="Delete manual item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Completed Section (Presi) */}
        {completedItems.length > 0 && (
          <div className="pt-6 border-t border-border/40 space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-2 text-muted-foreground/80">
                <Check className="w-5 h-5" />
                <h3 className="font-heading text-lg font-bold">
                  {t("completed")}
                </h3>
              </div>
              <button
                onClick={handleEmptyCompleted}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive active:scale-95 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("empty")}</span>
              </button>
            </div>

            <div className="space-y-2">
              {completedItems.map((item, index) => {
                const key = `${item.name.toLowerCase().trim()}||${item.unit.toLowerCase().trim()}`;
                
                // Convert quantities if imperial is preferred
                let qty = item.quantity;
                let unit = item.unit;
                if (qty !== null && measurementSystem === "imperial" && unit) {
                  const converted = convertToImperial(qty, unit);
                  qty = converted.quantity;
                  unit = converted.unit;
                }

                const displayQty = qty !== null ? (qty % 1 === 0 ? qty.toString() : qty.toFixed(1)) : null;

                return (
                  <div
                    key={`completed-${key}-${index}`}
                    className="glass-panel p-3.5 rounded-xl flex items-center justify-between border border-white/5 opacity-55 line-through hover:opacity-80 transition-opacity cursor-pointer"
                    onClick={() => handleToggleItem(item)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => handleToggleItem(item)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <p className="text-sm font-semibold text-muted-foreground">
                        {displayQty && <span className="font-bold mr-1">{displayQty}</span>}
                        {unit && unit !== "q.b." && <span className="text-xs mr-1">{unit}</span>}
                        <span>{item.name}</span>
                      </p>
                    </div>

                    {item.isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomItem(item.name);
                        }}
                        className="text-muted-foreground/30 hover:text-destructive active:scale-90 transition-colors p-1"
                        aria-label="Delete manual item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
