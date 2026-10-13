#!/usr/bin/env node
/**
 * Prints project pages to PDF — the same page a visitor sees, through the
 * print stylesheet in components.css, so the web page and the PDF never drift.
 *
 *   npm run pdf -- <slug> [<slug> …]     one or more projects
 *   npm run pdf -- --all                 every project, drafts included
 *   npm run pdf -- <slug> --no-build     reuse the existing dist/
 *
 * Published projects go to public/uploads/<slug>-report.pdf, where the project
 * page picks the file up on its next build and links it. Drafts go to
 * reports-draft/ instead, which is git-ignored: a PDF in public/ would be
 * reachable by URL the moment it is pushed, even while its page is a draft.
 *
 * Needs Chrome or Edge. Set CHROME_PATH if neither is in its usual place.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const projectsDir = path.join(root, 'src', 'content', 'projects');

const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const all = args.includes('--all');
let slugs = args.filter((a) => !a.startsWith('--'));

const available = readdirSync(projectsDir)
  .filter((f) => /\.mdx?$/.test(f))
  .map((f) => f.replace(/\.mdx?$/, ''));

if (all) slugs = available;
if (slugs.length === 0) {
  console.error(`Usage: npm run pdf -- <slug> [--no-build]\nProjects: ${available.join(', ')}`);
  process.exit(1);
}
for (const s of slugs) {
  if (!available.includes(s)) {
    console.error(`No project "${s}". Projects: ${available.join(', ')}`);
    process.exit(1);
  }
}

/** Frontmatter `draft: true`, read without a YAML parser — the key is flat. */
const isDraft = (slug) => {
  const file = ['.mdx', '.md'].map((e) => path.join(projectsDir, slug + e)).find(existsSync);
  const fm = readFileSync(file, 'utf8').split(/^---\s*$/m)[1] ?? '';
  return /^draft:\s*true\s*$/m.test(fm);
};

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const hit = candidates.find((c) => existsSync(c));
  if (!hit) {
    console.error('Chrome or Edge not found. Set CHROME_PATH to its executable.');
    process.exit(1);
  }
  return hit;
}

if (!noBuild) {
  console.log('Building (drafts included, for this local build only)…');
  const r = spawnSync('npx astro build', {
    cwd: root, stdio: 'inherit', shell: true,
    env: { ...process.env, REPORT_DRAFTS: '1' },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.pdf': 'application/pdf', '.json': 'application/json',
  '.woff2': 'font/woff2', '.xml': 'application/xml',
};

// A tiny static server over dist/, so root-relative asset paths resolve.
const server = createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { rel = '/'; }
  let file = path.join(dist, rel);
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = findBrowser();
let failed = 0;
for (const slug of slugs) {
  const draft = isDraft(slug);
  const outDir = draft ? path.join(root, 'reports-draft') : path.join(root, 'public', 'uploads');
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${slug}-report.pdf`);
  const url = `http://127.0.0.1:${port}/projects/${slug}/`;

  // Async, not spawnSync: the static server runs on this same event loop and
  // would never answer the browser while a synchronous call blocks it.
  const status = await new Promise((resolve) => {
    const p = spawn(browser, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
      '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=15000', `--print-to-pdf=${out}`, url,
    ], { stdio: 'ignore' });
    p.on('close', resolve);
  });

  if (status === 0 && existsSync(out)) {
    console.log(`${draft ? 'DRAFT ' : ''}${path.relative(root, out)}  (${Math.round(statSync(out).size / 1024)} KB)`);
  } else {
    console.error(`Failed: ${slug}`);
    failed++;
  }
}
server.close();

if (!failed) {
  console.log('\nRebuild (npm run build) so the project page links the new PDF.');
  console.log('Drafts in reports-draft/ are local only; publish the page before its PDF.');
}
process.exit(failed ? 1 : 0);
