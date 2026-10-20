// PAGE 11: Careers (main focus) + PAGE 12: Job detail template (one page per opening)
const { page, esc, abs, site } = require('../lib/layout');
const { icon } = require('../lib/icons');
const C = require('../lib/components');
const content = require('../data/content.json');

const trustNotice = `<div class="trust-notice reveal" role="note">
  <span class="tn-icon">${icon('shield', { size: 28 })}</span>
  <div><h2 class="h4">Trust & safety notice</h2>
  <p><strong>${site.name} never charges any fee for jobs, training or registration.</strong> Beware of fraudulent offers. Our recruiters only contact you from <strong>@scalenestdigital.com</strong> email addresses or our official number ${site.phone}. Report suspicious messages to <a href="mailto:${site.careersEmail}">${site.careersEmail}</a>.</p></div>
</div>`;

function careers(jobs) {
  const open = jobs.filter((j) => j.status === 'open');
  const crumbs = [['Home', '/'], ['Careers', '/careers/']];
  const uniq = (arr) => [...new Set(arr)];
  const opts = (list) => list.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  const departments = ['Tele-calling', 'Digital Marketing', 'SEO', 'Meta Ads', 'Design', 'Development', 'Sales'];
  const languages = uniq(open.flatMap((j) => j.languages)).sort();
  const wfhCount = open.filter((j) => j.mode === 'Work From Home').length;

  const body = `
<section class="page-hero careers-hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="container hero-grid">
    <div>
      <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Careers</li></ol></nav>
      <p class="eyebrow eyebrow-light"><span class="pulse-dot" aria-hidden="true"></span> ${open.length} open roles · ${wfhCount} fully remote</p>
      <h1>Work From Home With ${site.name}</h1>
      <p class="lead">Flexible remote careers in tele-calling, sales, SEO, Meta Ads, content and design. Fixed salary + incentives, paid training and real growth — from anywhere in India.</p>
      <div class="hero-actions"><a href="#open-positions" class="btn btn-accent btn-lg">View Open Positions ${icon('arrow-right', { size: 18 })}</a><a href="#general-application" class="btn btn-outline-light btn-lg">Send Your Resume</a></div>
      <ul class="hero-trust"><li>${icon('check-circle', { size: 18 })} Freshers welcome</li><li>${icon('check-circle', { size: 18 })} Zero joining fee</li><li>${icon('check-circle', { size: 18 })} 200+ remote team members</li></ul>
    </div>
    <div class="hero-art careers-art" aria-hidden="true">
      <div class="dash-card wfh-card"><div class="icon-wrap">${icon('laptop', { size: 30 })}</div><b>Your home office</b><small>Laptop · Headset · Wi-Fi</small></div>
      <div class="dash-card dash-float f1">${icon('indian-rupee', { size: 20 })}<div><small>Weekly incentive paid</small><b>₹2,450</b></div></div>
      <div class="dash-card dash-float f2">${icon('award', { size: 20 })}<div><small>Promoted to Team Lead</small><b>Pooja Y.</b></div></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Why work with us', title: 'Benefits that make remote work, work', sub: 'We’ve run a remote-first team since 2020. Here’s what every team member gets.' })}
    <div class="grid grid-4">${content.careerBenefits.map((b) => `<div class="feature reveal"><div class="icon-wrap">${icon(b.icon)}</div><h3>${b.title}</h3><p>${b.text}</p></div>`).join('')}</div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: `Life at ${site.shortName}`, title: 'Remote, but never alone', sub: 'Daily team huddles, monthly virtual celebrations, annual offsites and a team lead who always has your back.' })}
    <div class="gallery">${content.gallery.map(([cap, ic], i) => `<figure class="gallery-item g${i} reveal"><div class="g-img" role="img" aria-label="${esc(cap)} (placeholder image)">${icon(ic, { size: 40 })}</div><figcaption>${cap}</figcaption></figure>`).join('')}</div>
    <div class="narrow mt-xl">${C.testimonialSlider(content.employeeTestimonials, 'employee')}</div>
  </div>
</section>

<section class="section" id="open-positions">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Open positions', title: 'Find your remote role', sub: 'Filter by department, job type, work mode, experience or language. Results update instantly.' })}
    <form class="job-filters" id="job-filters" role="search" aria-label="Search and filter jobs" onsubmit="return false">
      <div class="jf-search"><label for="jf-q" class="sr-only">Search jobs</label>${icon('search', { size: 20 })}<input id="jf-q" type="search" placeholder="Search by job title or keyword…" autocomplete="off"></div>
      <div class="jf-selects">
        <div><label for="jf-dept">Department</label><select id="jf-dept" data-key="department"><option value="">All departments</option>${opts(departments)}</select></div>
        <div><label for="jf-type">Job type</label><select id="jf-type" data-key="type"><option value="">All types</option>${opts(['Full-time', 'Part-time', 'Freelance', 'Internship'])}</select></div>
        <div><label for="jf-mode">Work mode</label><select id="jf-mode" data-key="mode"><option value="">All modes</option>${opts(['Work From Home', 'Hybrid', 'Office'])}</select></div>
        <div><label for="jf-exp">Experience</label><select id="jf-exp" data-key="experience"><option value="">Any level</option><option value="Fresher">Fresher</option><option value="Junior">Junior (0–3 yrs)</option><option value="Mid">Mid (1–4 yrs)</option><option value="Senior">Senior (4+ yrs)</option></select></div>
        <div><label for="jf-lang">Language</label><select id="jf-lang" data-key="languages"><option value="">Any language</option>${opts(languages)}</select></div>
      </div>
      <div class="jf-meta"><p id="job-count" aria-live="polite"><strong>${open.length}</strong> open positions</p><button type="button" class="btn-link" id="jf-reset">Clear filters</button></div>
    </form>
    <div class="job-list" id="job-list">${open.map(C.jobCard).join('')}</div>
    <div class="empty-state" id="job-empty" hidden><p>No roles match those filters right now.</p><a href="#general-application" class="btn btn-primary">Send us your resume anyway</a></div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'What you’ll need', title: 'Requirements for work-from-home roles' })}
    <div class="grid grid-5">${content.wfhRequirements.map((r) => `<div class="feature feature-sm reveal"><div class="icon-wrap">${icon(r.icon)}</div><h3>${r.title}</h3><p>${r.text}</p></div>`).join('')}</div>
  </div>
</section>

<section class="section">
  <div class="container">
    ${C.sectionHead({ eyebrow: 'Hiring process', title: 'From application to your first day in about a week' })}
    ${C.processSteps(content.hiringProcess)}
  </div>
</section>

<section class="section section-alt">
  <div class="container narrow">
    ${C.sectionHead({ eyebrow: 'FAQs', title: 'Careers questions' })}
    ${C.faqAccordion(content.careerFaqs, 'cf')}
    <div class="mt-xl">${trustNotice}</div>
  </div>
</section>

<section class="section" id="general-application">
  <div class="container narrow">
    <div class="section-head center reveal">
      <p class="eyebrow">General application</p>
      <h2>Don't see a fitting role? Send us your resume.</h2>
      <p class="lead">We hire every month. Share your details and we’ll contact you when a matching work-from-home role opens up.</p>
      <ul class="hero-trust trust-dark">
        <li>${icon('check-circle', { size: 18 })} Reviewed within 5 working days</li>
        <li>${icon('check-circle', { size: 18 })} Kept on file for 6 months</li>
        <li>${icon('check-circle', { size: 18 })} Never shared outside ${site.name}</li>
      </ul>
    </div>
    ${C.applicationForm({ title: 'General Application', slug: 'general', shifts: ['Morning', 'Afternoon', 'Evening', 'Flexible'], languages: [], voiceNote: true })}
  </div>
</section>`;

  return { path: '/careers/', html: page({ path: '/careers/', title: `Work From Home Jobs | Careers at ${site.name}`, description: `Remote and work-from-home jobs at ${site.name}: tele-caller, sales, SEO, Meta Ads, content and design roles. Fixed salary + incentives, paid training, freshers welcome.`, schema: [C.faqSchema(content.careerFaqs), C.breadcrumbSchema(crumbs)] }, body) };
}

