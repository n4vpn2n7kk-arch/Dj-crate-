const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const allowedCountries=new Set(['gb','us']);
async function searchOne(task){
  const url=new URL('https://itunes.apple.com/search');
  url.search=new URLSearchParams({term:task.term,entity:'song',media:'music',limit:'75',country:task.country}).toString();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{accept:'application/json','user-agent':'DJCrateDiscovery/1.0'}});
    if(!res.ok)throw Error('Catalogue HTTP '+res.status);
    const data=await res.json();
    if(!Array.isArray(data.results))throw Error('Invalid catalogue response');
    return {results:data.results.filter(t=>t.kind==='song').slice(0,75)};
  }finally{clearTimeout(timer)}
}
export default async (request)=>{
 if(request.method!=='POST')return json({error:'POST required'},405);
 let payload;try{payload=await request.json()}catch{return json({error:'Invalid JSON'},400)}
 if(!Array.isArray(payload.tasks)||payload.tasks.length<1||payload.tasks.length>12)return json({error:'Supply 1–12 searches'},400);
 const tasks=payload.tasks;
 if(tasks.some(t=>!t||typeof t.term!=='string'||t.term.length<2||t.term.length>110||!allowedCountries.has(t.country)))return json({error:'Invalid search term or country'},400);
 let next=0;const found=[],errors=[];
 async function worker(){while(next<tasks.length){const task=tasks[next++];try{found.push(await searchOne(task))}catch(e){errors.push(`${task.country.toUpperCase()}: ${e.message}`)}}}
 await Promise.all(Array.from({length:Math.min(3,tasks.length)},worker));
 if(!found.length)return json({error:'Music provider unavailable: '+(errors[0]||'unknown error')},502);
 return json({found,errors,provider:'Apple iTunes Search',partial:errors.length>0});
};
