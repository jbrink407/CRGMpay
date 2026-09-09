import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CR Pay — Payroll detail log",
    short_name: "CR Pay",
    description:
      "Fill the Construction Resources Glass & Mirror payroll detail log and print a landscape PDF.",
    start_url: "/",
    display: "standalone",
    background_color: "#ece7de",
    theme_color: "#ece7de",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
