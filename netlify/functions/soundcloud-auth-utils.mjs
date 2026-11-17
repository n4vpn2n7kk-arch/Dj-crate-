// DJ Crate confidential server-side OAuth helpers. No credentials reach the browser.
import {randomBytes,createHash,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
export const callbackURL='https://djcrate.netlify.app/.netlify/functions/soundcloud-callback';
const cookieName='djcrate_sc_session',pendingName='djcrate_sc_pending';
export const names={session:cookieName,pending:pendingName};
const now=()=>Date.now();
const key=()=>{
 const secret=process.env.DJCRATE_SESSION_SECRET;
 if(!secret||secret.length<32)throw new Error('Session encryption key missing');
 return createHash('sha256').update(secret).digest();
};
export const configured=()=>Boolean(process.env.SOUNDCLOUD_CLIENT_ID&&process.env.SOUNDCLOUD_CLIENT_SECRET&&process.env.DJCRATE_SESSION_SECRET?.length>=32);
export const random=()=>randomBytes(32).toString('base64url');
export const sha256base64=s=>createHash('sha256').update(s).digest('base64url');
export function seal(obj){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv),raw=Buffer.from(JSON.stringify(obj));
 const encrypted=Buffer.concat([cipher.update(raw),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
export function unseal(payload){
 try{const buf=Buffer.from(payload,'base64url');if(buf.length<29)return null;
  const decipher=createDecipheriv('aes-256-gcm',key(),buf.subarray(0,12));decipher.setAuthTag(buf.subarray(12,28));
  const obj=JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)),decipher.final()]).toString('utf8'));
  return obj.exp&&obj.exp>now()?obj:null;
 }catch{return null}
}
export function cookieMap(request){const result=new Map();const str=request.headers.get('cookie')||'';
 for(const part of str.split(';')){const sep=part.indexOf('=');if(sep>=0)result.set(part.slice(0,sep).trim(),part.slice(sep+1).trim())}return result}
export function cookie(name,value,age){return `${name}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`}
export function clearCookie(name){return cookie(name,'',0)}
export function authCookie(request){const v=cookieMap(request).get(cookieName);return v?unseal(v):null}
export function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}})}
export function redirect(url,cookies=[]){const h=new Headers({'location':url,'cache-control':'no-store'});cookies.forEach(v=>h.append('set-cookie',v));return new Response(null,{status:302,headers:h})}
export async function exchange(params){
 const form=new URLSearchParams({...params,client_id:process.env.SOUNDCLOUD_CLIENT_ID,client_secret:process.env.SOUNDCLOUD_CLIENT_SECRET});
 const res=await fetch('https://secure.soundcloud.com/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body:form,signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw new Error(`SoundCloud token exchange failed (${res.status})`);
 const data=await res.json();if(!data.access_token||!data.refresh_token)throw new Error('Token data incomplete');return data;
}
export function sessionData(token,user){return {access:token.access_token,refresh:token.refresh_token,expiresAt:now()+Math.max(60,Number(token.expires_in||3600))*1000,username:user?.username||'',userId:user?.id||null,exp:now()+7*86400000}}
export async function profile(token){const res=await fetch('https://api.soundcloud.com/me',{headers:{'Authorization':'OAuth '+token,'Accept':'application/json'},signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error('SoundCloud profile unavailable');const data=await res.json();return {id:data.id,username:data.username||'SoundCloud user'};}
export async function sessionFromRequest(request){
 const existing=authCookie(request);if(!existing)return null;
 if(existing.expiresAt > now()+90000)return {session:existing,changed:false};
 // Refresh token rotation is single-use; parallel requests should be prevented by UI.
 const fresh=await exchange({grant_type:'refresh_token',refresh_token:existing.refresh});
 const session={...existing,access:fresh.access_token,refresh:fresh.refresh_token,expiresAt:now()+Math.max(60,Number(fresh.expires_in||3600))*1000};
 return {session,changed:true};
}
