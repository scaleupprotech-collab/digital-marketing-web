// PAGE 1: Home
const { page, site, services } = require('../lib/layout');
const { icon } = require('../lib/icons');
const C = require('../lib/components');
const content = require('../data/content.json');

// Decorative dashboard illustration for the hero (pure SVG, swap for a photo/video later).
const heroArt = `<div class="hero-art" aria-hidden="true">
  <div class="dash-card dash-main">
    <div class="dash-top"><span></span><span></span><span></span><b>Campaign performance</b></div>
    <svg viewBox="0 0 320 140" class="dash-chart"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F97316" stop-opacity=".35"/><stop offset="1" stop-color="#F97316" stop-opacity="0"/></linearGradient></defs>
      <path d="M0 120 L40 108 L80 112 L120 90 L160 84 L200 62 L240 58 L280 30 L320 18 L320 140 L0 140Z" fill="url(#ga)"/>
      <path d="M0 120 L40 108 L80 112 L120 90 L160 84 L200 62 L240 58 L280 30 L320 18" fill="none" stroke="#F97316" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 128 L40 124 L80 120 L120 116 L160 106 L200 100 L240 92 L280 84 L320 76" fill="none" stroke="#93A5E8" stroke-width="2" stroke-dasharray="5 5"/></svg>
    <div class="dash-kpis"><div><small>Leads</small><b>2,486</b><em>+38%</em></div><div><small>ROAS</small><b>4.2x</b><em>+1.8x</em></div><div><small>CPL</small><b>₹312</b><em>-41%</em></div></div>
  </div>
  <div class="dash-card dash-float f1">${icon('trending-up', { size: 20 })}<div><small>Organic traffic</small><b>+212%</b></div></div>
  <div class="dash-card dash-float f2">${icon('headphones', { size: 20 })}<div><small>Calls today</small><b>3,940</b></div></div>
</div>`;

module.exports = ({ posts, cases }) => {
  const featuredCases = ['urbannest-realty', 'glowroot-skincare', 'fincrest-loans'].map((s) => cases.find((c) => c.slug === s)).filter(Boolean);
  const body = `
<section class="hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="container hero-grid">
    <div class="hero-copy">
      <p class="eyebrow eyebrow-light">Digital agency · Gurugram, India</p>
      <h1>Grow Your Business with <span class="grad-text">Data-Driven</span> Digital Marketing</h1>
      <p class="lead">SEO, Meta Ads, websites and trained tele-calling teams — under one roof, measured by one thing: the revenue we help you grow.</p>
      <div class="hero-actions">
        <a href="#free-audit" class="btn btn-accent btn-lg">Get Free Audit ${icon('arrow-right', { size: 18 })}</a>
        <a href="/services/" class="btn btn-outline-light btn-lg">View Our Services</a>
      </div>
      <ul class="hero-trust">
        <li>${icon('check-circle', { size: 18 })} Google Partner</li>
        <li>${icon('check-circle', { size: 18 })} Meta Business Partner</li>
        <li>${icon('check-circle', { size: 18 })} No lock-in contracts</li>
      </ul>
    </div>
    ${heroArt}
  </div>
</section>

${C.clientStrip()}

<section class="section" id="services">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'What we do', title: 'Five services. One growth engine.', sub: 'Use one service or combine them — every team shares data, so your marketing gets smarter as it grows.' })}
    <div class="grid grid-3 services-grid">${services.map(C.serviceCard).join('')}
      <article class="card service-card card-cta reveal"><h3>Not sure where to start?</h3><p>Get a free 30-minute strategy call and a custom plan for your business.</p><a href="/contact/#consultation" class="btn btn-accent">Talk to an expert</a></article>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Why ScaleNest', title: 'Why 350+ businesses choose us', sub: 'Agency expertise with the accountability of an in-house team.' })}
    <div class="grid grid-3">${content.whyUs.map((w) => `<div class="feature reveal"><div class="icon-wrap">${icon(w.icon)}</div><h3>${w.title}</h3><p>${w.text}</p></div>`).join('')}</div>
  </div>
</section>

<section class="section stats-section">
  <div class="container">${C.statsBlock(site.stats)}</div>
</section>

<section class="section">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Our process', title: 'How we grow your business', sub: 'A simple, transparent five-step process — repeated every month.' })}
    ${C.processSteps(content.process)}
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Results', title: 'Featured case studies', sub: 'Real businesses, real numbers — before and after working with us.' })}
    <div class="grid grid-3">${featuredCases.map((c) => C.caseCard(c)).join('')}</div>
    <p class="center mt-lg"><a href="/case-studies/" class="btn btn-ghost">View all case studies ${icon('arrow-right', { size: 16 })}</a></p>
  </div>
</section>

<section class="section">
  <div class="container narrow">
    ${C.sectionHead({ eyebrow: 'Testimonials', title: 'What our clients say' })}
    ${C.testimonialSlider(content.testimonials)}
  </div>
</section>

<section class="section section-alt" id="free-audit">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Free SEO audit</p>
      <h2>Find out what’s holding your website back</h2>
      <p class="lead">Our SEO team will manually review your site and send a personalised report within 48 hours — free, no strings attached.</p>
      <ul class="check-list">
        <li>${icon('check', { size: 18 })} Technical health & Core Web Vitals check</li>
        <li>${icon('check', { size: 18 })} Keyword opportunities your competitors rank for</li>
        <li>${icon('check', { size: 18 })} Google Business Profile & local SEO review</li>
        <li>${icon('check', { size: 18 })} A prioritised 30-day action plan</li>
      </ul>
    </div>
    <div class="form-card reveal">${C.auditForm()}</div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="careers-banner reveal">
      <div class="cb-icon">${icon('home', { size: 34 })}</div>
      <div>
        <p class="eyebrow eyebrow-light">We're hiring</p>
        <h2>Join Our Remote Team – Work From Home Opportunities Available</h2>
        <p>Tele-calling, sales, SEO, Meta Ads, content and design roles. Fixed salary + incentives, paid training, flexible shifts. Freshers welcome.</p>
      </div>
      <a href="/careers/" class="btn btn-accent btn-lg">View Open Positions</a>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Insights', title: 'Latest from our blog' })}
    <div class="grid grid-3">${posts.slice(0, 3).map(C.postCard).join('')}</div>
    <p class="center mt-lg"><a href="/blog/" class="btn btn-ghost">Read more articles ${icon('arrow-right', { size: 16 })}</a></p>
  </div>
</section>

${C.ctaBand()}`;

  return [{
    path: '/',
    html: page({
      path: '/',
      title: 'ScaleNest Digital | Digital Marketing, SEO & Meta Ads Agency in Gurugram',
      description: 'Grow your business with data-driven digital marketing. SEO, Meta Ads, website development and tele-calling services from Gurugram. Get a free audit today.',
      schema: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url }]
    }, body)
  }];
};
