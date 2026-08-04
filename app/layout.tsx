import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
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
            __html: `(function(){try{var d=localStorage.getItem("travelmap.design");var a=localStorage.getItem("travelmap.appearance")||localStorage.getItem("fta-theme");if(d!=="minimal"&&d!=="atlas")d="atlas";if(a!=="dark"&&a!=="light"){a=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.dataset.design=d;r.dataset.theme=a;r.classList.toggle("dark",a==="dark")}catch(e){}})();`,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
