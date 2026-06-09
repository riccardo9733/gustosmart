"use client";

import { AuthGuard } from "@/components/auth-guard";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { useSyncUser } from "@/hooks/useSyncUser";
import { IngestProvider } from "@/contexts/ingest-context";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useSyncUser();

  return (
    <AuthGuard>
      <IngestProvider>
        <div className="relative min-h-screen flex flex-col pb-32">
          <Header />
          <main className="flex-1 pt-20 px-6 max-w-5xl mx-auto w-full">
            {children}
          </main>
          <BottomNav />
        </div>
      </IngestProvider>
    </AuthGuard>
  );
}
