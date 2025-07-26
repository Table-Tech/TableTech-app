import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

//client-side/app/client/layout.tsx

// Fonts configureren met CSS-variabelen
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    display: "swap",
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: "swap",
});

// Metadata voor SEO & PWA
export const metadata: Metadata = {
    title: "Restaurant Menu",
    description: "Bekijk en bestel vanaf je tafel",
    viewport: "width=device-width, initial-scale=1",
    themeColor: "#ffffff",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="nl">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-black`}
            >
                {children}
            </body>
        </html>
    );
}
