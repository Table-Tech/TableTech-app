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
  title: "TableTech Kitchen",
  description: "Restaurant kitchen management system",
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