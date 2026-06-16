import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { TarifaProvider } from "@/lib/tarifa-context";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LIQUIDZ — Controle de KM",
  description: "Controle de quilometragem e reembolso para representantes LIQUIDZ",
  // Faz o iOS abrir o atalho da tela inicial em tela cheia, como um app
  appleWebApp: {
    capable: true,
    title: "LIQUIDZ KM",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#9BDB20",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={manrope.className}>
      <body className="min-h-screen bg-lz-bg">
        <TarifaProvider>{children}</TarifaProvider>
      </body>
    </html>
  );
}
