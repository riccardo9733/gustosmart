"use client";
 
import { Leaf, Zap } from "lucide-react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { selectUserProfile } from "@/store/userSlice";
 
export function Header() {
  const profile = useAppSelector(selectUserProfile);
 
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-background/60 px-6 shadow-xl shadow-primary/5 backdrop-blur-xl dark:bg-surface-container/60">
      <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
        <Leaf className="h-6 w-6 text-primary" strokeWidth={2.5} />
        <h1 className="font-heading text-xl font-bold tracking-tight text-primary">
          GustoSmart
        </h1>
      </Link>
      <div className="flex items-center gap-3">
        {profile && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20">
            <Zap className="h-3.5 w-3.5 text-primary fill-primary animate-pulse" />
            <span className="text-xs font-extrabold text-primary tracking-wide">
              {profile.tokens ?? 10}
            </span>
          </div>
        )}
        <button 
          className="rounded-full p-2 text-primary transition-all hover:bg-primary/10 active:scale-95"
          aria-label="Smart features"
        >
          <Zap className="h-5 w-5 fill-primary" />
        </button>
      </div>
    </header>
  );
}
