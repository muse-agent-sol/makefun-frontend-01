// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is cached in memory by URL and revalidated with its ETag: the
// API binds ETags to the minute, so a repeat view inside the minute costs a
// 304 and no body, and a stale copy is refreshed the minute the tag turns.
// Concurrent calls for the same URL share one request.

const API = 'https://make.fun/api';

const cache = new Map(); // url -> { etag, data }
const inflight = new Map(); // url -> Promise<data>

/** GET one API path as JSON, from the cache when the ETag still matches. */
export function getJson(path) {
  const url = API + path;
  const pending = inflight.get(url);
  if (pending) return pending;
  const promise = (async () => {
    const hit = cache.get(url);
    const res = await fetch(url, { headers: hit?.etag ? { 'If-None-Match': hit.etag } : {} });
    if (res.status === 304 && hit) return hit.data;
    if (!res.ok) throw new Error(`make.fun API answered ${res.status} for ${path}`);
    const data = await res.json();
    cache.set(url, { etag: res.headers.get('etag'), data });
    return data;
  })();
  inflight.set(url, promise);
  const settle = () => inflight.delete(url);
  promise.then(settle, settle);
  return promise;
}

/** One page of the bounty list: { items, next_cursor }. */
export const listCompetitions = (cursor) =>
  getJson(`/competitions?status=open&activity=times&limit=60${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);

/** One bounty in full: summary, description, rules, rewards, dates. */
export const getCompetition = (slug) => getJson(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: columns plus ranked entries with handles. */
export const getLeaderboard = (slug) => getJson(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile: record, payouts and its entries. */
export const getProfile = (handle) => getJson(`/profiles/${encodeURIComponent(handle)}`);
