# DJ Crate V7 — Netlify backend

This is a deployable Netlify **Git repository**, not a drag-and-drop static ZIP. Netlify Functions require a build/deploy pipeline. Connect the repository through **Add new project → Import an existing project → GitHub**. Set the publish directory to `.` (or leave Netlify's `netlify.toml` defaults). Do not upload this ZIP through the ordinary static folder drag-and-drop flow expecting functions to work.

## Verify deployment
- `https://YOUR-SITE.netlify.app/api/health` should show JSON with `ok:true`.
- Open the homepage, paste an artist — track or public SoundCloud URL, click Discover.
- If `/api/health` returns 404, the backend wasn't deployed; connect the repo in Netlify and redeploy.
- The server searches Apple's public iTunes catalogue in GB/US, not all platforms.
- The server resolves public SoundCloud metadata using oEmbed; it does not analyse audio.
- Spotify/SoundCloud exports are CSVs for a playlist-transfer service. USB is a checklist, not audio.
- 90% vibe / 75% overplayed remain product preferences, **not validated matching scores**.
- Free-tier Netlify limits and external provider restrictions may apply.

## Files
- `index.html`: client
- `netlify.toml`: function settings and API redirects
- `netlify/functions/search.mjs`: server-side catalogue search
- `netlify/functions/resolve.mjs`: public SoundCloud metadata
- `netlify/functions/health.mjs`: backend deployment test

No API keys are required for this prototype. For a real multi-catalogue, licensed audio matching, and direct platform playlist writing, further permissions and backend integrations are necessary.
