import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Abstract Archive — Department of English",
    short_name: "Abstracts",
    description: "Categorised research abstracts from the Department of English.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ed",
    theme_color: "#7a2533",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
