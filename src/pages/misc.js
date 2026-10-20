// PAGE 14: Contact · PAGE 15: FAQ · PAGES 16–17: Legal · PAGE 18: 404
const { page, esc, site, fullAddress, waLink, honeypot } = require('../lib/layout');
const { icon } = require('../lib/icons');
const C = require('../lib/components');
const content = require('../data/content.json');

function contact() {
  const crumbs = [['Home', '/'], ['Contact', '/contact/']];
  const { lat, lng } = site.address;
  const mapQuery = encodeURIComponent(`Unitech Cyber Park, Sector 39, Gurugram`);
  const cards = [
    ['phone', 'Call us', `<a href="tel:${site.phoneHref}">${site.phone}</a>`, 'Mon–Sat, 9:30 AM – 7 PM'],
    ['mail', 'Email us', `<a href="mailto:${site.email}">${site.email}</a>`, 'We reply within 1 working day'],
    ['whatsapp', 'WhatsApp', `<a href="${waLink()}" target="_blank" rel="noopener">Chat on WhatsApp</a>`, 'Fastest way to reach us'],
    ['map-pin', 'Visit us', esc(fullAddress()), '<a href="https://www.google.com/maps/dir/?api=1&destination=' + mapQuery + '" target="_blank" rel="noopener">Get directions</a>']
  ];
  const body = `
${C.pageHero({ eyebrow: 'Contact us', title: 'Let’s talk about growing your business', sub: 'Get a free consultation, request a quote or just ask a question. A real person replies within one working day.', crumbs })}
<section class="section">
  <div class="container">
    <div class="grid grid-4">${cards.map(([ic, t, v, s]) => `<div class="card contact-card reveal"><div class="icon-wrap">${icon(ic)}</div><h2 class="h5">${t}</h2><p>${v}</p><p class="small muted">${s}</p></div>`).join('')}</div>
  </div>
</section>
<section class="section section-alt" id="consultation">
  <div class="container contact-layout">
    <div class="form-card reveal">
      <h2>Get a free consultation</h2>
      <p class="muted">Tell us about your business. Fields marked * are required.</p>
      ${C.contactForm()}
    </div>
    <div class="contact-side">
      <div class="card reveal">
        <h2 class="h4">${icon('clock', { size: 20 })} Business hours</h2>
        <table class="hours"><caption class="sr-only">Office hours</caption><tbody>${site.hours.rows.map(([d, h]) => `<tr><th scope="row">${d}</th><td>${h}</td></tr>`).join('')}</tbody></table>
        <p class="small muted">${site.hours.support}</p>
      </div>
      <div class="card reveal" id="book-call">
        <h2 class="h4">${icon('calendar', { size: 20 })} Book a call</h2>
        <p class="small muted">Pick a date and a 30-minute slot. We’ll confirm by email and send a Google Meet link.</p>
        <form class="booking js-form" data-form="book-call" action="/api/forms/book-call" method="post" novalidate>
          ${honeypot()}
          <fieldset><legend class="sr-only">Choose a date</legend><div class="date-strip" id="date-strip"></div></fieldset>
          <fieldset><legend class="sr-only">Choose a time</legend><div class="slot-grid" id="slot-grid">${['10:00 AM', '11:00 AM', '12:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'].map((t, i) => `<label class="slot"><input type="radio" name="time" value="${t}"${i === 0 ? ' required' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>
          <div class="form-grid">
            ${C.field({ id: 'bk-name', label: 'Name', name: 'name', auto: 'name', full: true })}
            ${C.field({ id: 'bk-email', label: 'Email', name: 'email', type: 'email', auto: 'email' })}
            ${C.field({ id: 'bk-phone', label: 'Phone', name: 'phone', type: 'tel', auto: 'tel', attrs: 'pattern="[+0-9 ()-]{10,16}"' })}
          </div>
          <div class="form-foot"><button class="btn btn-primary btn-block" type="submit">Book My Call</button><p class="form-status" role="status" aria-live="polite"></p></div>
          <p class="hint">Prefer Calendly? Replace this widget with your Calendly embed in <code>src/pages/misc.js</code>.</p>
        </form>
      </div>
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Find us', title: 'Our Gurugram office' })}
    <div class="map-wrap reveal" data-map-src="https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed">
      <button class="map-load btn btn-primary">${icon('map-pin', { size: 18 })} Load interactive map</button>
      <p class="small">${esc(fullAddress())}</p>
    </div>
  </div>
</section>`;
  return { path: '/contact/', html: page({ path: '/contact/', title: `Contact Us | Free Consultation | ${site.name}, Gurugram`, description: `Contact ${site.name} in Sector 39, Gurugram. Call ${site.phone}, WhatsApp us, book a call or request a free marketing consultation.`, schema: [C.breadcrumbSchema(crumbs)] }, body) };
}

function faq() {
  const crumbs = [['Home', '/'], ['FAQ', '/faq/']];
  const cats = Object.keys(content.faqs);
  const all = cats.flatMap((c) => content.faqs[c]);
  const body = `
${C.pageHero({ eyebrow: 'Help centre', title: 'Frequently asked questions', sub: 'Answers about our services, pricing and careers. Can’t find what you need? <a href="/contact/">Contact us</a>.', crumbs })}
<section class="section">
  <div class="container narrow">
    <nav class="filter-bar" aria-label="FAQ categories">${cats.map((c) => `<a class="filter-btn" href="#${c.toLowerCase()}">${c}</a>`).join('')}</nav>
    ${cats.map((c) => `<section class="faq-group" id="${c.toLowerCase()}" aria-labelledby="h-${c.toLowerCase()}"><h2 id="h-${c.toLowerCase()}">${c}</h2>${C.faqAccordion(content.faqs[c], 'fq-' + c.toLowerCase())}</section>`).join('')}
  </div>
</section>
${C.ctaBand('Still have questions?', 'Our team is happy to help — call, WhatsApp or book a free consultation.')}`;
  return { path: '/faq/', html: page({ path: '/faq/', title: `FAQ | ${site.name}`, description: 'Frequently asked questions about ScaleNest Digital services, pricing, reporting and work-from-home careers.', schema: [C.faqSchema(all), C.breadcrumbSchema(crumbs)] }, body) };
}

function legal(slug, title, intro, sections) {
  const path = `/${slug}/`;
  const crumbs = [['Home', '/'], [title, path]];
  const body = `
${C.pageHero({ title, sub: `Last updated: 1 October 2026`, crumbs })}
<section class="section">
  <div class="container narrow prose">
    <p class="lead">${intro}</p>
    ${sections.map(([h, t, id]) => `<h2${id ? ` id="${id}"` : ''}>${h}</h2>${t}`).join('')}
    <h2>Contact</h2><p>${site.name}, ${esc(fullAddress())}. Email: <a href="mailto:${site.email}">${site.email}</a> · Phone: ${site.phone}</p>
    <p class="notice small">This document is a template provided for convenience. Please have it reviewed by a qualified legal professional before publishing.</p>
  </div>
</section>`;
  return { path, html: page({ path, title: `${title} | ${site.name}`, description: `${title} for ${site.name} — how we handle your information, services and payments.`, schema: [C.breadcrumbSchema(crumbs)] }, body) };
}

const privacy = () => legal('privacy-policy', 'Privacy Policy', `This Privacy Policy explains how ${site.name} (“we”, “us”) collects, uses and protects personal data when you use our website, request our services or apply for a job, in line with India’s Digital Personal Data Protection Act, 2023.`, [
  ['Information we collect', '<ul><li><strong>Enquiry data:</strong> name, email, phone, company, budget and messages you submit through our forms.</li><li><strong>Job applications:</strong> CV/resume, voice notes, city, experience, languages and links you share.</li><li><strong>Usage data:</strong> pages visited, device and browser information, collected via cookies only with your consent.</li></ul>'],
  ['How we use your information', '<ul><li>To respond to enquiries and deliver services.</li><li>To assess job applications and contact candidates.</li><li>To send newsletters you have subscribed to (unsubscribe anytime).</li><li>To improve our website and measure marketing performance.</li></ul>'],
  ['Cookies & tracking', '<p>We use essential cookies to run the site. With your consent we also use Google Analytics 4, Google Tag Manager and the Meta Pixel to understand how visitors use our site and to measure advertising. You can change your choice anytime by clearing cookies for this site.</p>', 'cookies'],
  ['Data sharing', '<p>We never sell your data. We share it only with service providers who help us operate (hosting, email, CRM, analytics) under confidentiality obligations, or where required by law.</p>'],
  ['Client calling data', '<p>Customer data that clients share with us for tele-calling is processed only on their instructions, stored in access-controlled systems and deleted or returned at the end of the engagement.</p>'],
  ['Data retention', '<p>Enquiries are kept for up to 24 months; job applications for 6 months unless you ask us to delete them sooner.</p>'],
  ['Your rights', `<p>You may request access, correction or deletion of your personal data, or withdraw consent, by emailing <a href="mailto:${site.email}">${site.email}</a>. We respond within 30 days.</p>`],
  ['Security', '<p>We use HTTPS, access controls, encrypted storage for uploaded files and regular reviews to protect your data.</p>']
]);

const terms = () => legal('terms-and-conditions', 'Terms & Conditions', `These Terms & Conditions govern your use of the ${site.name} website and the services we provide. By using this website or engaging our services, you agree to these terms.`, [
  ['Use of this website', '<p>You may use this website for lawful purposes only. Content is provided for general information and may change without notice.</p>'],
  ['Services', '<p>The scope, deliverables, fees and timelines of each engagement are set out in a proposal or service agreement signed by both parties, which takes precedence over these terms.</p>'],
  ['Fees & payment', '<p>Fees are payable in advance as stated in your invoice. Prices exclude GST. Advertising spend is paid directly by the client to the respective platform.</p>'],
  ['Client responsibilities', '<p>Clients must provide timely access, approvals and accurate information. Delays caused by missing inputs may affect timelines.</p>'],
  ['Results', '<p>We commit to professional, best-practice work but cannot guarantee specific rankings, ad performance or sales, which depend on third-party platforms and market factors.</p>'],
  ['Intellectual property', '<p>On full payment, clients own the final deliverables created specifically for them. We retain ownership of our tools, templates and processes.</p>'],
  ['Careers', '<p>We never charge candidates any fee for applications, training or employment. Any such request made in our name is fraudulent.</p>'],
  ['Limitation of liability', '<p>Our total liability for any claim is limited to the fees paid for the service in the three months preceding the claim.</p>'],
  ['Governing law', '<p>These terms are governed by the laws of India, with exclusive jurisdiction of the courts at Gurugram, Haryana.</p>']
]);

const refund = () => legal('refund-policy', 'Refund Policy', `We want every client to be satisfied. This policy explains when refunds apply to ${site.name} services.`, [
  ['Monthly retainers', '<p>Monthly service fees are non-refundable once the month’s work has begun. You may cancel with 30 days’ written notice after the initial 3-month onboarding period.</p>'],
  ['Website projects', '<p>A 50% advance is refundable in full if cancelled before design work starts, and 50% of the advance is refundable if cancelled before the first design is delivered. No refunds after design approval.</p>'],
  ['Tele-calling packages', '<p>Unused calling days in a prepaid month can be carried forward once. Setup and training fees are non-refundable.</p>'],
  ['Ad spend', '<p>Advertising spend is paid directly to Google or Meta and is governed by their refund policies.</p>'],
  ['How to request a refund', `<p>Email <a href="mailto:${site.email}">${site.email}</a> with your invoice number. Approved refunds are processed within 10 working days to the original payment method.</p>`]
]);

// Applicant login — mobile number + the password set during the application. Rendered static; main.js (initAccount)
// posts to /api/account/login and redirects to the dashboard on success.
function login() {
  const crumbs = [['Home', '/'], ['Track application', '/login/']];
  const body = `
<section class="section acct-section">
  <div class="container narrow">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Track application</li></ol></nav>
    <div class="form-card acct-card reveal">
      <div class="acct-head">
        <span class="icon-wrap">${icon('user', { size: 24 })}</span>
        <div><h1 class="h3">Track your application</h1><p class="muted">Log in with the mobile number and password you created while applying.</p></div>
      </div>
      <form class="form js-account" data-account="login" novalidate>
        <div class="field full"><label for="lg-phone">Mobile number <span class="req" aria-hidden="true">*</span></label>
          <div class="input-group"><span class="input-prefix" aria-hidden="true">+91</span><input id="lg-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10-digit number" required data-indian-mobile></div>
          <p class="err" aria-live="polite"></p></div>
        <div class="field full"><label for="lg-pass">Password <span class="req" aria-hidden="true">*</span></label>
          <input id="lg-pass" name="password" type="password" autocomplete="current-password" placeholder="Your password" required>
          <p class="err" aria-live="polite"></p></div>
        <div class="form-foot full"><button type="submit" class="btn btn-accent btn-lg btn-block">Log in ${icon('arrow-right', { size: 18 })}</button><p class="form-status" role="status" aria-live="polite"></p></div>
      </form>
      <p class="small muted acct-alt">New here? <a href="/signup/">Create a free account</a> to apply for jobs and track your applications.</p>
      <p class="otp-privacy">${icon('lock', { size: 16 })}<span>${site.name} never asks for any fee or for an Aadhaar/bank OTP. Only use the password you created here.</span></p>
    </div>
  </div>
</section>`;
  return { path: '/login/', html: page({ path: '/login/', title: `Track Your Application | ${site.name}`, description: 'Log in to track the status and progress of your job application with ScaleNest Digital.', noindex: true, schema: [C.breadcrumbSchema(crumbs)] }, body) };
}

// Applicant sign-up — create an account (name, mobile, email, password). main.js (initAccount) posts to
// /api/account/signup, stores the session and redirects to the dashboard (or ?next=).
function signup() {
  const crumbs = [['Home', '/'], ['Create account', '/signup/']];
  const body = `
<section class="section acct-section">
  <div class="container narrow">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Create account</li></ol></nav>
    <div class="form-card acct-card reveal">
      <div class="acct-head">
        <span class="icon-wrap">${icon('user', { size: 24 })}</span>
        <div><h1 class="h3">Create your free account</h1><p class="muted">You’ll need an account to apply for jobs and track your applications.</p></div>
      </div>
      <form class="form js-account" data-account="signup" novalidate>
        <div class="field full"><label for="su-name">Full name <span class="req" aria-hidden="true">*</span></label>
          <input id="su-name" name="name" type="text" autocomplete="name" placeholder="As written on your Aadhaar" required>
          <p class="err" aria-live="polite"></p></div>
        <div class="field full"><label for="su-phone">Mobile number <span class="req" aria-hidden="true">*</span></label>
          <div class="input-group"><span class="input-prefix" aria-hidden="true">+91</span><input id="su-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10-digit number" required data-indian-mobile></div>
          <p class="hint">This becomes your login ID — use the number you’ll apply with.</p><p class="err" aria-live="polite"></p></div>
        <div class="field full"><label for="su-email">Email <span class="req" aria-hidden="true">*</span></label>
          <input id="su-email" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" placeholder="you@gmail.com" required>
          <p class="err" aria-live="polite"></p></div>
        <div class="field full"><label for="su-pass">Create a password <span class="req" aria-hidden="true">*</span></label>
          <input id="su-pass" name="password" type="password" autocomplete="new-password" minlength="6" data-minlen="6" placeholder="At least 6 characters" required>
          <p class="err" aria-live="polite"></p></div>
        <div class="form-foot full"><button type="submit" class="btn btn-accent btn-lg btn-block">Create account ${icon('arrow-right', { size: 18 })}</button><p class="form-status" role="status" aria-live="polite"></p></div>
      </form>
      <p class="small muted acct-alt">Already have an account? <a href="/login/">Log in</a>.</p>
      <p class="otp-privacy">${icon('lock', { size: 16 })}<span>By creating an account you agree to our <a href="/privacy-policy/" target="_blank">Privacy Policy</a>. ${site.name} never charges any fee to apply.</span></p>
    </div>
  </div>
</section>`;
  return { path: '/signup/', html: page({ path: '/signup/', title: `Create Account | ${site.name}`, description: 'Create a free account to apply for work-from-home jobs and track your applications with ScaleNest Digital.', noindex: true, schema: [C.breadcrumbSchema(crumbs)] }, body) };
}

// Applicant dashboard — the shell only; main.js (initAccount) fetches /api/account/me and renders the cards,
// or sends the visitor to /login/ when there is no valid session.
function dashboard() {
  const body = `
<section class="section acct-section" data-dashboard>
  <div class="container">
    <div class="dash-head reveal">
      <div><p class="eyebrow">My account</p><h1 class="h3" data-dash-welcome>Your dashboard</h1><p class="muted" data-dash-sub>Loading…</p></div>
      <button type="button" class="btn btn-ghost btn-sm" data-logout hidden>Log out</button>
    </div>

    <h2 class="h4 dash-section-h">${icon('briefcase', { size: 20 })} Applied jobs</h2>
    <div data-dash-body aria-live="polite"><div class="dash-loading"><span class="otp-spinner" aria-hidden="true"></span><p class="muted">Loading…</p></div></div>

    <h2 class="h4 dash-section-h dash-section-gap">${icon('zap', { size: 20 })} New opportunities</h2>
    <p class="muted dash-section-sub">Open roles you haven’t applied to yet.</p>
    <div data-dash-jobs aria-live="polite"></div>
  </div>
</section>`;
  return { path: '/dashboard/', html: page({ path: '/dashboard/', title: `Your Dashboard | ${site.name}`, description: 'Your ScaleNest Digital account dashboard — applied jobs and new opportunities.', noindex: true }, body) };
}

function notFound() {
  const body = `
<section class="nf">
  <div class="container narrow center">
    <p class="nf-code" aria-hidden="true">404</p>
    <h1>Oops — this page took a remote day off</h1>
    <p class="lead">The page you’re looking for doesn’t exist or has moved. Try searching, or use one of the links below.</p>
    <form class="nf-search" id="nf-search" role="search" onsubmit="return false">
      <label for="nf-q" class="sr-only">Search the site</label>
      <div class="jf-search">${icon('search', { size: 20 })}<input id="nf-q" type="search" placeholder="Search pages, services or jobs…" autocomplete="off"></div>
    </form>
    <ul class="nf-results" id="nf-results" aria-live="polite"></ul>
    <div class="hero-actions center-actions">
      <a href="/" class="btn btn-primary">${icon('home', { size: 18 })} Home</a>
      <a href="/services/" class="btn btn-ghost">Our Services</a>
      <a href="/careers/" class="btn btn-accent">Work From Home Jobs</a>
    </div>
  </div>
</section>`;
  return { path: '/404.html', html: page({ path: '/404.html', title: `Page Not Found | ${site.name}`, description: 'The page you are looking for could not be found.', noindex: true }, body) };
}

module.exports = () => [contact(), faq(), privacy(), terms(), refund(), login(), signup(), dashboard(), notFound()];
