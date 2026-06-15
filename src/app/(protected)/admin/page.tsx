"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile, selectUserLoading } from "@/store/userSlice";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Database,
  Search,
  Globe,
  Film,
  Video,
  ChefHat,
  Bookmark,
  ShoppingCart,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  DollarSign,
  Activity,
  X,
  Info,
  Flame
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Recharts components
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

// Shadcn Chart components
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

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

interface LocalEvent {
  id: string;
  eventName: string;
  params: Record<string, unknown>;
  userId: string | null;
  userEmail: string | null;
  timestamp: string | null;
}

interface OpenRouterCredits {
  total_credits: number;
  total_usage: number;
  cash_balance?: number;
  total_remaining?: number;
}

interface OpenRouterKey {
  label: string;
  limit: number | null;
  limit_remaining?: number | null;
  usage: number;
  usage_daily?: number;
  usage_weekly?: number;
  usage_monthly?: number;
  is_free_tier?: boolean;
  rate_limit: {
    requests: number;
    interval: string;
  } | null;
}

interface OpenRouterGeneration {
  data: {
    id: string;
    model: string;
    total_cost: number;
    tokens_prompt: number;
    tokens_completion: number;
    latency?: number;
  };
}

export default function AdminDashboard() {
  const profile = useAppSelector(selectUserProfile);
  const loadingUser = useAppSelector(selectUserLoading);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"overview" | "ingest" | "openrouter" | "logs">("overview");
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Pagination State for Event Logs
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // OpenRouter Log Table State
  const [openRouterFilter, setOpenRouterFilter] = useState<"all" | "ingest" | "translate">("all");
  const [openRouterPage, setOpenRouterPage] = useState(1);

  // Reset pagination on search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [logSearchQuery]);

  // OpenRouter key and credits data state
  const [openRouterCredits, setOpenRouterCredits] = useState<OpenRouterCredits | null>(null);
  const [openRouterKey, setOpenRouterKey] = useState<OpenRouterKey | null>(null);
  const [loadingOpenRouter, setLoadingOpenRouter] = useState(false);
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);

  // Individual generation detail modal state
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [generationDetail, setGenerationDetail] = useState<OpenRouterGeneration | null>(null);
  const [loadingGeneration, setLoadingGeneration] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Role Protection Guard
  useEffect(() => {
    if (!loadingUser) {
      if (!profile || profile.role !== "admin") {
        router.replace("/");
      }
    }
  }, [profile, loadingUser, router]);

  // Real-time Firestore sync for events
  useEffect(() => {
    if (!profile || profile.role !== "admin") return;

    const db = getFirebaseDb();
    const q = query(
      collection(db, "analytics_events"),
      orderBy("timestamp", "desc"),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LocalEvent[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            eventName: data.eventName || "unknown",
            params: data.params || {},
            userId: data.userId || null,
            userEmail: data.userEmail || null,
            timestamp: data.timestamp ? (typeof data.timestamp.toDate === "function" ? data.timestamp.toDate().toISOString() : data.timestamp) : null,
          };
        });
        setEvents(list);
        setLoadingEvents(false);
      },
      (error) => {
        console.error("Errore sincronizzazione eventi:", error);
        setLoadingEvents(false);
      }
    );

    return () => unsubscribe();
  }, [profile]);

  // Fetch OpenRouter management metrics when Tab is selected
  useEffect(() => {
    if (activeTab !== "openrouter" || !profile) return;
    
    const fetchOpenRouterData = async () => {
      setLoadingOpenRouter(true);
      setOpenRouterError(null);
      try {
        const auth = getFirebaseAuth();
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          throw new Error("Token di autenticazione non disponibile. Effettua nuovamente il login.");
        }

        const [creditsRes, keyRes] = await Promise.all([
          fetch(`/api/admin/openrouter?endpoint=credits&userId=${profile.uid}`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }),
          fetch(`/api/admin/openrouter?endpoint=key&userId=${profile.uid}`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          })
        ]);

        if (!creditsRes.ok || !keyRes.ok) {
          throw new Error("Errore nel caricamento delle metriche da OpenRouter Proxy");
        }

        const creditsData = await creditsRes.json();
        const keyData = await keyRes.json();

        if (creditsData.success) {
          setOpenRouterCredits(creditsData.data?.data || creditsData.data);
        } else {
          throw new Error(creditsData.error || "Errore nel caricamento dei crediti");
        }

        if (keyData.success) {
          setOpenRouterKey(keyData.data?.data || keyData.data);
        } else {
          throw new Error(keyData.error || "Errore nel caricamento dello stato chiave");
        }
      } catch (err: unknown) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "Impossibile recuperare i dati delle spese";
        setOpenRouterError(errorMessage);
      } finally {
        setLoadingOpenRouter(false);
      }
    };

    fetchOpenRouterData();
  }, [activeTab, profile]);

  // Fetch individual generation detail
  useEffect(() => {
    if (!selectedGenerationId || !profile) return;

    const fetchGenerationDetail = async () => {
      setLoadingGeneration(true);
      setGenerationError(null);
      setGenerationDetail(null);
      try {
        const auth = getFirebaseAuth();
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          throw new Error("Token di autenticazione non disponibile. Effettua nuovamente il login.");
        }

        const res = await fetch(`/api/admin/openrouter?endpoint=generation&id=${selectedGenerationId}&userId=${profile.uid}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (!res.ok) throw new Error("Generazione non trovata o API errore");
        const json = await res.json();
        if (json.success) {
          setGenerationDetail(json.data);
        } else {
          throw new Error(json.error || "Errore nel caricamento della generazione");
        }
      } catch (err: unknown) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "Impossibile recuperare i dettagli della generazione";
        setGenerationError(errorMessage);
      } finally {
        setLoadingGeneration(false);
      }
    };

    fetchGenerationDetail();
  }, [selectedGenerationId, profile]);

  if (loadingUser || !profile || profile.role !== "admin") {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Verifica permessi amministratore in corso...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // KPI Calculations
  // ---------------------------------------------------------------------------

  // Ingestion metrics
  const initiatedImports = events.filter((e) => e.eventName === "recipe_import_initiated");
  const completedImports = events.filter((e) => e.eventName === "recipe_import_completed");
  const failedImports = events.filter((e) => e.eventName === "recipe_import_failed");
  const cacheHits = completedImports.filter((e) => e.params.is_cached_hit === true).length;

  // ScrapeCreators credits metric
  const latestScrapeCreditsEvent = events.find((e) => e.eventName === "scrapecreators_credits");
  const scrapecreatorsCredits = latestScrapeCreditsEvent?.params?.credits_remaining as number | undefined;
  
  const successRate = initiatedImports.length > 0 
    ? Math.round((completedImports.length / initiatedImports.length) * 100)
    : 0;

  // Platform breakdown
  const platforms = { instagram: 0, tiktok: 0, youtube: 0, facebook: 0, web: 0 };
  initiatedImports.forEach((e) => {
    const p = (e.params.source_platform as string | undefined)?.toLowerCase();
    if (p && p in platforms) {
      platforms[p as keyof typeof platforms]++;
    }
  });

  // Error breakdown
  const errors: Record<string, number> = {};
  failedImports.forEach((e) => {
    const errType = (e.params.error_type as string | undefined) || "UNKNOWN";
    errors[errType] = (errors[errType] || 0) + 1;
  });

  // Other engagement events count
  const recipesSaved = events.filter((e) => e.eventName === "recipe_saved").length;
  const servingsChanged = events.filter((e) => e.eventName === "recipe_servings_changed").length;
  const translations = events.filter((e) => e.eventName === "recipe_translated").length;
  const cookingChecks = events.filter((e) => e.eventName === "cooking_check_item").length;
  const shoppingToggles = events.filter((e) => e.eventName === "shopping_recipe_toggled").length;
  const customItemsAdded = events.filter((e) => e.eventName === "shopping_custom_item_added").length;
  const shoppingResets = events.filter((e) => e.eventName === "shopping_list_reset").length;
  const nutritionViews = events.filter((e) => e.eventName === "recipe_nutrition_viewed").length;
  const pwaInstalls = events.filter((e) => e.eventName === "pwa_install_prompt_action" && e.params.action === "app_installed").length;
  const pwaPromptsAccepted = events.filter((e) => e.eventName === "pwa_install_prompt_action" && e.params.action === "accepted").length;
  const pwaPromptsShown = events.filter((e) => e.eventName === "pwa_install_prompt_action" && e.params.action === "shown").length;

  // ---------------------------------------------------------------------------
  // Chart Calculations
  // ---------------------------------------------------------------------------
  const chartData = useMemo(() => {
    const data: Record<string, { date: string; success: number; failure: number; cost: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("it-IT", { month: "2-digit", day: "2-digit" });
      const key = d.toISOString().split("T")[0];
      data[key] = { date: dateStr, success: 0, failure: 0, cost: 0 };
    }

    events.forEach((e) => {
      if (!e.timestamp) return;
      const key = e.timestamp.split("T")[0];
      if (data[key]) {
        if (e.eventName === "recipe_import_completed") {
          data[key].success++;
        } else if (e.eventName === "recipe_import_failed") {
          data[key].failure++;
        } else if (e.eventName === "openrouter_call") {
          const cost = Number(e.params.cost) || 0;
          data[key].cost += cost;
        }
      }
    });

    return Object.values(data);
  }, [events]);

  const platformChartData = useMemo(() => {
    return [
      { platform: "Instagram", scans: platforms.instagram, fill: "#ec4899" },
      { platform: "TikTok", scans: platforms.tiktok, fill: "#2dd4bf" },
      { platform: "YouTube", scans: platforms.youtube, fill: "#ef4444" },
      { platform: "Facebook", scans: platforms.facebook, fill: "#3b82f6" },
      { platform: "Web", scans: platforms.web, fill: "hsl(var(--primary))" },
    ].filter(p => p.scans > 0); // Only show platforms with data to keep Pie clean
  }, [platforms]);

  const engagementChartData = useMemo(() => {
    return [
      { action: "Checklist Cottura", count: cookingChecks, fill: "hsl(var(--primary))" },
      { action: "Porzioni Ricalcolate", count: servingsChanged, fill: "#3b82f6" },
      { action: "Traduzioni AI", count: translations, fill: "#2dd4bf" },
      { action: "Info Nutrizionali", count: nutritionViews, fill: "#f59e0b" },
      { action: "Modifiche Spesa", count: shoppingToggles + customItemsAdded, fill: "#ec4899" },
    ];
  }, [cookingChecks, servingsChanged, translations, nutritionViews, shoppingToggles, customItemsAdded]);

  const ingestChartConfig = {
    success: { label: "Successi", color: "hsl(var(--primary))" },
    failure: { label: "Fallimenti", color: "hsl(var(--destructive))" },
  } satisfies ChartConfig;

  const costChartConfig = {
    cost: { label: "Spesa ($)", color: "#f59e0b" },
  } satisfies ChartConfig;

  const platformChartConfig = {
    scans: { label: "Scansioni" },
    instagram: { label: "Instagram", color: "#ec4899" },
    tiktok: { label: "TikTok", color: "#2dd4bf" },
    youtube: { label: "YouTube", color: "#ef4444" },
    facebook: { label: "Facebook", color: "#3b82f6" },
    web: { label: "Siti Web", color: "hsl(var(--primary))" },
  } satisfies ChartConfig;

  const engagementChartConfig = {
    count: { label: "Interazioni", color: "hsl(var(--primary))" },
  } satisfies ChartConfig;

  const filteredLogs = events.filter((e) => {
    if (!logSearchQuery.trim()) return true;
    const q = logSearchQuery.toLowerCase();
    return (
      e.eventName.toLowerCase().includes(q) ||
      (e.userEmail && e.userEmail.toLowerCase().includes(q)) ||
      (e.userId && e.userId.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // OpenRouter call log processing
  const openRouterCalls = events.filter((e) => e.eventName === "openrouter_call");
  
  const filteredOpenRouterCalls = openRouterCalls.filter((e) => {
    if (openRouterFilter === "all") return true;
    return e.params.type === openRouterFilter;
  });

  const openRouterItemsPerPage = 15;
  const totalOpenRouterPages = Math.ceil(filteredOpenRouterCalls.length / openRouterItemsPerPage);
  const paginatedOpenRouterCalls = filteredOpenRouterCalls.slice(
    (openRouterPage - 1) * openRouterItemsPerPage,
    openRouterPage * openRouterItemsPerPage
  );

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram": return <Film className="h-4 w-4 text-pink-500" />;
      case "tiktok": return <Video className="h-4 w-4 text-teal-400" />;
      case "youtube": return <YouTubeIcon className="h-4 w-4 text-red-500" />;
      case "facebook": return <FacebookIcon className="h-4 w-4 text-blue-500" />;
      default: return <Globe className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16 relative w-full animate-in fade-in duration-500">
      
      {/* Admin Title */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">Area Amministrativa</span>
          </div>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Dashboard KPI & Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Analizza in tempo reale le performance di GustoSmart e il comportamento degli utenti (dati conservati per gli ultimi 7 giorni).
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="glass-panel px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-sm text-xs font-bold text-muted-foreground">
          <Database className="h-4 w-4 text-secondary fill-secondary/10" />
          <span>Real-time Live Sync</span>
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </section>

      {/* Tabs Switcher */}
      <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-1 bg-surface-container-low dark:bg-surface-container p-1 rounded-2xl border border-white/5 w-full sm:w-auto self-start shadow-sm max-w-full">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 ${
            activeTab === "overview"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Panoramica
        </button>
        <button
          onClick={() => setActiveTab("ingest")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 ${
            activeTab === "ingest"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Analisi Ingest
        </button>
        <button
          onClick={() => setActiveTab("openrouter")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 flex items-center gap-1 ${
            activeTab === "openrouter"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          Spese OpenRouter
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 ${
            activeTab === "logs"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Registro Eventi ({events.length})
        </button>
      </div>

      {loadingEvents ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="p-6 rounded-[24px] border border-white/10 bg-muted/10 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-8">
              
              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Initiated Scans */}
                <Card className="glass-panel p-5 rounded-[24px] border border-white/10 shadow-lg shadow-primary/5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Scansioni Avviate</span>
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-extrabold text-foreground leading-none">{initiatedImports.length}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Richieste totali di scansione</p>
                  </div>
                </Card>

                {/* Ingestion Success Rate */}
                <Card className="glass-panel p-5 rounded-[24px] border border-white/10 shadow-lg shadow-primary/5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Tasso di Successo</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-extrabold text-foreground leading-none">{successRate}%</h3>
                    <div className="w-full bg-emerald-500/10 h-1.5 rounded-full overflow-hidden mt-2 border border-emerald-500/5">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${successRate}%` }}></div>
                    </div>
                  </div>
                </Card>

                {/* Recipes Saved (Engagement) */}
                <Card className="glass-panel p-5 rounded-[24px] border border-white/10 shadow-lg shadow-primary/5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Salvataggi Ricettario</span>
                    <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
                      <Bookmark className="h-4 w-4 fill-secondary/20" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-extrabold text-foreground leading-none">{recipesSaved}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Ricette aggiunte dai ricettari</p>
                  </div>
                </Card>

                {/* PWA Installs */}
                <Card className="glass-panel p-5 rounded-[24px] border border-white/10 shadow-lg shadow-primary/5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Installazioni PWA</span>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <Smartphone className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-extrabold text-foreground leading-none">{pwaInstalls}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1 flex flex-wrap gap-1">
                      <span>Accettati: {pwaPromptsAccepted}</span>
                      <span className="text-muted-foreground/60">/</span>
                      <span>Mostrati: {pwaPromptsShown}</span>
                    </p>
                  </div>
                </Card>
              </div>

              {/* Grid: Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Ingestion success trend (Daily) */}
                <Card className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-xl shadow-primary/5">
                  <CardHeader className="p-0 mb-5">
                    <CardTitle className="text-base font-bold text-foreground">Trend Ingestione (Ultimi 7 Giorni)</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Rapporto tra importazioni completate e fallite.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-[240px] w-full">
                    <ChartContainer config={ingestChartConfig} className="h-full w-full">
                      <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorFailure" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-failure)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--color-failure)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          className="fill-muted-foreground text-[10px] font-mono"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          className="fill-muted-foreground text-[10px] font-mono"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="success"
                          stroke="var(--color-success)"
                          fillOpacity={1}
                          fill="url(#colorSuccess)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="failure"
                          stroke="var(--color-failure)"
                          fillOpacity={1}
                          fill="url(#colorFailure)"
                          strokeWidth={2}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* OpenRouter cost trend (Daily) */}
                <Card className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-xl shadow-primary/5">
                  <CardHeader className="p-0 mb-5">
                    <CardTitle className="text-base font-bold text-foreground">Costo OpenRouter Giornaliero</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Spesa totale accumulata (in USD) degli ultimi 7 giorni.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-[240px] w-full">
                    <ChartContainer config={costChartConfig} className="h-full w-full">
                      <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-cost)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          className="fill-muted-foreground text-[10px] font-mono"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(val) => `$${Number(val).toFixed(3)}`}
                          className="fill-muted-foreground text-[10px] font-mono"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="cost"
                          stroke="var(--color-cost)"
                          fillOpacity={1}
                          fill="url(#colorCost)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Platform Distribution donut */}
                <Card className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-xl shadow-primary/5 flex flex-col justify-between">
                  <CardHeader className="p-0 mb-5">
                    <CardTitle className="text-base font-bold text-foreground">Provenienza Ricette</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Percentuale delle scansioni per social/sito.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col justify-center min-h-[240px]">
                    {platformChartData.length === 0 ? (
                      <div className="text-center py-12 text-xs text-muted-foreground">Nessun dato di provenienza disponibile.</div>
                    ) : (
                      <ChartContainer config={platformChartConfig} className="mx-auto aspect-square max-h-[220px] w-full">
                        <PieChart>
                          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                          <Pie
                            data={platformChartData}
                            dataKey="scans"
                            nameKey="platform"
                            innerRadius={50}
                            outerRadius={75}
                            strokeWidth={3}
                            paddingAngle={2}
                          >
                            {platformChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartLegend content={<ChartLegendContent nameKey="platform" />} />
                        </PieChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Feature Engagement Bar Chart */}
                <Card className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-xl shadow-primary/5">
                  <CardHeader className="p-0 mb-5">
                    <CardTitle className="text-base font-bold text-foreground">Utilizzo Funzionalità</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Frequenza delle azioni interattive degli utenti.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-[240px] w-full">
                    <ChartContainer config={engagementChartConfig} className="h-full w-full">
                      <BarChart
                        data={engagementChartData}
                        layout="vertical"
                        margin={{ left: 10, right: 10, top: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="action"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          width={100}
                          className="fill-foreground text-[9px] font-semibold"
                        />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="count" radius={4}>
                          {engagementChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}

          {/* TAB 2: INGEST METRICS */}
          {activeTab === "ingest" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Platform Distribution Chart */}
              <div className="lg:col-span-6">
                <Card className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-xl shadow-primary/5 h-full">
                  <h3 className="font-heading text-lg font-bold text-foreground mb-6">
                    Distribuzione per Piattaforma Source
                  </h3>

                  <div className="space-y-5">
                    {Object.entries(platforms).map(([platform, count]) => {
                      const total = initiatedImports.length || 1;
                      const pct = Math.round((count / total) * 100);
                      const barColors: Record<string, string> = {
                        instagram: "bg-pink-500",
                        tiktok: "bg-teal-400",
                        youtube: "bg-red-500",
                        facebook: "bg-blue-500",
                        web: "bg-primary"
                      };

                      return (
                        <div key={platform} className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-28 shrink-0">
                            {getPlatformIcon(platform)}
                            <span className="text-xs font-semibold capitalize text-foreground">{platform}</span>
                          </div>
                          
                          <div className="flex-1 bg-muted/50 h-3.5 rounded-full overflow-hidden border border-white/5 relative">
                            <div
                              className={`${barColors[platform] || "bg-primary"} h-full rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="w-12 text-right shrink-0">
                            <span className="text-xs font-bold text-foreground">{count}</span>
                            <span className="text-[10px] text-muted-foreground block font-semibold">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-border/30 mt-6 pt-5 flex justify-between items-center text-xs text-muted-foreground">
                    <span>Cache Hit Generati</span>
                    <span className="font-bold text-foreground">{cacheHits} ricette ({initiatedImports.length > 0 ? Math.round((cacheHits / (completedImports.length || 1)) * 100) : 0}% dei successi)</span>
                  </div>
                </Card>
              </div>

              {/* Ingestion Success Log Summary */}
              <div className="lg:col-span-6">
                <Card className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-xl shadow-primary/5 h-full">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      Stato Globale Ingestione
                    </h3>
                    {scrapecreatorsCredits !== undefined && (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 bg-primary/10 text-primary">
                        Token ScrapeCreators: {scrapecreatorsCredits.toLocaleString("it-IT")}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-muted/10 p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Import Completati</span>
                      <span className="text-2xl font-extrabold text-emerald-500">{completedImports.length}</span>
                    </div>
                    <div className="bg-muted/10 p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Import Falliti</span>
                      <span className="text-2xl font-extrabold text-rose-500">{failedImports.length}</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Ultime 5 Ingestioni Fallite</h4>
                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                    {failedImports.slice(0, 5).map((log) => {
                      const platform = (log.params.source_platform as string | undefined) || "web";
                      const errorType = (log.params.error_type as string | undefined) || "UNKNOWN";
                      return (
                        <div key={log.id} className="p-3 rounded-xl border border-rose-500/10 bg-rose-500/5 text-xs flex justify-between items-start gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              {getPlatformIcon(platform)}
                              Errore: {errorType}
                            </span>
                            <span className="text-muted-foreground text-[10px] font-medium truncate max-w-[200px] block">
                              Utente: {log.userEmail || "Anonimo"}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground tracking-wider shrink-0 mt-0.5">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""}
                          </span>
                        </div>
                      );
                    })}

                    {failedImports.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Nessun errore di importazione recente.</p>
                    )}
                  </div>
                </Card>
              </div>

            </div>
          )}

          {/* TAB 3: OPENROUTER SPENDING */}
          {activeTab === "openrouter" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              {loadingOpenRouter ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Caricamento crediti e limiti da OpenRouter API...</p>
                </div>
              ) : openRouterError ? (
                <Card className="glass-panel p-6 border-rose-500/10 bg-rose-500/5 text-center max-w-md mx-auto rounded-3xl flex flex-col items-center gap-3">
                  <AlertTriangle className="h-10 w-10 text-rose-500" />
                  <h4 className="font-bold text-foreground">Impossibile caricare i dati OpenRouter</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{openRouterError}</p>
                  <Button onClick={() => router.refresh()} className="rounded-full mt-2">Riprova</Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Credits Usage Card */}
                  <Card className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-xl shadow-primary/5 lg:col-span-7 flex flex-col justify-between gap-5">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Crediti e Saldo
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Stato finanziario dell&apos;account e della chiave API legata a OpenRouter.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
                      <div className="bg-muted/10 p-4 rounded-2xl border border-white/5 text-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Acquistati</span>
                        <span className="text-xl font-extrabold text-foreground">
                          ${openRouterCredits?.total_credits !== undefined ? openRouterCredits.total_credits.toFixed(2) : "0.00"}
                        </span>
                      </div>
                      <div className="bg-muted/10 p-4 rounded-2xl border border-white/5 text-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Spesi</span>
                        <span className="text-xl font-extrabold text-primary">
                          ${openRouterCredits?.total_usage !== undefined ? openRouterCredits.total_usage.toFixed(2) : "0.00"}
                        </span>
                      </div>
                      <div className="bg-muted/10 p-4 rounded-2xl border border-white/5 text-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Residuo</span>
                        <span className="text-xl font-extrabold text-emerald-500">
                          ${openRouterCredits?.cash_balance !== undefined ? openRouterCredits.cash_balance.toFixed(2) : (openRouterCredits?.total_remaining !== undefined ? openRouterCredits.total_remaining.toFixed(2) : "0.00")}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Spent vs Total */}
                    {openRouterCredits && (
                      <div className="space-y-1.5 px-1">
                        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                          <span>Consumo Crediti</span>
                          <span>
                            {openRouterCredits.total_credits > 0
                              ? Math.round((openRouterCredits.total_usage / openRouterCredits.total_credits) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{
                              width: `${openRouterCredits.total_credits > 0 ? Math.min(100, (openRouterCredits.total_usage / openRouterCredits.total_credits) * 100) : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Key and Rate Limits Card */}
                  <Card className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-xl shadow-primary/5 lg:col-span-5 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-secondary" />
                        Limiti e Rate Limit
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Restrizioni di velocità e budget impostati sulla chiave API corrente.
                      </p>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                        <span className="font-semibold text-muted-foreground">Label Chiave</span>
                        <span className="font-bold text-foreground font-mono">{openRouterKey?.label || "GustoSmart Key"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                        <span className="font-semibold text-muted-foreground">Tipo Account</span>
                        <span className="font-bold text-foreground">
                          {openRouterKey?.is_free_tier ? "Free Tier" : "Paid / Premium"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                        <span className="font-semibold text-muted-foreground">Limite di Spesa</span>
                        <span className="font-bold text-foreground">
                          {openRouterKey?.limit !== null && openRouterKey?.limit !== undefined ? `$ ${openRouterKey.limit.toFixed(2)}` : "Nessun limite"}
                        </span>
                      </div>
                      {openRouterKey?.limit_remaining !== undefined && openRouterKey?.limit_remaining !== null && (
                        <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                          <span className="font-semibold text-muted-foreground">Credito Rimanente Chiave</span>
                          <span className="font-bold text-emerald-500">$ {openRouterKey.limit_remaining.toFixed(4)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                        <span className="font-semibold text-muted-foreground">Spesa Accumulata Chiave</span>
                        <span className="font-bold text-foreground">$ {openRouterKey?.usage !== undefined ? openRouterKey.usage.toFixed(4) : "0.0000"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                        <span className="font-semibold text-muted-foreground">Spesa Giornaliera</span>
                        <span className="font-bold text-foreground">$ {openRouterKey?.usage_daily !== undefined ? openRouterKey.usage_daily.toFixed(4) : "0.0000"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                        <span className="font-semibold text-muted-foreground">Spesa Settimanale</span>
                        <span className="font-bold text-foreground">$ {openRouterKey?.usage_weekly !== undefined ? openRouterKey.usage_weekly.toFixed(4) : "0.0000"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                        <span className="font-semibold text-muted-foreground">Spesa Mensile</span>
                        <span className="font-bold text-foreground">$ {openRouterKey?.usage_monthly !== undefined ? openRouterKey.usage_monthly.toFixed(4) : "0.0000"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="font-semibold text-muted-foreground">Rate Limit</span>
                        <span className="font-bold text-foreground">
                          {openRouterKey?.rate_limit 
                            ? (openRouterKey.rate_limit.requests === -1 ? "Illimitato" : `${openRouterKey.rate_limit.requests} req / ${openRouterKey.rate_limit.interval}`)
                            : "Nessun limite"}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* OpenRouter Calls Table */}
                  <Card className="glass-panel rounded-[28px] border border-white/10 overflow-hidden shadow-xl shadow-primary/5 col-span-1 lg:col-span-12">
                    <div className="p-6 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/20">
                      <div>
                        <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          Log Chiamate OpenRouter
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Elenco di tutte le chiamate API di generazione e traduzione effettuate tramite OpenRouter.
                        </p>
                      </div>
                      
                      {/* Filter Pills */}
                      <div className="flex bg-surface-container-low dark:bg-surface-container p-0.5 rounded-xl border border-white/5 shadow-sm text-[11px] font-bold">
                        <button
                          onClick={() => { setOpenRouterFilter("all"); setOpenRouterPage(1); }}
                          className={`px-3.5 py-1.5 rounded-lg transition-all ${
                            openRouterFilter === "all"
                              ? "bg-primary text-white shadow"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Tutte
                        </button>
                        <button
                          onClick={() => { setOpenRouterFilter("ingest"); setOpenRouterPage(1); }}
                          className={`px-3.5 py-1.5 rounded-lg transition-all ${
                            openRouterFilter === "ingest"
                              ? "bg-primary text-white shadow"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Ingest
                        </button>
                        <button
                          onClick={() => { setOpenRouterFilter("translate"); setOpenRouterPage(1); }}
                          className={`px-3.5 py-1.5 rounded-lg transition-all ${
                            openRouterFilter === "translate"
                              ? "bg-primary text-white shadow"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Traduzioni
                        </button>
                      </div>
                    </div>

                    {/* Mobile Card List view */}
                    <div className="block md:hidden divide-y divide-border/10">
                      {paginatedOpenRouterCalls.map((log) => {
                        const type = (log.params.type as string) || "unknown";
                        const promptTokens = (log.params.prompt_tokens as number) ?? 0;
                        const completionTokens = (log.params.completion_tokens as number) ?? 0;
                        const cost = (log.params.cost as number) ?? 0;
                        const genId = (log.params.generation_id as string) || "";
                        
                        return (
                          <div key={log.id} className="p-4 flex flex-col gap-3 hover:bg-muted/5 transition-colors">
                            <div className="flex justify-between items-start">
                              <span className="font-mono text-[9px] text-muted-foreground">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString("it-IT") : "—"}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                                type === "ingest"
                                  ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                                  : type === "translate"
                                  ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}>
                                {type === "ingest" ? "Ingest" : type === "translate" ? "Traduzione" : type}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-foreground truncate max-w-[180px]">{log.userEmail || "Anonimo"}</span>
                                <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[150px]">{log.userId || "—"}</span>
                              </div>
                              <span className="font-mono font-bold text-xs text-primary">${cost.toFixed(6)}</span>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/10 pt-2">
                              <span>Tokens: <strong className="text-foreground">{promptTokens + completionTokens}</strong> (In: {promptTokens} | Out: {completionTokens})</span>
                              {genId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedGenerationId(genId)}
                                  className="h-7 px-2.5 rounded-lg border-primary/20 text-primary hover:bg-primary/5 text-[10px]"
                                >
                                  <Info className="h-3.5 w-3.5 mr-1" data-icon="inline-start" />
                                  Dettagli
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filteredOpenRouterCalls.length === 0 && (
                        <p className="p-8 text-center text-xs text-muted-foreground">Nessuna chiamata registrata.</p>
                      )}
                    </div>

                    {/* Desktop Table view */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-muted/30 border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <th className="p-4 pl-6">Timestamp</th>
                            <th className="p-4">Utente</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Token (Input/Output)</th>
                            <th className="p-4">Costo</th>
                            <th className="p-4 text-center">Dettagli</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20 text-xs">
                          {paginatedOpenRouterCalls.map((log) => {
                            const type = (log.params.type as string) || "unknown";
                            const promptTokens = (log.params.prompt_tokens as number) ?? 0;
                            const completionTokens = (log.params.completion_tokens as number) ?? 0;
                            const cost = (log.params.cost as number) ?? 0;
                            const genId = (log.params.generation_id as string) || "";
                            
                            return (
                              <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                                <td className="p-4 pl-6 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-foreground">{log.userEmail || "Anonimo"}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{log.userId || "—"}</span>
                                  </div>
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                                    type === "ingest"
                                      ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                                      : type === "translate"
                                      ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                      : "bg-muted text-muted-foreground border-border"
                                  }`}>
                                    {type === "ingest" ? "Ingest" : type === "translate" ? "Traduzione" : type}
                                  </span>
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="text-foreground font-medium">Totale: {promptTokens + completionTokens}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      In: {promptTokens} | Out: {completionTokens}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-4 whitespace-nowrap font-mono font-bold text-primary">
                                  ${cost.toFixed(6)}
                                </td>
                                <td className="p-4 text-center">
                                  {genId ? (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => setSelectedGenerationId(genId)}
                                      className="h-8 w-8 rounded-lg border-primary/20 text-primary hover:bg-primary/5"
                                      title="Mostra dettagli chiamata OpenRouter"
                                    >
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {filteredOpenRouterCalls.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-12 text-center text-sm text-muted-foreground">
                                Nessuna chiamata registrata per questa selezione.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalOpenRouterPages > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-5 border-t border-border/20 bg-muted/5 text-xs text-muted-foreground font-semibold">
                        <div>
                          Mostrati {Math.min(filteredOpenRouterCalls.length, (openRouterPage - 1) * openRouterItemsPerPage + 1)} - {Math.min(filteredOpenRouterCalls.length, openRouterPage * openRouterItemsPerPage)} di {filteredOpenRouterCalls.length} chiamate
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenRouterPage((p) => Math.max(1, p - 1))}
                            disabled={openRouterPage === 1}
                            className="rounded-xl px-3 py-1.5 h-8 font-bold border-border/20 hover:bg-muted/10"
                          >
                            Precedente
                          </Button>
                          <span className="px-3">
                            Pagina {openRouterPage} di {totalOpenRouterPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenRouterPage((p) => Math.min(totalOpenRouterPages, p + 1))}
                            disabled={openRouterPage === totalOpenRouterPages}
                            className="rounded-xl px-3 py-1.5 h-8 font-bold border-border/20 hover:bg-muted/10"
                          >
                            Successiva
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>

                </div>
              )}
            </div>
          )}

          {/* TAB 4: REGISTRO EVENTI */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              {/* Notice */}
              <div className="flex items-center gap-2.5 px-4 py-3 bg-primary/5 border border-primary/10 rounded-2xl text-xs text-muted-foreground font-semibold">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span>Nota: I log degli eventi e le spese OpenRouter vengono conservati per un massimo di 7 giorni (Retention Policy TTL attiva).</span>
              </div>

              {/* Search Log Bar */}
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 transition-colors group-focus-within:text-primary" />
                <Input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Filtra per nome evento, email utente..."
                  className="w-full pl-12 pr-4 py-5 rounded-2xl bg-surface-container/60 border-0 focus-visible:ring-2 focus-visible:ring-primary/20 text-sm placeholder:text-muted-foreground transition-all"
                />
              </div>

              {/* Logs Card List */}
              <Card className="glass-panel rounded-[28px] border border-white/10 overflow-hidden shadow-xl shadow-primary/5">
                {/* Mobile Card List view */}
                <div className="block md:hidden divide-y divide-border/10">
                  {paginatedLogs.map((log) => {
                    const hasGenId = !!log.params.generation_id;
                    return (
                      <div key={log.id} className="p-4 flex flex-col gap-3 hover:bg-muted/5 transition-colors">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-[9px] text-muted-foreground">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString("it-IT") : "—"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/5 text-[9px]">
                            {log.eventName}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-xs text-foreground">{log.userEmail || "Anonimo"}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">{log.userId || "—"}</span>
                        </div>

                        <div className="flex items-center gap-2 border-t border-border/10 pt-2">
                          <div className="font-mono text-[9px] bg-muted/20 p-2 rounded-lg max-w-[280px] overflow-x-auto scrollbar-none text-muted-foreground border border-border/20 flex-1">
                            {JSON.stringify(log.params)}
                          </div>
                          {hasGenId && (
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => setSelectedGenerationId(log.params.generation_id as string)}
                              className="h-7 w-7 rounded-lg border-primary/20 text-primary hover:bg-primary/5 shrink-0"
                              title="Mostra costi generazione OpenRouter"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <p className="p-8 text-center text-xs text-muted-foreground">Nessun evento registrato.</p>
                  )}
                </div>

                {/* Desktop Table view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <th className="p-4 pl-6">Timestamp</th>
                        <th className="p-4">Evento</th>
                        <th className="p-4">Utente</th>
                        <th className="p-4">Dettagli Parametri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 text-xs">
                      {paginatedLogs.map((log) => {
                        const hasGenId = !!log.params.generation_id;
                        return (
                          <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                            <td className="p-4 pl-6 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-full font-bold bg-primary/10 text-primary border border-primary/5">
                                {log.eventName}
                              </span>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{log.userEmail || "Anonimo"}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{log.userId || "—"}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="font-mono text-[10px] bg-muted/20 p-2 rounded-lg max-w-[350px] overflow-x-auto scrollbar-none text-muted-foreground border border-border/20 flex-1">
                                  {JSON.stringify(log.params)}
                                </div>
                                {hasGenId && (
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setSelectedGenerationId(log.params.generation_id as string)}
                                    className="h-8 w-8 rounded-lg border-primary/20 text-primary hover:bg-primary/5 shrink-0"
                                    title="Mostra costi generazione OpenRouter"
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-sm text-muted-foreground">
                            Nessun evento corrisponde alla ricerca o nessun evento registrato.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-5 border-t border-border/20 bg-muted/5 text-xs text-muted-foreground font-semibold">
                    <div>
                      Mostrati {Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredLogs.length, currentPage * itemsPerPage)} di {filteredLogs.length} eventi
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-xl px-3 py-1.5 h-8 font-bold border-border/20 hover:bg-muted/10"
                      >
                        Precedente
                      </Button>
                      <span className="px-3">
                        Pagina {currentPage} di {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-xl px-3 py-1.5 h-8 font-bold border-border/20 hover:bg-muted/10"
                      >
                        Successiva
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {/* Modal: Generation Details */}
      {selectedGenerationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md rounded-[32px] bg-background dark:bg-surface-container p-6 shadow-2xl border border-white/20 dark:border-white/10 animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button
              onClick={() => setSelectedGenerationId(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-lg font-bold text-foreground">Dettaglio Generazione OpenRouter</h3>
              </div>

              {loadingGeneration ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Recupero dati da OpenRouter API...</p>
                </div>
              ) : generationError ? (
                <div className="text-center py-8 text-xs text-rose-500 font-semibold leading-relaxed">
                  <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-2" />
                  {generationError}
                </div>
              ) : generationDetail?.data ? (
                (() => {
                  const gen = generationDetail.data;
                  return (
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="text-muted-foreground font-semibold block mb-1">ID Generazione</span>
                        <span className="font-mono bg-muted/40 px-2 py-1 rounded border border-white/5 text-[10px] break-all block">
                          {gen.id}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground font-semibold block mb-0.5">Modello Utilizzato</span>
                          <span className="font-bold text-foreground truncate block">{gen.model || "gemini-3.1-flash-lite"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold block mb-0.5">Costo Generazione</span>
                          <span className="font-bold text-primary text-sm block">
                            ${gen.total_cost !== undefined ? gen.total_cost.toFixed(6) : "0.000000"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-muted/15 rounded-xl border border-white/5 text-center">
                        <div>
                          <span className="text-[10px] text-muted-foreground block mb-0.5">Token Prompt</span>
                          <span className="font-extrabold text-foreground">{gen.tokens_prompt ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block mb-0.5">Token Completion</span>
                          <span className="font-extrabold text-foreground">{gen.tokens_completion ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block mb-0.5">Latenza</span>
                          <span className="font-extrabold text-secondary">
                            {gen.latency !== undefined ? `${(gen.latency / 1000).toFixed(2)}s` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">Nessun dettaglio disponibile per questa generazione.</div>
              )}

              <Button onClick={() => setSelectedGenerationId(null)} className="w-full rounded-2xl py-5 mt-2 font-bold text-sm">
                Chiudi
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
