import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Giggles & Kurls",
    short_name: "Giggles",
    description: "Check in, track your loyalty and grab rewards at Giggles & Kurls nail salon.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF9F5",
    theme_color: "#EC4899",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
