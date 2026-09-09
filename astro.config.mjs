// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Repo is `saosith.github.io`, so the site is served from the domain root.
// If you later move to a custom domain, change `site` and add public/CNAME.
export default defineConfig({
  site: 'https://saosith.github.io',
  base: '/',
  integrations: [mdx(), sitemap()],
  build: { format: 'directory' },
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
  },
});
