import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: "https://thesis-cbc-git-main-shaira-micompals-projects.vercel.app", // Your backend URL
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path, // Keep the path as-is
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src", // Adjust based on your folder structure
    },
  },
});
