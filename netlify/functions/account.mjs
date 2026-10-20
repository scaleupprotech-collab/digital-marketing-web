// Applicant account API — real user accounts (collection "users"), one per mobile number. Applicants must create
// an account (or log in) before they can apply for a job; the dashboard then shows their applications and new openings.
//   POST /api/account/signup { name, phone, email, password } → { ok, token, user }
//   POST /api/account/login  { phone, password }              → { ok, token, user }
//   GET  /api/account/me      (Authorization: Bearer <token>)  → { ok, user, applications: [...] }
// Passwords are salted + hashed with scrypt; sessions are stateless HMAC tokens. See shared.mjs.
import { getDb, json, serverError, hashPassword, verifyPassword, signToken, verifyToken, saveFile, deleteFile } from '../lib/shared.mjs';

export const config = { path: '/api/account/:action', method: ['POST', 'GET'] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normPhone = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const publicUser = (u) => ({ name: u.name, phone: u.phone, email: u.email });

// Enrollment documents a selected candidate must submit. Order = how they appear in the dashboard.
// `accept` lists allowed file extensions for that document (the e-Aadhaar must be the PDF from uidai.gov.in).
const IMG_PDF = ['pdf', 'jpg', 'jpeg', 'png'];
const ENROLL_DOCS = [
  { key: 'photo', label: 'Passport-size photo', required: true, accept: ['jpg', 'jpeg', 'png'], hint: 'Clear, front-facing photo (JPG or PNG).' },
  { key: 'aadhaar', label: 'e-Aadhaar (PDF)', required: true, accept: ['pdf'], hint: 'The e-Aadhaar PDF downloaded from uidai.gov.in. Password-protected PDFs are fine.' },
  { key: 'pan', label: 'PAN card', required: true, accept: IMG_PDF, hint: 'PDF or a clear photo.' },
  { key: 'tenth', label: '10th marksheet / certificate', required: true, accept: IMG_PDF },
  { key: 'twelfth', label: '12th marksheet / certificate', required: true, accept: IMG_PDF },
  { key: 'graduation', label: 'Graduation / degree certificate', required: false, accept: IMG_PDF, hint: 'If you are a graduate.' },
  { key: 'bank', label: 'Bank passbook / cancelled cheque', required: true, accept: IMG_PDF },
  { key: 'experience', label: 'Experience / relieving letter', required: false, accept: IMG_PDF, hint: 'If you have prior work experience.' }
];
const ENROLL_DOC_MAP = Object.fromEntries(ENROLL_DOCS.map((d) => [d.key, d]));
const DOC_KEYS = new Set(ENROLL_DOCS.map((d) => d.key));
const REQUIRED_DOCS = ENROLL_DOCS.filter((d) => d.required).map((d) => d.key);
// Statuses at which a candidate may upload enrollment documents.
const ENROLL_STATUSES = new Set(['selected', 'enrolled', 'hired']);
// Magic-byte signatures per file type, and the per-file size cap (scanned certificates can be large).
const DOC_MAX_MB = 5;
const DOC_MAGIC = { pdf: [0x25, 0x50, 0x44, 0x46], png: [0x89, 0x50, 0x4E, 0x47], jpg: [0xFF, 0xD8, 0xFF], jpeg: [0xFF, 0xD8, 0xFF] };

// Best-effort rate limit (per warm instance): 12 auth attempts per IP per 10 minutes.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 600000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 12;
}

export default async (req, context) => {
  try {
    const action = context.params.action;
    if (action === 'signup') return await signup(req, context);
    if (action === 'login') return await login(req, context);
    if (action === 'me') return await me(req);
    if (action === 'enroll') return await enroll(req);
    return json(404, { ok: false, error: 'Not found' });
  } catch (e) { return serverError(e); }
};

