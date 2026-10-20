// GET /api/content/:name — public, read-only CMS data (jobs, posts, case-studies).
// build.js fetches this during each Netlify build so admin edits end up in the static pages.
import { getCollection, COLLECTIONS, json, serverError } from '../lib/shared.mjs';

export const config = { path: '/api/content/:name', method: 'GET' };

export default async (req, context) => {
  const { name } = context.params;
  if (!COLLECTIONS.includes(name)) return json(404, { ok: false, error: 'Unknown collection' });
  try {
    // Drafts stay private; closed jobs are included so their pages can render "Position closed".
    const items = (await getCollection(name)).filter((x) => x.status !== 'draft').map(({ order, createdAt, updatedAt, ...item }) => item);
    return json(200, items);
  } catch (e) { return serverError(e); }
};
