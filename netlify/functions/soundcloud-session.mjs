import {configured,sessionFromRequest,json,cookie,names,seal,clearCookie,profile} from './soundcloud-auth-utils.mjs';
export default async request=>{
 if(request.method!=='GET')return json({error:'GET required'},405);
 if(!configured())return json({configured:false,connected:false,message:'Awaiting rotated SoundCloud credentials'});
 try{const result=await sessionFromRequest(request);
  if(!result)return json({configured:true,connected:false});
  const s=result.session;
  let changed=result.changed;
  if (!Object.hasOwn(s, 'avatarUrl')) {
   try {
    const user=await profile(s.access);
    s.avatarUrl=user.avatarUrl;
    changed=true;
   } catch {
    // A profile request failure should not sign out an existing account.
   }
  }
  const payload=changed?seal(s):null;
  const headers=payload && payload.length<=3500?{'set-cookie':cookie(names.session,payload,7*86400)}:{};
  return json({configured:true,connected:true,username:s.username,avatarUrl:s.avatarUrl??null},200,headers);
 }catch{return json({configured:true,connected:false,error:'Session expired. Please reconnect.'},200,{'set-cookie':clearCookie(names.session)})}
};
