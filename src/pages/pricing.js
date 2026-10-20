// PAGE 10: Pricing — per-service tabs, monthly/yearly toggle, comparison table, FAQs
const { page } = require('../lib/layout');
const { icon } = require('../lib/icons');
const C = require('../lib/components');
const pricing = require('../data/pricing.json');

module.exports = () => {
  const crumbs = [['Home', '/'], ['Pricing', '/pricing/']];
  const keys = Object.keys(pricing.plans);
  const disc = 1 - pricing.yearlyDiscount;
  const tabs = keys.map((k, i) => `<button role="tab" class="tab${i === 0 ? ' active' : ''}" id="tab-${k}" aria-selected="${i === 0}" aria-controls="panel-${k}" tabindex="${i === 0 ? 0 : -1}" data-tab="${k}">${pricing.plans[k].label}</button>`).join('');
  const panels = keys.map((k, i) => {
    const p = pricing.plans[k];
    return `<div role="tabpanel" class="tab-panel" id="panel-${k}" aria-labelledby="tab-${k}"${i === 0 ? '' : ' hidden'}>
      <div class="grid grid-3 pricing-grid">${p.tiers.map((t) => `<article class="price-card${t.featured ? ' featured' : ''}">
        ${t.featured ? '<span class="ribbon">Most popular</span>' : ''}
        <h3>${t.name}</h3><p class="muted">${t.desc}</p>
        <p class="price">${p.oneTime
          ? `<span class="amount">${C.inr(t.monthly)}</span><span class="per">one-time</span>`
          : `<span class="amount" data-monthly="${C.inr(t.monthly)}" data-yearly="${C.inr(Math.round(t.monthly * disc / 100) * 100)}">${C.inr(t.monthly)}</span><span class="per">/month</span>`}</p>
        ${p.oneTime ? '<p class="small muted">Maintenance from ₹2,999/month</p>' : `<p class="small muted billed" data-monthly="Billed monthly" data-yearly="Billed yearly — save ${pricing.yearlyDiscount * 100}%">Billed monthly</p>`}
        <ul class="check-list">${t.features.map((f) => `<li>${icon('check', { size: 18 })} ${f}</li>`).join('')}</ul>
        <a href="/contact/?service=${encodeURIComponent(p.label)}&plan=${t.name}#consultation" class="btn ${t.featured ? 'btn-accent' : 'btn-ghost'} btn-block">Get Started</a>
      </article>`).join('')}</div>
    </div>`;
  }).join('');

  const body = `
${C.pageHero({ eyebrow: 'Pricing', title: 'Simple, transparent pricing', sub: 'Plans built for Indian businesses. No hidden fees, no long lock-ins. All prices exclude 18% GST.', crumbs })}
<section class="section">
  <div class="container">
    <div class="pricing-controls">
      <div class="tabs" role="tablist" aria-label="Choose a service">${tabs}</div>
      <div class="billing-toggle"><span id="bl-m">Monthly</span><button class="switch" role="switch" aria-checked="false" aria-labelledby="bl-m bl-y" id="billing-switch"><span></span></button><span id="bl-y">Yearly <em class="save">Save ${pricing.yearlyDiscount * 100}%</em></span></div>
    </div>
    ${keys.map((k) => `<span id="${k}" class="anchor" aria-hidden="true"></span>`).join('')}
    ${panels}
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Compare plans', title: 'What every plan includes' })}
    <div class="table-wrap reveal"><table class="table compare">
      <caption class="sr-only">Feature comparison across Starter, Growth and Enterprise plans</caption>
      <thead><tr><th scope="col">Feature</th>${pricing.comparison.columns.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>
      <tbody>${pricing.comparison.rows.map(([f, ...v]) => `<tr><th scope="row">${f}</th>${v.map((x) => `<td>${x === 'Yes' ? `<span class="yes">${icon('check', { size: 18 })}<span class="sr-only">Yes</span></span>` : x}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="price-snapshot reveal">
      <div><p class="eyebrow">Custom plan</p><h2>Need a mix of services or a bigger scope?</h2><p>We’ll build a custom plan around your goals, budget and timeline — often with a bundled discount.</p></div>
      <div class="cta-actions"><a href="/contact/?plan=Custom#consultation" class="btn btn-accent btn-lg">Request a Custom Plan</a></div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container narrow">
    ${C.sectionHead({ eyebrow: 'FAQs', title: 'Pricing questions' })}
    ${C.faqAccordion(pricing.faqs, 'pf')}
  </div>
</section>
${C.ctaBand()}`;
  return [{ path: '/pricing/', html: page({ path: '/pricing/', title: 'Pricing | SEO, Meta Ads, Web & Tele-calling Plans | ScaleNest Digital', description: 'Transparent pricing for SEO, Meta Ads, digital marketing, website development and tele-calling. Starter, Growth and Enterprise plans with monthly or yearly billing.', schema: [C.faqSchema(pricing.faqs), C.breadcrumbSchema(crumbs)] }, body) }];
};
