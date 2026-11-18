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
    const res=await fetch(url,{signal:stop(),headers:{'Authorization':'OAuth '+access,'Accept':'application/json'}});
    if(!res.ok)throw Error('SoundCloud API HTTP '+res.status);
    const data=await res.json();
    const songs=Array.isArray(data.collection)?data.collection:Array.isArray(data)?data:[];
    const items=songs.filter(t=>t&&(t.urn||t.id)&&t.title&&t.permalink_url).map(t=>({
      id:t.urn||t.id,title:t.title,artist:t.user?.username||t.metadata_artist||'Unknown',
      artistId:t.user?.urn||t.user?.id||null,genre:t.genre||'',url:t.permalink_url,
      artwork:t.artwork_url||t.user?.avatar_url||'',playback_count:t.playback_count??null,
      access:t.access||''
    }));
    const terms=genre.toLowerCase().trim();
    // SoundCloud uploader genre tags are inconsistent: a genre filter is advisory only.
    const genreAliases={
      'deep house':['deep house','soulful house'],
      'minimal house':['minimal house','microhouse','rominimal'],
      'uk garage':['uk garage','ukg','speed garage','2 step'],
      'tech house':['tech house'],
      'house':['house'],
      'techno':['techno','hardgroove'],
      'breakbeat':['breakbeat','breaks','broken beat'],
      'drum and bass':['drum and bass','dnb','jungle'],
      'disco':['disco','nu disco'],
      'hip hop':['hip hop','boom bap','rap'],
      'trance':['trance'],
      'electronic':['electronic','electronica']
    };
    const aliases=genreAliases[terms]||[terms];
    const filtered=terms?items.filter(t=>aliases.some(alias=>t.genre.toLowerCase().includes(alias))):items;
    const counts=new Map(),diverse=[];
    for(const t of filtered){const a=String(t.artistId||t.artist).toLowerCase();if((counts.get(a)||0)>=1)continue;counts.set(a,(counts.get(a)||0)+1);diverse.push(t);if(diverse.length===30)break}
    return json({provider:'SoundCloud',items:diverse,unfilteredCount:items.length,genreFilterApplied:!!terms,strictGenreTags:true,
      note:'Strict uploader genre-tag candidates only. Genre tags may be unreliable; no audio has been analysed.'});
  }catch(e){
    return json({error:String(e.message||'SoundCloud unavailable').slice(0,160)},502);
  }
};
