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
  // CSS is inlined into every page. With a separate hashed file, a browser holding
  // a cached page (GitHub Pages caches HTML for 10 min) asks for a stylesheet the
  // next deploy already deleted, and the page renders unstyled.
  build: { format: 'directory', inlineStylesheets: 'always' },
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
  },
});
