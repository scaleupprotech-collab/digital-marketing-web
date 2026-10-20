// PAGE 2: About Us
const { page, esc, site } = require('../lib/layout');
const { icon } = require('../lib/icons');
const C = require('../lib/components');
const content = require('../data/content.json');

module.exports = () => {
  const crumbs = [['Home', '/'], ['About Us', '/about/']];
  const body = `
${C.pageHero({ eyebrow: 'About ScaleNest Digital', title: 'We help Indian businesses grow — and Indian talent work from anywhere', sub: 'A Gurugram-born, remote-first agency of 250+ marketers, developers, designers and tele-calling professionals.', crumbs })}

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Our story</p>
      <h2>Started with two clients and one belief</h2>
      <p>ScaleNest Digital began in 2019 in a shared co-working space in Gurugram. Our founders, Karan Bhatia and Priya Nair, had spent years watching small businesses waste money on marketing they couldn't measure — and watching talented people across India miss out on good jobs simply because of where they lived.</p>
      <p>So we built an agency around two ideas: every rupee of marketing should be accountable, and great work can be done from anywhere. Today we serve 350+ clients and our team works from 18 states.</p>
    </div>
    <div class="mv-grid reveal">
      <div class="mv-card"><div class="icon-wrap">${icon('target')}</div><h3>Our mission</h3><p>To make growth predictable for Indian businesses through transparent, data-driven marketing and sales support.</p></div>
      <div class="mv-card"><div class="icon-wrap">${icon('eye')}</div><h3>Our vision</h3><p>To become India’s most trusted growth partner — and its most rewarding remote workplace, creating 1,000 work-from-home careers by 2028.</p></div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Core values', title: 'What we stand for' })}
    <div class="grid grid-3">${content.values.map((v) => `<div class="feature reveal"><div class="icon-wrap">${icon(v.icon)}</div><h3>${v.title}</h3><p>${v.text}</p></div>`).join('')}</div>
  </div>
</section>

<section class="section">
  <div class="container narrow">
    ${C.sectionHead({ eyebrow: 'Milestones', title: 'Our journey so far' })}
    <ol class="timeline">${content.milestones.map(([y, t, d]) => `<li class="reveal"><span class="tl-year">${y}</span><div><h3>${t}</h3><p>${d}</p></div></li>`).join('')}</ol>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Leadership & team', title: 'The people behind your growth' })}
    <div class="grid grid-4">${content.team.map((m) => `<article class="card team-card reveal">${C.avatar(m.name, 88)}<h3>${m.name}</h3><p class="role">${m.role}</p><p class="small muted">${m.bio}</p><a href="https://www.linkedin.com/" target="_blank" rel="noopener" class="icon-btn" aria-label="${esc(m.name)} on LinkedIn">${icon('linkedin', { size: 18 })}</a></article>`).join('')}</div>
  </div>
</section>

<section class="section">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Certifications & partnerships', title: 'Certified by the platforms we work on' })}
    <div class="grid grid-3">${content.certifications.map((c) => `<div class="cert reveal"><span class="cert-badge">${icon('award', { size: 26 })}</span><div><h3>${c.name}</h3><p class="small muted">${c.text}</p></div></div>`).join('')}</div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Culture', title: 'Life at ScaleNest', sub: 'Remote-first, but never disconnected. Here’s a glimpse of our people.' })}
    <div class="gallery">${content.gallery.map(([cap, ic], i) => `<figure class="gallery-item g${i} reveal"><div class="g-img" role="img" aria-label="${esc(cap)} (placeholder image)">${icon(ic, { size: 40 })}</div><figcaption>${cap}</figcaption></figure>`).join('')}</div>
  </div>
</section>

${C.ctaBand('Let’s build your growth story', 'Talk to our team about where you are today and where you want to be. We’ll show you how to get there.')}`;

  return [{ path: '/about/', html: page({ path: '/about/', title: 'About Us | ScaleNest Digital – Gurugram Digital Agency', description: `Meet ${site.name}: a Gurugram-based, remote-first digital agency serving 350+ businesses. Our story, values, leadership team and certifications.`, schema: [C.breadcrumbSchema(crumbs)] }, body) }];
};
