#!/usr/bin/env node
// Static site generator: renders every page from src/pages/* + src/data/* into dist/.
// Run: `npm run build`. On Netlify this runs on every deploy (including the ones triggered by admin edits).
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'src', 'data');

const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

// CMS collections (jobs, posts, case studies) are edited in the admin dashboard and stored in MongoDB.
// On Netlify builds we fetch them from the live site's /api/content endpoint; locally, or on the very first
// deploy (before the function exists), we fall back to the JSON files in src/data.
async function loadCollection(name, file) {
  const base = process.env.CONTENT_SOURCE_URL || (process.env.NETLIFY && process.env.URL);
  if (base) {
    try {
      const r = await fetch(`${base.replace(/\/$/, '')}/api/content/${name}`, { signal: AbortSignal.timeout(10000) });
      const data = r.ok ? await r.json() : null;
      if (Array.isArray(data)) { console.log(`  ${name}: ${data.length} items from ${base}`); return data; }
      console.warn(`  ${name}: live content unavailable (HTTP ${r.status}), using src/data/${file}`);
    } catch (e) {
      console.warn(`  ${name}: could not reach ${base} (${e.message}), using src/data/${file}`);
    }
  }
  return readJSON(file);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

async function build() {
  const t0 = Date.now();
  const site = readJSON('site.json');
  const jobs = (await loadCollection('jobs', 'jobs.json')).sort((a, b) => b.posted.localeCompare(a.posted));
  const posts = (await loadCollection('posts', 'posts.json')).filter((p) => p.status !== 'draft').sort((a, b) => b.date.localeCompare(a.date));
  const cases = (await loadCollection('case-studies', 'case-studies.json')).filter((c) => c.status !== 'draft');
  const ctx = { jobs, posts, cases };

  const pages = [
    require('./src/pages/home'),
    require('./src/pages/about'),
    require('./src/pages/services'),
    require('./src/pages/case-studies'),
    require('./src/pages/pricing'),
    require('./src/pages/careers'),
    require('./src/pages/blog'),
    require('./src/pages/misc')
  ].flatMap((fn) => fn(ctx));

  fs.rmSync(DIST, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'public'), DIST);
  copyDir(path.join(ROOT, 'admin'), path.join(DIST, 'admin')); // dashboard UI; its API is password-protected

  for (const p of pages) {
    const out = p.path.endsWith('.html') ? path.join(DIST, p.path) : path.join(DIST, p.path, 'index.html');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, p.html);
  }

  // XML sitemap (indexable pages only)
  const today = new Date().toISOString().slice(0, 10);
  const indexable = pages.filter((p) => !p.html.includes('content="noindex'));
  const prio = (p) => (p === '/' ? '1.0' : p === '/careers/' || p.startsWith('/services/') ? '0.9' : p.startsWith('/careers/') ? '0.8' : '0.7');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${site.url}${p.path}</loc><lastmod>${today}</lastmod><priority>${prio(p.path)}</priority></url>`).join('\n')}
</urlset>
`);

  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${site.url}/sitemap.xml
`);

  // Lightweight client-side search index (used by the 404 page search).
  const index = pages.filter((p) => p.path !== '/404.html').map((p) => ({
    url: p.path,
    title: (p.html.match(/<title>(.*?)<\/title>/) || [])[1] || p.path,
    description: (p.html.match(/<meta name="description" content="(.*?)"/) || [])[1] || ''
  }));
  fs.writeFileSync(path.join(DIST, 'search-index.json'), JSON.stringify(index));

  console.log(`Built ${pages.length} pages into dist/ in ${Date.now() - t0} ms`);
  return pages.length;
}

if (require.main === module) build().catch((e) => { console.error(e); process.exit(1); });
module.exports = { build };
