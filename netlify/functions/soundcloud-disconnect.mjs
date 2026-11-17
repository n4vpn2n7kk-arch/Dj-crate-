import {configured,sessionFromRequest,authCookie,json,names,clearCookie} from './soundcloud-auth-utils.mjs';
export default async request=>{
 if(request.method!=='POST')return json({error:'POST required'},405);
 // Prevent cross-origin form submissions from disconnecting a user without consent.
 const origin=request.headers.get('origin');
 if(origin!=='https://djcrate.netlify.app')return json({error:'Invalid origin'},403);
 if(!configured())return json({disconnected:true},200,{'set-cookie':clearCookie(names.session)});
 const s=authCookie(request);
 if(s?.access){try{await fetch('https://api.soundcloud.com/disconnect',{method:'POST',headers:{Authorization:'OAuth '+s.access},signal:AbortSignal.timeout(8000)})}catch{}}
 return json({disconnected:true},200,{'set-cookie':clearCookie(names.session)});
};
