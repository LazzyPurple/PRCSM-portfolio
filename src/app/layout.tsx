import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { palette } from "@/pond/palette";
import "./globals.css";

export const metadata: Metadata = {
  title: "La mare — Portfolio",
  description: "Une mare de koï peinte et interactive, générée en code.",
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
