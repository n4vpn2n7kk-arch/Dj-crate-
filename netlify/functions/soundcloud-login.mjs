import {configured,random,sha256base64,seal,redirect,cookie,names,callbackURL} from './soundcloud-auth-utils.mjs';
export default async request=>{
 if(request.method!=='GET')return new Response('GET required',{status:405});
 if(!configured())return redirect('/?soundcloud=not-configured');
 const state=random(),verifier=random();
 const authURL=new URL('https://secure.soundcloud.com/authorize');
 authURL.search=new URLSearchParams({client_id:process.env.SOUNDCLOUD_CLIENT_ID,redirect_uri:callbackURL,response_type:'code',code_challenge:sha256base64(verifier),code_challenge_method:'S256',state}).toString();
 const pending=seal({state,verifier,exp:Date.now()+10*60*1000});
 return redirect(authURL.toString(),[cookie(names.pending,pending,600)]);
};
