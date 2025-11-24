import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: "https://thesis-cbc-git-main-shaira-micompals-projects.vercel.app", // Point to the deployed Vercel API
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path, // Keep the path as-is
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url, '→', options.target + req.url);
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src", // Adjust based on your folder structure
    },
  },
});
