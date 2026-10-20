// PAGE 9: Case studies listing (filterable) + case study detail template
const { page, esc, abs, site, services } = require('../lib/layout');
const { icon } = require('../lib/icons');
const C = require('../lib/components');

function listing(cases) {
  const crumbs = [['Home', '/'], ['Case Studies', '/case-studies/']];
  const filters = ['All', 'SEO', 'Meta Ads', 'Website', 'Tele-calling', 'Digital Marketing'];
  const body = `
${C.pageHero({ eyebrow: 'Case studies', title: 'Results we’re proud of', sub: 'Before-and-after numbers from real client engagements across real estate, healthcare, D2C, education and finance.', crumbs })}
<section class="section">
  <div class="container">
    <div class="filter-bar" role="group" aria-label="Filter case studies by service">
      ${filters.map((f, i) => `<button class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${f}" aria-pressed="${i === 0}">${f}</button>`).join('')}
    </div>
    <p class="sr-only" id="cs-count" aria-live="polite"></p>
    <div class="grid grid-3" id="case-grid" data-filter-grid>${cases.map((c) => C.caseCard(c, true)).join('')}</div>
    <p class="empty-state" hidden>No case studies in this category yet — <a href="/contact/">ask us about relevant results</a>.</p>
  </div>
</section>
${C.ctaBand('Want results like these?', 'Let’s talk about your goals. We’ll share relevant case studies from your industry on the call.')}`;
  return { path: '/case-studies/', html: page({ path: '/case-studies/', title: 'Case Studies & Results | ScaleNest Digital', description: 'See real results from ScaleNest Digital clients: SEO, Meta Ads, website, tele-calling and digital marketing case studies with before-and-after metrics.', schema: [C.breadcrumbSchema(crumbs)] }, body) };
}

function detail(c, cases) {
  const path = `/case-studies/${c.slug}/`;
  const crumbs = [['Home', '/'], ['Case Studies', '/case-studies/'], [c.client, path]];
  const svc = services.find((s) => s.slug === c.serviceSlug);
  const related = cases.filter((x) => x.slug !== c.slug).slice(0, 3);
  const body = `
${C.pageHero({ eyebrow: `${c.service} · ${c.industry}`, title: `${esc(c.client)}: ${esc(c.highlight)}`, sub: esc(c.summary), crumbs })}
<section class="section">
  <div class="container">
    <ul class="cs-facts reveal">
      <li><small>Client</small><strong>${esc(c.client)}</strong></li>
      <li><small>Industry</small><strong>${esc(c.industry)}</strong></li>
      <li><small>Service</small><strong>${svc ? `<a href="/services/${svc.slug}/">${esc(c.service)}</a>` : esc(c.service)}</strong></li>
      <li><small>Location</small><strong>${esc(c.location)}</strong></li>
      <li><small>Duration</small><strong>${esc(c.duration)}</strong></li>
    </ul>
    <ul class="big-metrics wide reveal">${c.results.map((r) => `<li><strong>${esc(r.after)}</strong><span>${esc(r.label)}</span><small>from ${esc(r.before)}</small></li>`).join('')}</ul>
  </div>
</section>
<section class="section section-alt">
  <div class="container narrow prose">
    <h2>The challenge</h2><p>${esc(c.challenge)}</p>
    <h2>Our solution</h2><p>${esc(c.solution)}</p>
    <h2>The results</h2>
    <div class="table-wrap"><table class="table"><caption class="sr-only">Results before and after</caption><thead><tr><th scope="col">Metric</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>
    <tbody>${c.results.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.before)}</td><td><strong>${esc(r.after)}</strong></td></tr>`).join('')}</tbody></table></div>
    <blockquote class="pull">“${esc(c.quote)}”<cite>— ${esc(c.quoteBy)}, ${esc(c.client)}</cite></blockquote>
  </div>
</section>
<section class="section">
  <div class="container">
    ${C.sectionHead({ title: 'More case studies' })}
    <div class="grid grid-3">${related.map((r) => C.caseCard(r)).join('')}</div>
  </div>
</section>
${C.ctaBand(`Get results like ${esc(c.client)}`, 'Book a free strategy call and we’ll map out what’s possible for your business.')}`;
  const schema = { '@context': 'https://schema.org', '@type': 'Article', headline: `${c.client} case study: ${c.highlight}`, description: c.summary, author: { '@id': site.url + '/#organization' }, publisher: { '@id': site.url + '/#organization' }, mainEntityOfPage: abs(path) };
  return { path, html: page({ path, title: `${c.client} Case Study: ${c.highlight} | ScaleNest Digital`, description: c.summary, type: 'article', schema: [schema, C.breadcrumbSchema(crumbs)] }, body) };
}

module.exports = ({ cases }) => [listing(cases), ...cases.map((c) => detail(c, cases))];
