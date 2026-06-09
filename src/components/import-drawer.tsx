"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  Film,
  Video,
  Link as LinkIcon,
  Loader2,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIngest } from "@/contexts/ingest-context";

export function ImportDrawer() {
  const [videoUrl, setVideoUrl] = useState("");
  const {
    isIngesting,
    isDrawerOpen,
    closeImportDrawer,
    step,
    progress,
    error,
    recipeId,
    startIngest,
    resetIngest,
  } = useIngest();

  const router = useRouter();
  const t = useTranslations("Home");

  // Reset input field when drawer is opened and is idle
  useEffect(() => {
    if (isDrawerOpen && step === "idle") {
      setVideoUrl("");
    }
  }, [isDrawerOpen, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return;
    await startIngest(videoUrl.trim());
  };

  const getStepMessage = () => {
    switch (step) {
      case "scraping":
        return t("stepScraping");
      case "extracting":
        return t("stepAnalyzing");
      case "saving":
        return t("stepSaving");
      default:
        return t("importingDesc");
    }
  };

  const getErrorMessage = () => {
    if (error === "NO_TOKENS") {
      return t("noTokensErrorDesc");
    }
    if (error === "INSUFFICIENT_RECIPE_DATA") {
      return t("insufficientDataError");
    }
    if (error === "WEBSITE_FORBIDDEN") {
      return t("websiteForbidden");
    }
    return error || t("importFailedDesc");
  };

  return (
    <Drawer open={isDrawerOpen} onOpenChange={(open) => !open && closeImportDrawer()}>
      <DrawerContent className="max-h-[85vh] p-6 rounded-t-[32px] border-t border-white/20 bg-background dark:bg-surface-container/95 backdrop-blur-xl">
        {/* Elementi di accessibilità invisibili richiesti da Radix UI in tutti gli stati */}
        <div className="sr-only">
          <DrawerTitle>{t("drawerTitle") || "Importa una Ricetta"}</DrawerTitle>
          <DrawerDescription>
            {t("drawerDesc") || "Incolla il link di un Reel di Instagram, un video TikTok o una ricetta web per scansionarla e aggiungerla al catalogo."}
          </DrawerDescription>
        </div>

        <div className="flex flex-col gap-6 max-w-lg mx-auto w-full pb-10">
          
          {/* 1. STATE: IDLE (Input URL) */}
          {step === "idle" && (
            <>
              <DrawerHeader className="p-0 text-center flex flex-col gap-2">
                <div className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  {t("drawerTitle") || "Importa una Ricetta"}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {t("drawerDesc") || "Incolla il link di un Reel di Instagram, un video TikTok o una ricetta web per scansionarla e aggiungerla al catalogo."}
                </div>
              </DrawerHeader>

              <form onSubmit={handleSubmit} className="relative group w-full mt-2">
                <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full -z-10 transition-all duration-500 group-focus-within:bg-primary/20"></div>
                <div className="flex items-center glass-panel rounded-full p-1.5 shadow-xl shadow-primary/5 border border-primary/20 focus-within:border-primary transition-all">
                  <Input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder={t("placeholder")}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-5 text-sm h-11"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!videoUrl.trim()}
                    className="bg-primary hover:bg-primary/95 text-white rounded-full h-11 w-11 shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="fill-white" data-icon="inline-start" />
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setVideoUrl("https://www.instagram.com/reel/example")}
                  type="button"
                  className="glass-panel px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all border border-white/10 cursor-pointer"
                >
                  <Film className="h-4 w-4 text-primary" />
                  {t("instagram")}
                </button>
                <button
                  onClick={() => setVideoUrl("https://www.tiktok.com/@example/video/12345")}
                  type="button"
                  className="glass-panel px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all border border-white/10 cursor-pointer"
                >
                  <Video className="h-4 w-4 text-primary" />
                  {t("tiktok")}
                </button>
                <button
                  onClick={() => setVideoUrl("https://giallozafferano.it/ricette/example")}
                  type="button"
                  className="glass-panel px-4 py-2.5 rounded-full flex items-center gap-2 text-xs font-semibold text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all border border-white/10 cursor-pointer"
                >
                  <LinkIcon className="h-4 w-4 text-primary" />
                  {t("web")}
                </button>
              </div>

              <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/10 mt-2">
                <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-foreground">Come funziona?</span>
                  <span className="text-xs text-muted-foreground leading-snug">
                    I nostri sistemi analizzeranno la trascrizione del video o la pagina web per estrarre dosi, ingredienti e passaggi con l'intelligenza artificiale.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* 2. STATE: INGESTING (Progress bar) */}
          {isIngesting && step !== "completed" && step !== "failed" && (
            <div className="flex flex-col items-center justify-center text-center gap-6 py-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-125 animate-pulse"></div>
                <div className="relative flex items-center justify-center bg-primary/10 rounded-full p-5 border border-primary/20">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full px-4">
                <h3 className="font-heading text-xl font-bold text-foreground animate-pulse">
                  {t("importing")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed min-h-[40px]">
                  {getStepMessage()}
                </p>
              </div>

              <div className="w-full px-4 flex flex-col gap-1.5">
                <Progress value={progress} className="h-2.5 w-full bg-primary/10 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground text-right">
                  {progress}%
                </span>
              </div>

              <Button
                variant="outline"
                onClick={closeImportDrawer}
                className="mt-2 text-xs font-bold tracking-wide uppercase px-6 cursor-pointer"
              >
                Continua in background
              </Button>
            </div>
          )}

          {/* 3. STATE: COMPLETED (Success) */}
          {step === "completed" && (
            <div className="flex flex-col items-center justify-center text-center gap-6 py-6">
              <div className="relative">
                <div className="absolute inset-0 bg-secondary/20 blur-xl rounded-full scale-125 animate-bounce"></div>
                <div className="relative flex items-center justify-center bg-secondary/10 rounded-full p-5 border border-secondary/20">
                  <CheckCircle2 className="h-10 w-10 text-secondary" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-2xl font-bold text-secondary">
                  {t("importedSuccess")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {t("importedSuccessDesc")}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full mt-2">
                <Button
                  onClick={() => {
                    closeImportDrawer();
                    if (recipeId) {
                      router.push(`/recipes/${recipeId}`);
                    }
                  }}
                  className="bg-primary hover:bg-primary/95 text-white w-full rounded-xl py-6 font-bold text-base shadow-lg shadow-primary/20 cursor-pointer"
                >
                  {t("view")}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetIngest();
                  }}
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Importa un'altra ricetta
                </Button>
              </div>
            </div>
          )}

          {/* 4. STATE: FAILED (Error) */}
          {step === "failed" && (
            <div className="flex flex-col items-center justify-center text-center gap-6 py-6">
              <div className="relative">
                <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full scale-125"></div>
                <div className="relative flex items-center justify-center bg-destructive/10 rounded-full p-5 border border-destructive/20">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-2xl font-bold text-destructive">
                  {t("importFailed")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {getErrorMessage()}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full mt-2">
                <Button
                  onClick={() => {
                    resetIngest();
                  }}
                  className="bg-primary hover:bg-primary/95 text-white w-full rounded-xl py-6 font-bold text-base cursor-pointer"
                >
                  Riprova
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    closeImportDrawer();
                    resetIngest();
                  }}
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Chiudi
                </Button>
              </div>
            </div>
          )}

        </div>
      </DrawerContent>
    </Drawer>
  );
}
