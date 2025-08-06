import type { Metadata } from "next";

// Metadata voor SEO
export const metadata: Metadata = {
    title: "Restaurant Menu",
    description: "Bekijk en bestel vanaf je tafel",
};

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>
}
