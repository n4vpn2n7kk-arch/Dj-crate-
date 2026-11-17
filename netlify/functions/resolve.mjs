const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async request=>{
 if(request.method!=='POST')return json({error:'POST required'},405);
 let body;try{body=await request.json()}catch{return json({error:'Invalid JSON'},400)}
 if(typeof body.url!=='string'||body.url.length>1500)return json({error:'Invalid URL'},400);
 let u;try{u=new URL(body.url)}catch{return json({error:'Invalid URL'},400)}
 if(u.protocol!=='https:'||!['soundcloud.com','www.soundcloud.com','m.soundcloud.com','on.soundcloud.com'].includes(u.hostname))return json({error:'Only HTTPS SoundCloud URLs supported'},400);
 // Fixed remote host prevents arbitrary user-supplied server fetches.
 const endpoint='https://soundcloud.com/oembed?format=json&url='+encodeURIComponent(u.href);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(endpoint,{signal:controller.signal,headers:{accept:'application/json'}});
  if(!response.ok)throw Error('SoundCloud metadata unavailable');
  const data=await response.json();
  const title=String(data.title||'').replace(/\s+by\s+.+$/i,'').trim();
  if(!title)throw Error('No track title found');
  return json({name:title,artist:String(data.author_name||''),source:'soundcloud'});
 }catch{return json({error:'Could not read this SoundCloud link. Try entering Artist — Track manually; private or short links may be inaccessible.'},422)}
 finally{clearTimeout(timer)}
};
