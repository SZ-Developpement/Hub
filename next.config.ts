import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // @react-pdf/renderer embarque son propre réconciliateur React : il doit rester hors bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Polices des documents PDF, lues depuis le disque au rendu.
  outputFileTracingIncludes: {
    "/**": ["./assets/fonts/**"],
  },
  experimental: {
    serverActions: {
      // Logos, signature et justificatifs transitent par des Server Actions.
      bodySizeLimit: "5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
