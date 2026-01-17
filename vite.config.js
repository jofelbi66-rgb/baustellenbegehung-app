import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // WICHTIG für GitHub Pages Project Pages:
  // Repo heißt: baustellenbegehung-app
  base: "/baustellenbegehung-app/",
});
