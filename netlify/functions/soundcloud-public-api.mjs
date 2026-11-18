let pendingToken = null;
let tokenCache = null; // Netlify instances may restart; move to shared storage before scaling.
const stop = (ms=9000) => AbortSignal.timeout(ms);
export async function getToken(){
  if(tokenCache && tokenCache.exp > Date.now()+90000)return tokenCache.value;
  if (!pendingToken) pendingToken = requestToken().finally(() => { pendingToken = null; });
  return pendingToken;
}
async function requestToken(){
  const id=process.env.SOUNDCLOUD_CLIENT_ID,secret=process.env.SOUNDCLOUD_CLIENT_SECRET;
  if(!id||!secret)throw new Error('SoundCloud credentials have not been configured');
  const res=await fetch('https://secure.soundcloud.com/oauth/token',{
    method:'POST',signal:stop(),headers:{'Authorization':'Basic '+btoa(id+':'+secret),'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
    body:new URLSearchParams({grant_type:'client_credentials'}).toString()
  });
  if(!res.ok)throw new Error('SoundCloud token request failed ('+res.status+')');
  const data=await res.json();
  if(!data.access_token)throw new Error('No access token returned');
  tokenCache={value:data.access_token,exp:Date.now()+Math.min(Number(data.expires_in||3600),3600)*1000};
  return tokenCache.value;
}
