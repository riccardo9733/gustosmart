"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, UtensilsCrossed, ShoppingCart, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  const navItems = [
    { label: t("home"), href: "/", icon: Home },
    { label: t("recipes"), href: "/recipes", icon: UtensilsCrossed },
    { label: t("shoppingList"), href: "/shopping", icon: ShoppingCart },
    { label: t("profile"), href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 h-20 w-[90%] -translate-x-1/2 items-center justify-around rounded-full border border-white/20 bg-background/60 p-2 shadow-[0_10px_40px_rgba(174,41,0,0.1)] backdrop-blur-2xl flex max-w-lg dark:bg-surface-container/60">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center px-5 py-2 transition-all duration-300 ease-out active:scale-90 rounded-full ${
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
    </nav>
  );
}
