"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, UtensilsCrossed, ShoppingCart, User, Plus } from "lucide-react";
import { ImportDrawer } from "@/components/import-drawer";

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const leftItems = [
    { label: t("home"), href: "/", icon: Home },
    { label: t("recipes"), href: "/recipes", icon: UtensilsCrossed },
  ];

  const rightItems = [
    { label: t("shoppingList"), href: "/shopping", icon: ShoppingCart },
    { label: t("profile"), href: "/profile", icon: User },
  ];

  return (
    <>
      <nav className="fixed bottom-6 left-1/2 z-50 h-20 w-[95%] -translate-x-1/2 items-center justify-between rounded-full border border-white/20 bg-background/60 px-4 py-2 shadow-[0_10px_40px_rgba(174,41,0,0.1)] backdrop-blur-2xl flex max-w-lg dark:bg-surface-container/60">
        <div className="flex w-full items-center justify-between">
          {/* Left Items */}
          <div className="flex flex-1 justify-around">
            {leftItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center px-4 py-2 transition-all duration-300 ease-out active:scale-90 rounded-full ${
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="mt-1 text-xs font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Middle Plus Button */}
          <button
            onClick={() => setIsImportOpen(true)}
            className="mx-2 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Importa ricetta"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>

          {/* Right Items */}
          <div className="flex flex-1 justify-around">
            {rightItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center px-4 py-2 transition-all duration-300 ease-out active:scale-90 rounded-full ${
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="mt-1 text-xs font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <ImportDrawer open={isImportOpen} onOpenChange={setIsImportOpen} />
    </>
  );
}
