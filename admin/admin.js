/* Admin dashboard: submissions inbox + no-code CMS for jobs, blog posts and case studies.
   Data lives in MongoDB Atlas. Every CMS save triggers a Netlify build hook, so the public site updates in ~1 minute. */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (msg) => { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };
  // Password is kept only for this browser tab (sessionStorage) and sent as a Bearer token over HTTPS.
  const auth = {
    get: () => { try { return sessionStorage.getItem('sn-admin') || ''; } catch (e) { return window.__snAdmin || ''; } },
    set: (v) => { try { sessionStorage.setItem('sn-admin', v); } catch (e) { window.__snAdmin = v; } },
    clear: () => { try { sessionStorage.removeItem('sn-admin'); } catch (e) { window.__snAdmin = ''; } }
  };
  const authFetch = (url, opts = {}) => fetch('/api/admin' + url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + auth.get(), ...(opts.headers || {}) } });
  const api = async (url, opts = {}) => {
    const r = await authFetch(url, opts);
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { auth.clear(); renderLogin(data.error); throw new Error('Not signed in'); }
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  };
  // File downloads need the auth header, so fetch them as blobs instead of plain links.
  async function download(url, filename) {
    const r = await authFetch(url);
    if (!r.ok) return toast('Download failed');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await r.blob());
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const rebuildMsg = (r) => r.rebuilding ? 'Saved — the live site is rebuilding (about 1 minute)' : 'Saved — set BUILD_HOOK_URL in Netlify so the live site rebuilds automatically';
  const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* ---------- Field schemas for each CMS collection ----------
     types: text | number | date | select | textarea | lines (one item per line) | csv (comma separated) | html | results | bool */
  const SCHEMAS = {
    jobs: {
      title: 'Job openings', label: (j) => j.title, statusKey: 'status', statuses: ['open', 'closed'], url: (j) => `/careers/${j.slug}/`,
      fields: [
        ['title', 'Job title', 'text'], ['slug', 'URL slug', 'text', 'e.g. telecaller-work-from-home'],
        ['department', 'Department', 'select', ['Tele-calling', 'Digital Marketing', 'SEO', 'Meta Ads', 'Design', 'Development', 'Sales']],
        ['type', 'Job type', 'select', ['Full-time', 'Part-time', 'Freelance', 'Internship']],
        ['mode', 'Work mode', 'select', ['Work From Home', 'Hybrid', 'Office']],
        ['experience', 'Experience level (filter)', 'select', ['Fresher', 'Junior', 'Mid', 'Senior']],
        ['experienceText', 'Experience (display text)', 'text'], ['openings', 'Number of openings', 'number'],
        ['salaryMin', 'Salary min (₹/month)', 'number'], ['salaryMax', 'Salary max (₹/month)', 'number'],
        ['incentives', 'Incentives', 'text'], ['languages', 'Languages', 'csv', 'Comma separated'],
        ['posted', 'Posted date', 'date'], ['validThrough', 'Apply by', 'date'],
        ['status', 'Status', 'select', ['open', 'closed']], ['voiceNote', 'Ask for voice note?', 'bool'],
        ['hours', 'Working hours', 'text', '', true], ['shifts', 'Shift options', 'lines', 'One per line'],
        ['summary', 'Job overview', 'textarea', '', true],
        ['responsibilities', 'Responsibilities', 'lines', 'One per line'], ['requirements', 'Requirements', 'lines', 'One per line'],
        ['preferred', 'Preferred skills', 'lines', 'One per line'], ['perks', 'Perks', 'lines', 'One per line']
      ],
      blank: () => ({ status: 'open', mode: 'Work From Home', type: 'Full-time', experience: 'Fresher', posted: new Date().toISOString().slice(0, 10), validThrough: '', openings: 1, languages: ['Hindi', 'English'], voiceNote: false, shifts: ['Day (10 AM – 7 PM)'], responsibilities: [], requirements: [], preferred: [], perks: [] })
    },
    posts: {
      title: 'Blog posts', label: (p) => p.title, statusKey: 'status', statuses: ['published', 'draft'], url: (p) => `/blog/${p.slug}/`,
      fields: [
        ['title', 'Title', 'text', '', true], ['slug', 'URL slug', 'text'],
        ['category', 'Category', 'select', ['SEO', 'Meta Ads', 'Digital Marketing', 'Tele-calling', 'Careers & Remote Work']],
        ['date', 'Publish date', 'date'], ['author', 'Author', 'text'], ['authorRole', 'Author role', 'text'],
        ['status', 'Status', 'select', ['published', 'draft']], ['featured', 'Featured post?', 'bool'],
        ['excerpt', 'Excerpt / meta description', 'textarea', 'Max ~160 characters', true],
        ['body', 'Body (HTML)', 'html', 'Use <h2> for sections (they become the table of contents), <p>, <ul><li>, <strong>, <a>']
      ],
      blank: () => ({ status: 'draft', date: new Date().toISOString().slice(0, 10), category: 'SEO', featured: false, body: '<p></p>\n<h2>First section</h2>\n<p></p>' })
    },
    'case-studies': {
      title: 'Case studies', label: (c) => c.client, statusKey: 'status', statuses: ['published', 'draft'], url: (c) => `/case-studies/${c.slug}/`,
      fields: [
        ['client', 'Client name', 'text'], ['slug', 'URL slug', 'text'], ['industry', 'Industry', 'text'],
        ['service', 'Service (filter)', 'select', ['SEO', 'Meta Ads', 'Website', 'Tele-calling', 'Digital Marketing']],
        ['serviceSlug', 'Service page', 'select', ['seo', 'meta-ads', 'website-development', 'tele-calling', 'digital-marketing']],
        ['location', 'Location', 'text'], ['duration', 'Duration', 'text'], ['highlight', 'Headline result', 'text', 'e.g. 4.2x ROAS'],
        ['status', 'Status', 'select', ['published', 'draft']],
        ['summary', 'Summary', 'textarea', '', true], ['challenge', 'Challenge', 'textarea', '', true], ['solution', 'Solution', 'textarea', '', true],
        ['results', 'Results', 'results', 'One per line: Metric | Before | After'],
        ['quote', 'Client quote', 'textarea'], ['quoteBy', 'Quote by', 'text']
      ],
      blank: () => ({ status: 'draft', service: 'SEO', serviceSlug: 'seo', results: [] })
    }
  };

  /* ---------- Inbox ---------- */
  const STATUSES = ['incomplete', 'new', 'contacted', 'shortlisted', 'interview', 'selected', 'enrolled', 'hired', 'rejected', 'closed'];
  const TYPE_LABEL = { 'job-application': 'Job applications', contact: 'Contact', 'service-inquiry': 'Service inquiries', 'seo-audit': 'SEO audits', 'book-call': 'Call bookings', newsletter: 'Newsletter' };
  const filters = { type: '', job: '', status: '', verification: '', q: '' };
  const VERIFY_LABEL = { not_started: 'Not started', requested: 'OTP requested', pending: 'Pending', verified: 'Verified', failed: 'Failed' };
  // Friendly labels for enrollment document keys (files stored as "enroll-<key>").
  const ENROLL_LABEL = { photo: 'Passport photo', aadhaar: 'e-Aadhaar (PDF)', pan: 'PAN card', tenth: '10th marksheet', twelfth: '12th marksheet', graduation: 'Graduation certificate', bank: 'Bank proof', experience: 'Experience letter' };
  const INTERVIEW_MODES = ['Phone call', 'Google Meet', 'Zoom', 'In-office', 'Walk-in'];
  const fmtDT = (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  // ISO/Date → value for <input type="datetime-local"> in the admin's local timezone.
  const toLocalInput = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d)) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  // Mobile verification badge for job applications (falls back to the older phoneVerified field).
  const verifyBadge = (s) => {
    const v = s.verification?.status;
    if (v === 'verified') return ' <span class="pill v-verified" title="Mobile verified by admin">✓ mobile verified</span>';
    if (v === 'requested') return ' <span class="pill v-requested" title="Applicant tapped “Verify your number” — send them an OTP now">📩 OTP requested</span>';
    if (v === 'pending') return ' <span class="pill v-pending" title="OTP entered — compare it and approve">📱 verify pending</span>';
    if (v === 'failed') return ' <span class="pill v-failed" title="Marked failed — applicant can retry">✗ mobile failed</span>';
    if (s.fields.phoneVerified === 'yes') return ' <span class="pill v-verified">✓ mobile</span>';
    return '';
  };
  const qs = () => { const p = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)); return p.toString() ? '?' + p : ''; };

  const fileRow = (label, f) => `<div class="doc-row"><span class="doc-label">${esc(label)}</span><a href="#" class="doc-dl" data-file="${esc(f.stored)}" data-name="${esc(f.original)}">⬇ ${esc(f.original)}</a><span class="doc-size">${(f.size / 1024).toFixed(0)} KB</span></div>`;

  // The expanded view under a submission row: grouped into sections for a cleaner workflow.
  function detailPanel(s) {
    const isJob = s.type === 'job-application';
    const files = s.files || {};
    const appFiles = Object.entries(files).filter(([k]) => !k.startsWith('enroll-'));
    const enrollFiles = Object.entries(files).filter(([k]) => k.startsWith('enroll-'));
    const v = s.verification || {};
    const iv = s.interview || {};
    const selected = ['selected', 'enrolled', 'hired'].includes(s.status);
    const infoRows = Object.entries(s.fields).filter(([k]) => k !== 'jobSlug')
      .map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(Array.isArray(val) ? val.join(', ') : val)}</dd>`).join('');

    return `<div class="detail-grid">
      <section class="d-sec"><h4>Applicant details</h4><dl class="kv">${infoRows}</dl></section>

      <section class="d-sec"><h4>Documents</h4>
        ${appFiles.length ? `<div class="doc-group"><h5>Application</h5>${appFiles.map(([k, f]) => fileRow(k, f)).join('')}</div>` : ''}
        ${enrollFiles.length ? `<div class="doc-group"><h5>Enrollment documents ${s.enrollment?.status === 'submitted' ? '<span class="pill v-verified">all required submitted</span>' : s.enrollment ? '<span class="pill v-pending">in progress</span>' : ''}</h5>${enrollFiles.map(([k, f]) => fileRow(ENROLL_LABEL[k.replace('enroll-', '')] || k, f)).join('')}</div>` : ''}
        ${!appFiles.length && !enrollFiles.length ? '<p class="muted small">No documents uploaded yet.</p>' : ''}
        ${isJob && selected && !enrollFiles.length ? '<p class="muted small">Candidate is selected — enrollment documents will appear here once they upload them.</p>' : ''}
      </section>

      ${isJob ? `<section class="d-sec"><h4>Mobile verification</h4>
        <p><strong>${esc(VERIFY_LABEL[v.status || 'not_started'])}</strong>${v.otp ? ` · OTP entered: <b class="otp-code">${esc(v.otp)}</b>` : ''}${v.submittedAt ? ` (${esc(fmtDT(v.submittedAt))})` : ''}${v.attempts ? ` · ${v.attempts} attempt${v.attempts > 1 ? 's' : ''}` : ''}</p>
        <div class="actions"><button class="btn btn-ok btn-xs" data-verify="${s.id}" data-v="verified">✓ Mark verified</button><button class="btn btn-danger btn-xs" data-verify="${s.id}" data-v="failed">✗ Mark failed</button></div>
      </section>` : ''}

      ${isJob ? `<section class="d-sec"><h4>Interview</h4>
        ${iv.at ? `<p class="iv-current">Scheduled: <strong>${esc(fmtDT(iv.at))}</strong>${iv.mode ? ' · ' + esc(iv.mode) : ''}${iv.link ? ` · <a href="${esc(iv.link)}" target="_blank" rel="noopener">link</a>` : ''}</p>` : '<p class="muted small">No interview scheduled yet.</p>'}
        <div class="iv-form">
          <label>Date &amp; time<input type="datetime-local" data-iv-at="${s.id}" value="${esc(toLocalInput(iv.at))}"></label>
          <label>Mode<select data-iv-mode="${s.id}"><option value="">—</option>${INTERVIEW_MODES.map((m) => `<option${m === iv.mode ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
          <label class="full">Meeting link / phone<input type="text" data-iv-link="${s.id}" value="${esc(iv.link || '')}" placeholder="https://meet.google.com/… or a phone number"></label>
          <label class="full">Note to candidate<input type="text" data-iv-notes="${s.id}" value="${esc(iv.notes || '')}" placeholder="e.g. Keep your Aadhaar and a pen ready"></label>
        </div>
        <div class="actions"><button class="btn btn-primary btn-xs" data-iv-save="${s.id}">${iv.at ? 'Update interview' : 'Schedule interview'}</button>${iv.at ? `<button class="btn btn-xs" data-iv-clear="${s.id}">Clear</button>` : ''}</div>
      </section>` : ''}

      ${(s.history || []).length ? `<section class="d-sec"><h4>History</h4><ul class="hist">${s.history.map((h) => `<li>${esc(h.status || (h.interview ? 'interview ' + h.interview : 'mobile ' + h.verification))} — ${esc(fmtDT(h.at))}</li>`).join('')}</ul></section>` : ''}

      <section class="d-sec d-sec-wide"><h4>Status &amp; actions</h4>
        <div class="status-row">
          <label>Status <select data-status="${s.id}">${STATUSES.map((st) => `<option${st === s.status ? ' selected' : ''}>${st}</option>`).join('')}</select></label>
          <button class="btn btn-primary btn-xs" data-save="${s.id}">Save status &amp; note</button>
        </div>
        <label class="note-label">Private note<textarea data-note="${s.id}" rows="2" placeholder="e.g. Good Hindi, call back Monday">${esc(s.note || '')}</textarea></label>
        <div class="actions">
          ${s.fields.email ? `<a class="btn btn-xs" href="mailto:${esc(s.fields.email)}">Email</a>` : ''}
          ${s.fields.phone ? `<a class="btn btn-xs" href="tel:+91${esc(s.fields.phone)}">Call</a><a class="btn btn-xs" target="_blank" rel="noopener" href="https://wa.me/91${esc(String(s.fields.phone).replace(/\D/g, '').slice(-10))}">WhatsApp</a>` : ''}
          <button class="btn btn-danger btn-xs" data-del="${s.id}">Delete</button>
        </div>
      </section>
    </div>`;
  }

  async function renderInbox() {
    // Remember what the admin has open/typed so an automatic refresh doesn't lose it.
    const keep = {
      open: [...app.querySelectorAll('tr.detail:not([hidden])')].map((r) => r.dataset.for),
      notes: Object.fromEntries([...app.querySelectorAll('textarea[data-note][data-dirty]')].map((t) => [t.dataset.note, t.value])),
      statuses: Object.fromEntries([...app.querySelectorAll('select[data-status][data-dirty]')].map((x) => [x.dataset.status, x.value])),
      q: document.getElementById('f-q')?.value,
      scroll: window.scrollY
    };
    const [stats, items, jobs] = await Promise.all([api('/stats'), api('/submissions' + qs()), api('/collections/jobs')]);
    const jobTitle = Object.fromEntries(jobs.map((j) => [j.slug, j.title]));
    jobTitle.general = 'General application';
    const opt = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');
    app.innerHTML = `
      <div class="stats">
        <div class="stat"><small>Total submissions</small><b>${stats.total}</b></div>
        <div class="stat"><small>Open job listings</small><b>${stats.jobs}</b></div>
        ${Object.entries(stats.byType).map(([t, v]) => `<button class="stat stat-btn" data-filter-type="${t}"><small>${esc(TYPE_LABEL[t] || t)}</small><b>${v.total}</b>${v.new ? `<em>${v.new} new</em>` : ''}</button>`).join('')}
      </div>
      <div class="toolbar">
        <h2>Inbox <small class="count">${items.length}${items.length === 500 ? '+' : ''} shown</small> <small class="live" title="This page refreshes itself every 10 seconds">● Live · ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</small></h2>
        <input type="search" id="f-q" placeholder="Search name, email, phone, city" value="${esc(filters.q)}">
        <select id="f-type" aria-label="Type"><option value="">All types</option>${opt(Object.entries(TYPE_LABEL), filters.type)}</select>
        <select id="f-job" aria-label="Job"><option value="">All jobs</option>${opt([...jobs.map((j) => [j.slug, j.title + (j.status !== 'open' ? ' (closed)' : '')]), ['general', 'General application']], filters.job)}</select>
        <select id="f-status" aria-label="Status"><option value="">Any status</option>${opt(STATUSES.map((s) => [s, s]), filters.status)}</select>
        <select id="f-verify" aria-label="Mobile verification"><option value="">Mobile: any</option>${opt(Object.entries(VERIFY_LABEL).map(([k, l]) => [k, 'Mobile: ' + l.toLowerCase()]), filters.verification)}</select>
        ${Object.values(filters).some(Boolean) ? '<button class="btn" id="f-clear">Clear</button>' : ''}
        <button class="btn" id="export">Export CSV</button>
      </div>
      ${items.length ? `<table><thead><tr><th>Received</th><th>Type</th><th>Name / contact</th><th>Details</th><th>Status</th></tr></thead><tbody>
      ${items.map((s) => `<tr class="row" data-id="${s.id}"><td>${new Date(s.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td><td>${esc(TYPE_LABEL[s.type] || s.type)}</td>
        <td><strong>${esc(s.fields.name || '—')}</strong>${verifyBadge(s)}<br><small>${esc(s.fields.phone ? '+91 ' + s.fields.phone : '')} ${esc(s.fields.email || '')}</small></td>
        <td>${esc(s.type === 'job-application' ? (jobTitle[s.fields.jobSlug] || s.fields.job || '') : (s.fields.service || s.fields.website || s.fields.date || ''))}${s.fields.city ? `<br><small>${esc(s.fields.city)}${s.fields.experience ? ' · ' + esc(s.fields.experience) : ''}</small>` : ''}</td>
        <td><span class="pill ${s.status}">${s.status === 'incomplete' ? `incomplete · step ${s.stage || 1}/4` : s.status}</span>${s.status === 'incomplete' ? `<br><small>last active ${new Date(s.updatedAt || s.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small>` : ''}
          ${s.verification?.status === 'requested' ? `<div class="otp-entered">Send OTP to <b>+91 ${esc(s.fields.phone)}</b><br><small>requested ${new Date(s.verification.requestedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div>` : ''}
          ${s.verification?.status === 'pending' ? `<div class="otp-entered" title="OTP the applicant entered">OTP entered: <b>${esc(s.verification.otp || '—')}</b></div><div class="quick-verify"><button class="btn btn-ok btn-xs" data-verify="${s.id}" data-v="verified">✓ Verified</button><button class="btn btn-danger btn-xs" data-verify="${s.id}" data-v="failed">✗ Failed</button></div>` : ''}</td></tr>
        <tr class="detail" data-for="${s.id}" hidden><td colspan="5">${detailPanel(s)}</td></tr>`).join('')}</tbody></table>` : `<p class="empty">${Object.values(filters).some(Boolean) ? 'No submissions match these filters.' : 'No submissions yet. Form entries from the website will appear here.'}</p>`}`;

    // Restore open rows, unsaved notes/status choices, the search box and the scroll position.
    keep.open.forEach((id) => { const d = app.querySelector(`tr[data-for="${id}"]`); if (d) d.hidden = false; });
    Object.entries(keep.notes).forEach(([id, v]) => { const t = app.querySelector(`textarea[data-note="${id}"]`); if (t) { t.value = v; t.dataset.dirty = '1'; } });
    Object.entries(keep.statuses).forEach(([id, v]) => { const x = app.querySelector(`select[data-status="${id}"]`); if (x) { x.value = v; x.dataset.dirty = '1'; } });
    if (keep.q !== undefined && document.getElementById('f-q')) document.getElementById('f-q').value = keep.q;
    window.scrollTo(0, keep.scroll);
    app.querySelectorAll('textarea[data-note], select[data-status]').forEach((el) => el.addEventListener('input', () => (el.dataset.dirty = '1')));

    const setFilter = (k, v) => { filters[k] = v; renderInbox(); };
    document.getElementById('f-type').onchange = (e) => setFilter('type', e.target.value);
    document.getElementById('f-job').onchange = (e) => setFilter('job', e.target.value);
    document.getElementById('f-status').onchange = (e) => setFilter('status', e.target.value);
    document.getElementById('f-verify').onchange = (e) => setFilter('verification', e.target.value);
    app.querySelectorAll('[data-verify]').forEach((b) => b.onclick = async (e) => {
      e.stopPropagation();
      const v = b.dataset.v;
      if (v === 'failed' && !confirm('Mark this mobile number as FAILED? The applicant will be asked to verify again.')) return;
      try {
        await api('/submissions/' + b.dataset.verify, { method: 'PATCH', body: JSON.stringify({ verification: v }) });
        toast(v === 'verified' ? 'Mobile marked verified' : 'Mobile marked failed — applicant can retry'); renderInbox();
      } catch (err) { toast('Could not update: ' + err.message); }
    });
    const q = document.getElementById('f-q');
    q.onkeydown = (e) => { if (e.key === 'Enter') setFilter('q', q.value.trim()); };
    q.onsearch = () => setFilter('q', q.value.trim());
    const clear = document.getElementById('f-clear');
    if (clear) clear.onclick = () => { Object.keys(filters).forEach((k) => (filters[k] = '')); renderInbox(); };
    app.querySelectorAll('[data-filter-type]').forEach((b) => b.onclick = () => setFilter('type', b.dataset.filterType));
    document.getElementById('export').onclick = () => download('/export' + qs(), 'submissions.csv');
    app.querySelectorAll('[data-file]').forEach((a) => a.onclick = (e) => { e.preventDefault(); download('/files/' + encodeURIComponent(a.dataset.file), a.dataset.name); });
    app.querySelectorAll('tr.row').forEach((r) => r.onclick = () => { const d = app.querySelector(`tr[data-for="${r.dataset.id}"]`); d.hidden = !d.hidden; });
    app.querySelectorAll('[data-save]').forEach((b) => b.onclick = async () => {
      const id = b.dataset.save;
      try {
        await api('/submissions/' + id, { method: 'PATCH', body: JSON.stringify({ status: app.querySelector(`[data-status="${id}"]`).value, note: app.querySelector(`[data-note="${id}"]`).value }) });
        toast('Saved'); renderInbox();
      } catch (e) { toast('Could not save: ' + e.message); }
    });
    app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      if (!confirm('Delete this submission and its uploaded files permanently?')) return;
      try { await api('/submissions/' + b.dataset.del, { method: 'DELETE' }); toast('Deleted'); renderInbox(); } catch (e) { toast('Could not delete: ' + e.message); }
    });
    const ivVal = (attr, id) => { const el = app.querySelector(`[data-iv-${attr}="${id}"]`); return el ? el.value : ''; };
    app.querySelectorAll('[data-iv-save]').forEach((b) => b.onclick = async () => {
      const id = b.dataset.ivSave;
      const local = ivVal('at', id);
      if (!local) { toast('Please choose a date and time'); return; }
      const at = new Date(local); // parsed in the admin's local timezone
      if (isNaN(at)) { toast('Invalid date/time'); return; }
      try {
        await api('/submissions/' + id, { method: 'PATCH', body: JSON.stringify({ interview: { at: at.toISOString(), mode: ivVal('mode', id), link: ivVal('link', id), notes: ivVal('notes', id) } }) });
        toast('Interview scheduled — the candidate can see it on their dashboard'); renderInbox();
      } catch (e) { toast('Could not schedule: ' + e.message); }
    });
    app.querySelectorAll('[data-iv-clear]').forEach((b) => b.onclick = async () => {
      if (!confirm('Clear the scheduled interview?')) return;
      try { await api('/submissions/' + b.dataset.ivClear, { method: 'PATCH', body: JSON.stringify({ interview: { at: '' } }) }); toast('Interview cleared'); renderInbox(); } catch (e) { toast('Could not clear: ' + e.message); }
    });
  }

  /* ---------- Collections (CMS) ---------- */
  async function renderCollection(name) {
    const S = SCHEMAS[name];
    const [items, stats] = await Promise.all([api('/collections/' + name), name === 'jobs' ? api('/stats') : null]);
    const applicants = (slug) => {
      const a = stats && stats.byJob[slug];
      if (!a) return '<small>0 applicants</small>';
      return `<button class="btn-link" data-applicants="${esc(slug)}">${a.total} applicant${a.total === 1 ? '' : 's'}</button>${a.new ? ` <span class="pill new">${a.new} new</span>` : ''}${a.incomplete ? `<br><small>${a.incomplete} started, not finished</small>` : ''}`;
    };
    app.innerHTML = `
      <div class="toolbar"><h2>${S.title} <small class="count">${items.length}</small></h2><button class="btn btn-accent" id="add">+ ${name === 'jobs' ? 'Post a new job' : 'Add new'}</button></div>
      <div id="editor"></div>
      ${items.length ? `<table><thead><tr><th>Title</th>${name === 'jobs' ? '<th>Applicants</th>' : '<th>Slug</th>'}<th>Status</th><th>Date</th><th></th></tr></thead><tbody>
      ${items.map((it) => `<tr><td><strong>${esc(S.label(it))}</strong>${name === 'jobs' ? `<br><small>${esc(it.department || '')} · ${esc(it.type || '')} · ${esc(it.mode || '')}</small>` : ''}</td>
        <td>${name === 'jobs' ? applicants(it.slug) : `<small>${esc(it.slug)}</small>`}</td>
        <td><span class="pill ${esc(it[S.statusKey] || 'published')}">${esc(it[S.statusKey] || 'published')}</span></td><td>${esc(it.posted || it.date || '')}</td>
        <td class="actions"><button class="btn" data-edit="${esc(it.slug)}">Edit</button>
        ${name === 'jobs' ? `<button class="btn" data-dup="${esc(it.slug)}" title="Create a new opening based on this one">Duplicate</button>` : ''}
        <button class="btn" data-toggle="${esc(it.slug)}">${(it[S.statusKey] || S.statuses[0]) === S.statuses[0] ? (name === 'jobs' ? 'Close' : 'Unpublish') : (name === 'jobs' ? 'Reopen' : 'Publish')}</button>
        <a class="btn" href="${S.url(it)}" target="_blank" rel="noopener">View</a>
        <button class="btn btn-danger" data-del="${esc(it.slug)}">Delete</button></td></tr>`).join('')}</tbody></table>` : '<p class="empty">Nothing here yet.</p>'}`;

    const save = async (orig, item) => {
      const r = await api(`/collections/${name}/${encodeURIComponent(orig || item.slug)}`, { method: 'PUT', body: JSON.stringify(item) });
      toast(rebuildMsg(r));
      renderCollection(name);
    };
    document.getElementById('add').onclick = () => openEditor(name, S.blank(), null, save);
    app.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => openEditor(name, items.find((x) => x.slug === b.dataset.edit), b.dataset.edit, save));
    app.querySelectorAll('[data-dup]').forEach((b) => b.onclick = () => {
      const src = items.find((x) => x.slug === b.dataset.dup);
      const copy = { ...src, slug: src.slug + '-2', title: src.title + ' (copy)', status: 'open', posted: new Date().toISOString().slice(0, 10) };
      openEditor(name, copy, null, save);
    });
    app.querySelectorAll('[data-applicants]').forEach((b) => b.onclick = () => {
      Object.keys(filters).forEach((k) => (filters[k] = ''));
      filters.job = b.dataset.applicants;
      show('inbox');
    });
    app.querySelectorAll('[data-toggle]').forEach((b) => b.onclick = async () => {
      const it = { ...items.find((x) => x.slug === b.dataset.toggle) };
      const cur = it[S.statusKey] || S.statuses[0];
      it[S.statusKey] = cur === S.statuses[0] ? S.statuses[1] : S.statuses[0];
      try { await save(it.slug, it); } catch (e) { toast('Could not update: ' + e.message); }
    });
    app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      if (!confirm(`Delete “${b.dataset.del}” permanently? (Tip: ${name === 'jobs' ? 'close' : 'unpublish'} it instead to keep it.) Existing applications are kept.`)) return;
      try { toast(rebuildMsg(await api(`/collections/${name}/${encodeURIComponent(b.dataset.del)}`, { method: 'DELETE' }))); renderCollection(name); } catch (e) { toast('Could not delete: ' + e.message); }
    });
  }

  function openEditor(name, item, origSlug, save) {
    const S = SCHEMAS[name];
    const box = document.getElementById('editor');
    const val = (k, type) => {
      const v = item[k];
      if (type === 'lines') return (v || []).join('\n');
      if (type === 'csv') return (v || []).join(', ');
      if (type === 'results') return (v || []).map((r) => `${r.label} | ${r.before} | ${r.after}`).join('\n');
      return v ?? '';
    };
    box.innerHTML = `<form class="editor"><h3>${origSlug ? 'Edit' : 'New'} — ${esc(S.label(item) || 'untitled')}</h3><div class="grid">
      ${S.fields.map(([k, label, type, extra, full]) => {
        const hint = typeof extra === 'string' && extra ? `<small>${esc(extra)}</small>` : '';
        const isFull = full || ['lines', 'html', 'results', 'textarea'].includes(type);
        let input;
        if (type === 'select') input = `<select name="${k}">${extra.map((o) => `<option${o === item[k] ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
        else if (type === 'bool') input = `<select name="${k}"><option value="false"${!item[k] ? ' selected' : ''}>No</option><option value="true"${item[k] ? ' selected' : ''}>Yes</option></select>`;
        else if (['lines', 'textarea', 'html', 'results'].includes(type)) input = `<textarea name="${k}"${type === 'html' ? ' class="tall"' : ''}>${esc(val(k, type))}</textarea>`;
        else input = `<input name="${k}" type="${type}" value="${esc(val(k, type))}"${['title', 'slug', 'client'].includes(k) ? ' required' : ''}>`;
        return `<label class="${isFull ? 'full' : ''}">${label} ${hint}${input}</label>`;
      }).join('')}
    </div><p class="actions" style="margin-top:16px"><button class="btn btn-primary" type="submit">Save & publish</button><button class="btn" type="button" id="cancel">Cancel</button></p></form>`;
    const form = box.querySelector('form');
    const titleKey = name === 'case-studies' ? 'client' : 'title';
    form.elements[titleKey].addEventListener('input', (e) => { if (!origSlug) form.elements.slug.value = slugify(e.target.value); });
    box.querySelector('#cancel').onclick = () => (box.innerHTML = '');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const out = { ...item };
      S.fields.forEach(([k, , type]) => {
        const raw = form.elements[k].value;
        if (type === 'number') out[k] = Number(raw) || 0;
        else if (type === 'bool') out[k] = raw === 'true';
        else if (type === 'lines') out[k] = raw.split('\n').map((s) => s.trim()).filter(Boolean);
        else if (type === 'csv') out[k] = raw.split(',').map((s) => s.trim()).filter(Boolean);
        else if (type === 'results') out[k] = raw.split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((a) => a[0]).map(([label, before, after]) => ({ label, before: before || '', after: after || '' }));
        else out[k] = raw.trim();
      });
      if (name === 'jobs' && (!out.shifts || !out.shifts.length)) out.shifts = ['Flexible'];
      try { await save(origSlug, out); } catch (err) { alert('Could not save: ' + err.message); }
    };
    box.scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- Tabs ---------- */
  const tabs = document.querySelectorAll('nav.tabs button');
  const show = (view) => {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === view));
    app.innerHTML = '<p class="empty">Loading…</p>';
    (view === 'inbox' ? renderInbox() : renderCollection(view)).catch((e) => (app.innerHTML = `<p class="empty">Error: ${esc(e.message)}</p>`));
  };
  tabs.forEach((t) => (t.onclick = () => show(t.dataset.view)));

  /* ---------- Login ---------- */
  function renderLogin(err) {
    document.querySelector('nav.tabs').hidden = true;
    app.innerHTML = `<form class="editor" id="login" style="max-width:380px;margin:60px auto">
      <h2 style="margin-top:0">Admin sign in</h2>
      ${err && err !== 'Wrong password' ? `<p style="color:var(--bad)">${esc(err)}</p>` : ''}
      <label>Password <input type="password" name="pw" autocomplete="current-password" required autofocus></label>
      ${err === 'Wrong password' ? '<p style="color:var(--bad)">Wrong password, try again.</p>' : ''}
      <p><button class="btn btn-primary" type="submit">Sign in</button></p></form>`;
    document.getElementById('login').onsubmit = async (e) => {
      e.preventDefault();
      auth.set(e.target.pw.value);
      try { await api('/login'); start(); } catch (x) { /* renderLogin already shown */ }
    };
  }
  function start() {
    document.querySelector('nav.tabs').hidden = false;
    if (!document.getElementById('logout')) {
      const tools = document.createElement('div');
      tools.className = 'header-tools';
      tools.innerHTML = `<button class="btn" id="alert-sound" title="Ring when an applicant asks for an OTP"></button>
        <button class="btn" id="alert-desktop" title="Show alerts even when this tab is in the background">🖥 Desktop alerts</button>
        <button class="btn" id="logout">Sign out</button>`;
      document.querySelector('header').appendChild(tools);
      document.getElementById('logout').onclick = () => { stopAlerts(); clearInterval(liveTimer); auth.clear(); renderLogin(); };
      setupAlertControls();
    }
    show('inbox');
    startAlerts();
    startLive();
  }

  /* ---------- Live OTP alerts ----------
     Every 8 seconds the dashboard asks for new OTP activity. When an applicant taps "Verify your number" or
     "Re-generate OTP" (send them an OTP now), or submits an OTP (verify it now), it rings, shows a pop-up,
     updates the tab title and — if allowed — shows a desktop notification. */
  const ALERT_TEXT = {
    requested: ['📩', 'OTP requested', 'Send an OTP to this number now'],
    regenerated: ['🔁', 'Re-generate OTP requested', 'Send a new OTP to this number now'],
    submitted: ['🔐', 'OTP submitted — verify now', 'Compare the OTP and click Verified or Failed']
  };
  let alertSince = null, alertTimer = null, unread = 0, audioCtx = null;
  const seenAlerts = new Set();
  const pref = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };
  let soundOn = pref.get('sn-alert-sound', 'on') === 'on';

  // Browsers only allow sound after the admin has interacted with the page, so unlock audio on the first click.
  const unlockAudio = () => {
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { /* no audio */ }
  };
  document.addEventListener('click', unlockAudio, { once: false, passive: true });

  // A short phone-style ring made with the Web Audio API (no sound file needed).
  function ring() {
    if (!soundOn) return;
    try {
      unlockAudio();
      const t0 = audioCtx.currentTime + 0.05;
      for (let i = 0; i < 3; i++) {
        [880, 1320].forEach((freq, j) => {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.type = 'sine'; o.frequency.value = freq;
          const st = t0 + i * 0.7 + j * 0.16;
          g.gain.setValueAtTime(0.0001, st);
          g.gain.exponentialRampToValueAtTime(0.35, st + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, st + 0.15);
          o.connect(g).connect(audioCtx.destination);
          o.start(st); o.stop(st + 0.16);
        });
      }
    } catch (e) { /* audio unavailable */ }
  }

  function setupAlertControls() {
    const sb = document.getElementById('alert-sound');
    const paint = () => { sb.textContent = soundOn ? '🔔 Sound on' : '🔕 Sound off'; };
    paint();
    sb.onclick = () => { soundOn = !soundOn; pref.set('sn-alert-sound', soundOn ? 'on' : 'off'); paint(); if (soundOn) ring(); };
    const db = document.getElementById('alert-desktop');
    if (!('Notification' in window)) { db.hidden = true; return; }
    const paintD = () => { db.textContent = Notification.permission === 'granted' ? '🖥 Desktop alerts on' : '🖥 Enable desktop alerts'; db.disabled = Notification.permission !== 'default'; };
    paintD();
    db.onclick = () => Notification.requestPermission().then(paintD);
  }

  function updateTitle() { document.title = (unread ? `(${unread}) 🔔 ` : '') + 'Admin Dashboard | ScaleNest Digital'; }
  window.addEventListener('focus', () => { unread = 0; updateTitle(); });

  function showAlertCard(a) {
    let stack = document.getElementById('alert-stack');
    if (!stack) { stack = document.createElement('div'); stack.id = 'alert-stack'; stack.setAttribute('aria-live', 'assertive'); document.body.appendChild(stack); }
    const [ic, title, hint] = ALERT_TEXT[a.kind];
    const card = document.createElement('div');
    card.className = `alert-card alert-${a.kind}`;
    card.innerHTML = `<div class="ac-head"><span class="ac-ic">${ic}</span><strong>${title}</strong><button class="ac-x" aria-label="Dismiss">✕</button></div>
      <p class="ac-name">${esc(a.name)} · <b>+91 ${esc(a.phone)}</b></p>
      <p class="ac-meta">${esc(a.job || '')} · ${new Date(a.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
      ${a.otp ? `<p class="ac-otp">OTP entered: <b>${esc(a.otp)}</b></p>` : ''}
      <p class="ac-hint">${hint}</p>
      <div class="actions">${a.kind === 'submitted'
        ? `<button class="btn btn-ok btn-xs" data-ac-v="verified">✓ Verified</button><button class="btn btn-danger btn-xs" data-ac-v="failed">✗ Failed</button>`
        : ''}<button class="btn btn-xs" data-ac-open>Open</button></div>`;
    const close = () => { card.remove(); };
    card.querySelector('.ac-x').onclick = close;
    card.querySelector('[data-ac-open]').onclick = () => { Object.keys(filters).forEach((k) => (filters[k] = '')); filters.q = a.phone; show('inbox'); close(); };
    card.querySelectorAll('[data-ac-v]').forEach((b) => b.onclick = async () => {
      if (b.dataset.acV === 'failed' && !confirm('Mark this OTP as FAILED? The applicant will be asked to re-generate it.')) return;
      try {
        await api('/submissions/' + a.id, { method: 'PATCH', body: JSON.stringify({ verification: b.dataset.acV }) });
        toast(b.dataset.acV === 'verified' ? 'Mobile marked verified' : 'Marked failed — applicant can re-generate the OTP');
        close();
        if (document.querySelector('nav.tabs button.active')?.dataset.view === 'inbox') renderInbox().catch(() => {});
      } catch (err) { toast('Could not update: ' + err.message); }
    });
    stack.prepend(card);
  }

  async function checkAlerts() {
    try {
      const d = await api('/alerts?since=' + encodeURIComponent(alertSince));
      // Next time ask from a few seconds before the server's clock, and ignore duplicates.
      alertSince = new Date(new Date(d.now).getTime() - 5000).toISOString();
      const fresh = d.alerts.filter((a) => { const k = `${a.id}|${a.kind}|${a.at}`; if (seenAlerts.has(k)) return false; seenAlerts.add(k); return true; }).reverse();
      if (!fresh.length) return;
      ring();
      fresh.forEach(showAlertCard);
      if (!document.hasFocus()) { unread += fresh.length; updateTitle(); }
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        fresh.forEach((a) => new Notification(`${ALERT_TEXT[a.kind][1]} — ${a.name}`, { body: `+91 ${a.phone}${a.otp ? ' · OTP ' + a.otp : ''}\n${ALERT_TEXT[a.kind][2]}`, tag: a.id + a.kind }));
      }
      liveRefresh(); // show the new activity in the inbox straight away
    } catch (e) { /* offline or signed out — try again next tick */ }
  }
  /* ---------- Auto-refresh ----------
     The inbox reloads every 10 seconds (and as soon as this tab is focused again) so new applications and
     status changes appear without pressing reload. It skips a tick while the admin is typing or editing. */
  let liveTimer = null, refreshing = false;
  const activeView = () => document.querySelector('nav.tabs button.active')?.dataset.view;
  async function liveRefresh() {
    if (refreshing || document.getElementById('login') || !auth.get()) return;
    const typing = app.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (typing) return;
    refreshing = true;
    try {
      const view = activeView();
      if (view === 'inbox') await renderInbox();
      else if (view === 'jobs' && !document.getElementById('editor')?.innerHTML.trim()) { const y = window.scrollY; await renderCollection('jobs'); window.scrollTo(0, y); }
    } catch (e) { /* network hiccup — next tick */ } finally { refreshing = false; }
  }
  function startLive() { clearInterval(liveTimer); liveTimer = setInterval(liveRefresh, 10000); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { liveRefresh(); checkAlerts(); } });
  window.addEventListener('focus', () => { liveRefresh(); });

  function startAlerts() {
    stopAlerts();
    alertSince = new Date(Date.now() - 5 * 60000).toISOString(); // on sign-in, show requests from the last 5 minutes
    checkAlerts();
    alertTimer = setInterval(checkAlerts, 8000);
  }
  function stopAlerts() { clearInterval(alertTimer); alertTimer = null; }
  auth.get() ? api('/login').then(start).catch(() => {}) : renderLogin();
})();
