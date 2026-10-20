// POST /api/forms/:type — validates and stores every website form submission in MongoDB (collection "submissions"),
// saves resume/voice-note uploads to GridFS, then sends an email notification and syncs newsletter sign-ups.
import { randomUUID, createHash } from 'node:crypto';
import { getDb, saveFile, json, serverError, verifyToken } from '../lib/shared.mjs';

export const config = { path: '/api/forms/:type', method: 'POST' };

const RULES = {
  'seo-audit': ['name', 'email', 'website', 'phone'],
  'service-inquiry': ['name', 'email', 'phone', 'consent'],
  contact: ['name', 'email', 'phone', 'service', 'budget', 'message', 'consent'],
  'book-call': ['name', 'email', 'phone', 'date', 'time'],
  newsletter: ['email'],
  'job-application': ['name', 'email', 'phone', 'aadhaarLinked', 'dob', 'city', 'state', 'status', 'qualification', 'stream', 'passingYear', 'experience', 'languages', 'shift', 'availability', 'consent']
};
// Netlify Functions accept request bodies up to ~6 MB, so uploads are capped at 2 MB each.
const FILE_RULES = {
  resume: { exts: ['pdf', 'doc', 'docx'], maxMb: 2, magic: [[0x25, 0x50, 0x44, 0x46], [0xD0, 0xCF, 0x11, 0xE0], [0x50, 0x4B, 0x03, 0x04]] },
  voiceNote: { exts: ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'webm', 'opus'], maxMb: 2 }
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Best-effort rate limit (per warm function instance): 8 submissions per IP per 10 minutes.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 600000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 8;
}

async function checkFile(field, file) {
  const rule = FILE_RULES[field];
  if (!rule) return 'Unexpected file field';
  const ext = file.name.split('.').pop().toLowerCase();
  if (!rule.exts.includes(ext)) return `${field}: file type .${ext} not allowed`;
  if (file.size > rule.maxMb * 1024 * 1024) return `${field}: file exceeds ${rule.maxMb} MB`;
  if (rule.magic) {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (!rule.magic.some((sig) => sig.every((b, i) => head[i] === b))) return `${field}: file content doesn't match a PDF/DOC/DOCX`;
  }
  return '';
}

export default async (req, context) => {
  try { return await handle(req, context); } catch (e) { return serverError(e); }
};

