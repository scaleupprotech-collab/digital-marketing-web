// PAGE 13: Blog listing (categories, search, featured post) + blog post template
const { page, esc, abs, site, honeypot } = require('../lib/layout');
const { icon } = require('../lib/icons');
const C = require('../lib/components');

const CATEGORIES = ['SEO', 'Meta Ads', 'Digital Marketing', 'Tele-calling', 'Careers & Remote Work'];

function newsletterCta(id) {
  return `<div class="newsletter-cta reveal">
    <div><h2 class="h3">Get growth tips in your inbox</h2><p>One practical email a fortnight on SEO, ads and lead conversion. No spam, unsubscribe anytime.</p></div>
    <form class="newsletter js-form" data-form="newsletter" action="/api/forms/newsletter" method="post" novalidate>
      <label for="${id}" class="sr-only">Email address</label>
      <div class="newsletter-row"><input id="${id}" type="email" name="email" placeholder="you@company.com" required autocomplete="email"><button class="btn btn-accent" type="submit">Subscribe</button></div>
      ${honeypot()}<p class="form-status" role="status" aria-live="polite"></p>
    </form>
  </div>`;
}

function listing(posts) {
  const crumbs = [['Home', '/'], ['Blog', '/blog/']];
  const featured = posts.find((p) => p.featured) || posts[0];
  const rest = posts.filter((p) => p !== featured);
  const body = `
${C.pageHero({ eyebrow: 'Blog', title: 'Insights on growth, marketing & remote work', sub: 'Practical guides from our SEO, paid media, tele-calling and talent teams.', crumbs })}
<section class="section">
  <div class="container">
    <article class="featured-post reveal">
      <a href="/blog/${featured.slug}/" class="post-thumb thumb-${C.slugify(featured.category)}" tabindex="-1" aria-hidden="true">${icon(C.catIcon(featured.category), { size: 64 })}</a>
      <div>
        <p class="post-meta"><span class="chip chip-accent">Featured</span><span class="chip">${esc(featured.category)}</span><span>${C.fmtDate(featured.date)}</span><span>${C.readingTime(featured.body)} min read</span></p>
        <h2><a href="/blog/${featured.slug}/">${esc(featured.title)}</a></h2>
        <p class="lead">${esc(featured.excerpt)}</p>
        <p class="author-line">${C.avatar(featured.author, 40)}<span><strong>${esc(featured.author)}</strong><small>${esc(featured.authorRole)}</small></span></p>
      </div>
    </article>

    <div class="blog-toolbar">
      <div class="filter-bar" role="group" aria-label="Filter posts by category">
        <button class="filter-btn active" data-filter="All" aria-pressed="true">All</button>
        ${CATEGORIES.map((c) => `<button class="filter-btn" data-filter="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}
      </div>
      <div class="jf-search blog-search"><label for="blog-q" class="sr-only">Search articles</label>${icon('search', { size: 20 })}<input id="blog-q" type="search" placeholder="Search articles…" autocomplete="off"></div>
    </div>
    <p class="sr-only" id="blog-count" aria-live="polite"></p>
    <div class="grid grid-3" id="post-grid" data-filter-grid data-filter-attr="category">${rest.map(C.postCard).join('')}</div>
    <p class="empty-state" hidden>No articles match your search. Try another keyword or category.</p>
    <div class="mt-xl">${newsletterCta('blog-nl')}</div>
  </div>
</section>`;
  const schema = { '@context': 'https://schema.org', '@type': 'Blog', name: `${site.name} Blog`, url: abs('/blog/'), publisher: { '@id': site.url + '/#organization' } };
  return { path: '/blog/', html: page({ path: '/blog/', title: `Blog | SEO, Meta Ads, Marketing & Remote Work Tips | ${site.name}`, description: 'Practical articles on SEO, Meta Ads, digital marketing, tele-calling and work-from-home careers from the ScaleNest Digital team.', schema: [schema, C.breadcrumbSchema(crumbs)] }, body) };
}

function post(p, posts) {
  const path = `/blog/${p.slug}/`;
  const crumbs = [['Home', '/'], ['Blog', '/blog/'], [p.title, path]];
  // Add ids to h2s so the table of contents can link to them.
  const toc = [];
  const html = p.body.replace(/<h2>(.*?)<\/h2>/g, (_, t) => { const id = C.slugify(t.replace(/<[^>]+>/g, '')); toc.push([id, t]); return `<h2 id="${id}">${t}</h2>`; });
  const related = posts.filter((x) => x.slug !== p.slug).sort((a, b) => (b.category === p.category) - (a.category === p.category)).slice(0, 3);
  const url = encodeURIComponent(abs(path));
  const text = encodeURIComponent(p.title);
  const share = `<div class="share-row">
    <a class="icon-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">${icon('linkedin', { size: 18 })}</a>
    <a class="icon-btn" href="https://x.com/intent/post?url=${url}&text=${text}" target="_blank" rel="noopener" aria-label="Share on X">${icon('x-social', { size: 18 })}</a>
    <a class="icon-btn" href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener" aria-label="Share on Facebook">${icon('facebook', { size: 18 })}</a>
    <a class="icon-btn" href="https://wa.me/?text=${text}%20${url}" target="_blank" rel="noopener" aria-label="Share on WhatsApp">${icon('whatsapp', { size: 18 })}</a>
    <button class="icon-btn" data-copy="${abs(path)}" aria-label="Copy link">${icon('link', { size: 18 })}</button>
  </div>`;

  const body = `
<section class="page-hero post-hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="container page-hero-inner narrow">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/blog/">Blog</a></li><li aria-current="page">${esc(p.category)}</li></ol></nav>
    <p class="eyebrow eyebrow-light">${esc(p.category)}</p>
    <h1>${esc(p.title)}</h1>
    <p class="post-byline">${C.avatar(p.author, 44)}<span><strong>${esc(p.author)}</strong> · ${esc(p.authorRole)}<small><time datetime="${p.date}">${C.fmtDate(p.date)}</time> · ${C.readingTime(p.body)} min read</small></span></p>
  </div>
</section>
<section class="section">
  <div class="container post-layout">
    <aside class="post-aside">
      <nav class="toc sticky-card" aria-label="Table of contents"><h2 class="h5">On this page</h2><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></nav>
    </aside>
    <article class="prose post-content">
      ${html}
      <div class="post-share"><p><strong>Share this article</strong></p>${share}</div>
      <div class="author-box">${C.avatar(p.author, 64)}<div><p class="small muted">Written by</p><h2 class="h4">${esc(p.author)}</h2><p class="small">${esc(p.authorRole)} at ${site.name}.</p></div></div>
    </article>
  </div>
</section>
<section class="section section-alt">
  <div class="container">
    ${newsletterCta('post-nl')}
    <div class="mt-xl">${C.sectionHead({ title: 'Related posts' })}<div class="grid grid-3">${related.map(C.postCard).join('')}</div></div>
  </div>
</section>
${C.ctaBand()}`;
  const schema = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.excerpt, datePublished: p.date, dateModified: p.date,
    author: { '@type': 'Person', name: p.author, jobTitle: p.authorRole }, publisher: { '@id': site.url + '/#organization' },
    mainEntityOfPage: abs(path), image: abs('/assets/img/og-default.svg'), articleSection: p.category, wordCount: p.body.replace(/<[^>]+>/g, ' ').split(/\s+/).length
  };
  return { path, html: page({ path, title: `${p.title} | ${site.name} Blog`, description: p.excerpt, type: 'article', schema: [schema, C.breadcrumbSchema(crumbs)] }, body) };
}

module.exports = ({ posts }) => [listing(posts), ...posts.map((p) => post(p, posts))];
