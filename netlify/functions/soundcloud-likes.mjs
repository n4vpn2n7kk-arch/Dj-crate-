import { configured, sessionFromRequest, json, cookie, names, seal } from './soundcloud-auth-utils.mjs';

function soundCloudImage(value) {
 if (typeof value !== 'string') return null;
 try {
  const url = new URL(value);
  return url.protocol === 'https:' && /^(?:[^.]+\.)*sndcdn\.com$/i.test(url.hostname)
   ? url.href
   : null;
 } catch {
  return null;
 }
}

export default async function soundcloudLikes(request) {
 const privateHeaders = { vary: 'Cookie' };
 if (request.method !== 'GET') return json({ error: 'GET required' }, 405, privateHeaders);
 if (!configured()) return json({ error: 'SoundCloud login is unavailable.' }, 503, privateHeaders);

 const cursor = new URL(request.url).searchParams.get('cursor');
 if (cursor && cursor.length > 2048) return json({ error: 'Invalid page cursor.' }, 400, privateHeaders);

 let result;
 try {
  result = await sessionFromRequest(request);
 } catch {
  return json({ error: 'Your SoundCloud session expired. Disconnect and reconnect.' }, 401, privateHeaders);
 }
 if (!result) return json({ error: 'Connect SoundCloud to view your likes.' }, 401, privateHeaders);

 const headers = { ...privateHeaders };
 if (result.changed) headers['set-cookie'] = cookie(names.session, seal(result.session), 7 * 86400);
 const endpoint = new URL('https://api.soundcloud.com/me/likes/tracks?linked_partitioning=true&limit=25');
 if (cursor) endpoint.searchParams.set('cursor', cursor);

 try {
  const response = await fetch(endpoint, {
   headers: { Authorization: 'OAuth ' + result.session.access, Accept: 'application/json' },
   redirect: 'error',
   signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) {
   const error = response.status === 401
    ? 'SoundCloud rejected the session. Disconnect and reconnect.'
    : 'SoundCloud could not load your likes (HTTP ' + response.status + ').';
   return json({ error }, response.status === 401 ? 401 : 502, headers);
  }
  const data = await response.json();
  const collection = Array.isArray(data) ? data : data.collection;
  if (!Array.isArray(collection)) throw Error('Invalid likes response');
  const items = collection.flatMap(entry => {
   const track = entry.track ?? entry;
   const url = track.permalink_url;
   if (typeof url !== 'string' || !url.startsWith('https://soundcloud.com/') || !track.title) return [];
   const artwork = soundCloudImage(track.artwork_url) || soundCloudImage(track.user?.avatar_url);
   return [{ title: track.title, artist: track.user?.username || '', url, artwork }];
  });
  const nextCursor = data.next_href
   ? new URL(data.next_href, endpoint).searchParams.get('cursor')
   : null;
  return json({ items, nextCursor }, 200, headers);
 } catch {
  return json({ error: 'Could not load SoundCloud likes. Try again.' }, 502, headers);
 }
}
