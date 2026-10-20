// PAGE 3: Services overview + PAGES 4–8: individual service pages (one shared template)
const { page, esc, abs, site, services } = require('../lib/layout');
const { icon } = require('../lib/icons');
const C = require('../lib/components');

function overview() {
  const crumbs = [['Home', '/'], ['Services', '/services/']];
  const body = `
${C.pageHero({ eyebrow: 'Our services', title: 'Everything you need to grow, under one roof', sub: 'Digital marketing, SEO, Meta Ads, website development and tele-calling — run by specialists who share data and goals.', crumbs, actions: '<a href="/contact/#consultation" class="btn btn-accent btn-lg">Get a Free Consultation</a><a href="/pricing/" class="btn btn-outline-light btn-lg">See Pricing</a>' })}

<section class="section">
  <div class="container">
    <div class="svc-list">${services.map((s, i) => `<article class="svc-row reveal${i % 2 ? ' flip' : ''}">
      <div class="svc-visual"><div class="icon-wrap icon-xl">${icon(s.icon, { size: 44 })}</div></div>
      <div class="svc-copy">
        <h2>${s.name}</h2>
        <p class="lead">${s.short}</p>
        <ul class="check-list cols-2">${s.features.slice(0, 6).map((f) => `<li>${icon('check', { size: 18 })} ${f.title}</li>`).join('')}</ul>
        <p class="small muted">Starting from <strong>${s.pricingFrom}</strong></p>
        <a href="/services/${s.slug}/" class="btn btn-primary">Explore ${s.navName || s.name} ${icon('arrow-right', { size: 16 })}</a>
      </div>
    </article>`).join('')}</div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Which service fits?', title: 'Who each service is best for' })}
    <div class="table-wrap reveal"><table class="table">
      <caption class="sr-only">Comparison of services and who they are best for</caption>
      <thead><tr><th scope="col">Service</th><th scope="col">Best for</th><th scope="col">Time to results</th><th scope="col">Starting price</th></tr></thead>
      <tbody>${services.map((s) => `<tr><th scope="row"><a href="/services/${s.slug}/">${s.navName || s.name}</a></th><td>${s.bestFor}</td><td>${{ seo: '3–6 months', 'meta-ads': '1–3 weeks', 'digital-marketing': '2–8 weeks', 'website-development': '1–8 weeks', 'tele-calling': '5–7 days' }[s.slug]}</td><td>${s.pricingFrom}</td></tr>`).join('')}</tbody>
    </table></div>
  </div>
</section>

${C.ctaBand('Not sure which service you need?', 'Tell us your goals and we’ll recommend the right mix — even if it’s just one service.')}`;
  return { path: '/services/', html: page({ path: '/services/', title: 'Our Services | SEO, Meta Ads, Web & Tele-calling | ScaleNest Digital', description: 'Explore ScaleNest Digital’s services: digital marketing, SEO, Meta Ads, website development and tele-calling. Compare who each is best for.', schema: [C.breadcrumbSchema(crumbs)] }, body) };
}

