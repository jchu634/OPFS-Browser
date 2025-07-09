import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { ManifestV3Export } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, BuildOptions } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { stripDevIcons, crxI18n } from "./custom-vite-plugins";
import manifest from "./manifest.json";
import devManifest from "./manifest.dev.json";
import pkg from "./package.json";

const isDev = process.env.__DEV__ === "true";
// set this flag to true, if you want localization support
const localize = false;

export const baseManifest = {
    ...manifest,
    version: pkg.version,
    ...(isDev ? devManifest : ({} as ManifestV3Export)),
    ...(localize
        ? {
              name: "__MSG_extName__",
              description: "__MSG_extDescription__",
              default_locale: "en",
          }
        : {}),
} as ManifestV3Export;

export const baseBuildOptions: BuildOptions = {
    sourcemap: isDev,
    emptyOutDir: !isDev,
    rollupOptions: {
        input: {
            devtoolsLoader: resolve(__dirname, "src/pages/devtools/index.ts"), // Use resolve for absolute path safety
            // Add panel.tsx as a new entry point
            devtoolsPanel: resolve(__dirname, "src/pages/devtools/panel.tsx"),

            // Other entry points from your manifest (if not handled by crxjs plugin directly)
            // Example: background: resolve(__dirname, 'src/service-worker-loader.js'),
            // Example: popup: resolve(__dirname, 'src/pages/popup/index.html'), // If you have a popup
        },
        output: {
            // Control how the output files are named. This is crucial for web_accessible_resources.
            // Use [name] for the key from 'input' (e.g., 'devtoolsPanel').
            // Using 'assets/' prefix helps organize.
            entryFileNames: `assets/[name].js`, // e.g., 'assets/devtoolsPanel.js'
            chunkFileNames: `assets/[name]-[hash].js`, // For shared modules/React chunks
            assetFileNames: `assets/[name].[ext]`, // For CSS, images, etc.
        },
    },
};

export default defineConfig({
    plugins: [
        tailwindcss(),
        tsconfigPaths(),
        react(),
        stripDevIcons(isDev),
        crxI18n({ localize, src: "./src/locales" }),
    ],
    publicDir: resolve(__dirname, "public"),
});
