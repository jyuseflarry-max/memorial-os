import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { TeamProvider } from "@/context/TeamContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { DrillCategoryProvider } from "@/context/DrillCategoryContext";
import PrintOrientationStyle from "@/components/PrintOrientationStyle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Memorial Basketball OS",
  description: "Mission Control for the Memorial Mustangs basketball program",
  icons: { icon: "/mustang-logo.png", apple: "/mustang-logo.png" },
  openGraph: {
    title: "Mustang Basketball OS: Command Center",
    description: "Precision Coaching, Elite Analytics, and Mustang Culture. Fueling Memorial Basketball.",
    images: [{ url: "/og-memorial-os.png" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-memorial-os.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <SettingsProvider>
          <DrillCategoryProvider>
            <PrintOrientationStyle />
            <TeamProvider>
              <PlayerProvider>{children}</PlayerProvider>
            </TeamProvider>
          </DrillCategoryProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
