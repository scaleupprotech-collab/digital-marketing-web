// Reusable section/card/form components shared across pages.
const { icon } = require('./icons');
const { esc, abs, site, services, honeypot } = require('./layout');

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
const salaryText = (j) => `${inr(j.salaryMin)} – ${inr(j.salaryMax)}${j.type === 'Internship' ? ' stipend' : ''}/month`;
const readingTime = (html) => Math.max(2, Math.round(html.replace(/<[^>]+>/g, ' ').split(/\s+/).length / 200));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function sectionHead({ eyebrow, title, sub, center = true, h = 'h2' }) {
  return `<div class="section-head${center ? ' center' : ''} reveal">
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    <${h}>${title}</${h}>
    ${sub ? `<p class="lead">${sub}</p>` : ''}
  </div>`;
}

function breadcrumbSchema(crumbs) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(href) })) };
}

function pageHero({ eyebrow, title, sub, crumbs = [], actions = '', extra = '' }) {
  const bc = crumbs.length ? `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${crumbs.map(([l, h], i) => i === crumbs.length - 1 ? `<li aria-current="page">${esc(l)}</li>` : `<li><a href="${h}">${esc(l)}</a></li>`).join('')}</ol></nav>` : '';
  return `<section class="page-hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="container page-hero-inner">
    ${bc}
    ${eyebrow ? `<p class="eyebrow eyebrow-light">${esc(eyebrow)}</p>` : ''}
    <h1>${title}</h1>
    ${sub ? `<p class="lead">${sub}</p>` : ''}
    ${actions ? `<div class="hero-actions">${actions}</div>` : ''}
    ${extra}
  </div>
</section>`;
}

// Initials avatar used as a replaceable stand-in for team/client photos.
function avatar(name, size = 56) {
  const initials = name.replace(/^Dr\.\s*/, '').split(' ').map((w) => w[0]).slice(0, 2).join('');
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
  return `<span class="avatar av-${hue}" style="--s:${size}px" role="img" aria-label="Photo of ${esc(name)}">${initials}</span>`;
}

