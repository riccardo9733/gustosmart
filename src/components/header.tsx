"use client";
 
import { Leaf, Zap, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile } from "@/store/userSlice";
import { useIngest } from "@/contexts/ingest-context";
 
export function Header() {
  const profile = useAppSelector(selectUserProfile);
  const { isIngesting, progress, openImportDrawer } = useIngest();
 
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-background/60 px-6 shadow-xl shadow-primary/5 backdrop-blur-xl dark:bg-surface-container/60">
      <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
        <Leaf className="h-6 w-6 text-primary" strokeWidth={2.5} />
        <h1 className="font-heading text-xl font-bold tracking-tight text-primary">
          GustoSmart
        </h1>
      </Link>
      <div className="flex items-center gap-3">
        {isIngesting && (
          <button
            onClick={openImportDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/15 dark:bg-secondary/25 rounded-full border border-secondary/30 hover:bg-secondary/25 cursor-pointer active:scale-95 transition-all animate-pulse shadow-md shadow-secondary/10"
            aria-label="Mostra progresso importazione"
          >
            <Loader2 className="h-3.5 w-3.5 text-secondary animate-spin" />
            <span className="text-[10px] font-extrabold text-secondary tracking-wider">
              {progress}%
            </span>
          </button>
        )}
        {profile?.role === "admin" && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 dark:bg-secondary/25 rounded-full border border-secondary/20 hover:bg-secondary/20 active:scale-95 transition-all text-secondary"
            aria-label="Dashboard Amministratore"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[10px] font-extrabold tracking-wider uppercase hidden sm:inline">Admin</span>
          </Link>
        )}
        {profile && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20">
            <Zap className="h-3.5 w-3.5 text-primary fill-primary animate-pulse" />
            <span className="text-xs font-extrabold text-primary tracking-wide">
              {profile.tokens ?? 10}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
