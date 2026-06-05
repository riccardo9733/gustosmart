"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
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
  Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

const CATEGORIES = [
  { key: "all", label: "Tutte" },
  { key: "first_courses", label: "Primi" },
  { key: "second_courses", label: "Secondi" },
  { key: "desserts", label: "Dolci" },
  { key: "appetizers", label: "Antipasti" },
  { key: "sides", label: "Contorni" },
  { key: "single_dishes", label: "Piatti Unici" },
  { key: "other", label: "Altro" },
];

export default function RecipesPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all"); // 'all', 'social', 'web'

  // Fetch user's recipes from Firestore in real-time
  useEffect(() => {
    if (!user) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    const q = query(
      collection(db, "recipes"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRecipes = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAtMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0
        };
      });

      // Sort by creation date descending
      fetchedRecipes.sort((a: any, b: any) => b.createdAtMs - a.createdAtMs);
      setRecipes(fetchedRecipes);
      setLoading(false);
    }, (error) => {
      console.error("Errore fetch ricette:", error);
      toast.error("Impossibile caricare le ricette.");
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Handle recipe deletion
  const handleDeleteRecipe = async (id: string, title: string) => {
    const toastId = toast.loading(`Eliminazione di "${title}"...`);
    try {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, "recipes", id));
      toast.success("Ricetta eliminata!", { id: toastId });
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast.error("Impossibile eliminare la ricetta.", { id: toastId });
    }
  };

  // Reset all search filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSource("all");
  };

  // Filter recipes based on query, category, and source
  const filteredRecipes = recipes.filter((recipe) => {
    // 1. Text Search Filter (Title or Ingredients)
    const matchesSearch = searchQuery.trim() === "" || 
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients?.some((ing: any) => 
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // 2. Category Filter
    const matchesCategory = selectedCategory === "all" || recipe.category === selectedCategory;

    // 3. Source Filter
    let matchesSource = true;
    if (selectedSource === "social") {
      matchesSource = recipe.sourcePlatform === "instagram" || recipe.sourcePlatform === "tiktok" || !recipe.sourceUrl?.includes(".");
    } else if (selectedSource === "web") {
      matchesSource = recipe.sourcePlatform === "web" || (recipe.sourceUrl && !recipe.sourceUrl.includes("instagram.com") && !recipe.sourceUrl.includes("tiktok.com"));
    }

    return matchesSearch && matchesCategory && matchesSource;
  });

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 relative">
      
      {/* Title & Search Panel */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Il Tuo Ricettario
        </h2>
        
        {/* Search Input */}
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 transition-colors group-focus-within:text-primary" />
          <Input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per titolo o ingrediente..."
            className="w-full pl-12 pr-4 py-6 rounded-2xl bg-surface-container/60 border-0 focus-visible:ring-2 focus-visible:ring-primary/20 text-sm placeholder:text-muted-foreground transition-all"
          />
        </div>

        {/* Filters Panel */}
        <div className="flex overflow-x-auto gap-2 py-2 scrollbar-none items-center">
          {/* Categories */}
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

          {/* Separator line */}
          <div className="w-px h-6 bg-border mx-2 shrink-0" />

          {/* Source Platforms */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedSource("all")}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 duration-200 ${
                selectedSource === "all"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "glass-panel border-white/10 text-foreground hover:bg-white/40 dark:hover:bg-white/10"
              }`}
            >
              Tutte Fonti
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
              Social
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
              Web
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid Content */}
      <section className="w-full">
        {loading ? (
          // Grid loading skeletons
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="relative overflow-hidden rounded-[24px] aspect-[4/5] border border-white/10 shadow-lg bg-muted/10">
                <Skeleton className="w-full h-full animate-pulse bg-muted/20" />
              </Card>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          // GLOBAL EMPTY STATE (Cookbook illustration)
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-700 max-w-md mx-auto">
            <div className="w-64 h-64 mb-8 rounded-full bg-primary/5 flex items-center justify-center relative shadow-inner">
              <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse" />
              <img 
                alt="Empty Recipe Library" 
                className="w-48 h-48 object-contain relative z-10 hover:scale-105 transition-transform duration-500" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnttm-GbLD3lkDSG56fwGW6DCc4fD9FpznrOIRvycvfMBaiC94s4Nm_Mnmy_LRRF2Q1qhFx-_AQ0AniK434cXSMz929qYKJzKb5qn_-d9jTKbbr_Bv4HR1fYrlYifTZLr_YnDHCElFSWbYDEQSQO6GALYxNUYJ_DEeOin2HzhMRo6BmAvTEODlnyOJJdAptQsHM2SUKtMuIx6oQ7OK-AlcmPbe8HG9w_RM5AEQZrvd_xwwmeM8HL3wynlGa2BNXpSFZQqBSeTW3Q"
              />
            </div>
            <h3 className="font-heading text-2xl font-bold text-foreground mb-2">Ancora nessuna ricetta?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Inizia a salvare i tuoi piatti preferiti dai social o dal web in un unico posto.
            </p>
            <Button 
              onClick={() => router.push("/")}
              className="bg-primary hover:bg-primary/95 text-white px-8 py-6 rounded-full font-heading text-base shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              Importa la tua prima ricetta!
            </Button>
          </div>
        ) : filteredRecipes.length === 0 ? (
          // FILTERED SEARCH EMPTY STATE
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500 max-w-sm mx-auto">
            <ChefHat className="h-16 w-16 text-primary/40 mb-4 stroke-[1.2]" />
            <h3 className="text-xl font-bold text-foreground mb-2">Nessun risultato trovato</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Nessuna ricetta corrisponde alla ricerca corrente o ai filtri selezionati.
            </p>
            <Button 
              onClick={resetFilters}
              variant="outline" 
              className="border-primary/20 text-primary hover:bg-primary/5 rounded-full px-6"
            >
              Azzera tutti i filtri
            </Button>
          </div>
        ) : (
          // RECIPES GRID
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => {
              const isSocial = recipe.sourcePlatform === "instagram" || recipe.sourcePlatform === "tiktok" || !recipe.sourceUrl?.includes(".");
              const imageSrc = recipe.imageUrl 
                ? `/api/proxy-image?url=${encodeURIComponent(recipe.imageUrl)}` 
                : null;

              return (
                <div 
                  key={recipe.id}
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                  className="group relative overflow-hidden rounded-[24px] aspect-[4/5] glass-panel border-white/10 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer"
                >
                  {/* Recipe Image */}
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

                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none" />

                  {/* Dropdown Menu Overlay (Top-Left) */}
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
                        <DropdownMenuContent align="start" className="w-36 rounded-xl">
                          <AlertDialogTrigger render={
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer flex gap-2">
                              <Trash2 className="h-4 w-4" />
                              Elimina
                            </DropdownMenuItem>
                          } />
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* AlertDialog Content */}
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Vuoi eliminare questa ricetta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Stai per rimuovere permanentemente &ldquo;{recipe.title}&rdquo; dal tuo ricettario. Questa operazione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteRecipe(recipe.id, recipe.title)} 
                            className="bg-destructive hover:bg-destructive/95 text-white"
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Platform Source Icon (Top-Right) */}
                  <div className="absolute top-4 right-4 bg-white/10 dark:bg-black/20 text-white backdrop-blur border border-white/15 p-2 rounded-xl flex items-center justify-center shadow-md">
                    {isSocial ? (
                      <Film className="h-4.5 w-4.5 text-primary" />
                    ) : (
                      <LinkIcon className="h-4.5 w-4.5 text-secondary" />
                    )}
                  </div>

                  {/* Details (Bottom Overlay) */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-3 z-10 pointer-events-none">
                    
                    {/* Title */}
                    <h4 className="font-heading text-lg font-bold text-white leading-snug tracking-wide line-clamp-2">
                      {recipe.title}
                    </h4>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-2 items-center text-white/95 text-xs font-semibold">
                      {recipe.prepTimeMinutes && (
                        <span className="flex items-center gap-1 bg-white/10 dark:bg-black/35 px-2.5 py-1 rounded-full backdrop-blur border border-white/5">
                          <Clock className="h-3.5 w-3.5" />
                          {recipe.prepTimeMinutes} min
                        </span>
                      )}
                      
                      <span className="flex items-center gap-1 bg-white/10 dark:bg-black/35 px-2.5 py-1 rounded-full backdrop-blur border border-white/5">
                        <Users className="h-3.5 w-3.5" />
                        {recipe.servings || 2} porz.
                      </span>

                      {recipe.kcal && (
                        <span className="flex items-center gap-1 bg-primary/20 px-2.5 py-1 rounded-full border border-primary/20">
                          <Flame className="h-3.5 w-3.5 fill-primary text-primary" />
                          {recipe.kcal} kcal
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

      {/* Floating Action Button (FAB) (Positioned to avoid bottom navigation) */}
      <button 
        onClick={() => router.push("/")}
        className="fixed bottom-32 right-6 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/30 z-40 hover:scale-110 active:scale-90 transition-all duration-300"
        aria-label="Aggiungi nuova ricetta"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}