function servicePage(s, cases) {
  const path = `/services/${s.slug}/`;
  const crumbs = [['Home', '/'], ['Services', '/services/'], [s.navName || s.name, path]];
  const cs = cases.find((c) => c.slug === s.caseStudy);
  const tele = s.slug === 'tele-calling';

  const teleExtras = tele ? `
<section class="section">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Industries we serve', title: 'Calling expertise for your industry' })}
    <div class="grid grid-5">${s.industries.map((i) => `<div class="feature feature-sm reveal"><div class="icon-wrap">${icon(i.icon)}</div><h3>${i.name}</h3><p>${i.text}</p></div>`).join('')}</div>
  </div>
</section>
<section class="section section-alt">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Our promise</p>
      <h2>Call quality & data security, guaranteed</h2>
      <p class="lead">Your customers’ trust is your brand. We protect both.</p>
    </div>
    <ul class="promise-list reveal">
      <li>${icon('mic')}<div><h3>100% recorded calls</h3><p>Every call is recorded; recordings are available to you on request.</p></div></li>
      <li>${icon('check-circle')}<div><h3>Weekly QA scoring</h3><p>Quality analysts score a sample of every agent’s calls against a 20-point checklist. Target: 90%+.</p></div></li>
      <li>${icon('lock')}<div><h3>Secure data handling</h3><p>NDAs for every agent, role-based CRM access, no downloads to personal devices, DPDP Act 2023 aligned.</p></div></li>
      <li>${icon('shield')}<div><h3>DND & TRAI compliant</h3><p>Lists scrubbed where required and calls made only during permitted hours.</p></div></li>
    </ul>
  </div>
</section>
<section class="section" id="packages">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Call volume packages', title: 'Pick a package that matches your call volume', sub: 'All packages include script writing, agent training, call recordings and daily reports. Prices exclude GST.' })}
    <div class="grid grid-3 pricing-grid">${s.packages.map((p) => `<article class="price-card reveal${p.featured ? ' featured' : ''}">
      ${p.featured ? '<span class="ribbon">Most popular</span>' : ''}
      <h3>${p.name}</h3><p class="muted">${p.calls}</p>
      <p class="price"><span class="amount">${p.price}</span>${p.price !== 'Custom' ? '<span class="per">/month</span>' : ''}</p>
      <ul class="check-list">${p.features.map((f) => `<li>${icon('check', { size: 18 })} ${f}</li>`).join('')}</ul>
      <a href="#inquiry" class="btn ${p.featured ? 'btn-accent' : 'btn-ghost'} btn-block">${p.price === 'Custom' ? 'Get a Custom Quote' : 'Choose ' + p.name}</a>
    </article>`).join('')}</div>
  </div>
</section>` : '';

  const body = `
${C.pageHero({ eyebrow: s.name, title: s.headline, sub: s.sub, crumbs, actions: `<a href="#inquiry" class="btn btn-accent btn-lg">Request a Free Quote</a><a href="${tele ? '#packages' : '/pricing/#' + s.slug}" class="btn btn-outline-light btn-lg">${tele ? 'View Call Packages' : 'View Pricing'}</a>` })}

<section class="section">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'What’s included', title: `Our ${s.navName || s.name} services` })}
    <div class="grid grid-3">${s.features.map((f) => `<div class="feature reveal"><div class="icon-wrap">${icon(f.icon)}</div><h3>${f.title}</h3><p>${f.text}</p></div>`).join('')}</div>
  </div>
</section>

<section class="section section-alt">
  <div class="container split">
    <div class="reveal"><p class="eyebrow">Benefits</p><h2>What it means for your business</h2><p class="lead">${s.bestFor}</p><a href="#inquiry" class="btn btn-primary">Talk to a specialist</a></div>
    <ul class="benefit-list reveal">${s.benefits.map((b) => `<li>${icon('check-circle', { size: 22 })}<span>${b}</span></li>`).join('')}</ul>
  </div>
</section>

${teleExtras}

<section class="section${tele ? ' section-alt' : ''}">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Our process', title: `How we deliver ${s.navName || s.name}` })}
    ${C.processSteps(s.process)}
  </div>
</section>

<section class="section${tele ? '' : ' section-alt'}">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Tools & platforms', title: 'The stack we use' })}
    ${C.toolChips(s.tools)}
  </div>
</section>

${cs ? `<section class="section">
  <div class="container">
    <div class="result-feature reveal">
      <div>
        <p class="eyebrow">Case study · ${esc(cs.industry)}</p>
        <h2>${esc(cs.client)}: ${esc(cs.highlight)}</h2>
        <p>${esc(cs.summary)}</p>
        <blockquote class="pull">“${esc(cs.quote)}”<cite>— ${esc(cs.quoteBy)}</cite></blockquote>
        <a href="/case-studies/${cs.slug}/" class="link-arrow">Read the full case study ${icon('arrow-right', { size: 16 })}</a>
      </div>
      <ul class="big-metrics">${cs.results.map((r) => `<li><strong>${esc(r.after)}</strong><span>${esc(r.label)}</span><small>from ${esc(r.before)}</small></li>`).join('')}</ul>
    </div>
  </div>
</section>` : ''}

${!tele ? `<section class="section section-alt">
  <div class="container">
    <div class="price-snapshot reveal">
      <div><p class="eyebrow">Pricing snapshot</p><h2>Plans from ${s.pricingFrom}</h2><p>Starter, Growth and Enterprise plans available. No hidden fees — ad spend is paid directly by you.</p></div>
      <div class="cta-actions"><a href="/pricing/#${s.slug}" class="btn btn-primary btn-lg">Compare Plans</a><a href="#inquiry" class="btn btn-ghost btn-lg">Request Quote</a></div>
    </div>
  </div>
</section>` : ''}

<section class="section">
  <div class="container narrow">
    ${C.sectionHead({ eyebrow: 'FAQs', title: `${s.navName || s.name} questions, answered` })}
    ${C.faqAccordion(s.faqs, 'sf')}
  </div>
</section>

<section class="section section-alt" id="inquiry">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Get started</p>
      <h2>Request a free ${s.navName || s.name} proposal</h2>
      <p class="lead">Share a few details and a specialist will reply within one working day with ideas and a quote.</p>
      <ul class="contact-mini">
        <li>${icon('phone', { size: 18 })}<a href="tel:${site.phoneHref}">${site.phone}</a></li>
        <li>${icon('mail', { size: 18 })}<a href="mailto:${site.email}">${site.email}</a></li>
      </ul>
    </div>
    <div class="form-card reveal">${C.inquiryForm(s.name)}</div>
  </div>
</section>`;

  const serviceSchema = {
    '@context': 'https://schema.org', '@type': 'Service', name: s.name, serviceType: s.name, description: s.metaDescription, url: abs(path),
    provider: { '@id': site.url + '/#organization' }, areaServed: { '@type': 'Country', name: 'India' },
    hasOfferCatalog: { '@type': 'OfferCatalog', name: s.name, itemListElement: s.features.map((f) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: f.title } })) }
  };
  return { path, html: page({ path, title: s.metaTitle, description: s.metaDescription, schema: [serviceSchema, C.faqSchema(s.faqs), C.breadcrumbSchema(crumbs)] }, body) };
}

module.exports = ({ cases }) => [overview(), ...services.map((s) => servicePage(s, cases))];
