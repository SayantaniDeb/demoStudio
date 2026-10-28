import { seoPlugin } from './build/seo.mjs';
import { websiteMiddleware } from './server/website.mjs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of [
    'GROQ_API_KEY',
    'GROQ_API_KEY_1',
    'GROQ_MODEL',
    'GROQ_VISION_MODEL',
    'GROQ_DIRECTOR_MODEL',
    'DEMO_CHROME_PATH',
  ])
    if (env[key]) process.env[key] = env[key];
  return {
    plugins: [
      react(),
      seoPlugin(env.SITE_URL),
      {
        name: 'website-demo-import',
        configureServer(server) {
          server.middlewares.use(websiteMiddleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(websiteMiddleware);
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'] },
        },
      },
    },
  };
});
