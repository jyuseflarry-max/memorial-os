import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { TeamProvider } from "@/context/TeamContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { DrillCategoryProvider } from "@/context/DrillCategoryContext";
import { DrillObjectivesProvider } from "@/context/DrillObjectivesContext";
import { DrillProvider } from "@/context/DrillContext";
import { AuthProvider } from "@/context/AuthContext";
import { LocationsProvider } from "@/context/LocationsContext";
import { StatImpactsProvider } from "@/context/StatImpactsContext";
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
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  title: "The Coach's OS",
  description: "The Coach's Operating System — practice planning, player readiness, and program management for every sport.",
  icons: { icon: "/thecoachsOS.jpg", apple: "/thecoachsOS.jpg" },
  openGraph: {
    title: "The Coach's OS",
    description: "The Coach's Operating System — practice planning, player readiness, and program management for every sport.",
    images: [{ url: "/og-coaches-os.jpg" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-coaches-os.jpg"],
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
        <AuthProvider>
          <SettingsProvider>
            <DrillCategoryProvider>
              <DrillObjectivesProvider>
                <PrintOrientationStyle />
                <LocationsProvider>
                  <StatImpactsProvider>
                    <TeamProvider>
                      <PlayerProvider>
                        <DrillProvider>{children}</DrillProvider>
                      </PlayerProvider>
                    </TeamProvider>
                  </StatImpactsProvider>
                </LocationsProvider>
              </DrillObjectivesProvider>
            </DrillCategoryProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
