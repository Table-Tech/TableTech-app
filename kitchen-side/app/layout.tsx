import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/shared/contexts/AuthContext";
import { AuthGuard } from "@/shared/components/protection";
import { ErrorBoundary } from "@/shared/components/error";

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
          <AuthProvider>
            <ErrorBoundary
              level="section"
              name="AuthGuard"
            >
              <AuthGuard>
                {children}
              </AuthGuard>
            </ErrorBoundary>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}