import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [
        ["@babel/preset-react", { runtime: "automatic" }],
        reactCompilerPreset(),
      ],
    }),
  ],
  server: {
    port: 3000,
  },
});
