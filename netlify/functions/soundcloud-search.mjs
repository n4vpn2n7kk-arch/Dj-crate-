import {getToken} from './soundcloud-public-api.mjs';
// DJ Crate — public SoundCloud catalogue discovery (NOT audio analysis).
// Security: credentials never sent to browser. Requires replacement credentials.
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const stop = (ms=9000) => AbortSignal.timeout(ms);
export default async request=>{
  if(request.method!=='GET')return json({error:'GET required'},405);
  if(!process.env.SOUNDCLOUD_CLIENT_ID||!process.env.SOUNDCLOUD_CLIENT_SECRET)
    return json({configured:false,error:'Waiting for safely rotated API credentials'},503);
  const reqUrl=new URL(request.url);
  const query=(reqUrl.searchParams.get('q')||'').trim();
  const genre=(reqUrl.searchParams.get('genre')||'').trim();
  if(query.length<2||query.length>100||genre.length>40)return json({error:'Invalid query'},400);
  try{
    const access=await getToken();
    const url=new URL('https://api.soundcloud.com/tracks');
    url.searchParams.set('q',query);
    url.searchParams.set('limit','50');
    url.searchParams.set('access','playable');
    url.searchParams.set('linked_partitioning','true');
    url.searchParams.set('duration[to]','1199999');
    const pages=reqUrl.searchParams.get('pages')==='2'?2:1;
    const headers={'Authorization':'OAuth '+access,'Accept':'application/json'};
    const signal=stop();
    const items=new Map();
    let partial=false;
    for(let page=0;page<pages;page++){
      try{
        const res=await fetch(url,{signal,headers,redirect:'error'});
        if(!res.ok)throw Error('SoundCloud API HTTP '+res.status);
        const data=await res.json();
        const songs=Array.isArray(data)?data:data.collection;
        if(!Array.isArray(songs))throw Error('Unexpected SoundCloud search response');
        for(const t of songs){
          if(!t||!(t.urn||t.id)||!t.title||!t.permalink_url?.startsWith('https://soundcloud.com/'))continue;
          const id=t.urn||t.id;
          if(items.has(id)||Number(t.duration)>=1200000)continue;
          const tags=Array.isArray(t.tags)?t.tags:typeof t.tag_list==='string'
            ? (t.tag_list.match(/"[^"]+"|\S+/g)||[]).map(tag=>tag.replace(/^"|"$/g,''))
            : [];
          items.set(id,{
            id,title:t.title,artist:t.metadata_artist||t.user?.username||'Unknown',
            artistId:t.user?.urn||t.user?.id||null,genre:t.genre||'',url:t.permalink_url,
            artwork:t.artwork_url||t.user?.avatar_url||'',playback_count:t.playback_count??null,
            access:t.access||'',duration:t.duration??null,tags
          });
        }
        if(!data.next_href||page+1>=pages)break;
        const next=new URL(data.next_href,url);
        if(next.origin!==url.origin||next.pathname!==url.pathname||next.href===url.href)break;
        next.searchParams.set('duration[to]','1199999');
        url.search=next.search;
      }catch(error){
        if(page===0)throw error;
        partial=true;
        break;
      }
    }
    return json({provider:'SoundCloud',items:[...items.values()],partial});
  }catch(e){
    return json({error:String(e.message||'SoundCloud unavailable').slice(0,160)},502);
  }
};

