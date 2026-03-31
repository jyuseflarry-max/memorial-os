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
import { PermissionsProvider } from "@/context/PermissionsContext";
import { LocationsProvider } from "@/context/LocationsContext";
import { FacilitiesProvider } from "@/context/FacilitiesContext";
import { ThemeProvider } from "@/context/ThemeContext";
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
      <head>
        {/* Runs synchronously before paint — prevents flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <ThemeProvider>
        <AuthProvider>
          <PermissionsProvider>
            <SettingsProvider>
              <DrillCategoryProvider>
                <DrillObjectivesProvider>
                  <PrintOrientationStyle />
                  <LocationsProvider>
                    <FacilitiesProvider>
                    <StatImpactsProvider>
                      <TeamProvider>
                        <PlayerProvider>
                          <DrillProvider>{children}</DrillProvider>
                        </PlayerProvider>
                      </TeamProvider>
                    </StatImpactsProvider>
                    </FacilitiesProvider>
                  </LocationsProvider>
                </DrillObjectivesProvider>
              </DrillCategoryProvider>
            </SettingsProvider>
          </PermissionsProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
