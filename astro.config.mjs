// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config/site.ts';
import { NOINDEX_PATHS } from './src/lib/noindex.ts';

// SITE / BASE задаются переменными окружения (см. src/config/site.ts и .github/workflows/deploy.yml).
export default defineConfig({
  site: SITE.origin,
  base: SITE.base,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const p = new URL(page).pathname;
        const rel = p.startsWith(SITE.base) ? `/${p.slice(SITE.base.length)}` : p;
        return !NOINDEX_PATHS.includes(rel) && !rel.startsWith('/404');
      },
    }),
  ],
});
