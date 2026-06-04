"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

/**
 * AuthGuard — client-side route protection.
 *
 * While Firebase is resolving the initial auth state it shows a branded
 * loading spinner. Once resolved, unauthenticated users are redirected
 * to `/login`. Authenticated users see the children.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // --- Not authenticated → redirect in progress ---
  if (!user) {
    return null;
  }

  // --- Authenticated ---
  return <>{children}</>;
}
