import type { Metadata, Viewport } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { OfflineBanners } from "@/components/offline-banners";
import { OfflineProvider } from "@/components/offline-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Family Travel Atlas",
  description:
    "Track individual and family journeys on one shared atlas — countries, cities, and memories together.",
  applicationName: "Family Travel Atlas",
  appleWebApp: {
    capable: true,
    title: "Travel Atlas",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1f1e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col font-[family-name:var(--font-body)]"
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem("travelmap.design");var a=localStorage.getItem("travelmap.appearance")||localStorage.getItem("fta-theme");if(d!=="minimal"&&d!=="atlas")d="atlas";if(a!=="dark"&&a!=="light"){a=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.dataset.design=d;r.dataset.theme=a;r.classList.toggle("dark",a==="dark");var l=localStorage.getItem("travelmap.locale");if(l!=="en"&&l!=="sr"){var n=(navigator.language||"en").toLowerCase();l=(n.indexOf("sr")===0||n.indexOf("hr")===0||n.indexOf("bs")===0)?"sr":"en"}r.lang=l==="sr"?"sr-Latn":"en"}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <LanguageProvider>
            <OfflineProvider>
              <OfflineBanners />
              {children}
            </OfflineProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
