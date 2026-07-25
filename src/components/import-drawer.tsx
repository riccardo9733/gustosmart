"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
  MessageSquare,
  ClipboardPaste,
  Globe,
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

const YouTubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.42V8.02a6.34 6.34 0 0 0-5.4 6.33 6.34 6.34 1 0 11.43-3.66v-4.1a8.16 8.16 0 0 0 4.08 1.1V6.69z" />
  </svg>
);

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isIngesting,
    isDrawerOpen,
    closeImportDrawer,
    step,
    progress,
    error,
    recipeId,
    startIngest,
    startImageIngest,
    startCommentSearch,
    resetIngest,
  } = useIngest();

  const router = useRouter();
  const t = useTranslations("Home");

  // Reset input field and selected file when drawer is opened and is idle
  useEffect(() => {
    if (isDrawerOpen && step === "idle") {
      setVideoUrl("");
      setSelectedFile(null);
    }
  }, [isDrawerOpen, step]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Seleziona un file immagine valido (PNG, JPG, WEBP).");
        return;
      }
      setSelectedFile(file);
      setVideoUrl(file.name);
      toast.success("Immagine selezionata!");
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setVideoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      await startImageIngest(selectedFile);
    } else if (videoUrl.trim()) {
      await startIngest(videoUrl.trim());
    }
  };

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.error("La lettura degli appunti non è supportata dal tuo browser.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setSelectedFile(null);
        setVideoUrl(text.trim());
        toast.success("Link incollato dagli appunti!");
      } else {
        toast.info("Nessun testo trovato negli appunti.");
      }
    } catch (err) {
      console.error("Errore lettura appunti:", err);
      toast.error("Impossibile accedere agli appunti. Incolla manualmente.");
    }
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
    if (error === "ANALYSIS_TIMEOUT") {
      return t("analysisTimeoutError");
    }
    return error || t("importFailedDesc");
  };

  return (
    <Drawer open={isDrawerOpen} onOpenChange={(open) => !open && closeImportDrawer()} repositionInputs={false}>
      <DrawerContent className="max-h-[85vh] p-6 rounded-t-[32px] border-t border-white/20 bg-background dark:bg-surface-container/95 backdrop-blur-xl">
        {/* Elementi di accessibilità invisibili richiesti da Radix UI in tutti gli stati */}
        <div className="sr-only">
          <DrawerTitle>{t("drawerTitle") || "Importa una Ricetta"}</DrawerTitle>
          <DrawerDescription>
            {t("drawerDesc") || "Incolla il link di un Reel di Instagram, un video TikTok o carica una foto della ricetta."}
          </DrawerDescription>
        </div>

        <div className="flex flex-col gap-6 max-w-lg mx-auto w-full pb-10">
          
          {/* 1. STATE: IDLE (Input URL o Immagine) */}
          {step === "idle" && (
            <>
              <DrawerHeader className="p-0 text-center flex flex-col gap-2">
                <div className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  {t("drawerTitle") || "Importa una Ricetta"}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  Incolla un link o carica uno screenshot/foto della tua ricetta.
                </div>
              </DrawerHeader>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <form onSubmit={handleSubmit} className="relative group w-full mt-2">
                <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full -z-10 transition-all duration-500 group-focus-within:bg-primary/20"></div>
                <div className="flex items-center glass-panel rounded-2xl sm:rounded-full p-2 shadow-xl shadow-primary/5 border border-primary/20 focus-within:border-primary transition-all gap-1.5">
                  
                  {/* Plus icon to upload image */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-xl sm:rounded-full transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                    title="Carica foto o screenshot"
                  >
                    <Plus className="h-5 w-5" />
                  </button>

                  <div className="text-primary/70 shrink-0">
                    {selectedFile ? (
                      <ImageIcon className="h-5 w-5 text-primary" />
                    ) : (
                      <LinkIcon className="h-5 w-5" />
                    )}
                  </div>

                  <Input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => {
                      if (!selectedFile) setVideoUrl(e.target.value);
                    }}
                    readOnly={!!selectedFile}
                    placeholder={t("placeholder") || "Incolla il link o carica foto..."}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 h-11 text-sm md:text-base text-foreground placeholder:text-muted-foreground/60"
                  />

                  {videoUrl && !selectedFile && (
                    <button
                      type="button"
                      onClick={() => setVideoUrl("")}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors shrink-0 cursor-pointer"
                      title="Cancella"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {selectedFile ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveFile}
                      className="glass-panel text-xs font-semibold px-3 h-10 rounded-xl sm:rounded-full flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/15 active:scale-95 transition-all border border-destructive/20 shrink-0 cursor-pointer"
                      title="Rimuovi immagine"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="hidden sm:inline">Rimuovi</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handlePaste}
                      className="glass-panel text-xs font-semibold px-3 h-10 rounded-xl sm:rounded-full flex items-center gap-1.5 text-primary hover:text-primary hover:bg-primary/15 active:scale-95 transition-all border border-primary/20 shrink-0 cursor-pointer"
                      title="Incolla dagli appunti"
                    >
                      <ClipboardPaste className="h-4 w-4 text-primary" />
                      <span className="hidden sm:inline">Incolla</span>
                    </Button>
                  )}

                  <Button
                    type="submit"
                    disabled={!videoUrl.trim()}
                    className="bg-primary hover:bg-primary/95 text-white rounded-xl sm:rounded-full h-10 px-4 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 font-semibold gap-1.5"
                  >
                    <Sparkles className="h-4 w-4 fill-white" />
                    <span className="hidden sm:inline">Importa</span>
                  </Button>
                </div>
              </form>

              {/* Badges delle Piattaforme Supportate (Informativi, non cliccabili) */}
              <div className="flex flex-col items-center gap-3 mt-1">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Funziona con
                </span>
                <div className="flex flex-wrap justify-center items-center gap-2">
                  {/* Instagram Reel */}
                  <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium text-foreground border border-white/10 dark:border-white/5 bg-background/50 dark:bg-white/5 shadow-xs">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shrink-0">
                      <Film className="h-3 w-3" />
                    </span>
                    <span>Instagram Reel</span>
                  </div>

                  {/* YouTube Short */}
                  <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium text-foreground border border-white/10 dark:border-white/5 bg-background/50 dark:bg-white/5 shadow-xs">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white shrink-0">
                      <YouTubeIcon className="h-2.5 w-2.5 fill-current text-white" />
                    </span>
                    <span>YouTube Short</span>
                  </div>

                  {/* Facebook Reel */}
                  <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium text-foreground border border-white/10 dark:border-white/5 bg-background/50 dark:bg-white/5 shadow-xs">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white shrink-0">
                      <FacebookIcon className="h-2.5 w-2.5 fill-current text-white" />
                    </span>
                    <span>Facebook Reel</span>
                  </div>

                  {/* TikTok */}
                  <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium text-foreground border border-white/10 dark:border-white/5 bg-background/50 dark:bg-white/5 shadow-xs">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-black dark:bg-zinc-800 text-teal-400 shrink-0">
                      <TikTokIcon className="h-3 w-3" />
                    </span>
                    <span>TikTok</span>
                  </div>

                  {/* Pagine Web */}
                  <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium text-foreground border border-white/10 dark:border-white/5 bg-background/50 dark:bg-white/5 shadow-xs">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary shrink-0">
                      <Globe className="h-3 w-3" />
                    </span>
                    <span>Pagine Web</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start bg-primary/5 p-4 rounded-2xl border border-primary/10 mt-1">
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

          {/* 3b. STATE: NEEDS COMMENT SEARCH (Instagram only) */}
          {step === "needsCommentSearch" && (
            <div className="flex flex-col items-center justify-center text-center gap-6 py-6">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full scale-125 animate-pulse"></div>
                <div className="relative flex items-center justify-center bg-amber-500/10 rounded-full p-5 border border-amber-500/20">
                  <MessageSquare className="h-10 w-10 text-amber-500" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {t("commentSearchTitle")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {t("commentSearchDesc")}
                </p>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                  {t("commentSearchCost")}
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full mt-2">
                <Button
                  onClick={() => startCommentSearch()}
                  className="bg-amber-500 hover:bg-amber-600 text-white w-full rounded-xl py-6 font-bold text-base shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  {t("commentSearchBtn")}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    closeImportDrawer();
                    resetIngest();
                  }}
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  {t("commentSearchCancel")}
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