async function handle(req, context) {
  const type = context.params.type;
  if (!RULES[type]) return json(404, { ok: false, error: 'Unknown form' });
  const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (rateLimited(ip)) return json(429, { ok: false, error: 'Too many submissions — please try again in a few minutes' });

  // Job applications require a logged-in account; its mobile number is the applicant's identity (set below).
  let session = null;
  if (type === 'job-application') {
    session = verifyToken((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
    if (!session) return json(401, { ok: false, error: 'Please log in to apply.' });
  }

  let form;
  try { form = await req.formData(); } catch { return json(400, { ok: false, error: 'Bad request (upload may be too large)' }); }

  const fields = {}, files = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === 'object' && v !== null && 'arrayBuffer' in v) { if (v.size > 0) files[k] = v; continue; }
    const val = String(v).slice(0, 5000);
    fields[k] = k in fields ? [].concat(fields[k], val) : val;
  }

  // Spam protection: honeypot must be empty and the form can't be submitted impossibly fast.
  const elapsed = Date.now() - Number(fields._ts || 0);
  if (fields.company_website || (fields._ts && elapsed < 2500)) return json(200, { ok: true });
  delete fields.company_website; delete fields._ts;

  const missing = RULES[type].filter((k) => !fields[k] || (typeof fields[k] === 'string' && !fields[k].trim()));
  if (missing.length) return json(422, { ok: false, error: `Missing: ${missing.join(', ')}` });
  if (fields.email && !EMAIL_RE.test(String(fields.email).trim())) return json(422, { ok: false, error: 'Invalid email' });
  if (fields.phone && String(fields.phone).replace(/\D/g, '').length < 10) return json(422, { ok: false, error: 'Invalid phone number' });
  const db = await getDb();
  if (fields.phone) fields.phone = String(fields.phone).replace(/\D/g, '').slice(-10);
  if (session) fields.phone = session.phone; // the logged-in account's number wins over anything posted
  if (fields.email) fields.email = String(fields.email).trim().toLowerCase();

  if (type === 'job-application') {
    if (!files.resume && fields.noResume !== 'yes') return json(422, { ok: false, error: 'Please upload your resume, or tick “I don’t have a resume”.' });
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(fields.dob))) return json(422, { ok: false, error: 'Date of birth must be DD/MM/YYYY' });
    // Only accept applications for openings that exist and are still open (or the general application).
    if (fields.jobSlug !== 'general') {
      const job = await db.collection('jobs').findOne({ slug: String(fields.jobSlug || '') }, { projection: { status: 1, title: 1 } });
      if (!job) return json(422, { ok: false, error: 'This job opening no longer exists.' });
      if (job.status !== 'open') return json(422, { ok: false, error: 'Sorry — this position has just been closed. Please see our other openings.' });
      fields.job = job.title;
    }
    // One application per mobile number per job every 30 days.
    const dupe = await db.collection('submissions').findOne({ type, status: { $ne: 'incomplete' }, 'fields.jobSlug': fields.jobSlug, 'fields.phone': fields.phone, createdAt: { $gt: new Date(Date.now() - 30 * 864e5) } }, { projection: { _id: 1 } });
    if (dupe) return json(409, { ok: false, error: 'You have already applied for this job with this mobile number. Our team will contact you soon.' });
  }
  // The application was saved step by step as "incomplete" — complete that same record instead of adding a new one.
  const draftId = /^[0-9a-f-]{36}$/.test(String(fields.draftId || '')) ? String(fields.draftId) : null;
  const draft = type === 'job-application' && draftId
    ? await db.collection('submissions').findOne({ id: draftId, type, status: 'incomplete', 'fields.jobSlug': fields.jobSlug }, { projection: { id: 1, createdAt: 1, verification: 1 } })
    : null;
  if (type === 'job-application') {
    if (draft) {
      // Mobile verification happens in step 3 and must be approved by an admin before the application can be sent.
      if (draft.verification?.status !== 'verified') return json(422, { ok: false, error: 'Your mobile number must be verified before you can submit. Please complete “Verify mobile”.' });
    } else {
      // Every step is saved with "Save & Next", so a missing draft means the steps weren't completed.
      return json(422, { ok: false, error: 'Please complete all steps with “Save & Next” before submitting.' });
    }
  }
  if (type === 'newsletter') {
    const exists = await db.collection('submissions').findOne({ type, 'fields.email': fields.email }, { projection: { _id: 1 } });
    if (exists) return json(200, { ok: true, already: true });
  }
  delete fields.otpToken; delete fields.draftId;
  for (const [field, file] of Object.entries(files)) {
    const err = await checkFile(field, file);
    if (err) return json(422, { ok: false, error: err });
  }

  const id = draft ? draft.id : randomUUID();
  const createdAt = new Date();
  const saved = {};
  for (const [field, file] of Object.entries(files)) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const stored = `${id.slice(0, 8)}-${field}-${safe}`;
    await saveFile(stored, await file.arrayBuffer(), { original: file.name, type: file.type, submission: id });
    saved[field] = { stored, original: file.name, size: file.size };
  }

  const record = { id, type, status: 'new', createdAt, ip, userAgent: req.headers.get('user-agent') || '', fields, files: saved, notes: [] };
  if (draft) {
    // Keep when they started; mark the time they finished.
    record.startedAt = draft.createdAt;
    record.stage = 4;
    await db.collection('submissions').updateOne({ id }, { $set: { ...record, submittedAt: createdAt, updatedAt: createdAt } });
  } else {
    await db.collection('submissions').insertOne(record);
  }

  // Side effects shouldn't block or fail the visitor's submission.
  context.waitUntil(Promise.allSettled([
    notify(record, files),
    type === 'newsletter' ? subscribeMailchimp(fields.email) : null
  ]).then((rs) => rs.forEach((r) => r.status === 'rejected' && console.error(r.reason))));

  return json(200, { ok: true, id });
}


// Email notification via SMTP (e.g. Gmail app password, Zoho, Brevo). Skipped if SMTP isn't configured.
async function notify(record, files) {
  const to = record.type === 'job-application' ? (process.env.CAREERS_EMAIL || process.env.NOTIFY_EMAIL) : process.env.NOTIFY_EMAIL;
  const summary = Object.entries(record.fields).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
  const subject = `[ScaleNest] New ${record.type} submission${record.fields.name ? ' from ' + record.fields.name : ''}`;
  if (!process.env.SMTP_HOST || !to) { console.log(`[notify] ${subject}\n${summary}`); return; }
  const { default: nodemailer } = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const attachments = await Promise.all(Object.entries(files).map(async ([, f]) => ({ filename: f.name, content: Buffer.from(await f.arrayBuffer()) })));
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, replyTo: record.fields.email,
    text: `${summary}\n\nOpen the admin dashboard to manage this submission: ${process.env.URL || ''}/admin/`,
    attachments
  });
}

// Mailchimp sync (optional): MAILCHIMP_API_KEY="xxxx-us21", MAILCHIMP_LIST_ID="abc123".
async function subscribeMailchimp(email) {
  const key = process.env.MAILCHIMP_API_KEY, list = process.env.MAILCHIMP_LIST_ID;
  if (!key || !list) return;
  const dc = key.split('-')[1];
  const hash = createHash('md5').update(String(email).toLowerCase()).digest('hex');
  const r = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${list}/members/${hash}`, {
    method: 'PUT',
    headers: { Authorization: 'Basic ' + Buffer.from('any:' + key).toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_address: email, status_if_new: 'pending' })
  });
  if (!r.ok) throw new Error(`Mailchimp HTTP ${r.status}`);
}
