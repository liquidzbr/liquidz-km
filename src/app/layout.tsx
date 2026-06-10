import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { TarifaProvider } from "@/lib/tarifa-context";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LIQUIDZ — Controle de KM",
  description: "Controle de quilometragem e reembolso para representantes LIQUIDZ",
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
