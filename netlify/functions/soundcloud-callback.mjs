import {configured,cookieMap,names,unseal,exchange,profile,sessionData,seal,cookie,clearCookie,redirect,callbackURL} from './soundcloud-auth-utils.mjs';
import {timingSafeEqual} from 'node:crypto';
const safeEqual=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y)};
export default async request=>{
 if(request.method!=='GET')return new Response('GET required',{status:405});
 if(!configured())return redirect('/?soundcloud=not-configured');
 const u=new URL(request.url),state=u.searchParams.get('state'),code=u.searchParams.get('code');
 const pending=unseal(cookieMap(request).get(names.pending)||'');
 const clear=clearCookie(names.pending);
 if(u.searchParams.has('error'))return redirect('/?soundcloud=denied',[clear]);
 if(!state||!code||!pending||!safeEqual(state,pending.state))return redirect('/?soundcloud=invalid-state',[clear]);
 try{
  const data=await exchange({grant_type:'authorization_code',redirect_uri:callbackURL,code,code_verifier:pending.verifier});
  const user=await profile(data.access_token);
  const session=seal(sessionData(data,user));
  if(session.length>3500)throw Error('Session too large');
  return redirect('/?soundcloud=connected',[clear,cookie(names.session,session,7*86400)]);
 }catch{return redirect('/?soundcloud=connection-failed',[clear])}
};
