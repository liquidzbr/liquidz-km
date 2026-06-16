import type { MetadataRoute } from "next";

// Web App Manifest — habilita a instalação na tela inicial (PWA).
// O Next injeta automaticamente o <link rel="manifest"> a partir deste arquivo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LIQUIDZ — Controle de KM",
    short_name: "LIQUIDZ KM",
    description: "Controle de quilometragem e reembolso para representantes LIQUIDZ",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F6F3",
    theme_color: "#9BDB20",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
