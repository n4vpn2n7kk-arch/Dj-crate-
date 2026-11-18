import {configured,sessionFromRequest,json,cookie,names,seal,clearCookie} from './soundcloud-auth-utils.mjs';
export default async request=>{
 if(request.method!=='GET')return json({error:'GET required'},405);
 if (!configured()) {
  return json({
    configured: false,
    connected: false,
    checks: {
      clientIdPresent: Boolean(process.env.SOUNDCLOUD_CLIENT_ID),
      clientSecretPresent: Boolean(process.env.SOUNDCLOUD_CLIENT_SECRET),
      sessionSecretLongEnough:
        (process.env.DJCRATE_SESSION_SECRET?.length ?? 0) >= 32,
    },
  });
}
 try{const result=await sessionFromRequest(request);
  if(!result)return json({configured:true,connected:false});
  const s=result.session;
  const headers=result.changed?{'set-cookie':cookie(names.session,seal(s),7*86400)}:{};
  return json({configured:true,connected:true,username:s.username},200,headers);
 }catch{return json({configured:true,connected:false,error:'Session expired. Please reconnect.'},200,{'set-cookie':clearCookie(names.session)})}
};
