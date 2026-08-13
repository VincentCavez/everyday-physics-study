import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" : la page est servie depuis https://<user>.github.io/<repo>/, donc
// tous les chemins d'asset doivent être relatifs.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", assetsDir: "assets", chunkSizeWarningLimit: 1200 },
});
