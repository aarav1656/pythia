import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MiniKitWrapper } from "@/components/MiniKitWrapper";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/contracts";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pythia — Sybil-Resistant Private Prediction Markets",
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
      <body className={`${inter.variable} antialiased bg-mesh min-h-screen`}>
        <WagmiProvider config={config}>
          <MiniKitWrapper>
            {children}
          </MiniKitWrapper>
        </WagmiProvider>
      </body>
    </html>
  );
}
