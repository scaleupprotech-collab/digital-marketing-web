// GET /api/applications/status?id=<draftId>&phone=<10 digits>
// Lets the application form check (and live-update) the admin's mobile verification decision and resume a saved
// application on the same device. Both the id and the phone must match, and only non-sensitive status is returned.
import { getDb, json, serverError } from '../lib/shared.mjs';

export const config = { path: '/api/applications/status', method: 'GET' };

export default async (req) => {
  try {
    const url = new URL(req.url);
    const id = String(url.searchParams.get('id') || '');
    const phone = String(url.searchParams.get('phone') || '').replace(/\D/g, '').slice(-10);
    if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d{10}$/.test(phone)) return json(400, { ok: false, error: 'Bad request' });
    const db = await getDb();
    const rec = await db.collection('submissions').findOne({ id, type: 'job-application', 'fields.phone': phone }, { projection: { status: 1, stage: 1, verification: 1 } });
    if (!rec) return json(404, { ok: false, error: 'Not found' });
    return json(200, { ok: true, status: rec.status, stage: rec.stage || 1, verification: rec.verification?.status || 'not_started' });
  } catch (e) { return serverError(e); }
};