function jobDetail(j, jobs) {
  const path = `/careers/${j.slug}/`;
  const crumbs = [['Home', '/'], ['Careers', '/careers/'], [j.title, path]];
  const closed = j.status !== 'open';
  const similar = jobs.filter((x) => x.slug !== j.slug && x.status === 'open').sort((a, b) => (b.department === j.department) - (a.department === j.department)).slice(0, 3);
  const list = (arr) => `<ul class="check-list">${arr.map((x) => `<li>${icon('check', { size: 18 })} ${esc(x)}</li>`).join('')}</ul>`;
  const shareUrl = encodeURIComponent(abs(path));
  const shareText = encodeURIComponent(`${j.title} (${j.mode}) at ${site.name}`);

  const body = `
<section class="page-hero job-hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="container page-hero-inner">
    <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/careers/">Careers</a></li><li aria-current="page">${esc(j.title)}</li></ol></nav>
    <p class="eyebrow eyebrow-light">${esc(j.department)}</p>
    <h1>${esc(j.title)}${j.mode === 'Work From Home' ? ' – Work From Home' : ''}</h1>
    <ul class="badges">
      <li class="badge badge-wfh">${icon('home', { size: 14 })}${esc(j.mode)}</li>
      <li class="badge">${icon('briefcase', { size: 14 })}${esc(j.type)}</li>
      <li class="badge">${icon('indian-rupee', { size: 14 })}${C.salaryText(j)}</li>
      <li class="badge">${icon('users', { size: 14 })}${j.openings} openings</li>
      ${closed ? '<li class="badge badge-closed">Position closed</li>' : ''}
    </ul>
  </div>
</section>

<section class="section">
  <div class="container job-layout">
    <article class="job-main prose">
      ${closed ? `<div class="notice">This position is no longer accepting applications. <a href="/careers/#open-positions">See current openings</a>.</div>` : ''}
      <h2>Job overview</h2><p>${esc(j.summary)}</p>
      <h2>Responsibilities</h2>${list(j.responsibilities)}
      <h2>Requirements</h2>${list(j.requirements)}
      <h2>Preferred skills</h2>${list(j.preferred)}
      <h2>Perks & benefits</h2>${list(j.perks)}
      <h2>Working hours</h2><p>${esc(j.hours)}</p>
      <h2>Salary & incentives</h2><p><strong>${C.salaryText(j)}</strong> fixed, plus ${esc(j.incentives.charAt(0).toLowerCase() + j.incentives.slice(1))}. Salary is paid by bank transfer on the 5th of each month.</p>
      ${trustNotice}

      ${closed ? '' : `<div class="apply-block" id="apply">
        <h2>Apply for this role</h2>
        <p class="muted">5 quick steps · about 4 minutes · your progress is saved on this device.</p>
        ${C.applicationForm(j)}
      </div>`}
    </article>

    <aside class="job-aside" aria-label="Job summary">
      <div class="sticky-card">
        <h2 class="h4">Job summary</h2>
        <dl class="summary-list">
          <div><dt>${icon('home', { size: 16 })} Work mode</dt><dd>${esc(j.mode)}</dd></div>
          <div><dt>${icon('briefcase', { size: 16 })} Job type</dt><dd>${esc(j.type)}</dd></div>
          <div><dt>${icon('award', { size: 16 })} Experience</dt><dd>${esc(j.experienceText)}</dd></div>
          <div><dt>${icon('indian-rupee', { size: 16 })} Salary</dt><dd>${C.salaryText(j)}</dd></div>
          <div><dt>${icon('globe', { size: 16 })} Languages</dt><dd>${esc(j.languages.join(', '))}</dd></div>
          <div><dt>${icon('clock', { size: 16 })} Posted</dt><dd><time datetime="${j.posted}">${C.fmtDate(j.posted)}</time></dd></div>
          <div><dt>${icon('calendar', { size: 16 })} Apply by</dt><dd><time datetime="${j.validThrough}">${C.fmtDate(j.validThrough)}</time></dd></div>
        </dl>
        ${closed ? '<p class="badge badge-closed">Closed</p>' : '<a href="#apply" class="btn btn-accent btn-block btn-lg">Apply Now</a>'}
        <div class="share">
          <p class="small muted">Share this job</p>
          <div class="share-row">
            <a class="icon-btn" href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener" aria-label="Share on WhatsApp">${icon('whatsapp', { size: 18 })}</a>
            <a class="icon-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">${icon('linkedin', { size: 18 })}</a>
            <a class="icon-btn" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener" aria-label="Share on Facebook">${icon('facebook', { size: 18 })}</a>
            <a class="icon-btn" href="https://x.com/intent/post?url=${shareUrl}&text=${shareText}" target="_blank" rel="noopener" aria-label="Share on X">${icon('x-social', { size: 18 })}</a>
            <button class="icon-btn" data-copy="${abs(path)}" aria-label="Copy link">${icon('link', { size: 18 })}</button>
          </div>
        </div>
      </div>
    </aside>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    ${C.sectionHead({ title: 'Similar jobs' })}
    <div class="job-list">${similar.map(C.jobCard).join('')}</div>
  </div>
</section>`;

  return {
    path,
    html: page({
      path,
      title: `${j.title}${j.mode === 'Work From Home' ? ' – Work From Home' : ''} | ${C.salaryText(j)} | ${site.name}`,
      description: `${j.title} (${j.mode}, ${j.type}) at ${site.name}. ${C.salaryText(j)}. ${j.summary}`.slice(0, 300),
      schema: closed ? [C.breadcrumbSchema(crumbs)] : [C.jobSchema(j), C.breadcrumbSchema(crumbs)],
      noindex: closed
    }, body)
  };
}

module.exports = ({ jobs }) => [careers(jobs), ...jobs.map((j) => jobDetail(j, jobs))];
