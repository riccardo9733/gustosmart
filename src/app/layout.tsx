import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { StoreProvider } from "@/store/store-provider";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GustoSmart — Precision Cooking, Smart Living",
  description:
    "Importa ricette dai social, ricalcola le dosi e genera la tua lista della spesa intelligente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <StoreProvider>
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
