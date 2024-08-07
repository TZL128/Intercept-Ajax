import path, { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { terser } from "rollup-plugin-terser";
import UnoCSS from "unocss/vite";
import copy from "rollup-plugin-copy";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  plugins: [
    vue(),
    Components({
      resolvers: ElementPlusResolver(),
    }),
    AutoImport({
      imports: ["vue", "@vueuse/core"],
      dts: "src/auto-imports.d.ts",
      dirs: ["src/stores", "src/hooks", "src/utils", "src/constant"],
      resolvers: [ElementPlusResolver()],
    }),
    UnoCSS(),
    copy({
      targets: [
        { src: "src/manifest.json", dest: "dist" },
        { src: "src/assets", dest: "dist" },
      ],
      hook: "writeBundle",
    }),
    terser(),
  ],
  build: {
    rollupOptions: {
      input: ["panel.html", "src/background.js", "src/content.js"],
      output: {
        chunkFileNames: "[name].[hash].js",
        assetFileNames: "[name].[hash].[ext]",
        entryFileNames: "[name].js",
        dir: "dist",
        manualChunks: {
          vue: ["vue"],
          "element-plus": ["element-plus", "@element-plus/icons-vue"],
          "@vueuse/core": ["@vueuse/core"],
          "vue-codemirror": [
            "@codemirror/lang-javascript",
            "@codemirror/lang-json",
            "@codemirror/lint",
            "@codemirror/view",
          ],
        },
      },
    },
  },
  server: {
    open: "/panel",
  },
});
