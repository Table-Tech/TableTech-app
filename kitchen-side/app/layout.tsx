import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/shared/contexts/AuthContext";
import { LanguageProvider } from "@/shared/contexts/LanguageContext";
import { AuthGuard } from "@/shared/components/protection";
import { ErrorBoundary } from "@/shared/components/error";
import { LanguageKeyboardShortcut } from "@/shared/components/ui/LanguageToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TableTech Kitchen Dashboard",
  description: "Professional restaurant kitchen management system for order processing, inventory tracking, and team coordination",
  keywords: ["restaurant", "kitchen", "management", "orders", "pos"],
  authors: [{ name: "TableTech Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  robots: "noindex, nofollow", // Kitchen dashboard should not be indexed
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/site.webmanifest",
  other: {
    "theme-color": "#ffffff",
    "msapplication-TileColor": "#da532c",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary
          level="page"
          name="RootLayout"
        >
          <LanguageProvider>
            <AuthProvider>
              <ErrorBoundary
                level="section"
                name="AuthGuard"
              >
                <AuthGuard>
                  <LanguageKeyboardShortcut />
                  {children}
                </AuthGuard>
              </ErrorBoundary>
            </AuthProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}