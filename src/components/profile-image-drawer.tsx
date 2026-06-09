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
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

interface ProfileImageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function ProfileImageDrawer({ isOpen, onClose, userId }: ProfileImageDrawerProps) {
  const t = useTranslations("Profile");
  const [file, setFile] = useState<File | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
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
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
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
      formData.append("file", file);
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
      await updateDoc(userRef, {
        photoURL: data.imageUrl,
        updatedAt: new Date().toISOString(),
      });

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
