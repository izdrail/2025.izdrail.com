// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

import react from '@astrojs/react';
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [tailwind(), react()],
  vite: {
    build: {
      rollupOptions: {
        output: {
          banner: `if (typeof MessageChannel === 'undefined') {
            globalThis.MessageChannel = class MessageChannel {
              constructor() {
                this.port1 = { onmessage: null, postMessage: (msg) => { setTimeout(() => this.port2.onmessage?.({ data: msg }), 0); } };
                this.port2 = { onmessage: null, postMessage: (msg) => { setTimeout(() => this.port1.onmessage?.({ data: msg }), 0); } };
              }
            };
          }`,
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components'
      }
    }
  },
  output: 'server',
  build: {
    inlineStylesheets: 'auto'
  },
  server: {
    host: true,
    port: 4321,
  }
});