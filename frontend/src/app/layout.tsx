import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Rami Malagasy — À votre table",
  description:
    "Une table de rami malgache. Démonstration locale avec joueurs simulés.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