const stars = (n) => `<span class="stars" role="img" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= n ? 'on' : ''}">${icon('star', { size: 16 })}</span>`).join('')}</span>`;

function serviceCard(s) {
  return `<article class="card service-card reveal">
    <div class="icon-wrap">${icon(s.icon, { size: 26 })}</div>
    <h3>${esc(s.navName && s.navName !== s.name ? s.name : s.name)}</h3>
    <p>${esc(s.short)}</p>
    <a class="link-arrow" href="/services/${s.slug}/" aria-label="Learn more about ${esc(s.name)}">Learn More ${icon('arrow-right', { size: 16 })}</a>
  </article>`;
}

function caseCard(c, full = false) {
  return `<article class="card case-card reveal" data-service="${esc(c.service)}">
    <div class="case-top">
      <span class="chip">${esc(c.service)}</span>
      <span class="case-highlight">${esc(c.highlight)}</span>
    </div>
    <h3><a href="/case-studies/${c.slug}/">${esc(c.client)}</a></h3>
    <p class="muted small">${esc(c.industry)} · ${esc(c.location)}</p>
    ${full ? `<dl class="case-cs"><dt>Challenge</dt><dd>${esc(c.challenge)}</dd><dt>Solution</dt><dd>${esc(c.solution)}</dd></dl>` : `<p>${esc(c.summary)}</p>`}
    <ul class="metrics">${c.results.slice(0, full ? 3 : 2).map((r) => `<li><span class="m-label">${esc(r.label)}</span><span class="m-vals"><s aria-label="before">${esc(r.before)}</s>${icon('arrow-right', { size: 14 })}<strong aria-label="after">${esc(r.after)}</strong></span></li>`).join('')}</ul>
    <a class="link-arrow" href="/case-studies/${c.slug}/">Read case study ${icon('arrow-right', { size: 16 })}</a>
  </article>`;
}

function postCard(p) {
  return `<article class="card post-card reveal" data-category="${esc(p.category)}" data-search="${esc((p.title + ' ' + p.excerpt + ' ' + p.category).toLowerCase())}">
    <a href="/blog/${p.slug}/" class="post-thumb thumb-${slugify(p.category)}" tabindex="-1" aria-hidden="true">${icon(catIcon(p.category), { size: 40 })}</a>
    <div class="post-body">
      <p class="post-meta"><span class="chip">${esc(p.category)}</span><span>${fmtDate(p.date)}</span><span>${readingTime(p.body)} min read</span></p>
      <h3><a href="/blog/${p.slug}/">${esc(p.title)}</a></h3>
      <p>${esc(p.excerpt)}</p>
    </div>
  </article>`;
}
function catIcon(c) {
  return { SEO: 'search', 'Meta Ads': 'target', 'Digital Marketing': 'megaphone', 'Tele-calling': 'headphones', 'Careers & Remote Work': 'home' }[c] || 'file-text';
}

function jobCard(j) {
  const days = Math.max(0, Math.round((Date.now() - new Date(j.posted)) / 864e5));
  const posted = days === 0 ? 'Today' : days === 1 ? '1 day ago' : days < 30 ? `${days} days ago` : fmtDate(j.posted);
  return `<article class="card job-card" data-department="${esc(j.department)}" data-type="${esc(j.type)}" data-mode="${esc(j.mode)}" data-experience="${esc(j.experience)}" data-languages="${esc(j.languages.join('|'))}" data-search="${esc((j.title + ' ' + j.department + ' ' + j.summary).toLowerCase())}">
    <div class="job-head">
      <div>
        <p class="job-dept">${esc(j.department)}</p>
        <h3><a href="/careers/${j.slug}/">${esc(j.title)}</a></h3>
      </div>
      <span class="badge ${j.mode === 'Work From Home' ? 'badge-wfh' : 'badge-hybrid'}">${icon('home', { size: 14 })}${esc(j.mode)}</span>
    </div>
    <ul class="job-facts">
      <li>${icon('briefcase', { size: 16 })}${esc(j.type)}</li>
      <li>${icon('award', { size: 16 })}${esc(j.experienceText)}</li>
      <li>${icon('indian-rupee', { size: 16 })}${salaryText(j)}</li>
      <li>${icon('globe', { size: 16 })}${esc(j.languages.join(', '))}</li>
    </ul>
    <div class="job-foot">
      <span class="muted small">${icon('clock', { size: 14 })} Posted <time datetime="${j.posted}">${posted}</time></span>
      <div class="job-actions">
        <a class="btn btn-ghost btn-sm" href="/careers/${j.slug}/">View Details</a>
        <a class="btn btn-accent btn-sm" href="/careers/${j.slug}/#apply">Apply Now</a>
      </div>
    </div>
  </article>`;
}

function jobSchema(j) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: j.title,
    description: `<p>${esc(j.summary)}</p><h3>Responsibilities</h3><ul>${j.responsibilities.map((r) => `<li>${esc(r)}</li>`).join('')}</ul><h3>Requirements</h3><ul>${j.requirements.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`,
    identifier: { '@type': 'PropertyValue', name: site.name, value: j.slug },
    datePosted: j.posted,
    validThrough: j.validThrough + 'T23:59:59+05:30',
    employmentType: { 'Full-time': 'FULL_TIME', 'Part-time': 'PART_TIME', Freelance: 'CONTRACTOR', Internship: 'INTERN' }[j.type],
    hiringOrganization: { '@type': 'Organization', name: site.name, sameAs: site.url, logo: abs('/assets/img/logo.svg') },
    ...(j.mode === 'Work From Home'
      ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: 'India' } }
      : {}),
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.city, addressRegion: site.address.region, postalCode: site.address.postalCode, addressCountry: 'IN' } },
    baseSalary: { '@type': 'MonetaryAmount', currency: 'INR', value: { '@type': 'QuantitativeValue', minValue: j.salaryMin, maxValue: j.salaryMax, unitText: 'MONTH' } },
    directApply: true,
    url: abs(`/careers/${j.slug}/`)
  };
}

function faqAccordion(items, prefix = 'faq') {
  return `<div class="accordion">${items.map(([q, a], i) => `<div class="acc-item">
    <h3 class="acc-h"><button class="acc-btn" aria-expanded="false" aria-controls="${prefix}-${i}" id="${prefix}-b${i}">${esc(q)}${icon('chevron-down', { size: 20 })}</button></h3>
    <div class="acc-panel" id="${prefix}-${i}" role="region" aria-labelledby="${prefix}-b${i}" hidden><p>${esc(a)}</p></div>
  </div>`).join('')}</div>`;
}
const faqSchema = (items) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

function processSteps(steps) {
  return `<ol class="process">${steps.map(([t, d], i) => `<li class="process-step reveal" style="--d:${i * 80}ms"><span class="step-num">${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>`;
}

function statsBlock(stats) {
  return `<div class="stats">${stats.map((s) => `<div class="stat reveal"><p class="stat-num"><span class="counter" data-target="${s.value}">${Number(s.value).toLocaleString('en-IN')}</span>${s.suffix}</p><p class="stat-label">${esc(s.label)}</p></div>`).join('')}</div>`;
}

function testimonialSlider(items, kind = 'client') {
  const slides = items.map((t) => `<figure class="slide testimonial">
    ${kind === 'client' ? stars(t.rating) : `<p class="since">${icon('home', { size: 14 })} Working from home since ${esc(t.since)}</p>`}
    <blockquote>“${esc(t.text)}”</blockquote>
    <figcaption>${avatar(t.name, 52)}<span><strong>${esc(t.name)}</strong><small>${esc(t.role)}, ${esc(kind === 'client' ? t.company : t.location)}</small></span></figcaption>
  </figure>`).join('');
  return `<div class="slider reveal" data-slider aria-roledescription="carousel" aria-label="${kind === 'client' ? 'Client testimonials' : 'Employee testimonials'}">
    <div class="slider-track" aria-live="polite">${slides}</div>
    <div class="slider-controls">
      <button class="icon-btn slider-prev" aria-label="Previous testimonial">${icon('chevron-left')}</button>
      <div class="slider-dots" role="tablist"></div>
      <button class="icon-btn slider-next" aria-label="Next testimonial">${icon('chevron-right')}</button>
    </div>
  </div>`;
}

function ctaBand(title = 'Ready to Scale Your Business?', text = 'Book a free 30-minute strategy call. We’ll review your marketing and show you exactly where your next customers will come from.', btn = '<a href="/contact/#consultation" class="btn btn-accent btn-lg">Get a Free Consultation</a>') {
  return `<section class="section">
  <div class="container"><div class="cta-band reveal">
    <div><h2>${title}</h2><p>${text}</p></div>
    <div class="cta-actions">${btn}<a href="tel:${site.phoneHref}" class="btn btn-outline-light btn-lg">${icon('phone', { size: 18 })} ${site.phone}</a></div>
  </div></div>
</section>`;
}

function clientStrip() {
  const { clients } = require('../data/content.json');
  const items = clients.map((c) => `<li class="client-logo">${icon('layers', { size: 18 })}<span>${esc(c)}</span></li>`).join('');
  return `<section class="clients" aria-label="Trusted by these businesses">
  <div class="container"><p class="clients-title">Trusted by 350+ growing businesses across India</p></div>
  <div class="marquee"><ul class="marquee-track">${items}${items.replace(/<li /g, '<li aria-hidden="true" ')}</ul></div>
</section>`;
}

function toolChips(tools) {
  return `<ul class="tool-grid">${tools.map((t) => `<li class="tool reveal"><span class="tool-mark" aria-hidden="true">${esc(t.split(' ').map((w) => w[0]).join('').slice(0, 2))}</span>${esc(t)}</li>`).join('')}</ul>`;
}

/* ---------- Forms ---------- */
const field = ({ id, label, type = 'text', name, required = true, placeholder = '', auto = '', attrs = '', full = false, hint = '' }) =>
  `<div class="field${full ? ' full' : ''}"><label for="${id}">${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="opt">(optional)</span>'}</label>
  <input id="${id}" name="${name}" type="${type}"${required ? ' required' : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${auto ? ` autocomplete="${auto}"` : ''} ${attrs}>
  ${hint ? `<p class="hint">${hint}</p>` : ''}<p class="err" aria-live="polite"></p></div>`;
const select = ({ id, label, name, options, required = true, full = false, selected = '' }) =>
  `<div class="field${full ? ' full' : ''}"><label for="${id}">${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="opt">(optional)</span>'}</label>
  <select id="${id}" name="${name}"${required ? ' required' : ''}><option value="">Select…</option>${options.map((o) => `<option${o === selected ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select><p class="err" aria-live="polite"></p></div>`;
const textarea = ({ id, label, name, required = false, placeholder = '', rows = 4 }) =>
  `<div class="field full"><label for="${id}">${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="opt">(optional)</span>'}</label>
  <textarea id="${id}" name="${name}" rows="${rows}"${required ? ' required' : ''}${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}></textarea><p class="err" aria-live="polite"></p></div>`;
const consent = (id, text = 'I agree to the <a href="/privacy-policy/">Privacy Policy</a> and to be contacted about my enquiry.') =>
  `<div class="field full check"><input type="checkbox" id="${id}" name="consent" value="yes" required><label for="${id}">${text}</label><p class="err" aria-live="polite"></p></div>`;
const submit = (label) => `<div class="form-foot full"><button type="submit" class="btn btn-accent btn-lg">${label}</button><p class="form-status" role="status" aria-live="polite"></p></div>`;
const formWrap = (type, inner, extra = '') => `<form class="form js-form" data-form="${type}" action="/api/forms/${type}" method="post" novalidate${extra}>${honeypot()}<div class="form-grid">${inner}</div></form>`;

function auditForm() {
  return formWrap('seo-audit', [
    field({ id: 'au-name', label: 'Full name', name: 'name', auto: 'name' }),
    field({ id: 'au-email', label: 'Work email', name: 'email', type: 'email', auto: 'email' }),
    field({ id: 'au-url', label: 'Website URL', name: 'website', type: 'url', placeholder: 'https://yourbusiness.com', auto: 'url' }),
    field({ id: 'au-phone', label: 'Phone', name: 'phone', type: 'tel', placeholder: '+91 98xxx xxxxx', auto: 'tel', attrs: 'pattern="[+0-9 ()-]{10,16}"' }),
    submit('Get My Free SEO Audit')
  ].join(''));
}

function inquiryForm(serviceName) {
  return formWrap('service-inquiry', [
    `<input type="hidden" name="service" value="${esc(serviceName)}">`,
    field({ id: 'iq-name', label: 'Full name', name: 'name', auto: 'name' }),
    field({ id: 'iq-email', label: 'Email', name: 'email', type: 'email', auto: 'email' }),
    field({ id: 'iq-phone', label: 'Phone', name: 'phone', type: 'tel', auto: 'tel', attrs: 'pattern="[+0-9 ()-]{10,16}"' }),
    field({ id: 'iq-company', label: 'Company', name: 'company', required: false, auto: 'organization' }),
    select({ id: 'iq-budget', label: 'Monthly budget', name: 'budget', options: ['Under ₹25,000', '₹25,000 – ₹50,000', '₹50,000 – ₹1,00,000', '₹1,00,000 – ₹3,00,000', '₹3,00,000+'], required: false, full: true }),
    textarea({ id: 'iq-msg', label: 'Tell us about your goals', name: 'message', placeholder: `What would you like ${serviceName} to achieve for your business?` }),
    consent('iq-consent'),
    submit('Request a Quote')
  ].join(''));
}

function contactForm() {
  return formWrap('contact', [
    field({ id: 'ct-name', label: 'Full name', name: 'name', auto: 'name' }),
    field({ id: 'ct-email', label: 'Email', name: 'email', type: 'email', auto: 'email' }),
    field({ id: 'ct-phone', label: 'Phone', name: 'phone', type: 'tel', auto: 'tel', attrs: 'pattern="[+0-9 ()-]{10,16}"' }),
    field({ id: 'ct-company', label: 'Company', name: 'company', required: false, auto: 'organization' }),
    select({ id: 'ct-service', label: 'Service interested in', name: 'service', options: [...services.map((s) => s.name), 'Multiple services', 'Not sure yet'] }),
    select({ id: 'ct-budget', label: 'Budget range (monthly)', name: 'budget', options: ['Under ₹25,000', '₹25,000 – ₹50,000', '₹50,000 – ₹1,00,000', '₹1,00,000 – ₹3,00,000', '₹3,00,000+'] }),
    textarea({ id: 'ct-msg', label: 'Message', name: 'message', required: true, placeholder: 'Tell us about your business and what you want to achieve.' }),
    consent('ct-consent'),
    submit('Send Message')
  ].join(''));
}

/* Multi-step job application wizard (steps: basic details → verify mobile → qualification → experience → documents & review).
   Rendered as one <form>; /assets/js/main.js (initWizard) handles step navigation, OTP and draft saving. */
const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];
const WIZARD_STEPS = [
  ['user', 'Basic details', 'Let’s start with your basic details', 'This helps our recruiter know you and call you prepared.'],
  ['book-open', 'Education & work', 'Your education and experience', 'Freshers are welcome — choose “Fresher” if you haven’t worked before.'],
  ['smartphone', 'Verify mobile', 'Verify your mobile number', 'Tap “Verify your number” and we’ll send you an OTP. Enter it here and our team will approve your number.'],
  ['upload', 'Finish', 'Almost done!', 'Choose your shift, add your resume (optional for freshers) and submit.']
];

// Multi-select chips (checkboxes) and single-choice chips (radios) — big tap targets instead of dropdowns.
const pills = (name, options, required = false) =>
  `<div class="check-grid"${required ? ' data-group-required' : ''}>${options.map((o) => `<label class="pill-check"><input type="checkbox" name="${name}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div>`;
const choices = (name, options, required = true) =>
  `<div class="choice-grid" role="radiogroup"${required ? ' data-group-required' : ''}>${options.map((o) => `<label class="pill-check choice"><input type="radio" name="${name}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div>`;
const choiceField = (label, name, options, { required = true, hint = '' } = {}) =>
  `<fieldset class="field full"><legend>${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="opt">(optional)</span>'}</legend>${hint ? `<p class="hint">${hint}</p>` : ''}${choices(name, options, required)}<p class="err" aria-live="polite"></p></fieldset>`;
const more = (summary, inner) =>
  `<details class="more full"><summary>${icon('chevron-down', { size: 18 })}<span>${summary}</span><small>optional</small></summary><div class="form-grid">${inner}</div></details>`;

function applicationForm(j) {
  const id = (s) => `ap-${s}-${j.slug}`;
  const langs = ['Hindi', 'English', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Odia', 'Urdu'];
  const thisYear = new Date().getFullYear();
  const years = ['Still studying', ...Array.from({ length: 37 }, (_, i) => String(thisYear - i))];
  const streams = ['10th', '12th Arts', '12th Commerce', '12th Science', 'Diploma', 'ITI', 'BA', 'B.Com', 'B.Sc', 'BBA', 'BCA', 'B.Tech / BE', 'MA', 'M.Com', 'MBA', 'MCA'];

  const steps = [
    // 1. Basic details
    [
      field({ id: id('name'), label: 'Full name', name: 'name', auto: 'name', placeholder: 'As written on your Aadhaar', full: true }),
      `<div class="field"><label for="${id('phone')}">Mobile number <span class="req" aria-hidden="true">*</span></label>
        <div class="input-group"><span class="input-prefix" aria-hidden="true">+91</span><input id="${id('phone')}" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10-digit number" required data-indian-mobile></div>
        <p class="hint">Use the number linked to your Aadhaar — you'll verify it next.</p><p class="err" aria-live="polite"></p></div>`,
      field({ id: id('email'), label: 'Email', name: 'email', type: 'email', auto: 'email', placeholder: 'you@gmail.com', attrs: 'inputmode="email" autocapitalize="off"' }),
      field({ id: id('dob'), label: 'Date of birth', name: 'dob', auto: 'bday', placeholder: 'DD/MM/YYYY', attrs: 'inputmode="numeric" maxlength="10" data-dob' }),
      field({ id: id('pin'), label: 'PIN code', name: 'pincode', required: false, placeholder: '6 digits — fills city & state', attrs: 'inputmode="numeric" maxlength="6" autocomplete="postal-code" data-pincode', full: false }),
      field({ id: id('city'), label: 'City / district', name: 'city', auto: 'address-level2', placeholder: 'e.g. Lucknow' }),
      select({ id: id('state'), label: 'State', name: 'state', options: STATES }),
      choiceField('What are you doing currently?', 'status', ['Fresher', 'Student', 'Working', 'Looking for a change', 'Career break']),
      choiceField('Gender', 'gender', ['Female', 'Male', 'Other', 'Prefer not to say'], { required: false }),
      `<p class="full save-note">${icon('lock', { size: 15 })}<span>When you tap Save & Next, your details are saved securely so our recruiter can help you finish your application. See our <a href="/privacy-policy/" target="_blank">Privacy Policy</a>.</span></p>`
    ],
    // 2. Education & work
    [
      choiceField('Highest qualification', 'qualification', ['10th pass', '12th pass', 'Diploma / ITI', 'Graduate', 'Post Graduate', 'Still studying']),
      `<div class="field"><label for="${id('stream')}">Degree / stream <span class="req" aria-hidden="true">*</span></label>
        <input id="${id('stream')}" name="stream" type="text" list="${id('streams')}" required placeholder="e.g. B.Com, 12th Arts" autocomplete="off">
        <datalist id="${id('streams')}">${streams.map((s) => `<option value="${s}">`).join('')}</datalist><p class="err" aria-live="polite"></p></div>`,
      select({ id: id('year'), label: 'Year of passing', name: 'passingYear', options: years }),
      choiceField('Work experience', 'experience', ['Fresher', 'Less than 1 year', '1–2 years', '2–4 years', '4+ years']),
      `<fieldset class="field full"><legend>Languages you speak well <span class="req" aria-hidden="true">*</span></legend><p class="hint">Select all that apply</p>${pills('languages', langs, true)}<p class="err" aria-live="polite"></p></fieldset>`,
      more('Add more details — college, skills, last job', [
        field({ id: id('institute'), label: 'School / college', name: 'institute', required: false, placeholder: 'e.g. Lucknow University' }),
        field({ id: id('score'), label: 'Percentage / CGPA', name: 'score', required: false, placeholder: 'e.g. 72%' }),
        field({ id: id('company'), label: 'Last company', name: 'lastCompany', required: false }),
        field({ id: id('role'), label: 'Last job title', name: 'lastRole', required: false }),
        field({ id: id('expected'), label: 'Expected salary (₹/month)', name: 'expectedSalary', type: 'number', required: false, placeholder: 'e.g. 15000', attrs: 'min="0" step="500" inputmode="numeric"' }),
        `<fieldset class="field full"><legend>Skills <span class="opt">(optional)</span></legend>${pills('skills', ['MS Excel', 'Google Sheets', 'Fast typing', 'CRM software', 'Customer handling', 'Sales', 'Social media', 'Canva', 'SEO basics', 'Content writing'])}</fieldset>`,
        textarea({ id: id('certs'), label: 'Certificates / courses', name: 'certifications', rows: 2, placeholder: 'e.g. Google Digital Marketing (2025)' })
      ].join(''))
    ],
    // 3. Verify mobile (number comes from step 1; approved by an admin)
    [
      `<div class="full otp-box" data-otp>
        <div class="otp-number"><span class="otp-icon">${icon('smartphone', { size: 22 })}</span><div><small>Your mobile number</small><strong>+91 <span data-otp-phone>—</span></strong></div><button type="button" class="btn-link" data-otp-change>Change</button></div>
        <div class="verify-state" data-verify-state hidden></div>
        <div class="otp-request" data-otp-request-box>
          <label class="consent-line" for="${id('aadhaar')}"><input type="checkbox" id="${id('aadhaar')}" name="aadhaarLinked" value="yes" required><span>This number is <strong>linked to my Aadhaar</strong> and belongs to me</span></label>
          <p class="err aadhaar-err" aria-live="polite"></p>
          <button type="button" class="btn btn-accent btn-lg btn-block" data-otp-request>${icon('shield', { size: 18 })} <span>Verify your number</span></button>
        </div>
        <div class="otp-wait" data-otp-wait hidden role="status" aria-live="polite">
          <div class="otp-timer" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" class="t-track"/><circle cx="32" cy="32" r="28" class="t-bar" data-otp-ring/></svg><span data-otp-seconds>30</span></div>
          <div><strong>Sending OTP to +91 <span data-otp-phone2></span></strong><p>Please keep this page open. You can enter the OTP in <b data-otp-seconds2>30</b> seconds.</p></div>
        </div>
        <div class="otp-entry" data-otp-entry hidden>
          <label for="${id('otp')}">Enter the OTP sent to +91 <span data-otp-phone3></span></label>
          <input id="${id('otp')}" class="otp-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Enter OTP" data-skip-validate>
          <button type="button" class="btn btn-accent btn-lg btn-block" data-otp-submit>Submit OTP ${icon('arrow-right', { size: 18 })}</button>
          <p class="hint otp-again">Didn’t get the OTP? <button type="button" class="btn-link" data-otp-again>Request again</button></p>
        </div>
        <p class="otp-status" data-otp-status role="status" aria-live="polite"></p>
        <p class="otp-privacy">${icon('lock', { size: 16 })}<span>Only enter the OTP sent to you by ${site.name}. Never share an Aadhaar or bank OTP with anyone.</span></p>
      </div>`
    ],
    // 4. Finish
    [
      choiceField('Preferred shift', 'shift', j.shifts),
      choiceField('When can you start?', 'availability', ['Immediately', 'Within 1 week', 'Within 2 weeks', 'Within 1 month']),
      `<fieldset class="field full"><legend>Your work-from-home setup <span class="opt">(tap what you have)</span></legend>${pills('setup', ['Laptop / PC', 'Smartphone', 'Wi-Fi / 4G internet', 'Headset with mic', 'Quiet place'])}</fieldset>`,
      `<div class="field full" data-resume-field><label for="${id('resume')}">Resume / CV <span class="req" aria-hidden="true" data-resume-req>*</span></label>
        <div class="file-drop">${icon('file-text', { size: 26 })}<span class="file-text"><strong>Tap to upload your resume</strong><small>PDF or Word · max 2 MB</small></span>
        <input id="${id('resume')}" name="resume" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required data-max-mb="2" data-ext="pdf,doc,docx" data-required-msg="Please upload your resume — or tick “I don’t have a resume” below."></div><p class="err" aria-live="polite"></p>
        <label class="consent-line soft" for="${id('nocv')}"><input type="checkbox" id="${id('nocv')}" name="noResume" value="yes" data-no-resume><span>I don’t have a resume — I’m a fresher</span></label></div>`,
      j.voiceNote ? `<div class="field full"><label for="${id('voice')}">Voice introduction <span class="opt">(optional — helps you get shortlisted faster)</span></label>
        <div class="file-drop">${icon('mic', { size: 26 })}<span class="file-text"><strong>Upload a 30–60 sec voice note</strong><small>Say your name, city and why you want this job · max 2 MB</small></span>
        <input id="${id('voice')}" name="voiceNote" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac" data-max-mb="2" data-ext="mp3,m4a,wav,ogg,aac,webm,opus"></div><p class="err" aria-live="polite"></p></div>` : '',
      more('Add a message or portfolio link', [
        field({ id: id('link'), label: 'LinkedIn / portfolio link', name: 'portfolio', type: 'url', required: false, placeholder: 'https://', full: true }),
        textarea({ id: id('msg'), label: 'Message to the recruiter', name: 'message', rows: 3, placeholder: 'Anything you’d like us to know' })
      ].join('')),
      `<details class="review full" data-review><summary>${icon('clipboard', { size: 18 })}<span>Check your answers</span><small>tap to view</small></summary><div data-review-body></div></details>`,
      consent(id('consent'), 'I confirm my details are correct and agree to the <a href="/privacy-policy/" target="_blank">Privacy Policy</a>.')
    ]
  ];

  const nav = `<ol class="wz-nav" aria-label="Application steps">${WIZARD_STEPS.map(([ic, t], i) => `<li${i === 0 ? ' aria-current="step"' : ''}><button type="button" data-goto="${i}" ${i === 0 ? '' : 'disabled'}><span class="wz-dot">${icon(ic, { size: 18, class: 'wz-ic' })}${icon('check', { size: 18, class: 'wz-ok' })}</span><span class="wz-label">${t}</span></button></li>`).join('')}</ol>`;
  const panels = steps.map((fields, i) => `<section class="wz-step" data-step="${i}" aria-labelledby="wz-h-${j.slug}-${i}"${i ? ' hidden' : ''}>
    <header class="wz-head"><h3 id="wz-h-${j.slug}-${i}" tabindex="-1">${WIZARD_STEPS[i][2]}</h3><p>${WIZARD_STEPS[i][3]}</p></header>
    <div class="form-grid">${fields.join('')}</div>
  </section>`).join('');

  return `<div class="apply-gate" data-apply-gate hidden>
    <span class="icon-wrap">${icon('lock', { size: 26 })}</span>
    <h3>Log in to apply</h3>
    <p>Create a free account or log in to apply for this role and track your application from your dashboard.</p>
    <div class="hero-actions"><a class="btn btn-accent btn-lg" data-gate-signup href="/signup/">Create free account</a><a class="btn btn-ghost btn-lg" data-gate-login href="/login/">Log in</a></div>
    <p class="small muted">${site.name} never charges any fee to apply. It takes under a minute.</p>
  </div>
  <div class="wizard-wrap" data-wizard-wrap hidden>
  <form class="form js-form wizard" data-form="job-application" data-wizard data-draft-key="sn-apply-${esc(j.slug)}" action="/api/forms/job-application" method="post" enctype="multipart/form-data" novalidate>
    ${honeypot()}
    <input type="hidden" name="job" value="${esc(j.title)}"><input type="hidden" name="jobSlug" value="${esc(j.slug)}"><input type="hidden" name="draftId" value="">
    <div class="wz-top">
      <div class="wz-title"><div><small>Applying for</small><strong>${esc(j.title)}</strong></div><span class="wz-meta"><span data-wz-stepcount>Step 1 of ${steps.length}</span> · ~3 min</span></div>
      ${nav}
      <div class="wz-progress" aria-hidden="true"><span></span></div>
    </div>
    <div class="wz-body">${panels}</div>
    <div class="wz-foot">
      <button type="button" class="btn btn-ghost" data-wz-back hidden aria-label="Previous step">${icon('chevron-left', { size: 20 })}<span class="hide-xs">Back</span></button>
      <p class="form-status" role="status" aria-live="polite"></p>
      <button type="button" class="btn btn-primary btn-lg" data-wz-next hidden>${icon('check', { size: 18 })} Save &amp; Next</button>
      <button type="submit" class="btn btn-accent btn-lg" data-wz-submit hidden>Submit application ${icon('send', { size: 18 })}</button>
    </div>
    <p class="wz-saved" data-draft-status aria-live="polite"></p>
  </form>
  <div class="success-panel" hidden tabindex="-1">
    <div class="success-icon">${icon('check-circle', { size: 56 })}</div>
    <h3>Application submitted!</h3>
    <p>Thank you for applying for <strong>${esc(j.title)}</strong>. Our recruiter will call you on <strong>+91 <span data-success-phone></span></strong> within 48 hours.</p>
    <ol class="next-steps"><li><strong>Screening call</strong> within 48 hours</li><li><strong>Short interview or voice test</strong> online</li><li><strong>Paid training</strong>, then you start working</li></ol>
    <p class="small muted">Remember: we never ask for any payment. <a href="/careers/">See more jobs</a></p>
  </div>
</div>`;
}

module.exports = {
  fmtDate, inr, salaryText, readingTime, slugify, catIcon,
  sectionHead, pageHero, breadcrumbSchema, avatar, stars, serviceCard, caseCard, postCard, jobCard, jobSchema,
  faqAccordion, faqSchema, processSteps, statsBlock, testimonialSlider, ctaBand, clientStrip, toolChips,
  field, select, textarea, consent, submit, formWrap, auditForm, inquiryForm, contactForm, applicationForm
};
