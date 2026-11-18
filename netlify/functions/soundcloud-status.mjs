const json = (data) => new Response(JSON.stringify(data), {headers: {'Content-Type':'application/json','Cache-Control':'no-store'}});
export default async () => json({
  configured: Boolean(process.env.SOUNDCLOUD_CLIENT_ID && process.env.SOUNDCLOUD_CLIENT_SECRET),
  mode: 'public-track-search',
  message: (process.env.SOUNDCLOUD_CLIENT_ID && process.env.SOUNDCLOUD_CLIENT_SECRET)
    ? 'SoundCloud public-track search credentials are configured.'
    : 'Awaiting replacement SoundCloud credentials. Existing DJ Crate discovery is unaffected.'
});