async function signup(req, context) {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (rateLimited(ip)) return json(429, { ok: false, error: 'Too many attempts — please wait a minute and try again.' });

  const body = await req.json().catch(() => null) || {};
  const name = String(body.name || '').trim().slice(0, 80);
  const phone = normPhone(body.phone);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
  const password = String(body.password || '');
  if (name.length < 2) return json(422, { ok: false, error: 'Please enter your full name.' });
  if (!/^[6-9]\d{9}$/.test(phone)) return json(422, { ok: false, error: 'Please enter a valid 10-digit mobile number.' });
  if (!EMAIL_RE.test(email)) return json(422, { ok: false, error: 'Please enter a valid email address.' });
  if (password.length < 6) return json(422, { ok: false, error: 'Your password must be at least 6 characters.' });

  const db = await getDb();
  const user = { name, phone, email, auth: hashPassword(password), createdAt: new Date() };
  try {
    await db.collection('users').insertOne(user);
  } catch (e) {
    if (e.code === 11000) return json(409, { ok: false, error: 'An account with this mobile number already exists. Please log in.' });
    throw e;
  }
  const token = signToken({ phone });
  if (!token) return json(503, { ok: false, error: 'Sign up is not available right now. Please try again later.' });
  return json(200, { ok: true, token, user: publicUser(user) });
}

async function login(req, context) {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (rateLimited(ip)) return json(429, { ok: false, error: 'Too many attempts — please wait a minute and try again.' });

  const body = await req.json().catch(() => null) || {};
  const phone = normPhone(body.phone);
  const password = String(body.password || '');
  if (!/^[6-9]\d{9}$/.test(phone) || !password) return json(422, { ok: false, error: 'Enter your 10-digit mobile number and password.' });

  const db = await getDb();
  const user = await db.collection('users').findOne({ phone });
  // Same message whether the number is unknown or the password is wrong — don't reveal which.
  if (!user || !verifyPassword(password, user.auth)) return json(401, { ok: false, error: 'Mobile number or password is incorrect.' });

  const token = signToken({ phone });
  if (!token) return json(503, { ok: false, error: 'Login is not available right now. Please try again later.' });
  return json(200, { ok: true, token, user: publicUser(user) });
}

// Only non-sensitive fields are ever returned to the browser.
const SAFE_FIELDS = ['name', 'email', 'city', 'state', 'qualification', 'experience', 'shift', 'availability'];

// Candidate-safe view of the enrollment documents (the internal GridFS filename is never exposed).
function enrollSummary(rec) {
  const stored = (rec.enrollment && rec.enrollment.docs) || {};
  const docs = {};
  for (const [k, v] of Object.entries(stored)) if (DOC_KEYS.has(k)) docs[k] = { original: v.original, at: v.at };
  const uploaded = REQUIRED_DOCS.filter((k) => docs[k]).length;
  return { status: (rec.enrollment && rec.enrollment.status) || 'not_started', docs, uploaded, requiredCount: REQUIRED_DOCS.length };
}

function summarize(rec) {
  const f = rec.fields || {};
  const fields = {};
  for (const k of SAFE_FIELDS) if (f[k] !== undefined) fields[k] = f[k];
  return {
    id: rec.id,
    job: f.job || 'General Application',
    jobSlug: f.jobSlug || 'general',
    status: rec.status,                                 // incomplete | new (submitted) | ...
    stage: rec.stage || 1,                              // 1–4, how far through the wizard
    verification: (rec.verification && rec.verification.status) || 'not_started',
    interview: rec.interview && rec.interview.at
      ? { at: rec.interview.at, mode: rec.interview.mode || '', link: rec.interview.link || '', notes: rec.interview.notes || '' }
      : null,
    selected: ENROLL_STATUSES.has(rec.status),          // selected → enrollment documents unlock
    enrollment: enrollSummary(rec),
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    submittedAt: rec.submittedAt || null,
    fields
  };
}

