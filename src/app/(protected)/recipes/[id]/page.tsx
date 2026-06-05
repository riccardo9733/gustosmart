"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Plus,
  Minus,
  Edit2,
  Save,
  X,
  Trash2,
  PlusCircle,
  ChefHat,
  Sparkles,
  ShoppingBag,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function RecipeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();

  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentServings, setCurrentServings] = useState(2);
  
  // Cooking checklist state (temporary in-memory)
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editRecipe, setEditRecipe] = useState<any>(null);

  const [scrollY, setScrollY] = useState(0);

  // Parallax Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Firestore Sync Listener
  useEffect(() => {
    if (!id) return;

    const db = getFirebaseDb();
    const recipeRef = doc(db, "recipes", id);

    const unsubscribe = onSnapshot(
      recipeRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const r = { id: docSnap.id, ...data };
          setRecipe(r);
          setCurrentServings(data.servings || 2);
          setLoading(false);
        } else {
          toast.error("Ricetta non trovata.");
          router.push("/");
        }
      },
      (error) => {
        console.error("Errore fetch ricetta:", error);
        toast.error("Errore nel caricamento della ricetta.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id, router]);

  // Adjust Servings handlers
  const updateServings = (delta: number) => {
    const newVal = currentServings + delta;
    if (newVal < 1) return;
    setCurrentServings(newVal);
  };

  // Toggle edit state
  const handleToggleEdit = () => {
    if (isEditing) {
      // If we were editing, clicking the FAB again triggers Save
      handleSave();
    } else {
      // Enter edit mode
      setEditRecipe(JSON.parse(JSON.stringify(recipe))); // Deep clone
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditRecipe(null);
  };

  // Save edits back to Firestore
  const handleSave = async () => {
    if (!editRecipe.title.trim()) {
      toast.error("Il titolo della ricetta è obbligatorio.");
      return;
    }

    const toastId = toast.loading("Salvataggio ricetta...");

    try {
      const db = getFirebaseDb();
      const recipeRef = doc(db, "recipes", id);

      // Clean and validate ingredients
      const cleanedIngredients = editRecipe.ingredients
        .map((ing: any) => ({
          name: ing.name.trim(),
          quantity: ing.quantity !== null && ing.quantity !== "" ? Number(ing.quantity) : null,
          unit: ing.unit.trim() || "q.b.",
        }))
        .filter((ing: any) => ing.name !== "");

      // Clean instructions
      const cleanedInstructions = editRecipe.instructions
        .map((step: string) => step.trim())
        .filter((step: string) => step !== "");

      const updateData = {
        title: editRecipe.title.trim(),
        servings: Number(editRecipe.servings) || 2,
        prepTimeMinutes: editRecipe.prepTimeMinutes !== null && editRecipe.prepTimeMinutes !== "" 
          ? Number(editRecipe.prepTimeMinutes) 
          : null,
        ingredients: cleanedIngredients,
        instructions: cleanedInstructions,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(recipeRef, updateData);
      toast.success("Ricetta salvata con successo!", { id: toastId });
      setIsEditing(false);
      setEditRecipe(null);
    } catch (error) {
      console.error("Errore durante il salvataggio della ricetta:", error);
      toast.error("Impossibile salvare le modifiche.", { id: toastId });
    }
  };

  const formatQuantity = (qty: number) => {
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
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

  const baseServings = recipe.servings || 2;
  const imageSrc = recipe.imageUrl
    ? `/api/proxy-image?url=${encodeURIComponent(recipe.imageUrl)}`
    : null;

  return (
    <div className="relative w-full max-w-4xl mx-auto pb-32 animate-in fade-in duration-500">
      
      {/* Hero Section (Parallax & Bleed to layout edges) */}
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
        
        {/* Floating Back Button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute top-24 left-6 z-40 rounded-full bg-background/60 backdrop-blur-md border-white/10 hover:bg-background/80 shadow-md text-primary active:scale-95 transition-all"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content Over Card */}
      <main className="relative -mt-24 px-2">
        
        {/* Header Glass Card */}
        <div className="glass-panel rounded-[32px] p-6 md:p-8 shadow-2xl shadow-primary/5 mb-8">
          {isEditing ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold tracking-wider text-primary uppercase font-heading">
                Modifica Dettagli
              </h3>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Titolo</label>
                <Input
                  type="text"
                  value={editRecipe.title}
                  onChange={(e) => setEditRecipe({ ...editRecipe, title: e.target.value })}
                  placeholder="Titolo Ricetta"
                  className="font-heading text-xl font-bold bg-background/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Porzioni Base</label>
                  <Input
                    type="number"
                    value={editRecipe.servings ?? ""}
                    onChange={(e) => setEditRecipe({ ...editRecipe, servings: Number(e.target.value) })}
                    placeholder="2"
                    min="1"
                    className="bg-background/40"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Tempo Prep (minuti)</label>
                  <Input
                    type="number"
                    value={editRecipe.prepTimeMinutes ?? ""}
                    onChange={(e) => setEditRecipe({ 
                      ...editRecipe, 
                      prepTimeMinutes: e.target.value === "" ? null : Number(e.target.value) 
                    })}
                    placeholder="es. 25"
                    min="0"
                    className="bg-background/40"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 items-center mb-3">
                  {recipe.prepTimeMinutes && (
                    <Badge variant="secondary" className="bg-secondary-container text-on-secondary-container rounded-full px-3 py-1 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {recipe.prepTimeMinutes} Minuti
                    </Badge>
                  )}
                  {recipe.sourceUrl && (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                    >
                      Fonte Originale
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <h2 className="font-heading text-3xl font-bold text-on-surface mb-2">
                  {recipe.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Trascritto e ottimizzato in formato smart.
                </p>
              </div>

              {/* Servings Counter */}
              <div className="bg-surface-container rounded-full p-2 flex items-center gap-4 shadow-inner border border-white/5 shrink-0 self-center md:self-start">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 transition-all shrink-0"
                  onClick={() => updateServings(-1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center min-w-[48px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Persone</span>
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
            </div>
          )}
        </div>

        {/* Dynamic Lists Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Ingredients Section */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold text-on-surface flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Ingredienti
              </h3>
            </div>

            <div className="glass-panel rounded-[24px] p-6">
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  {editRecipe.ingredients.map((ing: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="Quantità"
                        value={ing.quantity ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          const updated = [...editRecipe.ingredients];
                          updated[idx] = { ...updated[idx], quantity: val };
                          setEditRecipe({ ...editRecipe, ingredients: updated });
                        }}
                        className="w-20 shrink-0 bg-background/40"
                      />
                      <Input
                        type="text"
                        placeholder="Unità"
                        value={ing.unit}
                        onChange={(e) => {
                          const updated = [...editRecipe.ingredients];
                          updated[idx] = { ...updated[idx], unit: e.target.value };
                          setEditRecipe({ ...editRecipe, ingredients: updated });
                        }}
                        className="w-20 shrink-0 bg-background/40"
                      />
                      <Input
                        type="text"
                        placeholder="Ingrediente"
                        value={ing.name}
                        onChange={(e) => {
                          const updated = [...editRecipe.ingredients];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setEditRecipe({ ...editRecipe, ingredients: updated });
                        }}
                        className="flex-1 bg-background/40"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = editRecipe.ingredients.filter((_: any, i: number) => i !== idx);
                          setEditRecipe({ ...editRecipe, ingredients: updated });
                        }}
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditRecipe({
                        ...editRecipe,
                        ingredients: [...editRecipe.ingredients, { name: "", quantity: null, unit: "" }]
                      });
                    }}
                    className="mt-2 text-primary border-primary/20 hover:bg-primary/5 self-start w-full md:w-auto"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Aggiungi Ingrediente
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {recipe.ingredients && recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((ing: any, idx: number) => {
                      const baseQty = ing.quantity;
                      const calculatedQty = baseQty !== null 
                        ? baseQty * (currentServings / baseServings) 
                        : null;
                      
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
                            {ing.unit && ing.unit !== "q.b." && (
                              <span className="text-muted-foreground mr-1">{ing.unit}</span>
                            )}
                            <span>{ing.name}</span>
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">Nessun ingrediente elencato.</span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Instructions Section */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold text-on-surface flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                Procedimento
              </h3>
              {!isEditing && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                    Cottura Attiva
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {isEditing ? (
                <div className="flex flex-col gap-4">
                  {editRecipe.instructions.map((step: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-start glass-panel rounded-[20px] p-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 mt-1">
                        {idx + 1}
                      </div>
                      <textarea
                        value={step}
                        onChange={(e) => {
                          const updated = [...editRecipe.instructions];
                          updated[idx] = e.target.value;
                          setEditRecipe({ ...editRecipe, instructions: updated });
                        }}
                        placeholder={`Descrivi il passaggio ${idx + 1}`}
                        className="flex-1 min-h-[70px] bg-background/40 rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = editRecipe.instructions.filter((_: any, i: number) => i !== idx);
                          setEditRecipe({ ...editRecipe, instructions: updated });
                        }}
                        className="text-destructive hover:bg-destructive/10 shrink-0 mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditRecipe({
                        ...editRecipe,
                        instructions: [...editRecipe.instructions, ""]
                      });
                    }}
                    className="mt-2 text-primary border-primary/20 hover:bg-primary/5 self-start w-full md:w-auto"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Aggiungi Passaggio
                  </Button>
                </div>
              ) : (
                recipe.instructions && recipe.instructions.length > 0 ? (
                  recipe.instructions.map((step: string, idx: number) => {
                    const isChecked = !!completedSteps[idx];

                    return (
                      <div key={idx} className="group flex gap-4 items-start">
                        {/* Step Number */}
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
                          {idx < recipe.instructions.length - 1 && (
                            <div className="w-0.5 h-16 bg-border/40 mt-2" />
                          )}
                        </div>

                        {/* Step Description */}
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
                            <span>Passaggio Completato</span>
                          </label>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground">Nessuna istruzione fornita.</span>
                )
              )}
            </div>
          </section>

        </div>
      </main>

      {/* Floating Action Button (FAB) Area */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-50">
        {isEditing && (
          <Button
            onClick={handleCancelEdit}
            className="w-14 h-14 bg-muted hover:bg-muted-foreground/20 text-muted-foreground rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all duration-300"
            size="icon"
            aria-label="Annulla modifiche"
          >
            <X className="h-6 w-6" />
          </Button>
        )}
        <Button
          onClick={handleToggleEdit}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all duration-300 ${
            isEditing
              ? "bg-secondary hover:bg-secondary/95 text-white"
              : "bg-primary hover:bg-primary/95 text-white"
          }`}
          size="icon"
          aria-label={isEditing ? "Salva modifiche" : "Modifica ricetta"}
        >
          {isEditing ? (
            <Save className="h-6 w-6" />
          ) : (
            <Edit2 className="h-6 w-6" />
          )}
        </Button>
      </div>

    </div>
  );
}
