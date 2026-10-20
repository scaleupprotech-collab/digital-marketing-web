// Shared backend helpers for Netlify Functions — MongoDB Atlas is the database.
//
// Collections (database: MONGODB_DB, default "scalenest"):
//   jobs, posts, case_studies   → CMS content, one document per item (unique slug)
//   submissions                 → every form submission (contact, audits, bookings, newsletter, job applications)
//   uploads.files / .chunks     → GridFS bucket holding resumes and voice notes
import { MongoClient, GridFSBucket } from 'mongodb';
import { timingSafeEqual, scryptSync, randomBytes, createHmac } from 'node:crypto';
import jobsSeed from '../../src/data/jobs.json' with { type: 'json' };
import postsSeed from '../../src/data/posts.json' with { type: 'json' };
import casesSeed from '../../src/data/case-studies.json' with { type: 'json' };

/* ---------- Connection (reused across warm invocations) ---------- */
let clientPromise = null;
let setupPromise = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Connect with a couple of retries — the first handshake from a cold serverless instance can fail transiently.
async function connect() {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 3, maxIdleTimeMS: 60000, serverSelectionTimeoutMS: 7000, appName: 'scalenest-site' });
    try {
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      return client;
    } catch (e) {
      lastErr = e;
      await client.close().catch(() => {});
      await sleep(400 * (attempt + 1));
    }
  }
  throw Object.assign(lastErr, { dbUnavailable: true });
}

export async function getDb() {
  if (!process.env.MONGODB_URI) throw Object.assign(new Error('MONGODB_URI is not set in the environment variables'), { dbUnavailable: true });
  if (!clientPromise) clientPromise = connect().catch((e) => { clientPromise = null; throw e; });
  const db = (await clientPromise).db(process.env.MONGODB_DB || 'scalenest');
  if (!setupPromise) setupPromise = setup(db).catch((e) => { setupPromise = null; throw e; });
  await setupPromise;
  return db;
}

// CMS collection name in the API/admin → MongoDB collection, seed data and default sort.
const CMS = {
  jobs: { coll: 'jobs', seed: jobsSeed, sort: { posted: -1, _id: -1 } },
  posts: { coll: 'posts', seed: postsSeed, sort: { date: -1, _id: -1 } },
  'case-studies': { coll: 'case_studies', seed: casesSeed, sort: { order: 1, _id: 1 } }
};
export const COLLECTIONS = Object.keys(CMS);

// Indexes + first-run seeding. Runs once per database (tracked in _meta), and is idempotent if two cold starts race.
const SCHEMA_VERSION = 3;
async function setup(db) {
  const meta = db.collection('_meta');
  if ((await meta.findOne({ _id: 'schema' }))?.version >= SCHEMA_VERSION) return;
  await Promise.all([
    ...Object.values(CMS).map(({ coll }) => db.collection(coll).createIndex({ slug: 1 }, { unique: true })),
    db.collection('submissions').createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { createdAt: -1 } },
      { key: { type: 1, createdAt: -1 } },
      { key: { 'fields.jobSlug': 1, createdAt: -1 } },
      { key: { status: 1 } }
    ]),
    db.collection('submissions').createIndex({ 'verification.status': 1 }),
    // Applicant accounts: one per mobile number.
    db.collection('users').createIndex({ phone: 1 }, { unique: true })
  ]);
  for (const { coll, seed } of Object.values(CMS)) {
    const c = db.collection(coll);
    if ((await c.estimatedDocumentCount()) > 0) continue;
    const now = new Date();
    await c.bulkWrite(seed.map((item, i) => ({
      updateOne: { filter: { slug: item.slug }, update: { $setOnInsert: { ...item, order: i, createdAt: now, updatedAt: now } }, upsert: true }
    })), { ordered: false });
  }
  await meta.updateOne({ _id: 'schema' }, { $set: { version: SCHEMA_VERSION, at: new Date() } }, { upsert: true });
}

/* ---------- CMS content ---------- */
const clean = ({ _id, ...doc }) => doc;

export async function getCollection(name) {
  const { coll, sort } = CMS[name];
  const db = await getDb();
  return (await db.collection(coll).find({}, { sort }).toArray()).map(clean);
}