async function me(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    || new URL(req.url).searchParams.get('token') || '';
  const data = verifyToken(token);
  if (!data) return json(401, { ok: false, error: 'Your session has expired — please log in again.' });

  const db = await getDb();
  const [user, recs] = await Promise.all([
    db.collection('users').findOne({ phone: data.phone }, { projection: { _id: 0, auth: 0 } }),
    db.collection('submissions')
      .find({ type: 'job-application', 'fields.phone': data.phone },
        { sort: { createdAt: -1 }, projection: { id: 1, status: 1, stage: 1, verification: 1, interview: 1, enrollment: 1, createdAt: 1, updatedAt: 1, submittedAt: 1, fields: 1 } })
      .toArray()
  ]);
  if (!user) return json(401, { ok: false, error: 'Your account could not be found — please log in again.' });
  return json(200, { ok: true, user: publicUser(user), enrollDocs: ENROLL_DOCS, applications: recs.map(summarize) });
}

// POST /api/account/enroll (multipart) — a selected candidate uploads one enrollment document.
// Fields: appId, docType; file field: "file". Stored in GridFS and recorded on the application.
async function enroll(req) {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  const data = verifyToken((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  if (!data) return json(401, { ok: false, error: 'Your session has expired — please log in again.' });

  let form;
  try { form = await req.formData(); } catch { return json(400, { ok: false, error: 'Bad request (file may be too large).' }); }
  const appId = String(form.get('appId') || '');
  const docType = String(form.get('docType') || '');
  const file = form.get('file');
  if (!/^[0-9a-f-]{36}$/.test(appId) || !DOC_KEYS.has(docType)) return json(422, { ok: false, error: 'Bad request.' });
  if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || file.size === 0) return json(422, { ok: false, error: 'Please choose a file to upload.' });

  // Validate the file against what this document accepts (type + size + magic bytes).
  const doc = ENROLL_DOC_MAP[docType];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!doc.accept.includes(ext)) return json(422, { ok: false, error: `${doc.label}: allowed file type${doc.accept.length > 1 ? 's' : ''} ${doc.accept.join(', ').toUpperCase()}.` });
  if (file.size > DOC_MAX_MB * 1024 * 1024) return json(422, { ok: false, error: `File exceeds ${DOC_MAX_MB} MB.` });
  const sig = DOC_MAGIC[ext];
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!sig.every((b, i) => head[i] === b)) return json(422, { ok: false, error: `This file doesn’t look like a valid ${ext.toUpperCase()} file.` });

  const db = await getDb();
  const subs = db.collection('submissions');
  const rec = await subs.findOne({ id: appId, type: 'job-application', 'fields.phone': data.phone });
  if (!rec) return json(404, { ok: false, error: 'Application not found.' });
  if (!ENROLL_STATUSES.has(rec.status)) return json(403, { ok: false, error: 'Enrollment opens once you have been selected. We’ll let you know.' });

  // Replace any previous upload for this document (remove the old GridFS file).
  const prev = rec.files && rec.files[`enroll-${docType}`];
  if (prev && prev.stored) await deleteFile(prev.stored).catch(() => {});

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const stored = `${appId.slice(0, 8)}-enroll-${docType}-${safe}`;
  await saveFile(stored, await file.arrayBuffer(), { original: file.name, type: file.type, submission: appId, enrollment: true });

  const now = new Date();
  const entry = { stored, original: file.name, size: file.size, at: now };
  const docsNow = { ...((rec.enrollment && rec.enrollment.docs) || {}), [docType]: entry };
  const allIn = REQUIRED_DOCS.every((k) => docsNow[k]);
  await subs.updateOne({ id: appId }, { $set: {
    [`enrollment.docs.${docType}`]: entry,
    'enrollment.status': allIn ? 'submitted' : 'in_progress',
    'enrollment.updatedAt': now,
    [`files.enroll-${docType}`]: { stored, original: file.name, size: file.size, enrollment: true },
    updatedAt: now
  } });

  const updated = await subs.findOne({ id: appId }, { projection: { enrollment: 1, status: 1 } });
  return json(200, { ok: true, enrollment: enrollSummary(updated) });
}
