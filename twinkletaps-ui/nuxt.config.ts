import { createResolver } from '@nuxt/kit';
import vuetify from 'vite-plugin-vuetify';

const { resolve } = createResolver(import.meta.url);

export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', 'vite-plugin-vuetify'],
  css: [
    'vuetify/lib/styles/main.sass',
    '@mdi/font/css/materialdesignicons.min.css',
  ],
  build: {
    transpile: ['vuetify'],
  },
  features: {
    inlineStyles: false,
  },
  vite: {
    define: {
      'process.env.DEBUG': false,
    },
  },
  hooks: {
    'vite:extendConfig': config => {
      config.plugins!.push(
        vuetify({
          styles: { configFile: resolve('./settings.scss') },
        })
      );
    },
  },
  runtimeConfig: {
    public: {
      apiBase: '/mock',
      env: 'dev',
    },
  },
});
