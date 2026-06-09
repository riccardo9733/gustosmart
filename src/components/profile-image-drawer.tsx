"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";

interface ProfileImageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

/**
 * Ridimensiona e taglia al centro un'immagine selezionata in un quadrato 384x384
 * e restituisce un Blob compresso in formato JPEG (qualità 0.85).
 */
const cropAndResizeImage = (file: File, targetSize = 384): Promise<{ blob: Blob; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Impossibile inizializzare il contesto Canvas 2D"));
          return;
        }

        // Calcola il ritaglio quadrato centrale
        const minSide = Math.min(img.width, img.height);
        const sourceX = (img.width - minSide) / 2;
        const sourceY = (img.height - minSide) / 2;

        // Disegna l'immagine ritagliata e riscalata sul canvas
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          minSide,
          minSide, // sorgente
          0,
          0,
          targetSize,
          targetSize // destinazione
        );

        // Converte in blob JPEG a qualità 0.85
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const previewUrl = URL.createObjectURL(blob);
              resolve({ blob, previewUrl });
            } else {
              reject(new Error("Errore durante la compressione dell'immagine"));
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => {
        reject(new Error("Errore durante il caricamento del file immagine"));
      };
    };
    reader.onerror = () => {
      reject(new Error("Errore durante la lettura del file"));
    };
  });
};

export function ProfileImageDrawer({ isOpen, onClose, userId }: ProfileImageDrawerProps) {
  const t = useTranslations("Profile");
  const [file, setFile] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setIsUploading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateFile = (selectedFile: File): boolean => {
    if (!selectedFile.type.startsWith("image/")) {
      toast.error(t("typeError"));
      return false;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error(t("sizeError"));
      return false;
    }
    return true;
  };

  const processImageFile = async (selectedFile: File) => {
    const toastId = toast.loading("Elaborazione immagine...");
    try {
      const { blob, previewUrl: url } = await cropAndResizeImage(selectedFile);
      setFile(blob);
      setPreviewUrl(url);
      toast.dismiss(toastId);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Errore durante l'elaborazione dell'immagine.";
      console.error(err);
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      processImageFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && validateFile(droppedFile)) {
      processImageFile(droppedFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      // Poiché file è un Blob JPEG generato dal canvas, diamo un nome coerente "profile.jpg"
      formData.append("file", file, "profile.jpg");
      formData.append("userId", userId);

      const response = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t("uploadFailed"));
      }

      // Update Firestore user document
      const db = getFirebaseDb();
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        photoURL: data.imageUrl,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      toast.success(t("uploadSuccess"));
      handleClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("uploadFailed");
      console.error("Errore durante il caricamento della foto profilo:", error);
      toast.error(errorMessage);
      setIsUploading(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()} repositionInputs={false}>
      <DrawerContent className="max-h-[85vh] p-6 rounded-t-[32px] border-t border-white/20 bg-background dark:bg-surface-container/95 backdrop-blur-xl">
        {/* Radix UI hidden accessibility title/description */}
        <div className="sr-only">
          <DrawerTitle>{t("uploadPhoto")}</DrawerTitle>
          <DrawerDescription>{t("uploadPhotoDesc")}</DrawerDescription>
        </div>

        <div className="flex flex-col gap-6 max-w-lg mx-auto w-full pb-10">
          <DrawerHeader className="p-0 text-center flex flex-col gap-2">
            <div className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {t("uploadPhoto")}
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              {t("uploadPhotoDesc")}
            </div>
          </DrawerHeader>

          {/* Drag & Drop Zone */}
          {!previewUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-[24px] p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.02]"
                  : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-full">
                <ImageIcon className="text-primary size-8" />
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <span className="font-semibold text-foreground text-sm">
                  {t("dragDrop")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("limits")}
                </span>
              </div>
            </div>
          ) : (
            /* Image Preview State */
            <div className="flex flex-col items-center justify-center gap-6 py-4">
              <div className="relative group size-32 rounded-full overflow-hidden border-4 border-white dark:border-surface-container shadow-xl">
                <img
                  src={previewUrl}
                  alt="Profile picture preview"
                  className="w-full h-full object-cover"
                />
                {!isUploading && (
                  <button
                    onClick={resetState}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <X className="text-white size-6" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 w-full">
                <Button
                  variant="outline"
                  onClick={resetState}
                  disabled={isUploading}
                  className="flex-1 rounded-xl py-5 font-semibold text-sm cursor-pointer"
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 rounded-xl py-5 font-semibold text-sm cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                      {t("uploading")}
                    </>
                  ) : (
                    <>
                      <Upload data-icon="inline-start" />
                      {t("confirmUpload")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
