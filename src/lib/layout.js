// Global page shell: <head> (SEO, OG, schema, tracking placeholders), header, footer, floating widgets.
const { icon } = require('./icons');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Cache-busting: /assets/* is cached by browsers for a week, so each link carries a fingerprint of the file's
// contents (e.g. main.js?v=3f9a1c2b). A changed file gets a new URL and browsers fetch it straight away.
const assetVersion = (rel) => {
  try { return crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, '../../public', rel))).digest('hex').slice(0, 10); }
  catch (e) { return String(Date.now()); }
};
const asset = (rel) => `${rel}?v=${assetVersion(rel)}`;
const site = require('../data/site.json');
const services = require('../data/services.json');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => site.url + p;
const fullAddress = () => `${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}, ${site.address.countryName}`;
const waLink = (msg = site.whatsappMessage) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;

const logo = (extra = '') => `<a href="/" class="logo ${extra}" aria-label="${site.name} — home">
  <svg width="36" height="36" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E3A8A"/><stop offset="1" stop-color="#3B5BDB"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="url(#lg)"/><path d="M9 27l11-7 11 7" fill="none" stroke="#F97316" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 19l11-7 11 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <span class="logo-text">ScaleNest<span>Digital</span></span></a>`;

// Organization + LocalBusiness schema, included on every page.
function orgSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness', 'ProfessionalService'],
    '@id': site.url + '/#organization',
    name: site.name,
    url: site.url,
    logo: abs('/assets/img/logo.svg'),
    image: abs('/assets/img/og-default.svg'),
    description: site.description,
    telephone: site.phone,
    email: site.email,
    foundingDate: site.founded,
    priceRange: '₹₹',
    address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.postalCode, addressCountry: site.address.country },
    geo: { '@type': 'GeoCoordinates', latitude: site.address.lat, longitude: site.address.lng },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:30', closes: '19:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '10:00', closes: '16:00' }
    ],
    sameAs: Object.values(site.social)
  };
}

function head({ title, description, path, image, type = 'website', schema = [], noindex = false }) {
  const url = abs(path);
  const img = abs(image || '/assets/img/og-default.svg');
  const ld = [orgSchema(), ...schema].map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#1E3A8A">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<!-- Open Graph / Twitter -->
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@scalenestdigital">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">
<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap">
<link rel="stylesheet" href="${asset('/assets/css/styles.css')}">
<!-- Theme: set before paint to avoid a flash of the wrong theme -->
<script>document.documentElement.classList.add('js');try{var t=localStorage.getItem('sn-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<!--
  TRACKING PLACEHOLDERS — Google Tag Manager (${site.tracking.gtm}), GA4 (${site.tracking.ga4}) and Meta Pixel (${site.tracking.metaPixel}).
  They are injected by /assets/js/main.js ONLY after the visitor accepts cookies.
  Replace the IDs in src/data/site.json and rebuild; placeholder IDs (containing X / zeros) are skipped.
-->
<script>window.SN_CONFIG=${JSON.stringify({ tracking: site.tracking, whatsapp: site.whatsapp })};</script>
${ld}
</head>`;
}

function header(path) {
  const active = (p) => (p === '/' ? path === '/' : path.startsWith(p)) ? ' aria-current="page"' : '';
  const svcLinks = services.map((s) => `<li><a href="/services/${s.slug}/" class="dd-link">${icon(s.icon, { size: 20 })}<span><strong>${s.navName || s.name}</strong><small>${esc(s.short.split(' ').slice(0, 7).join(' '))}…</small></span></a></li>`).join('');
  return `<a class="skip-link" href="#main">Skip to content</a>
<div class="topbar">
  <div class="container topbar-inner">
    <div class="topbar-contact">
      <a href="tel:${site.phoneHref}">${icon('phone', { size: 14 })}<span>${site.phone}</span></a>
      <a href="mailto:${site.email}" class="hide-sm">${icon('mail', { size: 14 })}<span>${site.email}</span></a>
    </div>
    <a href="/careers/" class="topbar-hiring"><span class="pulse-dot" aria-hidden="true"></span>We're Hiring – Work From Home ${icon('arrow-right', { size: 14 })}</a>
  </div>
</div>
<header class="site-header" id="site-header">
  <div class="container header-inner">
    ${logo()}
    <nav class="main-nav" id="main-nav" aria-label="Main">
      <ul class="nav-list">
        <li><a href="/"${active('/')}>Home</a></li>
        <li><a href="/about/"${active('/about')}>About</a></li>
        <li class="has-dd">
          <a href="/services/"${active('/services')} class="dd-parent">Services</a>
          <button class="dd-toggle" aria-expanded="false" aria-controls="dd-services" aria-label="Show services menu">${icon('chevron-down', { size: 16 })}</button>
          <ul class="dropdown" id="dd-services">${svcLinks}<li class="dd-all"><a href="/services/">View all services ${icon('arrow-right', { size: 14 })}</a></li></ul>
        </li>
        <li><a href="/case-studies/"${active('/case-studies')}>Case Studies</a></li>
        <li><a href="/pricing/"${active('/pricing')}>Pricing</a></li>
        <li><a href="/careers/"${active('/careers')}>Careers <span class="nav-badge">WFH</span></a></li>
        <li><a href="/blog/"${active('/blog')}>Blog</a></li>
        <li><a href="/contact/"${active('/contact')}>Contact</a></li>
      </ul>
      <a href="/contact/#consultation" class="btn btn-accent nav-cta-mobile">Get a Free Consultation</a>
    </nav>
    <div class="header-actions">
      <a class="icon-btn" href="/dashboard/" aria-label="My account" title="Login / My account">${icon('user', { size: 20 })}</a>
      <button class="icon-btn theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">${icon('moon', { size: 20, class: 'i-moon' })}${icon('sun', { size: 20, class: 'i-sun' })}</button>
      <a href="/contact/#consultation" class="btn btn-accent btn-sm header-cta">Get a Free Consultation</a>
      <button class="icon-btn nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="main-nav">${icon('menu', { class: 'i-open' })}${icon('x', { class: 'i-close' })}</button>
    </div>
  </div>
</header>`;
}

function footer() {
  const soc = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'], ['x', 'X (Twitter)']]
    .map(([k, label]) => `<a href="${site.social[k]}" target="_blank" rel="noopener" aria-label="${label}">${icon(k === 'x' ? 'x-social' : k, { size: 18 })}</a>`).join('');
  return `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      ${logo('logo-light')}
      <p>${esc(site.tagline)} Proudly based in Gurugram, working with businesses — and remote talent — across India.</p>
      <div class="socials">${soc}</div>
    </div>
    <div>
      <h2 class="footer-h">Quick links</h2>
      <ul class="footer-links">
        <li><a href="/about/">About us</a></li><li><a href="/case-studies/">Case studies</a></li><li><a href="/pricing/">Pricing</a></li>
        <li><a href="/blog/">Blog</a></li><li><a href="/faq/">FAQ</a></li><li><a href="/contact/">Contact</a></li>
        <li><a href="/login/">Track your application</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">Services</h2>
      <ul class="footer-links">${services.map((s) => `<li><a href="/services/${s.slug}/">${s.navName || s.name}</a></li>`).join('')}</ul>
      <h2 class="footer-h footer-h-gap">Careers</h2>
      <ul class="footer-links"><li><a href="/careers/">Work From Home jobs <span class="nav-badge">Hiring</span></a></li></ul>
    </div>
    <div>
      <h2 class="footer-h">Contact</h2>
      <ul class="footer-contact">
        <li>${icon('map-pin', { size: 18 })}<span>${esc(fullAddress())}</span></li>
        <li>${icon('phone', { size: 18 })}<a href="tel:${site.phoneHref}">${site.phone}</a></li>
        <li>${icon('mail', { size: 18 })}<a href="mailto:${site.email}">${site.email}</a></li>
        <li>${icon('clock', { size: 18 })}<span>${site.hours.display}</span></li>
      </ul>
      <h2 class="footer-h footer-h-gap">Newsletter</h2>
      <form class="newsletter js-form" data-form="newsletter" action="/api/forms/newsletter" method="post" novalidate>
        <label for="nl-email" class="sr-only">Email address</label>
        <div class="newsletter-row">
          <input id="nl-email" type="email" name="email" placeholder="you@company.com" required autocomplete="email">
          <button class="btn btn-accent btn-sm" type="submit">Subscribe</button>
        </div>
        ${honeypot()}
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="container footer-bottom-inner">
      <p>© <span data-year>2026</span> ${site.name}. All rights reserved.</p>
      <ul><li><a href="/privacy-policy/">Privacy Policy</a></li><li><a href="/terms-and-conditions/">Terms &amp; Conditions</a></li><li><a href="/refund-policy/">Refund Policy</a></li><li><a href="/sitemap.xml">Sitemap</a></li></ul>
    </div>
  </div>
</footer>
<a class="wa-float" href="${waLink()}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${icon('whatsapp', { size: 28 })}<span class="wa-label">Chat with us</span></a>
<button class="to-top" id="to-top" aria-label="Back to top">${icon('arrow-up', { size: 20 })}</button>
<div class="cookie" id="cookie" role="dialog" aria-live="polite" aria-label="Cookie consent" hidden>
  <p>We use cookies for analytics and to improve your experience. See our <a href="/privacy-policy/#cookies">Privacy Policy</a>.</p>
  <div class="cookie-actions"><button class="btn btn-ghost btn-sm" data-consent="reject">Essential only</button><button class="btn btn-primary btn-sm" data-consent="accept">Accept all</button></div>
</div>`;
}

// Honeypot field: hidden from humans, bots fill it in and get rejected server-side.
function honeypot() {
  return `<div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div><input type="hidden" name="_ts" value="">`;
}

function page(opts, body) {
  return `${head(opts)}
<body${opts.bodyClass ? ` class="${opts.bodyClass}"` : ''}>
${header(opts.path)}
<main id="main">
${body}
</main>
${footer()}
<script src="${asset('/assets/js/main.js')}" defer></script>
</body>
</html>`;
}

module.exports = { page, esc, abs, site, services, fullAddress, waLink, honeypot, logo };
