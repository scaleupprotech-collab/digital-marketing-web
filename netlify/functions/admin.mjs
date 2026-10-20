// /api/admin/* — password-protected API for the admin dashboard (submissions inbox + CMS), backed by MongoDB.
import { getDb, getCollection, saveItem, deleteItem, readFile, deleteFile, COLLECTIONS, isAdmin, verifyPassword, signToken, triggerRebuild, json, serverError } from '../lib/shared.mjs';

export const config = { path: ['/api/admin', '/api/admin/*'] };

const STATUSES = ['incomplete', 'new', 'contacted', 'shortlisted', 'interview', 'selected', 'enrolled', 'hired', 'rejected', 'closed'];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds a MongoDB filter from the inbox filters (?type=&job=&status=&q=).
function submissionFilter(params) {
  const f = {};
  if (params.get('type')) f.type = params.get('type');
  if (params.get('job')) f['fields.jobSlug'] = params.get('job');
  if (params.get('status')) f.status = params.get('status');
  if (params.get('verification')) f['verification.status'] = params.get('verification');
  const q = (params.get('q') || '').trim();
  if (q) {
    const re = new RegExp(escRe(q), 'i');
    f.$or = [{ 'fields.name': re }, { 'fields.email': re }, { 'fields.phone': re }, { 'fields.city': re }];
  }
  return f;
}

export default async (req) => {
  const resource = new URL(req.url).pathname.split('/').filter(Boolean)[2]; // /api/admin/<resource>
  // Email + password login is open (it IS the auth step); everything else needs a valid admin token.
  if (resource === 'login' && req.method === 'POST') {
    try { return await adminLogin(req); } catch (e) { return serverError(e, { admin: true }); }
  }
  if (!isAdmin(req)) return json(401, { ok: false, error: process.env.ADMIN_PASSWORD ? 'Wrong password' : 'ADMIN_PASSWORD is not set in Netlify environment variables' });
  try { return await handle(req); } catch (e) { return serverError(e, { admin: true }); }
};

// Verify email + password against the admin_users collection and return a 12-hour session token.
// The env ADMIN_PASSWORD also works (with any email) as a master/bootstrap credential.
async function adminLogin(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return json(422, { ok: false, error: 'Enter your email and password.' });
  const db = await getDb();
  const admin = await db.collection('admin_users').findOne({ email });
  const ok = admin ? verifyPassword(password, admin.auth)
    : (!!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD);
  if (!ok) return json(401, { ok: false, error: 'Wrong email or password.' });
  const token = signToken({ admin: true, email }, 12 * 60 * 60 * 1000);
  if (!token) return json(503, { ok: false, error: 'Login unavailable — set ADMIN_PASSWORD or SESSION_SECRET in the environment.' });
  return json(200, { ok: true, token, email });
}

