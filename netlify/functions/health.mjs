export default async () => new Response(
  JSON.stringify({
    ok: true,
    service: "DJ Crate V7",
    catalogue: "iTunes public search"
  }),
  {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  }
);
