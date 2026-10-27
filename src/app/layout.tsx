import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { palette } from "@/pond/palette";
import "./globals.css";

export const metadata: Metadata = {
  title: "La mare — Portfolio",
  description: "Une mare de koï peinte et interactive, générée en code.",
  icons: { icon: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="${palette.water.deep}"/><ellipse cx="16" cy="16" rx="5" ry="10" fill="${palette.koi.white}"/><circle cx="16" cy="11" r="3" fill="${palette.koi.vermilion}"/></svg>`)}` },
};

const colors = {
  "--water-shallow": palette.water.shallow,
  "--water-middle": palette.water.middle,
  "--water-deep": palette.water.deep,
  "--paper": palette.paper,
  "--ink": palette.ink,
} as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" style={colors}>
      <body>{children}</body>
    </html>
  );
}
