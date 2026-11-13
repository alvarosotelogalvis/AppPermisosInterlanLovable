import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { powerApps } from "@microsoft/power-apps-vite/plugin";

// https://vitejs.dev/config/
// Configuración para Power Apps code apps (rama powerapps).
// El plugin powerApps() integra la app con el host de Power Apps (desarrollo local y publicación).
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), powerApps()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
});
