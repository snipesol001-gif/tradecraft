import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND } from "@/lib/brand";
import { Providers } from "@/components/providers";
import ReferralCapture from "@/components/referral-capture";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} - ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
};

// Pre-paint theme application. Mirrors the id-to-base map in
// lib/themes.ts (the script cannot import TypeScript, so the small map
// is duplicated here; both carry a comment pointing at the other).
// Resolves "system" against the OS preference, then sets the .dark class
// and the data-theme attribute for named looks.

const themeInitScript = `(function(){try{var t=localStorage.getItem("tc-theme")||"system";if(t==="system"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}var m={light:[0,0],dark:[1,0],midnight:[1,1],"indigo-drift":[1,1],"golden-horizon":[1,1],"prism-glow":[1,1],"twilight-ember":[1,1],"abyssal-blue":[1,1],"sakura-drift":[0,1]};var e=m[t]||m.light;document.documentElement.classList.toggle("dark",e[0]===1);if(e[1]===1){document.documentElement.setAttribute("data-theme",t);}else{document.documentElement.removeAttribute("data-theme");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script
          id="tc-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <Providers>
          <ReferralCapture />
          {children}
        </Providers>
      </body>
    </html>
  );
}