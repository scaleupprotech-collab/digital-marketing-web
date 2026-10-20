/* ScaleNest Digital — site behaviour (vanilla JS, no dependencies).
   Each feature is a small init function that no-ops when its markup isn't on the page. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  /* ---------- Applicant session (shared by the login/dashboard and the apply gate) ---------- */
  const ACCT_KEY = 'sn-acct', ACCT_USER = 'sn-user';
  const acct = {
    token: () => store.get(ACCT_KEY),
    user: () => { try { return JSON.parse(store.get(ACCT_USER) || 'null'); } catch (e) { return null; } },
    save: (token, user) => { store.set(ACCT_KEY, token); if (user) store.set(ACCT_USER, JSON.stringify(user)); },
    clear: () => { try { localStorage.removeItem(ACCT_KEY); localStorage.removeItem(ACCT_USER); } catch (e) { /* ignore */ } }
  };

  /* ---------- Theme (dark mode) ---------- */
  function initTheme() {
    const btn = $('#theme-toggle');
    if (!btn) return;
    const isDark = () => {
      const t = document.documentElement.getAttribute('data-theme');
      return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    const sync = () => btn.setAttribute('aria-pressed', String(isDark()));
    sync();
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      store.set('sn-theme', next);
      sync();
    });
  }

  /* ---------- Sticky header shrink + back-to-top ---------- */
  function initScroll() {
    const header = $('#site-header');
    const toTop = $('#to-top');
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      header && header.classList.toggle('scrolled', y > 40);
      toTop && toTop.classList.toggle('show', y > 600);
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
    onScroll();
    toTop && toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      const skip = $('.skip-link'); skip && skip.focus({ preventScroll: true });
    });
  }

  /* ---------- Mobile nav + services dropdown ---------- */
  function initNav() {
    const toggle = $('#nav-toggle');
    const nav = $('#main-nav');
    if (!toggle || !nav) return;
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('open', open);
      document.body.classList.toggle('nav-open', open);
      if (open) { const first = $('a', nav); first && first.focus(); }
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });

    $$('.dd-toggle').forEach((btn) => {
      const dd = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        dd.classList.toggle('open', open);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      $$('.dd-toggle[aria-expanded="true"]').forEach((b) => { b.setAttribute('aria-expanded', 'false'); document.getElementById(b.getAttribute('aria-controls')).classList.remove('open'); b.focus(); });
      if (nav.classList.contains('open')) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 1025px)').addEventListener('change', (m) => m.matches && setOpen(false));
  }

  /* ---------- Fade-in on scroll + animated counters ---------- */
  function initReveal() {
    const els = $$('.reveal');
    const counters = $$('.counter');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });
    els.forEach((el) => io.observe(el));

    const animate = (el) => {
      const target = Number(el.dataset.target);
      const start = performance.now();
      const dur = 1800;
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('en-IN');
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { animate(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- Testimonial sliders ---------- */
  function initSliders() {
    $$('[data-slider]').forEach((slider) => {
      const slides = $$('.slide', slider);
      const dots = $('.slider-dots', slider);
      let i = 0, timer = null;
      slides.forEach((s, n) => {
        s.setAttribute('role', 'group');
        s.setAttribute('aria-roledescription', 'slide');
        s.setAttribute('aria-label', `${n + 1} of ${slides.length}`);
        const d = document.createElement('button');
        d.type = 'button';
        d.setAttribute('role', 'tab');
        d.setAttribute('aria-label', `Show testimonial ${n + 1}`);
        d.addEventListener('click', () => { go(n); restart(); });
        dots.appendChild(d);
      });
      const go = (n) => {
        i = (n + slides.length) % slides.length;
        slides.forEach((s, k) => { s.classList.toggle('active', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
        $$('button', dots).forEach((d, k) => d.setAttribute('aria-selected', String(k === i)));
      };
      const restart = () => { clearInterval(timer); if (!reduceMotion) timer = setInterval(() => go(i + 1), 6500); };
      $('.slider-prev', slider).addEventListener('click', () => { go(i - 1); restart(); });
      $('.slider-next', slider).addEventListener('click', () => { go(i + 1); restart(); });
      slider.addEventListener('mouseenter', () => clearInterval(timer));
      slider.addEventListener('mouseleave', restart);
      slider.addEventListener('focusin', () => clearInterval(timer));
      slider.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { go(i - 1); restart(); }
        if (e.key === 'ArrowRight') { go(i + 1); restart(); }
      });
      go(0); restart();
    });
  }

  /* ---------- Accordions (FAQ) ---------- */
  function initAccordions() {
    $$('.acc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        document.getElementById(btn.getAttribute('aria-controls')).hidden = open;
      });
    });
  }

  /* ---------- Filterable grids (case studies, blog) ---------- */
  function initFilterGrids() {
    $$('[data-filter-grid]').forEach((grid) => {
      const section = grid.closest('section');
      const buttons = $$('.filter-btn[data-filter]', section);
      const search = $('.blog-search input', section);
      const empty = $('.empty-state', section);
      const live = $('[aria-live].sr-only', section);
      const attr = grid.dataset.filterAttr || 'service';
      let active = 'All';
      const apply = () => {
        const q = search ? search.value.trim().toLowerCase() : '';
        let shown = 0;
        Array.from(grid.children).forEach((card) => {
          const okCat = active === 'All' || card.dataset[attr] === active;
          const okQ = !q || (card.dataset.search || card.textContent.toLowerCase()).includes(q);
          const show = okCat && okQ;
          card.classList.toggle('is-hidden', !show);
          if (show) { shown++; card.classList.add('in'); }
        });
        if (empty) empty.hidden = shown > 0;
        if (live) live.textContent = `${shown} result${shown === 1 ? '' : 's'} shown`;
      };
      buttons.forEach((b) => b.addEventListener('click', () => {
        active = b.dataset.filter;
        buttons.forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        apply();
      }));
      search && search.addEventListener('input', apply);
    });
  }

  /* ---------- Careers: job search + filters (client-side, synced to URL) ---------- */
  function initJobFilters() {
    const form = $('#job-filters');
    if (!form) return;
    const cards = $$('#job-list .job-card');
    const q = $('#jf-q');
    const selects = $$('select[data-key]', form);
    const count = $('#job-count');
    const empty = $('#job-empty');
    const params = new URLSearchParams(location.search);
    if (params.get('q')) q.value = params.get('q');
    selects.forEach((s) => { const v = params.get(s.dataset.key); if (v) s.value = v; });

    const apply = () => {
      const term = q.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach((c) => {
        let ok = !term || c.dataset.search.includes(term);
        selects.forEach((s) => {
          if (!s.value || !ok) return;
          const key = s.dataset.key;
          ok = key === 'languages' ? c.dataset.languages.split('|').includes(s.value) : c.dataset[key] === s.value;
        });
        c.hidden = !ok;
        if (ok) shown++;
      });
      count.innerHTML = `<strong>${shown}</strong> open position${shown === 1 ? '' : 's'}${shown < cards.length ? ' match your filters' : ''}`;
      empty.hidden = shown > 0;
      const p = new URLSearchParams();
      if (term) p.set('q', term);
      selects.forEach((s) => s.value && p.set(s.dataset.key, s.value));
      history.replaceState(null, '', `${location.pathname}${p.toString() ? '?' + p : ''}${location.hash}`);
    };
    q.addEventListener('input', apply);
    selects.forEach((s) => s.addEventListener('change', apply));
    $('#jf-reset').addEventListener('click', () => { q.value = ''; selects.forEach((s) => (s.value = '')); apply(); q.focus(); });
    apply();
  }

  /* ---------- Pricing tabs + monthly/yearly toggle ---------- */
  function initPricing() {
    const tabs = $$('.tabs [role="tab"]');
    if (tabs.length) {
      const select = (tab, focus) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
        if (focus) tab.focus();
      };
      tabs.forEach((t, n) => {
        t.addEventListener('click', () => select(t));
        t.addEventListener('keydown', (e) => {
          const map = { ArrowRight: n + 1, ArrowLeft: n - 1, Home: 0, End: tabs.length - 1 };
          if (e.key in map) { e.preventDefault(); select(tabs[(map[e.key] + tabs.length) % tabs.length], true); }
        });
      });
      const fromHash = () => { const t = tabs.find((x) => x.dataset.tab === location.hash.slice(1)); if (t) select(t); };
      fromHash();
      window.addEventListener('hashchange', fromHash);
    }
    const sw = $('#billing-switch');
    if (sw) {
      sw.addEventListener('click', () => {
        const yearly = sw.getAttribute('aria-checked') !== 'true';
        sw.setAttribute('aria-checked', String(yearly));
        $$('[data-monthly][data-yearly]').forEach((el) => { el.textContent = yearly ? el.dataset.yearly : el.dataset.monthly; });
      });
    }
  }

  /* ---------- Forms: validation, uploads, spam protection, submission ---------- */
  const MESSAGES = {
    'seo-audit': 'Thanks! Your free SEO audit request is in. Expect your report within 48 hours.',
    'service-inquiry': 'Thank you! A specialist will reply within one working day.',
    contact: 'Thanks for reaching out! We’ll get back to you within one working day.',
    'book-call': 'Your call is booked! A confirmation with a Google Meet link is on its way to your inbox.',
    newsletter: 'You’re subscribed! Look out for our next email.',
    'job-application': 'Application received! Our recruiter will call you within 48 hours.'
  };

  function fieldError(input, msg) {
    const wrap = input.closest('.field');
    if (!wrap) return;
    wrap.classList.toggle('invalid', !!msg);
    const err = $('.err', wrap);
    if (err) err.textContent = msg || '';
    if (input.matches('input, select, textarea')) input.setAttribute('aria-invalid', String(!!msg));
  }

  function validateFile(input) {
    const f = input.files && input.files[0];
    if (!f) return input.required ? (input.dataset.requiredMsg || 'Please upload a file.') : '';
    const exts = (input.dataset.ext || '').split(',');
    const ext = f.name.split('.').pop().toLowerCase();
    if (exts[0] && !exts.includes(ext)) return `Unsupported file type. Allowed: ${exts.join(', ').toUpperCase()}.`;
    const max = Number(input.dataset.maxMb || 5);
    if (f.size > max * 1024 * 1024) return `File is too large (${(f.size / 1048576).toFixed(1)} MB). Maximum is ${max} MB.`;
    return '';
  }

  function validateInput(input) {
    if (input.type === 'file') return validateFile(input);
    const v = input.value.trim();
    if (input.type === 'checkbox') return input.required && !input.checked ? 'Please tick this box to continue.' : '';
    if (input.required && !v) return 'This field is required.';
    if (!v) return '';
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Please enter a valid email address.';
    if (input.dataset.minlen && v.length < +input.dataset.minlen) return `Please use at least ${input.dataset.minlen} characters.`;
    if (input.dataset.indianMobile !== undefined && !/^[6-9]\d{9}$/.test(v.replace(/\D/g, '').slice(-10))) return 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
    if (input.type === 'tel' && v.replace(/\D/g, '').length < 10) return 'Please enter a valid 10-digit phone number.';
    if (input.dataset.dob !== undefined) {
      const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return 'Enter your date of birth as DD/MM/YYYY, e.g. 14/05/2001.';
      const dob = new Date(+m[3], +m[2] - 1, +m[1]);
      if (dob.getDate() !== +m[1] || dob.getMonth() !== +m[2] - 1) return 'That date doesn’t exist — please check it.';
      const age = (Date.now() - dob) / 31557600000;
      if (age < 18) return 'You must be at least 18 years old to apply.';
      if (age > 70) return 'Please check the year of birth.';
    }
    if (input.dataset.pincode !== undefined && !/^[1-9]\d{5}$/.test(v)) return 'PIN code should be 6 digits.';
    if (input.dataset.minAge) {
      const dob = new Date(v + 'T00:00:00');
      const min = new Date(); min.setFullYear(min.getFullYear() - Number(input.dataset.minAge));
      if (isNaN(dob) || dob > min) return `You must be at least ${input.dataset.minAge} years old to apply.`;
      if (dob.getFullYear() < 1950) return 'Please check your date of birth.';
    }
    if (input.type === 'url') { try { const u = new URL(/^https?:\/\//.test(v) ? v : 'https://' + v); if (!u.hostname.includes('.')) throw 0; } catch (e) { return 'Please enter a valid website URL.'; } }
    return '';
  }

  function validateForm(form) {
    let firstBad = null;
    $$('input:not([type=hidden]):not([name=company_website]), select, textarea', form).forEach((inp) => {
      if (inp.type === 'radio' || inp.closest('.pill-check') || inp.dataset.skipValidate !== undefined) return;
      const msg = validateInput(inp);
      fieldError(inp, msg);
      if (msg && !firstBad) firstBad = inp;
    });
    // Checkbox groups that need at least one selection (e.g. languages known)
    $$('[data-group-required]', form).forEach((grp) => {
      const ok = $$('input:checked', grp).length > 0;
      const wrap = grp.closest('.field');
      wrap.classList.toggle('invalid', !ok);
      $('.err', wrap).textContent = ok ? '' : 'Please select at least one option.';
      if (!ok && !firstBad) firstBad = $('input', grp);
    });
    // Required radio groups (e.g. booking time slot, date)
    const radios = new Set($$('input[type=radio][required]', form).map((r) => r.name));
    radios.forEach((name) => {
      if (!form.querySelector(`input[name="${name}"]:checked`)) {
        const status = $('.form-status', form);
        status.className = 'form-status bad';
        status.textContent = `Please choose a ${name}.`;
        if (!firstBad) firstBad = form.querySelector(`input[name="${name}"]`);
      }
    });
    return firstBad;
  }

  function initForms() {
    // Prefill from query string, e.g. /contact/?service=SEO&plan=Growth
    const qs = new URLSearchParams(location.search);
    const svc = $('#ct-service');
    if (svc && qs.get('service')) {
      const want = qs.get('service').toLowerCase();
      const opt = Array.from(svc.options).find((o) => o.text.toLowerCase().includes(want) || want.includes(o.text.toLowerCase().split(' ')[0]));
      if (opt) svc.value = opt.value;
    }
    const msg = $('#ct-msg');
    if (msg && qs.get('plan')) msg.value = `I'm interested in the ${qs.get('plan')} plan${qs.get('service') ? ' for ' + qs.get('service') : ''}. `;

    $$('.file-drop input[type=file]').forEach((inp) => {
      const drop = inp.closest('.file-drop');
      const label = $('.file-text', drop);
      const original = label.innerHTML;
      inp.addEventListener('change', () => {
        const f = inp.files[0];
        const err = validateFile(inp);
        fieldError(inp, err);
        drop.classList.toggle('has-file', !!f && !err);
        if (f) { label.textContent = ''; const b = document.createElement('strong'); b.textContent = f.name; const sm = document.createElement('small'); sm.textContent = `${(f.size / 1024).toFixed(0)} KB · click to change`; label.append(b, sm); }
        else label.innerHTML = original;
      });
      inp.form && inp.form.addEventListener('reset', () => { drop.classList.remove('has-file'); label.innerHTML = original; });
      ['dragenter', 'dragover'].forEach((ev) => inp.addEventListener(ev, () => drop.classList.add('drag')));
      ['dragleave', 'drop'].forEach((ev) => inp.addEventListener(ev, () => drop.classList.remove('drag')));
    });

    $$('form.js-form').forEach((form) => {
      const ts = $('input[name=_ts]', form);
      if (ts) ts.value = String(Date.now());
      $$('input, select, textarea', form).forEach((inp) => {
        inp.addEventListener('blur', () => { if (inp.type !== 'file' && inp.type !== 'radio' && inp.value) fieldError(inp, validateInput(inp)); });
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = $('.form-status', form);
        status.className = 'form-status';
        status.textContent = '';
        if (form._wizard && !form._wizard.validateAll()) return;
        const bad = validateForm(form);
        if (bad) {
          bad.focus();
          if (!status.textContent) { status.className = 'form-status bad'; status.textContent = 'Please fix the highlighted fields.'; }
          return;
        }
        const btn = $('button[type=submit]', form);
        const label = btn.textContent;
        btn.setAttribute('aria-busy', 'true');
        btn.textContent = 'Sending…';
        try {
          const headers = { Accept: 'application/json' };
          if (form.dataset.form === 'job-application' && acct.token()) headers.Authorization = 'Bearer ' + acct.token();
          const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) throw new Error(data.error || 'Server error');
          const type = form.dataset.form;
          trackEvent(type);
          form.dispatchEvent(new CustomEvent('sn:submitted'));
          const panel = form.nextElementSibling;
          if (panel && panel.classList.contains('success-panel')) {
            form.hidden = true;
            panel.hidden = false;
            panel.focus();
            panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
          } else {
            status.className = 'form-status ok';
            status.textContent = MESSAGES[type] || 'Thank you! We’ll be in touch soon.';
            form.reset();
            $$('.file-drop', form).forEach((d) => { d.classList.remove('has-file'); });
            if (ts) ts.value = String(Date.now());
          }
        } catch (err) {
          status.className = 'form-status bad';
          status.innerHTML = `Sorry, we couldn’t send that (${err.message}). Please try again, or email <a href="mailto:hello@scalenestdigital.com">hello@scalenestdigital.com</a>.`;
        } finally {
          btn.removeAttribute('aria-busy');
          btn.textContent = label;
        }
      });
    });
  }

  /* ---------- Job application wizard ----------
     Basic details → Education & work → Verify mobile → Finish.
     Every "Save & Next" saves the application to the database (it shows in the admin inbox as "incomplete"),
     and going back to edit a step then saving again updates the same record.
     Mobile verification: "Verify your number" → 30 s wait → the applicant types the OTP they received (sent from
     another platform, not by this site) → "pending" (45 s approval countdown) → an admin clicks Verified or Failed.
     Only "verified" unlocks the next steps.
     The form checks that decision live; after "failed" the applicant can verify again. */
  function initWizards() {
    $$('form[data-wizard]').forEach((form) => {
      const wrap = form.closest('.wizard-wrap');

      // You must be logged in to apply. Show the login/signup gate when there's no session, and don't wire up the
      // (hidden) wizard at all; when logged in, reveal the form and lock the mobile number to the account.
      const gate = wrap && wrap.previousElementSibling && wrap.previousElementSibling.matches('[data-apply-gate]') ? wrap.previousElementSibling : null;
      const user = acct.user();
      if (!acct.token()) {
        if (gate) {
          const next = encodeURIComponent(location.pathname + '#apply');
          const sl = $('[data-gate-login]', gate); if (sl) sl.href = '/login/?next=' + next;
          const ss = $('[data-gate-signup]', gate); if (ss) ss.href = '/signup/?next=' + next;
          gate.hidden = false;
        }
        return; // leave the wizard hidden
      }
      if (wrap) wrap.hidden = false;
      if (gate) gate.hidden = true;
      const steps = $$('.wz-step', form);
      const navItems = $$('.wz-nav li', form);
      const bar = $('.wz-progress span', form);
      const stepCount = $('[data-wz-stepcount]', form);
      const back = $('[data-wz-back]', form);
      const next = $('[data-wz-next]', form);
      const nextLabel = next.innerHTML;
      const submitBtn = $('[data-wz-submit]', form);
      const status = $('.wz-foot .form-status', form);
      const phone = $('input[name=phone]', form);
      // The mobile number is the account's identity — prefill it and stop it being changed here.
      if (user && user.phone) {
        phone.value = user.phone;
        phone.readOnly = true;
        phone.setAttribute('aria-readonly', 'true');
        const changeBtn = $('[data-otp-change]', form);
        if (changeBtn) changeBtn.hidden = true;
      }
      const nameInput = $('input[name=name]', form);
      if (nameInput && user && user.name && !nameInput.value) nameInput.value = user.name;
      const draftInput = $('input[name=draftId]', form);
      const jobSlug = $('input[name=jobSlug]', form).value;
      const draftStatus = $('[data-draft-status]', form);
      const OTP_STEP = steps.findIndex((s) => $('[data-otp]', s));
      let current = 0, maxReached = 0;
      let vstate = 'not_started'; // mobile verification: not_started | pending | verified | failed
      const canPassOtp = () => vstate === 'verified'; // only an admin-approved number unlocks the next steps

      const stepOf = (el) => steps.findIndex((s) => s.contains(el));
      const setStatus = (msg = '', kind = '') => { status.className = 'form-status' + (kind ? ' ' + kind : ''); status.textContent = msg; };
      const num = () => phone.value.replace(/\D/g, '').slice(-10);
      const escHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

      function validateStep(i) {
        let firstBad = null;
        $$('input:not([type=hidden]):not([name=company_website]), select, textarea', steps[i]).forEach((inp) => {
          if (inp.type === 'radio' || inp.closest('.pill-check') || inp.closest('.consent-line') || inp.dataset.skipValidate !== undefined) return;
          const msg = validateInput(inp);
          fieldError(inp, msg);
          if (msg && !firstBad) firstBad = inp;
        });
        $$('[data-group-required]', steps[i]).forEach((grp) => {
          const ok = $$('input:checked', grp).length > 0;
          const f = grp.closest('.field');
          f.classList.toggle('invalid', !ok);
          $('.err', f).textContent = ok ? '' : (grp.classList.contains('choice-grid') ? 'Please choose one option.' : 'Please select at least one.');
          if (!ok && !firstBad) firstBad = $('input', grp);
        });
        const consentBox = $('input[name=consent]', steps[i]);
        if (consentBox && !consentBox.checked) { fieldError(consentBox, 'Please tick this box to submit.'); firstBad = firstBad || consentBox; }
        if (i === OTP_STEP && !canPassOtp() && !firstBad) {
          otpMsg(vstate === 'requested' ? 'Please enter the OTP and tap Submit OTP.' : vstate === 'pending' ? 'Please wait — our team is approving your number. You can continue once it’s verified.' : vstate === 'failed' ? 'Please tap “Re-generate OTP” and enter the new OTP.' : 'Please tap “Verify your number” to continue.', 'bad');
          firstBad = form._otpFocus;
        }
        if (firstBad) { const d = firstBad.closest('details'); if (d) d.open = true; }
        return firstBad;
      }

      function show(i, focus = true) {
        current = i;
        maxReached = Math.max(maxReached, i);
        steps.forEach((s, k) => (s.hidden = k !== i));
        navItems.forEach((li, k) => {
          li.classList.toggle('done', k !== i && k <= maxReached && (k < i || k < maxReached));
          li.classList.toggle('active', k === i);
          if (k === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
          $('button', li).disabled = k > maxReached || (k > OTP_STEP && !canPassOtp());
        });
        bar.style.width = `${((i + 1) / steps.length) * 100}%`;
        stepCount.textContent = `Step ${i + 1} of ${steps.length}`;
        const last = i === steps.length - 1;
        back.hidden = i === 0;
        next.hidden = last || (i === OTP_STEP && !canPassOtp());
        submitBtn.hidden = !last;
        setStatus();
        if (i === OTP_STEP) {
          renderVerifyState();
          // Warm up the status check now, so the admin's decision shows quickly later.
          if (draftInput.value && !form._statusWarm) { form._statusWarm = true; fetchStatus(); }
        }
        if (last) renderReview();
        if (focus) {
          const top = wrap.getBoundingClientRect().top + window.scrollY - 80;
          if (window.scrollY > top + 40 || window.scrollY < top - 400) window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
          $('.wz-head h3', steps[i]).focus({ preventScroll: true });
        }
      }

      /* ----- Saving to the database ----- */
      async function saveProgress(stage, extra = {}) {
        const fields = {};
        for (const [k, v] of new FormData(form).entries()) {
          if (typeof v !== 'string' || ['otpToken', '_ts', 'company_website', 'consent', 'draftId', 'job', 'jobSlug'].includes(k)) continue;
          fields[k] = k in fields ? [].concat(fields[k], v) : v;
        }
        let r;
        try {
          r = await fetch('/api/applications/progress', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (acct.token() || '') },
            body: JSON.stringify({ jobSlug, draftId: draftInput.value, step: stage, fields, company_website: $('input[name=company_website]', form).value, ...extra })
          });
        } catch (e) { return { ok: false, error: 'No internet connection — please check and tap Save & Next again.' }; }
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.id) {
          if (draftInput.value !== d.id) draftInput.value = d.id;
          if (d.verification) setVState(d.verification.status);
          saveDraft();
          const t = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
          draftStatus.textContent = `Saved to your application at ${t}`;
        }
        return { ok: r.ok && !!d.ok, ...d };
      }

      async function goNext() {
        const bad = validateStep(current);
        if (bad) {
          bad.focus();
          bad.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
          setStatus('Please fill the highlighted fields', 'bad');
          return;
        }
        next.setAttribute('aria-busy', 'true');
        next.textContent = 'Saving…';
        const d = await saveProgress(current + 2); // stage = the (1-based) step they move on to
        next.removeAttribute('aria-busy');
        next.innerHTML = nextLabel;
        if (!d.ok) { setStatus(d.error || 'Could not save — please try again.', 'bad'); return; }
        show(current + 1);
      }
      next.addEventListener('click', goNext);
      back.addEventListener('click', () => show(current - 1));
      $$('[data-goto]', form).forEach((b) => b.addEventListener('click', () => { const t = Number(b.dataset.goto); if (t <= maxReached) show(t); }));
      const clearStatus = () => { if (status.classList.contains('bad')) setStatus(); };
      form.addEventListener('input', (e) => {
        clearStatus();
        // Re-check a field that is showing an error while the person types, so the red message goes away once it's fixed
        const f = e.target.closest('.field');
        if (f && f.classList.contains('invalid') && e.target.matches('input:not([type=checkbox]):not([type=radio]), select, textarea')) fieldError(e.target, validateInput(e.target));
      });
      form.addEventListener('change', (e) => {
        clearStatus();
        const grp = e.target.closest('[data-group-required]');
        if (grp) { const f = grp.closest('.field'); f.classList.remove('invalid'); $('.err', f).textContent = ''; }
        if (e.target.name === 'consent' && e.target.checked) fieldError(e.target, '');
      });
      form.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SUMMARY') return;
        e.preventDefault();
        if (e.target === codeInput) submitOtpBtn.click();
        else if (current < steps.length - 1 && !next.hidden) goNext();
      });

      form._wizard = {
        validateAll() {
          for (let i = 0; i < steps.length; i++) {
            const bad = validateStep(i);
            if (bad) { show(i); bad.focus(); setStatus('Please fill the highlighted fields', 'bad'); return false; }
          }
          return true;
        }
      };

      /* Date of birth: type digits, slashes are added automatically (DD/MM/YYYY) */
      $$('input[data-dob]', form).forEach((inp) => inp.addEventListener('input', (e) => {
        if (e.inputType && e.inputType.startsWith('delete')) return;
        const d = inp.value.replace(/\D/g, '').slice(0, 8);
        inp.value = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
      }));

      /* PIN code → city & state (India Post public API); fields stay editable if it fails */
      const pin = $('input[data-pincode]', form);
      if (pin) {
        const city = $('input[name=city]', form), state = $('select[name=state]', form);
        const hint = document.createElement('p'); hint.className = 'hint pin-hint'; pin.closest('.field').insertBefore(hint, $('.err', pin.closest('.field')));
        pin.addEventListener('input', async () => {
          pin.value = pin.value.replace(/\D/g, '').slice(0, 6);
          hint.textContent = '';
          if (pin.value.length !== 6) return;
          hint.textContent = 'Finding your city…';
          try {
            const r = await fetch(`https://api.postalpincode.in/pincode/${pin.value}`, { signal: AbortSignal.timeout(6000) });
            const po = ((await r.json())[0] || {}).PostOffice;
            if (!po || !po.length) { hint.textContent = 'PIN code not found — please type your city.'; return; }
            city.value = po[0].District;
            const st = Array.from(state.options).find((o) => o.value.toLowerCase() === po[0].State.toLowerCase());
            if (st) state.value = st.value;
            [city, state].forEach((el) => { fieldError(el, ''); el.dispatchEvent(new Event('change', { bubbles: true })); });
            hint.textContent = `✓ ${po[0].District}, ${po[0].State}`;
          } catch (e) { hint.textContent = 'Couldn’t look up the PIN — please type your city.'; }
        });
      }

      /* "I don't have a resume" makes the upload optional */
      const noCv = $('input[data-no-resume]', form);
      const resume = $('input[name=resume]', form);
      if (noCv && resume) {
        const sync = () => {
          resume.required = !noCv.checked;
          $('[data-resume-req]', form).hidden = noCv.checked;
          resume.closest('.file-drop').classList.toggle('is-muted', noCv.checked);
          if (noCv.checked) fieldError(resume, '');
        };
        noCv.addEventListener('change', sync);
        resume.addEventListener('change', () => { if (resume.files.length) { noCv.checked = false; sync(); } });
        sync();
      }

      /* Review summary */
      const V_TEXT = { not_started: 'Not verified yet', requested: 'OTP requested — not submitted yet', pending: 'Waiting for approval', verified: '✓ Verified', failed: '✗ Failed — re-generate OTP' };
      function renderReview() {
        const body = $('[data-review-body]', form);
        if (!body) return;
        body.innerHTML = steps.slice(0, -1).map((step, i) => {
          const rows = [];
          if (i === OTP_STEP) rows.push(`<div><dt>Mobile</dt><dd>+91 ${escHtml(num())}</dd></div><div><dt>Verification</dt><dd class="rv-v rv-${vstate}">${V_TEXT[vstate]}</dd></div>`);
          else $$('.field', step).forEach((f) => {
            const lab = $(':scope > label, :scope > legend', f);
            if (!lab) return;
            let val;
            if ($('.pill-check', f)) val = $$('.pill-check input:checked', f).map((c) => c.value).join(', ');
            else { const inp = $('input:not([type=checkbox]):not([type=file]), select, textarea', f); val = inp ? inp.value.trim() : ''; }
            if (val) rows.push(`<div><dt>${escHtml(lab.childNodes[0].textContent.trim())}</dt><dd>${escHtml(val)}</dd></div>`);
          });
          return `<div class="rv-sec"><div class="rv-h"><strong>${navItems[i].textContent.trim()}</strong><button type="button" class="btn-link" data-rv-goto="${i}">Edit</button></div><dl>${rows.join('')}</dl></div>`;
        }).join('');
        $$('[data-rv-goto]', body).forEach((b) => b.addEventListener('click', () => show(Number(b.dataset.rvGoto))));
      }

      /* ----- Mobile verification ----------------------------------------------------------------
         1. "Verify your number" → marked "OTP requested" (the admin gets an alert and sends the OTP from
            the other platform) → 30-second countdown → "Enter OTP" screen.
         2. "Submit OTP" → status "pending" → 45-second "Waiting for approval" countdown; the form checks the
            admin's decision every 5 seconds. Only "verified" unlocks the next step (it then moves on by itself).
         3. "Failed" → "Re-generate OTP" → OTP box straight away → enter the new OTP → submit again. */
      const otpBox = $('[data-otp]', form);
      const requestBox = $('[data-otp-request-box]', form);
      const requestBtn = $('[data-otp-request]', form);
      const waitBox = $('[data-otp-wait]', form);
      const entry = $('[data-otp-entry]', form);
      const codeInput = $('.otp-input', form);
      const submitOtpBtn = $('[data-otp-submit]', form);
      const submitOtpLabel = submitOtpBtn.innerHTML;
      const otpStatus = $('[data-otp-status]', form);
      const stateBox = $('[data-verify-state]', form);
      const aadhaar = $('input[name=aadhaarLinked]', form);
      const aadhaarErr = $('.aadhaar-err', form);
      const ring = $('[data-otp-ring]', form);
      const RING_LEN = 2 * Math.PI * 28;
      const SEND_WAIT = 30;      // seconds before the OTP box appears after "Verify your number"
      const APPROVAL_WAIT = 45;  // "Waiting for approval" countdown after "Submit OTP"
      let poll = null, waitTimer = null, waiting = false, approvalTimer = null, approvalLeft = 0;
      const otpMsg = (msg, kind = '') => { otpStatus.className = 'otp-status' + (kind ? ' ' + kind : ''); otpStatus.innerHTML = msg; };
      Object.defineProperty(form, '_otpFocus', { get: () => (!entry.hidden ? codeInput : !requestBox.hidden ? requestBtn : otpBox) });
      const ringSvg = (left, total) => `<span class="otp-timer small" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" class="t-track"/><circle cx="32" cy="32" r="28" class="t-bar" style="stroke-dasharray:${RING_LEN};stroke-dashoffset:${RING_LEN * (1 - left / total)}"/></svg><span>${left}</span></span>`;

      function setVState(v) {
        const prev = vstate;
        vstate = v || 'not_started';
        if (prev !== vstate) {
          if (vstate === 'failed') codeInput.value = '';
          if (vstate === 'pending') startApprovalCountdown(); else clearInterval(approvalTimer);
          renderVerifyState();
          if (vstate === 'failed' && current > OTP_STEP) show(OTP_STEP);
          if (vstate === 'verified' && prev === 'pending') {
            draftStatus.textContent = '✓ Your mobile number has been verified by our team';
            setTimeout(() => { if (current === OTP_STEP) show(OTP_STEP + 1); }, 1500);
          }
        }
        startPolling();
      }

      function renderVerifyState() {
        ['data-otp-phone', 'data-otp-phone2', 'data-otp-phone3'].forEach((a) => { const el = $(`[${a}]`, form); if (el) el.textContent = num() || '—'; });
        let box = null;
        if (vstate === 'pending') {
          // Just a countdown while the admin checks the OTP; after it ends, a spinner until they decide.
          stateBox.hidden = false;
          stateBox.className = 'verify-state vs-countdown';
          stateBox.setAttribute('aria-label', 'Waiting for approval');
          stateBox.innerHTML = approvalLeft > 0 ? ringSvg(approvalLeft, APPROVAL_WAIT).replace('otp-timer small', 'otp-timer big') : '<span class="otp-spinner" aria-hidden="true"></span>';
        } else if (vstate === 'verified') box = ['verified', '✓', 'Mobile number verified', `+91 ${num()} has been verified. Taking you to the next step…`];
        else if (vstate === 'failed') box = ['failed', '✗', 'OTP could not be verified', 'Please tap “Re-generate OTP”, then enter the new OTP you receive.'];
        otpBox.classList.toggle('is-verified', vstate === 'verified');
        navItems[OTP_STEP].classList.toggle('verified', vstate === 'verified');
        if (box) {
          stateBox.hidden = false;
          stateBox.className = `verify-state vs-${box[0]}`;
          stateBox.removeAttribute('aria-label');
          stateBox.innerHTML = `<span class="vs-icon">${box[1]}</span><div><strong>${box[2]}</strong><p>${box[3]}</p></div>`;
        } else if (vstate !== 'pending') stateBox.hidden = true;
        // Which screen to show: request button → 30 s wait → OTP entry → waiting for approval.
        const canRequest = vstate === 'not_started' || vstate === 'failed';
        requestBox.hidden = !canRequest || waiting;
        $('.consent-line', requestBox).hidden = vstate === 'failed' && aadhaar.checked; // already confirmed
        if (!requestBtn.disabled) $('span', requestBtn).textContent = vstate === 'failed' ? 'Re-generate OTP' : 'Verify your number';
        waitBox.hidden = !waiting;
        entry.hidden = !(vstate === 'requested' && !waiting);
        if (vstate !== 'requested' && vstate !== 'not_started' && vstate !== 'failed') otpMsg('');
        if (current === OTP_STEP) next.hidden = !canPassOtp();
        navItems.forEach((li, k) => { $('button', li).disabled = k > maxReached || (k > OTP_STEP && !canPassOtp()); });
      }

      // 30-second "Sending OTP" countdown before the OTP box appears.
      function startWait() {
        clearInterval(waitTimer);
        waiting = true;
        let left = SEND_WAIT;
        const tick = () => {
          $('[data-otp-seconds]', form).textContent = left;
          $('[data-otp-seconds2]', form).textContent = left;
          ring.style.strokeDasharray = RING_LEN;
          ring.style.strokeDashoffset = RING_LEN * (1 - left / SEND_WAIT);
        };
        tick();
        renderVerifyState();
        waitTimer = setInterval(() => {
          left--;
          tick();
          if (left <= 0) { clearInterval(waitTimer); waiting = false; renderVerifyState(); codeInput.focus(); }
        }, 1000);
      }

      // 45-second "Waiting for approval" countdown after the OTP is submitted.
      function startApprovalCountdown() {
        clearInterval(approvalTimer);
        approvalLeft = APPROVAL_WAIT;
        approvalTimer = setInterval(() => {
          approvalLeft = Math.max(0, approvalLeft - 1);
          if (vstate === 'pending') renderVerifyState();
          if (approvalLeft <= 0) clearInterval(approvalTimer);
        }, 1000);
      }

      // While waiting for the admin's decision, check every 4 seconds — and immediately when the applicant comes back
      // to this tab (browsers slow down timers in background tabs).
      let checking = false;
      async function checkDecision() {
        if (checking || vstate !== 'pending' || !draftInput.value) return; // one check at a time
        checking = true;
        try {
          const s = await fetchStatus();
          if (s && s.verification && s.verification !== vstate && vstate === 'pending') setVState(s.verification);
        } finally { checking = false; }
      }
      function startPolling() {
        clearInterval(poll);
        if (vstate !== 'pending' || !draftInput.value) return;
        poll = setInterval(checkDecision, 4000);
      }
      document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDecision(); });
      window.addEventListener('focus', checkDecision);
      async function fetchStatus() {
        try {
          const r = await fetch(`/api/applications/status?id=${encodeURIComponent(draftInput.value)}&phone=${num()}`);
          return r.ok ? await r.json() : (r.status === 404 ? { missing: true } : null);
        } catch (e) { return null; }
      }

      // A changed number needs verifying again.
      function resetVerification() {
        if (vstate === 'not_started' && !waiting) return;
        clearInterval(waitTimer);
        waiting = false;
        codeInput.value = '';
        otpMsg('');
        setVState('not_started');
        maxReached = Math.min(maxReached, OTP_STEP);
      }
      phone.addEventListener('input', () => {
        phone.value = phone.value.replace(/\D/g, '').slice(0, 10);
        if (phone.value.length === 10) fieldError(phone, validateInput(phone));
        resetVerification();
      });
      $('[data-otp-change]', form).addEventListener('click', () => { show(0); phone.focus(); phone.select(); });
      aadhaar.addEventListener('change', () => { if (aadhaar.checked) aadhaarErr.textContent = ''; });
      codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 8); if (otpStatus.classList.contains('bad')) otpMsg(''); });

      // Ask for an OTP — recorded on the application, which rings an alert on the admin dashboard.
      // First request waits 30 s for the OTP to arrive; "Re-generate OTP" (after a failed check) opens the OTP box straight away.
      async function requestOtp(btn) {
        const err = validateInput(phone);
        if (err) { show(0); fieldError(phone, err); phone.focus(); return; }
        if (!aadhaar.checked) { $('.consent-line', requestBox).hidden = false; aadhaarErr.textContent = 'Please tick this box to confirm.'; aadhaar.focus(); return; }
        const regenerate = vstate === 'failed';
        const labelEl = $('span', btn) || btn;
        const label = labelEl.textContent;
        btn.disabled = true;
        labelEl.textContent = 'Please wait…';
        otpMsg('');
        const s = await saveProgress(OTP_STEP + 1, { requestOtp: true });
        labelEl.textContent = label;
        btn.disabled = false;
        if (!s.ok) { otpMsg(s.error || 'Could not request the OTP — please try again.', 'bad'); return; }
        codeInput.value = '';
        if (regenerate) { renderVerifyState(); otpMsg('A new OTP is on its way. Enter it below when it arrives.', 'info'); codeInput.focus(); }
        else startWait();
      }
      requestBtn.addEventListener('click', () => requestOtp(requestBtn));
      $('[data-otp-again]', form).addEventListener('click', (e) => requestOtp(e.currentTarget));

      // Submit the OTP → pending admin approval (the next step unlocks only once the admin clicks Verified).
      submitOtpBtn.addEventListener('click', async () => {
        if (!/^\d{4,8}$/.test(codeInput.value)) { otpMsg('Please enter the OTP you received (4–8 digits).', 'bad'); codeInput.focus(); return; }
        submitOtpBtn.disabled = true;
        submitOtpBtn.textContent = 'Submitting…';
        const s = await saveProgress(OTP_STEP + 1, { otp: codeInput.value });
        submitOtpBtn.disabled = false;
        submitOtpBtn.innerHTML = submitOtpLabel;
        if (!s.ok) { otpMsg(s.error || 'Could not submit the OTP — please try again.', 'bad'); return; }
        otpMsg('');
      });

      /* ----- Copy of answers on this device (so a page refresh doesn't lose them) ----- */
      const key = form.dataset.draftKey;
      const SKIP = new Set(['otpToken', '_ts', 'company_website', 'job', 'jobSlug', 'resume', 'voiceNote', 'consent', 'password', 'phone']);
      function saveDraft() {
        const data = {};
        $$('input, select, textarea', form).forEach((el) => {
          if (!el.name || SKIP.has(el.name) || el.type === 'file' || el.classList.contains('otp-input')) return;
          if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) (data[el.name] ||= []).push(el.value); }
          else if (el.value) data[el.name] = el.value;
        });
        store.set(key, JSON.stringify(data));
      }
      let saveT;
      form.addEventListener('input', () => { clearTimeout(saveT); saveT = setTimeout(saveDraft, 600); });
      form.addEventListener('change', () => { clearTimeout(saveT); saveT = setTimeout(saveDraft, 300); });
      form.addEventListener('sn:submitted', () => {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        clearInterval(poll);
        const sp = $('[data-success-phone]', wrap); if (sp) sp.textContent = num();
        document.body.classList.remove('is-applying');
      });

      /* Hide floating WhatsApp / back-to-top buttons while the form is on screen (they cover fields on phones) */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([en]) => document.body.classList.toggle('is-applying', en.isIntersecting && !form.hidden), { threshold: 0.15 }).observe(wrap);
      }

      /* Restore a saved application: fill the fields, then ask the server how far they got and the verification status */
      let restored = null;
      try { restored = JSON.parse(store.get(key) || 'null'); } catch (e) { /* corrupt — ignore */ }
      if (restored) {
        Object.entries(restored).forEach(([name, v]) => $$(`[name="${name}"]`, form).forEach((el) => {
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = [].concat(v).includes(el.value);
          else el.value = v;
        }));
        if (noCv && resume) noCv.dispatchEvent(new Event('change'));
      }
      show(0, false);
      if (restored && draftInput.value && num().length === 10) {
        fetchStatus().then((s) => {
          if (!s) return;
          if (s.missing || s.status !== 'incomplete') { draftInput.value = ''; saveDraft(); return; } // finished or removed → start a new one
          setVState(s.verification);
          maxReached = Math.min(steps.length - 1, Math.max(0, (s.stage || 1) - 1));
          if (!canPassOtp()) maxReached = Math.min(maxReached, OTP_STEP);
          show(maxReached, false);
          draftStatus.textContent = 'Welcome back — we restored your saved application';
        });
      }
    });
  }

  /* ---------- Booking widget: next 10 working days ---------- */
  function initBooking() {
    const strip = $('#date-strip');
    if (!strip) return;
    const d = new Date();
    let added = 0;
    while (added < 10) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) continue; // closed Sundays
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const lab = document.createElement('label');
      lab.innerHTML = `<input type="radio" name="date" value="${iso}"${added === 0 ? ' required' : ''}><span>${d.toLocaleDateString('en-IN', { weekday: 'short' })}<b>${d.getDate()}</b>${d.toLocaleDateString('en-IN', { month: 'short' })}</span>`;
      strip.appendChild(lab);
      added++;
    }
  }

  /* ---------- Google Map: load on demand (keeps page fast + privacy-friendly) ---------- */
  function initMap() {
    const wrap = $('.map-wrap[data-map-src]');
    if (!wrap) return;
    $('.map-load', wrap).addEventListener('click', () => {
      wrap.innerHTML = `<iframe src="${wrap.dataset.mapSrc}" title="Map showing ScaleNest Digital office in Sector 39, Gurugram" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
      wrap.classList.add('loaded');
    });
  }

  /* ---------- Copy-link buttons ---------- */
  function initCopy() {
    $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.setAttribute('aria-label', 'Link copied!'); b.title = 'Link copied!'; } catch (e) { prompt('Copy this link:', b.dataset.copy); }
    }));
  }

  /* ---------- Blog table of contents highlighting ---------- */
  function initToc() {
    const links = $$('.toc a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    links.forEach((l) => { const t = document.getElementById(l.getAttribute('href').slice(1)); t && io.observe(t); });
  }

  /* ---------- 404 page search ---------- */
  function initSiteSearch() {
    const input = $('#nf-q');
    if (!input) return;
    const out = $('#nf-results');
    let index = null;
    input.addEventListener('input', async () => {
      if (!index) { try { index = await (await fetch('/search-index.json')).json(); } catch (e) { index = []; } }
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { out.innerHTML = ''; return; }
      const hits = index.filter((p) => (p.title + ' ' + p.description).toLowerCase().includes(q)).slice(0, 6);
      out.innerHTML = hits.length
        ? hits.map((h) => `<li><a href="${h.url}">${h.title.split(' | ')[0]}<small>${h.description.slice(0, 110)}…</small></a></li>`).join('')
        : '<li class="muted">No matching pages. Try “SEO”, “jobs” or “pricing”.</li>';
    });
  }

  /* ---------- Cookie consent + consent-gated tracking (GTM, GA4, Meta Pixel) ---------- */
  function loadTracking() {
    const t = (window.SN_CONFIG || {}).tracking || {};
    const real = (id) => id && !/X{4,}|^0+$/.test(id);
    if (real(t.gtm)) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      addScript(`https://www.googletagmanager.com/gtm.js?id=${t.gtm}`);
    }
    if (real(t.ga4)) {
      addScript(`https://www.googletagmanager.com/gtag/js?id=${t.ga4}`);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', t.ga4, { anonymize_ip: true });
    }
    if (real(t.metaPixel)) {
      /* Meta Pixel base code */
      !function (f, b, e, v, n, t2, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t2 = b.createElement(e); t2.async = !0; t2.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t2, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', t.metaPixel);
      window.fbq('track', 'PageView');
    }
  }
  function addScript(src) { const s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }
  function trackEvent(type) {
    const name = type === 'job-application' ? 'SubmitApplication' : type === 'newsletter' ? 'Subscribe' : 'Lead';
    window.gtag && window.gtag('event', 'generate_lead', { form_type: type });
    window.fbq && window.fbq('track', name, { content_name: type });
    window.dataLayer && window.dataLayer.push({ event: 'form_submit', form_type: type });
  }
  /* ---------- Applicant account: signup + login + dashboard ---------- */
  function initAccount() {
    const loginForm = $('[data-account="login"]');
    const signupForm = $('[data-account="signup"]');
    const dash = $('[data-dashboard]');
    if (!loginForm && !signupForm && !dash) return;

    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // Where to go after login/signup: a same-site ?next=, else the dashboard.
    function nextUrl() {
      try {
        const n = new URL(location.href).searchParams.get('next');
        if (n && n.startsWith('/') && !n.startsWith('//')) return n;
      } catch (e) { /* ignore */ }
      return '/dashboard/';
    }

    if (loginForm) initAuthForm(loginForm, '/api/account/login', 'Logging in…', (p) => ({ phone: p.phone, password: p.password }));
    if (signupForm) initAuthForm(signupForm, '/api/account/signup', 'Creating account…', (p) => p);
    if (dash) initDashboard(dash);

    function readFields(form) {
      const o = {};
      $$('input[name]', form).forEach((i) => { o[i.name] = i.name === 'phone' ? i.value.replace(/\D/g, '').slice(-10) : i.value; });
      return o;
    }

    function initAuthForm(form, url, busyLabel, payload) {
      if (acct.token()) { location.replace(nextUrl()); return; }
      const status = $('.form-status', form);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bad = validateForm(form);
        if (bad) { bad.focus(); return; }
        const btn = $('button[type=submit]', form);
        const label = btn.innerHTML;
        btn.disabled = true; btn.textContent = busyLabel;
        status.className = 'form-status'; status.textContent = '';
        try {
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload(readFields(form))) });
          const d = await r.json().catch(() => ({}));
          if (r.ok && d.token) { acct.save(d.token, d.user); location.href = nextUrl(); return; }
          status.className = 'form-status bad';
          status.textContent = d.error || 'Something went wrong — please try again.';
        } catch (err) {
          status.className = 'form-status bad';
          status.textContent = 'No internet connection — please check and try again.';
        }
        btn.disabled = false; btn.innerHTML = label;
      });
    }

    function initDashboard(root) {
      const token = acct.token();
      const bodyEl = $('[data-dash-body]', root);
      const jobsEl = $('[data-dash-jobs]', root);
      const subEl = $('[data-dash-sub]', root);
      const welcomeEl = $('[data-dash-welcome]', root);
      const logoutBtn = $('[data-logout]', root);
      if (!token) { location.replace('/login/?next=/dashboard/'); return; }
      logoutBtn.hidden = false;
      logoutBtn.addEventListener('click', () => { acct.clear(); location.replace('/login/'); });
      load();

      async function load() {
        let d;
        try {
          const [meRes, jobsRes] = await Promise.all([
            fetch('/api/account/me', { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }),
            fetch('/api/content/jobs', { headers: { Accept: 'application/json' } })
          ]);
          if (meRes.status === 401) { acct.clear(); location.replace('/login/?next=/dashboard/'); return; }
          d = await meRes.json().catch(() => ({}));
          if (!meRes.ok) { bodyEl.innerHTML = `<p class="form-status bad">${esc(d.error || 'Could not load your dashboard.')}</p>`; return; }
          const jobs = jobsRes.ok ? await jobsRes.json().catch(() => []) : [];
          render(d, Array.isArray(jobs) ? jobs : []);
        } catch (e) {
          bodyEl.innerHTML = '<p class="form-status bad">No internet connection — please refresh to try again.</p>';
        }
      }

      function render(d, jobs) {
        const name = d.user && d.user.name ? d.user.name.split(' ')[0] : '';
        welcomeEl.textContent = name ? `Welcome back, ${name}` : 'Your dashboard';
        subEl.textContent = d.user && d.user.phone ? ('Logged in as +91 ' + d.user.phone) : '';
        const apps = d.applications || [];
        const enrollDocs = d.enrollDocs || [];
        bodyEl.innerHTML = apps.length
          ? '<div class="dash-grid">' + apps.map((a) => appCard(a, enrollDocs)).join('') + '</div>'
          : '<div class="card dash-empty"><p>You haven’t applied to any jobs yet. Browse the opportunities below to get started.</p></div>';
        // Wire up the enrollment document uploads for any selected application.
        $$('input[data-enroll]', bodyEl).forEach((inp) => inp.addEventListener('change', () => uploadEnrollDoc(inp)));

        // New opportunities = open roles the applicant hasn't applied to.
        const applied = new Set(apps.map((a) => a.jobSlug));
        const open = jobs.filter((j) => j.status === 'open' && !applied.has(j.slug));
        jobsEl.innerHTML = open.length
          ? '<div class="dash-grid">' + open.slice(0, 6).map(jobCard).join('') + '</div>'
          : '<div class="card dash-empty"><p>No new openings right now — we add roles every month. Check back soon.</p></div>';
      }

      async function uploadEnrollDoc(input) {
        const file = input.files && input.files[0];
        const appId = input.dataset.enroll, docType = input.dataset.doc;
        const msg = $(`[data-enroll-msg="${appId}"]`, bodyEl);
        const say = (t, kind) => { if (msg) { msg.className = 'enroll-msg' + (kind ? ' ' + kind : ''); msg.textContent = t; } };
        if (!file) return;
        const accept = (input.dataset.accept || 'pdf,jpg,jpeg,png').split(',');
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!accept.includes(ext)) { say(`Please upload a ${accept.join(', ').toUpperCase()} file for this document.`, 'bad'); input.value = ''; return; }
        if (file.size > 5 * 1024 * 1024) { say(`“${file.name}” is too large — maximum is 5 MB.`, 'bad'); input.value = ''; return; }
        const label = input.closest('.edoc-btn');
        if (label) label.classList.add('busy');
        say('Uploading ' + file.name + '…');
        const fd = new FormData();
        fd.append('appId', appId); fd.append('docType', docType); fd.append('file', file);
        try {
          const r = await fetch('/api/account/enroll', { method: 'POST', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }, body: fd });
          if (r.status === 401) { acct.clear(); location.replace('/login/?next=/dashboard/'); return; }
          const d = await r.json().catch(() => ({}));
          if (!r.ok || !d.ok) { say(d.error || 'Upload failed — please try again.', 'bad'); if (label) label.classList.remove('busy'); input.value = ''; return; }
          say('Uploaded — refreshing…');
          load(); // re-render with the new enrollment state
        } catch (e) {
          say('No internet connection — please try again.', 'bad');
          if (label) label.classList.remove('busy');
          input.value = '';
        }
      }
    }

    /* ----- Renderers ----- */
    const STEP_LABELS = ['Basic details', 'Education & work', 'Verify mobile', 'Finish & submit'];
    const V_BADGE = {
      not_started: ['todo', 'Not verified yet'], requested: ['wait', 'OTP requested'],
      pending: ['wait', 'Waiting for approval'], verified: ['done', 'Verified'], failed: ['bad', 'Verification failed']
    };

    function fmtDate(s) {
      if (!s) return '';
      const dt = new Date(s);
      return isNaN(dt) ? '' : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function appCard(a, enrollDocs) {
      const submitted = a.status && a.status !== 'incomplete';
      const stage = Math.max(1, Math.min(STEP_LABELS.length, a.stage || 1));
      const completed = submitted ? STEP_LABELS.length : Math.max(0, stage - 1);
      const percent = Math.round((completed / STEP_LABELS.length) * 100);
      const [sKind, sText] = a.selected ? ['done', a.status === 'enrolled' ? 'Enrolled' : 'Selected'] : (submitted ? ['done', 'Submitted'] : ['wait', 'In progress']);
      const [vKind, vText] = V_BADGE[a.verification] || V_BADGE.not_started;
      const steps = STEP_LABELS.map((label, i) => {
        const state = i < completed ? 'done' : (!submitted && i === completed ? 'active' : 'todo');
        return `<li class="pstep ${state}"><span class="pstep-dot">${state === 'done' ? '✓' : (i + 1)}</span><span class="pstep-label">${esc(label)}</span></li>`;
      }).join('');
      const continueHref = a.jobSlug === 'general' ? '/careers/#general-application' : `/careers/${encodeURIComponent(a.jobSlug)}/#apply`;
      const action = a.selected
        ? ''
        : (submitted
          ? '<p class="app-note">Our recruiter will contact you on your mobile number. No payment is ever required.</p>'
          : `<a class="btn btn-accent btn-sm" href="${continueHref}">Continue application →</a>`);
      return `<article class="card app-card${a.selected ? ' is-selected' : ''}">
        <div class="app-top">
          <div><h3 class="h5">${esc(a.job)}</h3><p class="small muted">Updated ${esc(fmtDate(a.updatedAt) || fmtDate(a.createdAt))}</p></div>
          <span class="app-badge ${sKind}">${sText}</span>
        </div>
        <div class="app-prog"><div class="app-prog-bar"><span style="width:${percent}%"></span></div><span class="app-prog-pct">${percent}%</span></div>
        <ol class="psteps">${steps}</ol>
        <div class="app-meta">
          <span class="app-badge ${vKind}">Mobile: ${vText}</span>
          ${a.fields && a.fields.city ? `<span class="small muted">${esc(a.fields.city)}${a.fields.state ? ', ' + esc(a.fields.state) : ''}</span>` : ''}
        </div>
        ${a.interview ? interviewBanner(a) : ''}
        ${a.selected ? enrollBlock(a, enrollDocs) : ''}
        ${action ? `<div class="app-foot">${action}</div>` : ''}
      </article>`;
    }

    // Interview details scheduled by the recruiter.
    function interviewBanner(a) {
      const iv = a.interview || {};
      const when = iv.at ? new Date(iv.at) : null;
      const whenText = when && !isNaN(when)
        ? when.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
        : 'To be confirmed';
      const link = iv.link && /^https?:\/\//i.test(iv.link)
        ? `<a class="btn btn-primary btn-sm" href="${esc(iv.link)}" target="_blank" rel="noopener">Join interview →</a>` : '';
      return `<div class="iv-banner">
        <div class="iv-row"><span class="iv-ic">📅</span><div>
          <strong>Interview scheduled</strong>
          <p>${esc(whenText)}${iv.mode ? ' · ' + esc(iv.mode) : ''}</p>
          ${iv.notes ? `<p class="small muted">${esc(iv.notes)}</p>` : ''}
        </div></div>
        ${link}
      </div>`;
    }

    // Enrollment documents panel — shown once a candidate is selected.
    function enrollBlock(a, enrollDocs) {
      const e = a.enrollment || { docs: {}, status: 'not_started', uploaded: 0, requiredCount: 0 };
      const docs = e.docs || {};
      const rows = (enrollDocs || []).map((doc) => {
        const up = docs[doc.key];
        const accept = (doc.accept || ['pdf', 'jpg', 'jpeg', 'png']);
        const acceptAttr = accept.map((x) => '.' + x).join(',');
        return `<li class="edoc${up ? ' done' : ''}">
          <span class="edoc-info"><span class="edoc-dot">${up ? '✓' : ''}</span>
            <span class="edoc-text"><strong>${esc(doc.label)}</strong>${doc.required ? '' : ' <em>(optional)</em>'}
              ${doc.hint ? `<small class="edoc-hint">${esc(doc.hint)}</small>` : ''}
              ${up ? `<small>${esc(up.original)}</small>` : ''}</span></span>
          <label class="btn btn-ghost btn-xs edoc-btn">${up ? 'Replace' : 'Upload'}
            <input type="file" accept="${esc(acceptAttr)}" data-enroll="${esc(a.id)}" data-doc="${esc(doc.key)}" data-accept="${esc(accept.join(','))}" hidden></label>
        </li>`;
      }).join('');
      const done = e.status === 'submitted';
      const statusLine = done
        ? '✓ All required documents submitted — our team will verify them and confirm your joining.'
        : `${e.uploaded || 0} of ${e.requiredCount || 0} required documents uploaded.`;
      return `<div class="enroll-block${done ? ' is-done' : ''}">
        <div class="enroll-head">
          <h4>${a.status === 'enrolled' ? 'Enrollment confirmed' : '🎉 You’ve been selected — complete your enrollment'}</h4>
          <p>Upload the documents below to confirm your joining. PDF or image (JPG/PNG), max 2 MB each. We never ask for any payment.</p>
        </div>
        <ul class="edocs">${rows}</ul>
        <p class="enroll-status${done ? ' done' : ''}">${statusLine}</p>
        <p class="enroll-msg" data-enroll-msg="${esc(a.id)}" role="status" aria-live="polite"></p>
      </div>`;
    }

    function salaryText(j) {
      const k = (n) => '₹' + Math.round(n / 1000) + 'k';
      if (j.salaryMin && j.salaryMax) return `${k(j.salaryMin)}–${k(j.salaryMax)}/mo`;
      return j.salaryMin ? `${k(j.salaryMin)}/mo` : '';
    }

    function jobCard(j) {
      const sal = salaryText(j);
      return `<article class="card app-card job-op">
        <div class="app-top"><h3 class="h5">${esc(j.title)}</h3>${j.mode ? `<span class="app-badge todo">${esc(j.mode)}</span>` : ''}</div>
        <div class="app-meta">
          ${j.department ? `<span class="small muted">${esc(j.department)}</span>` : ''}
          ${j.type ? `<span class="small muted">${esc(j.type)}</span>` : ''}
          ${sal ? `<span class="small muted">${sal}</span>` : ''}
        </div>
        <div class="app-foot"><a class="btn btn-primary btn-sm" href="/careers/${encodeURIComponent(j.slug)}/#apply">View &amp; apply →</a></div>
      </article>`;
    }
  }

  function initCookies() {
    const banner = $('#cookie');
    const choice = store.get('sn-consent');
    if (choice === 'accept') loadTracking();
    if (!banner || choice) return;
    banner.hidden = false;
    $$('[data-consent]', banner).forEach((b) => b.addEventListener('click', () => {
      store.set('sn-consent', b.dataset.consent);
      banner.hidden = true;
      if (b.dataset.consent === 'accept') loadTracking();
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
    [initTheme, initScroll, initNav, initReveal, initSliders, initAccordions, initFilterGrids, initJobFilters, initPricing, initForms, initWizards, initBooking, initMap, initCopy, initToc, initSiteSearch, initAccount, initCookies]
      .forEach((fn) => { try { fn(); } catch (err) { console.error(fn.name, err); } });
  });
})();