// Create or update one item. `origSlug` is the slug it was saved under before (for renames).
export async function saveItem(name, origSlug, item) {
  const c = (await getDb()).collection(CMS[name].coll);
  const { _id, createdAt, ...data } = item;
  if (data.slug !== origSlug && (await c.countDocuments({ slug: data.slug }, { limit: 1 }))) {
    const err = new Error('Another item already uses that slug'); err.status = 409; throw err;
  }
  const now = new Date();
  const existing = await c.findOne({ slug: origSlug }, { projection: { order: 1 } });
  if (existing) {
    await c.updateOne({ _id: existing._id }, { $set: { ...data, updatedAt: now } });
  } else {
    const first = await c.find({}, { sort: { order: 1 }, limit: 1, projection: { order: 1 } }).next();
    await c.insertOne({ ...data, order: (first?.order ?? 0) - 1, createdAt: now, updatedAt: now });
  }
}

export async function deleteItem(name, slug) {
  const r = await (await getDb()).collection(CMS[name].coll).deleteOne({ slug });
  return r.deletedCount > 0;
}

/* ---------- Uploaded files (GridFS) ---------- */
const bucket = async () => new GridFSBucket(await getDb(), { bucketName: 'uploads' });

export async function saveFile(filename, buffer, metadata) {
  const b = await bucket();
  await new Promise((resolve, reject) => {
    const stream = b.openUploadStream(filename, { metadata });
    stream.on('finish', resolve).on('error', reject);
    stream.end(Buffer.from(buffer));
  });
}
export async function readFile(filename) {
  const b = await bucket();
  const file = await b.find({ filename }, { limit: 1 }).next();
  if (!file) return null;
  const chunks = [];
  for await (const chunk of b.openDownloadStream(file._id)) chunks.push(chunk);
  return { data: Buffer.concat(chunks), metadata: file.metadata || {} };
}
export async function deleteFile(filename) {
  const b = await bucket();
  for await (const f of b.find({ filename })) await b.delete(f._id);
}

/* ---------- HTTP + auth helpers ---------- */
export const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

// Admin auth: the dashboard sends "Authorization: Bearer <ADMIN_PASSWORD>" over HTTPS.
export function isAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // refuse all admin access until a password is configured
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(got), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---------- Applicant accounts (mobile + password login for the applicant dashboard) ---------- */
// Passwords are salted and hashed with scrypt; we store only { salt, hash } on the application record, never the
// plaintext. Sessions are stateless HMAC-signed tokens so no extra collection or server state is needed.
export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash, setAt: new Date() };
}
export function verifyPassword(password, auth) {
  if (!auth || !auth.salt || !auth.hash) return false;
  const got = scryptSync(String(password), auth.salt, 64);
  const expected = Buffer.from(auth.hash, 'hex');
  return got.length === expected.length && timingSafeEqual(got, expected);
}

// Token signing secret: SESSION_SECRET if set, otherwise the admin password (always present in a working deploy).
const sessionSecret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || null;
const b64url = (buf) => Buffer.from(buf).toString('base64url');

// Stateless session token: "<base64url(payload)>.<base64url(hmac)>". Returns null if no secret is configured.
export function signToken(payload, ttlMs = 7 * 864e5) {
  const secret = sessionSecret();
  if (!secret) return null;
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + ttlMs }));
  const sig = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}
export function verifyToken(token) {
  const secret = sessionSecret();
  if (!secret || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = b64url(createHmac('sha256', secret).update(body).digest());
  const a = Buffer.from(sig || ''), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

// Ask Netlify to rebuild the static site after CMS changes (Build hook URL from Site settings → Build & deploy).
export async function triggerRebuild() {
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) return false;
  const r = await fetch(hook, { method: 'POST' }).catch(() => null);
  return !!(r && r.ok);
}


// Logs the real error, returns a safe message to the browser. Admins get a hint when the database is unreachable.
export function serverError(e, { admin = false } = {}) {
  console.error(e);
  const dbDown = e.dbUnavailable || /^Mongo(Network|ServerSelection|Topology)/.test(e.name || '');
  if (dbDown) {
    return json(503, { ok: false, error: admin
      ? 'Cannot reach the MongoDB database. In MongoDB Atlas → Network Access, allow 0.0.0.0/0 (needed for Netlify), and check MONGODB_URI.'
      : 'Our server is busy right now — please try again in a minute.' });
  }
  return json(e.status || 500, { ok: false, error: e.status ? e.message : 'Server error — please try again in a moment.' });
}
