import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import localFont from "next/font/local";
import { palette } from "@/pond/palette";
import "./globals.css";

const sans = localFont({ src: [
  { path: "./fonts/geist-sans-latin-400-normal.woff2", weight: "400" },
  { path: "./fonts/geist-sans-latin-500-normal.woff2", weight: "500" },
], variable: "--font-geist-sans", display: "swap" });
const mono = localFont({ src: "./fonts/geist-mono-latin-400-normal.woff2", weight: "400", variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Nathan Toto — Product Owner",
  description: "Du besoin au produit : le portfolio de Nathan Toto, Product Owner. Une sélection de projets au fil de l’eau.",
  icons: { icon: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="${palette.water.deep}"/><ellipse cx="16" cy="16" rx="5" ry="10" fill="${palette.koi.white}"/><circle cx="16" cy="11" r="3" fill="${palette.koi.vermilion}"/></svg>`)}` },
};

const colors = {
  "--water-shallow": palette.water.shallow,
  "--water-middle": palette.water.middle,
  "--water-deep": palette.water.deep,
  "--paper": palette.paper,
  "--ink": palette.ink,
  "--portfolio-ink": palette.portfolio.ink,
  "--muted-light": palette.portfolio.muted,
  "--page-dark": palette.portfolio.dark,
  "--text-dark": palette.portfolio.cream,
  "--muted-dark": palette.portfolio.mutedDark,
  "--footer-lilac": palette.portfolio.footer,
  "--footer-ink": palette.portfolio.footerInk,
} as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning style={colors}>
      <head>
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('pond-theme')==='light')document.documentElement.dataset.theme='light'}catch{}" }} />
        <noscript><style>{".theme-toggle{display:none}"}</style></noscript>
      </head>
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
