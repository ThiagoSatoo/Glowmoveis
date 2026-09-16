// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Mesma detecção de sandbox que o próprio @lovable.dev/vite-tanstack-config usa internamente
// (DEV_SERVER__PROJECT_PATH / LOVABLE_SANDBOX): dentro do preview da Lovable, o preset do nitro
// é sempre forçado para "cloudflare-module" (outra pasta de saída, diferente da do Vercel) —
// então o PWA fica desligado ali para não escrever o service worker no lugar errado. Fora do
// sandbox (dev local ou o build real que vai pro Vercel), o preset é "vercel" (ver abaixo) e o
// PWA aponta certinho para a pasta estática que o Vercel serve.
const dentroDoSandboxLovable = !!(
  process.env["DEV_SERVER__PROJECT_PATH"] || process.env["LOVABLE_SANDBOX"]
);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Preview builds made inside the Lovable cloud sandbox always force "cloudflare-module"
  // regardless of this setting (that's the sandbox's own preview infra). Outside the sandbox —
  // i.e. the real production build that runs on Vercel — this makes nitro emit Vercel's
  // serverless/edge output instead of a Cloudflare Worker.
  nitro: { preset: "vercel" },
  plugins: [
    ...(dentroDoSandboxLovable
      ? []
      : [
          VitePWA({
            // TanStack Start has no static index.html for Vite to transform — we register the
            // service worker ourselves (see AtualizacaoObrigatoria.tsx).
            injectRegister: null,
            // Every new push to GitHub → new Vercel deploy → new build hash → the new service
            // worker installs in the background but stays in "waiting" (skipWaiting/clientsClaim
            // OFF, unlike "autoUpdate") until AtualizacaoObrigatoria.tsx tells it to take over.
            // That component blocks the whole app behind a mandatory "Atualizar agora" screen —
            // no silent auto-reload, and the person can't dismiss it without updating.
            registerType: "prompt",
            // vite-plugin-pwa defaults to writing sw.js/manifest into "dist" — that directory
            // doesn't exist in this project at all; Nitro's "vercel" preset (set above) puts the
            // static output that Vercel actually serves in .vercel/output/static instead.
            outDir: ".vercel/output/static",
            manifest: {
              name: "Glow Móveis",
              short_name: "Glow Móveis",
              description: "Gantt de produção para marcenaria",
              start_url: "/",
              scope: "/",
              display: "standalone",
              background_color: "#43493f",
              theme_color: "#43493f",
              icons: [
                { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
                { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
                {
                  src: "/icons/icon-192-maskable.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "maskable",
                },
                {
                  src: "/icons/icon-512-maskable.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
                },
              ],
            },
            workbox: {
              // Só o app shell (JS/CSS/HTML/ícones/fontes locais) fica em cache para abrir
              // offline; chamadas ao Supabase (outro domínio) nunca passam pelo service worker.
              globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
              navigateFallbackDenylist: [/^\/api\//],
              cleanupOutdatedCaches: true,
            },
            devOptions: { enabled: false },
          }),
        ]),
  ],
});
