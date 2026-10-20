// POST /api/applications/progress — saves a job application step by step ("Save & Next").
// The first save (Basic details) creates an "incomplete" application in the submissions collection, so it shows in
// the admin inbox straight away; every later save updates the same record, including when the applicant goes back
// and edits an earlier step. The final form submit (/api/forms/job-application with draftId) completes it.
//
// Mobile verification lives on the record as `verification`:
//   not_started → (applicant taps "Verify your number") → requested → (admin sends the OTP from the other platform;
//   applicant types it) → pending → (admin compares it, clicks Verified / Failed) → verified | failed. The OTP itself is sent from another platform, not by this site; we only store what the
//   applicant entered so the admin can check it. After "failed" the applicant can enter a new OTP (back to pending).
import { randomUUID } from 'node:crypto';
import { getDb, json, serverError, verifyToken } from '../lib/shared.mjs';

export const config = { path: '/api/applications/progress', method: 'POST' };

// Only these form fields are stored from progress saves (files and consent come with the final submit).
const ALLOWED = ['name', 'phone', 'email', 'dob', 'pincode', 'city', 'state', 'status', 'gender', 'aadhaarLinked',
  'qualification', 'stream', 'passingYear', 'experience', 'languages', 'institute', 'score', 'lastCompany', 'lastRole',
  'expectedSalary', 'skills', 'certifications', 'shift', 'availability', 'setup', 'noResume', 'portfolio', 'message'];
const MULTI = new Set(['languages', 'skills', 'setup']);
const STEP1_REQUIRED = ['name', 'phone', 'email', 'dob', 'city', 'state', 'status'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f-]{36}$/;

// Best-effort rate limit per warm instance: 40 saves per IP per 10 minutes.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 600000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 40;
}

export default async (req, context) => {
  try { return await handle(req, context); } catch (e) { return serverError(e); }
};

async function handle(req, context) {
  const ip = context.ip || 'unknown';
  if (rateLimited(ip)) return json(429, { ok: false, error: 'Too many requests — please wait a minute.' });

  // You must be logged in to apply. The account's mobile number is the applicant's identity and is used throughout —
  // the number typed into the form can't override it.
  const session = verifyToken((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  if (!session) return json(401, { ok: false, error: 'Please log in to apply.' });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.fields !== 'object') return json(400, { ok: false, error: 'Bad request' });
  if (body.company_website) return json(200, { ok: true }); // honeypot filled → bot

  // Keep only known fields; trim and cap lengths.
  const fields = {};
  for (const k of ALLOWED) {
    const v = body.fields[k];
    if (v === undefined || v === null || v === '') continue;
    fields[k] = MULTI.has(k) ? [].concat(v).map((x) => String(x).slice(0, 60)).slice(0, 20) : String(v).trim().slice(0, 2000);
  }
  // The logged-in account's mobile number is authoritative.
  fields.phone = session.phone;
  const missing = STEP1_REQUIRED.filter((k) => !fields[k]);
  if (missing.length) return json(422, { ok: false, error: `Please fill: ${missing.join(', ')}` });
  fields.email = fields.email.toLowerCase();
  if (!/^[6-9]\d{9}$/.test(fields.phone)) return json(422, { ok: false, error: 'Please enter a valid 10-digit mobile number.' });
  if (!EMAIL_RE.test(fields.email)) return json(422, { ok: false, error: 'Please enter a valid email address.' });
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fields.dob)) return json(422, { ok: false, error: 'Date of birth must be DD/MM/YYYY.' });

  const jobSlug = String(body.jobSlug || '');
  const step = Math.max(1, Math.min(4, Number(body.step) || 1));
  const db = await getDb();
  const subs = db.collection('submissions');

  let jobTitle = 'General Application';
  if (jobSlug !== 'general') {
    const job = await db.collection('jobs').findOne({ slug: jobSlug }, { projection: { status: 1, title: 1 } });
    if (!job) return json(422, { ok: false, error: 'This job opening no longer exists.' });
    if (job.status !== 'open') return json(422, { ok: false, error: 'Sorry — this position has just been closed. Please see our other openings.' });
    jobTitle = job.title;
  }

  // Tell them early if this number has already applied for this job (completed application in the last 30 days).
  const done = await subs.findOne({ type: 'job-application', status: { $ne: 'incomplete' }, 'fields.jobSlug': jobSlug, 'fields.phone': fields.phone, createdAt: { $gt: new Date(Date.now() - 30 * 864e5) } }, { projection: { _id: 1 } });
  if (done) return json(409, { ok: false, error: 'You have already applied for this job with this mobile number. Our team will contact you soon.' });

  // Find the draft to update: by the id the browser holds, else an unfinished one for the same job + phone.
  const draftId = UUID_RE.test(String(body.draftId || '')) ? String(body.draftId) : null;
  const base = { type: 'job-application', status: 'incomplete', 'fields.jobSlug': jobSlug };
  const existing = (draftId && await subs.findOne({ ...base, id: draftId }))
    || await subs.findOne({ ...base, 'fields.phone': fields.phone });

  const now = new Date();
  let verification = existing?.verification || { status: 'not_started', attempts: 0 };
  // A changed mobile number needs to be verified again.
  if (verification.phone && verification.phone !== fields.phone) verification = { status: 'not_started', attempts: verification.attempts || 0 };

  // "Verify your number" tapped → tell the admin to send an OTP to this number (from the other platform).
  if (body.requestOtp) {
    if (verification.status === 'verified') return json(422, { ok: false, error: 'Your mobile number is already verified.' });
    if ((verification.requests || 0) >= 10) return json(429, { ok: false, error: 'Too many OTP requests. Please contact us to verify your number.' });
    // `regenerated` tells the admin this is a new OTP after a failed one.
    verification = { status: 'requested', phone: fields.phone, attempts: verification.attempts || 0, requests: (verification.requests || 0) + 1, requestedAt: now, regenerated: verification.status === 'failed' || (verification.requests || 0) > 0 };
  }

  // OTP typed by the applicant → store it for the admin to compare, and mark the number as pending approval.
  if (body.otp !== undefined) {
    const otp = String(body.otp).replace(/\D/g, '');
    if (!/^\d{4,8}$/.test(otp)) return json(422, { ok: false, error: 'Please enter the OTP you received (4–8 digits).' });
    if (verification.status === 'verified') return json(422, { ok: false, error: 'Your mobile number is already verified.' });
    if ((verification.attempts || 0) >= 10) return json(429, { ok: false, error: 'Too many OTP attempts. Please contact us to verify your number.' });
    verification = { ...verification, status: 'pending', phone: fields.phone, otp, attempts: (verification.attempts || 0) + 1, submittedAt: now };
  }

  const data = { ...fields, jobSlug, job: jobTitle };
  let id;
  if (existing) {
    id = existing.id;
    const update = { $set: { fields: data, stage: Math.max(existing.stage || 1, step), verification, updatedAt: now } };
    if (['requested', 'pending'].includes(verification.status) && existing.verification?.status !== verification.status) update.$push = { history: { verification: verification.status === 'requested' ? 'OTP requested' : 'pending', at: now } };
    await subs.updateOne({ id }, update);
  } else {
    id = randomUUID();
    await subs.insertOne({ id, type: 'job-application', status: 'incomplete', stage: step, createdAt: now, updatedAt: now, ip, userAgent: req.headers.get('user-agent') || '', fields: data, files: {}, notes: [], verification, history: [] });
  }
  return json(200, { ok: true, id, verification: { status: verification.status } });
}