async function handle(req) {
  const url = new URL(req.url);
  const [resource, id, sub] = url.pathname.split('/').filter(Boolean).slice(2).map(decodeURIComponent);
  const method = req.method;
  const db = await getDb();
  const subs = db.collection('submissions');

  if (resource === 'login') return json(200, { ok: true });

  if (resource === 'stats' && method === 'GET') {
    const [byTypeRows, byJobRows, openJobs] = await Promise.all([
      subs.aggregate([{ $group: { _id: '$type', total: { $sum: 1 }, new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } } } }]).toArray(),
      subs.aggregate([{ $match: { type: 'job-application' } }, { $group: { _id: '$fields.jobSlug',
        total: { $sum: { $cond: [{ $ne: ['$status', 'incomplete'] }, 1, 0] } },
        new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        incomplete: { $sum: { $cond: [{ $eq: ['$status', 'incomplete'] }, 1, 0] } } } }]).toArray(),
      db.collection('jobs').countDocuments({ status: 'open' })
    ]);
    const byType = Object.fromEntries(byTypeRows.map((r) => [r._id, { total: r.total, new: r.new }]));
    const byJob = Object.fromEntries(byJobRows.map((r) => [r._id, { total: r.total, new: r.new, incomplete: r.incomplete }]));
    return json(200, { total: byTypeRows.reduce((n, r) => n + r.total, 0), byType, byJob, jobs: openJobs, rebuildConfigured: !!process.env.BUILD_HOOK_URL, statuses: STATUSES });
  }

  if (resource === 'submissions') {
    if (method === 'GET' && !id) {
      const items = await subs.find(submissionFilter(url.searchParams), { sort: { createdAt: -1 }, limit: 500, projection: { _id: 0, auth: 0 } }).toArray();
      return json(200, items);
    }
    const rec = await subs.findOne({ id }, { projection: { _id: 0, auth: 0 } });
    if (!rec) return json(404, { ok: false, error: 'Not found' });
    if (method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const set = { updatedAt: new Date() };
      if (body.status) {
        if (!STATUSES.includes(body.status)) return json(422, { ok: false, error: 'Unknown status' });
        set.status = body.status;
      }
      if (body.note !== undefined) set.note = String(body.note).slice(0, 2000);
      const history = [];
      if (body.status && body.status !== rec.status) history.push({ status: body.status, at: new Date() });
      // Schedule / update an interview for a job application.
      if (body.interview !== undefined) {
        if (rec.type !== 'job-application') return json(422, { ok: false, error: 'Only job applications can have interviews' });
        const iv = body.interview || {};
        const at = iv.at ? new Date(iv.at) : null;
        if (iv.at && isNaN(at)) return json(422, { ok: false, error: 'Invalid interview date/time' });
        set.interview = { at, mode: String(iv.mode || '').slice(0, 40), link: String(iv.link || '').slice(0, 300), notes: String(iv.notes || '').slice(0, 500), setAt: new Date() };
        history.push({ interview: at ? 'scheduled' : 'cleared', at: new Date() });
        // Convenience: move an early-stage application to "interview" when one is first scheduled.
        if (at && !body.status && ['new', 'contacted', 'shortlisted'].includes(rec.status)) set.status = 'interview';
      }
      // Manual mobile verification decided by the admin. "failed" lets the applicant re-attempt from the form.
      if (body.verification) {
        if (!['verified', 'failed', 'pending'].includes(body.verification)) return json(422, { ok: false, error: 'Unknown verification status' });
        if (rec.type !== 'job-application') return json(422, { ok: false, error: 'Only job applications have mobile verification' });
        set['verification.status'] = body.verification;
        set['verification.decidedAt'] = new Date();
        if (!rec.verification?.phone) set['verification.phone'] = rec.fields.phone;
        history.push({ verification: body.verification, at: new Date() });
      }
      const update = { $set: set };
      if (history.length) update.$push = { history: { $each: history } };
      await subs.updateOne({ id }, update);
      return json(200, { ok: true });
    }
    if (method === 'DELETE') {
      await Promise.all(Object.values(rec.files || {}).map((f) => deleteFile(f.stored)));
      await subs.deleteOne({ id });
      return json(200, { ok: true });
    }
  }

  // Live alerts for the dashboard: OTP requested (send it now) and OTP submitted (verify it now) since a time.
  if (resource === 'alerts' && method === 'GET') {
    const since = new Date(url.searchParams.get('since') || Date.now() - 60000);
    if (isNaN(since)) return json(400, { ok: false, error: 'Bad since' });
    const now = new Date(); // taken before the query so nothing written meanwhile is missed next time
    const rows = await subs.find({ type: 'job-application', $or: [
      { 'verification.status': 'requested', 'verification.requestedAt': { $gt: since } },
      { 'verification.status': 'pending', 'verification.submittedAt': { $gt: since } }
    ] }, { sort: { updatedAt: -1 }, limit: 20, projection: { _id: 0, id: 1, fields: 1, verification: 1 } }).toArray();
    const alerts = rows.map((r) => {
      const v = r.verification;
      const requested = v.status === 'requested';
      return { id: r.id, kind: requested ? (v.regenerated ? 'regenerated' : 'requested') : 'submitted', at: requested ? v.requestedAt : v.submittedAt,
        name: r.fields.name, phone: r.fields.phone, job: r.fields.job, otp: requested ? null : v.otp };
    });
    return json(200, { ok: true, now, alerts });
  }

  if (resource === 'files' && id && method === 'GET') {
    const file = await readFile(id);
    if (!file) return json(404, { ok: false, error: 'File not found' });
    return new Response(file.data, { headers: { 'Content-Type': file.metadata.type || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${String(file.metadata.original || id).replace(/"/g, '')}"`, 'Cache-Control': 'no-store' } });
  }

  if (resource === 'export' && method === 'GET') {
    const rows = await subs.find(submissionFilter(url.searchParams), { sort: { createdAt: -1 }, projection: { _id: 0, auth: 0 } }).toArray();
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r.fields)))];
    const cell = (v) => `"${String(Array.isArray(v) ? v.join('; ') : v ?? '').replace(/"/g, '""')}"`;
    const csv = [['id', 'type', 'status', 'createdAt', ...keys, 'files', 'note'].join(','),
      ...rows.map((r) => [r.id, r.type, r.status, new Date(r.createdAt).toISOString(), ...keys.map((k) => r.fields[k]), Object.values(r.files || {}).map((f) => f.original).join('; '), r.note].map(cell).join(','))].join('\n');
    return new Response('﻿' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="submissions.csv"' } });
  }

  if (resource === 'collections' && COLLECTIONS.includes(id)) {
    if (method === 'GET') return json(200, await getCollection(id));
    if (method === 'PUT' && sub) {
      const item = await req.json().catch(() => null);
      if (!item || !item.slug || !/^[a-z0-9-]+$/.test(item.slug)) return json(422, { ok: false, error: 'Slug must use lowercase letters, numbers and hyphens' });
      const required = { jobs: ['title', 'department', 'type', 'mode', 'summary'], posts: ['title', 'category', 'excerpt', 'body'], 'case-studies': ['client', 'summary'] }[id];
      const missing = required.filter((k) => !String(item[k] ?? '').trim());
      if (missing.length) return json(422, { ok: false, error: `Please fill: ${missing.join(', ')}` });
      if (id === 'jobs') {
        if (Number(item.salaryMin) > Number(item.salaryMax)) return json(422, { ok: false, error: 'Salary min cannot be more than salary max' });
        if (!item.shifts || !item.shifts.length) item.shifts = ['Flexible'];
        if (!item.posted) item.posted = new Date().toISOString().slice(0, 10);
      }
      await saveItem(id, sub, item);
      return json(200, { ok: true, rebuilding: await triggerRebuild() });
    }
    if (method === 'DELETE' && sub) {
      if (!(await deleteItem(id, sub))) return json(404, { ok: false, error: 'Not found' });
      return json(200, { ok: true, rebuilding: await triggerRebuild() });
    }
  }

  if (resource === 'rebuild' && method === 'POST') return json(200, { ok: true, rebuilding: await triggerRebuild() });
  return json(404, { ok: false, error: 'Unknown admin endpoint' });
}
