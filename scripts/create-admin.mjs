// Create (or update) an admin login in MongoDB for the admin dashboard.
//
// Usage (from the project root):
//   node --env-file=.env scripts/create-admin.mjs "admin1234@scaleup.com" "YourPassword"
//
// The password is read from the command line (or ADMIN_SEED_PASSWORD) and is NEVER written to disk —
// only its salted scrypt hash is stored, matching how the app verifies passwords (netlify/lib/shared.mjs).
import { MongoClient } from 'mongodb';
import { scryptSync, randomBytes } from 'node:crypto';

const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_SEED_PASSWORD || '';

if (!email || !password) {
  console.error('Usage: node --env-file=.env scripts/create-admin.mjs "<email>" "<password>"');
  process.exit(1);
}
if (password.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Run with: node --env-file=.env scripts/create-admin.mjs …');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const auth = { salt, hash: scryptSync(password, salt, 64).toString('hex'), setAt: new Date() };

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'scalenest');
  await db.collection('admin_users').createIndex({ email: 1 }, { unique: true });
  const r = await db.collection('admin_users').updateOne(
    { email },
    { $set: { email, auth, role: 'admin', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  console.log(`✓ Admin ${r.upsertedCount ? 'created' : 'updated'}: ${email}`);
  console.log('  You can now sign in at /admin/ with this email and password.');
} catch (e) {
  console.error('Failed to create admin:', e.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
