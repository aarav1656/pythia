import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

// Inter as base (always safe), retro fonts loaded via <link> below
const inter = Inter({
  variable: "--font-base",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PYTHIA — Sybil-Resistant Private Prediction Markets",
  description: "The prediction market where every person matters equally, and your bets stay private. Powered by Chainlink CRE + World ID + ACE.",
  keywords: ["prediction markets", "World ID", "Chainlink", "privacy", "sybil-resistant", "ACE"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} bg-mesh min-h-screen flicker`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
