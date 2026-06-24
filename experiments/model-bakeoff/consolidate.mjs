#!/usr/bin/env node
// Consolidate one bake-off round into results.json — VALIDATED accounting.
//
//   node consolidate.mjs <slug>
//
// Per-model authoritative source (cross-validated lapdog == harness for grok-proxy):
//   GPT      -> codex session JSONL (total_token_usage)
//   Opus     -> claude session JSONL (deduped by message.id/requestId)
//   grok-build/composer (native) -> grok unified.jsonl (sid->model via summary.json)
//   grok-proxy (glm/qwen×2/deepseek/minimax/kimi/fugu/fugu-ultra) -> lapdog /test/traces
//                 (exact model match, trace-deduped, scoped to the run's timing window)
// Metric: THINKING = fresh input (input - cached) + output.   TOTAL = input + output.
// Cost: cache-aware = fresh*in_rate + cached*cached_rate + output*out_rate.
//       OpenRouter models = REAL $ (live rates); subscription models = equivalent API $ ($0 marginal).
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const HOME=os.homedir();
const SLUG=process.argv[2]||'kodomo-no-hi-10';
const HERE=path.dirname(new URL(import.meta.url).pathname);
const LOGS=path.join(HERE,'runs',SLUG);
const GROK_SDIR=path.join(HOME,'.grok/sessions/%2FUsers%2Fseshendranalla%2FDevelopment%2Fkatagami');
const readJSON=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const sizeOf=p=>{try{return fs.statSync(p).size}catch{return 0}};
const SURFACES=['DESIGN.md','landing.html','immersive.html','dashboard.html'];

// rates $/1M: {in, cached, out}.  OpenRouter ones filled live.
const RATE={
  opus:{in:5,cached:0.5,out:25}, gpt:{in:1.25,cached:0.125,out:10},
  'grok-build':{in:1.0,cached:0.2,out:2.0}, composer:{in:3.0,cached:0.3,out:15.0},
  fugu:{in:2.5,cached:0.25,out:15}, 'fugu-ultra':{in:5,cached:0.5,out:30},
};
const MODELS=[
 {key:'opus',dir:'opus-4.8',name:'Opus 4.8',src:'claude',tag:'opus-4.8',bill:'sub'},
 {key:'gpt',dir:'gpt-5',name:'GPT-5.5',src:'codex',tag:'gpt-5',bill:'sub'},
 {key:'grok-build',dir:'grok-4.3',name:'grok-build',src:'grok',gmid:'grok-build',bill:'sub'},
 {key:'composer',dir:'composer',name:'Composer 2.5',src:'grok',gmid:'grok-composer-2.5-fast',bill:'sub'},
 {key:'glm',dir:'glm-5.2',name:'GLM 5.2',src:'lapdog',mn:'z-ai/glm-5.2',or:'z-ai/glm-5.2',bill:'openrouter'},
 {key:'qwen36-or',dir:'qwen3.6-35b',name:'Qwen 3.6',src:'lapdog',mn:'qwen/qwen3.6-35b-a3b',or:'qwen/qwen3.6-35b-a3b',bill:'openrouter'},
 {key:'qwen37',dir:'qwen3.7-max',name:'Qwen 3.7',src:'lapdog',mn:'qwen/qwen3.7-max',or:'qwen/qwen3.7-max',bill:'openrouter'},
 {key:'deepseek',dir:'deepseek-v4',name:'DeepSeek V4',src:'lapdog',mn:'deepseek/deepseek-v4-pro',or:'deepseek/deepseek-v4-pro',bill:'openrouter'},
 {key:'minimax',dir:'minimax-m3',name:'MiniMax M3',src:'lapdog',mn:'minimax/minimax-m3',or:'minimax/minimax-m3',bill:'openrouter'},
 {key:'kimi',dir:'kimi-k2.7',name:'Kimi K2.7',src:'lapdog',mn:'moonshotai/kimi-k2.7-code',or:'moonshotai/kimi-k2.7-code',bill:'openrouter'},
 {key:'fugu',dir:'fugu',name:'Fugu',src:'lapdog',mn:'fugu',bill:'sub'},
 {key:'fugu-ultra',dir:'fugu-ultra',name:'Fugu Ultra',src:'lapdog',mn:'fugu-ultra',bill:'sub'},
];

const lines=p=>{try{return fs.readFileSync(p,'utf8').split('\n')}catch{return[]}};
function statusOf(o){const pr=SURFACES.filter(f=>sizeOf(path.join(o,f))>200);
  if(!pr.length)return['failed',pr]; if(pr.length===4)return['complete',pr];
  if(pr.length===3&&!pr.includes('immersive.html'))return['complete',pr]; return['incomplete',pr];}

// ---- codex (gpt): newest total_token_usage in the session that wrote the folder tag ----
function codexUsage(tag){
  let best=null;
  for(const f of (fs.existsSync(path.join(HOME,'.codex/sessions'))?walk(path.join(HOME,'.codex/sessions')):[])){
    if(!f.endsWith('.jsonl'))continue; const txt=fs.readFileSync(f,'utf8'); if(!txt.includes(tag))continue;
    let last=null; for(const ln of txt.split('\n')){let r;try{r=JSON.parse(ln)}catch{continue}
      const u=r?.payload?.info?.total_token_usage; if(u)last=u;}
    if(last)best=last;
  }
  if(!best)return null;
  const cached=best.cached_input_tokens||0, input=best.input_tokens||0, out=best.output_tokens||0;
  return {fresh:input-cached,cached,output:out,total:best.total_tokens||input+out};
}
// ---- claude (opus): session with the folder tag, excluding THIS conversation; dedup usage ----
function claudeUsage(outdir){   // isolated run -> dedicated per-cwd project dir (exact, round-clean)
  const proj=path.join(HOME,'.claude/projects', path.dirname(outdir).replace(/\//g,'-'));
  if(!fs.existsSync(proj))return null;
  const seen=new Set(); let fresh=0,cached=0,out=0,found=false;
  for(const fn of fs.readdirSync(proj)){ if(!fn.endsWith('.jsonl'))continue; found=true;
    for(const ln of lines(path.join(proj,fn))){let d;try{d=JSON.parse(ln)}catch{continue}
      const m=d.message,u=m?.usage; if(!u)continue; const k=(m.id||'')+'|'+(d.requestId||''); if(seen.has(k))continue; seen.add(k);
      fresh+=u.input_tokens||0; cached+=u.cache_read_input_tokens||0; out+=u.output_tokens||0;}}
  return found?{fresh,cached,output:out,total:fresh+cached+out}:null;
}
// ---- grok native (grok-build/composer): unified.jsonl, sid->model, scoped to run window ----
let SID2MODEL=null;
function sidMap(){ if(SID2MODEL)return SID2MODEL; SID2MODEL={};
  if(fs.existsSync(GROK_SDIR))for(const d of fs.readdirSync(GROK_SDIR)){ const sm=path.join(GROK_SDIR,d,'summary.json');
    if(fs.existsSync(sm)){const s=readJSON(sm); if(s)SID2MODEL[d]=s.current_model_id;}}
  return SID2MODEL;}
function grokUsage(gmid,t0,t1){ const m=sidMap(); const lo=new Date(t0*1000).toISOString(), hi=new Date(t1*1000+60000).toISOString();
  let p=0,c=0,comp=0,found=false;
  for(const ln of lines(path.join(HOME,'.grok/logs/unified.jsonl'))){let r;try{r=JSON.parse(ln)}catch{continue}
    const ts=r.ts||''; if(ts<lo||ts>hi)continue; const ctx=r.ctx||{}; if(!('prompt_tokens'in ctx))continue;
    if(String(m[r.sid])!==gmid)continue; found=true;
    p+=ctx.prompt_tokens||0; c+=ctx.cached_prompt_tokens||0; comp+=ctx.completion_tokens||0;}
  return found?{fresh:p-c,cached:c,output:comp,total:p+comp}:null;
}
// ---- lapdog (grok-proxy): exact model match, trace-dedup, run window, cache-aware ----
let SPANS=null;
async function lapdogSpans(){ if(SPANS)return SPANS; let d=null;
  const snap=path.join(HERE,'runs','_lapdog-snapshot-r11r12.json');   // durable capture (unified.jsonl rotates)
  try{ d = fs.existsSync(snap) ? JSON.parse(fs.readFileSync(snap,'utf8')) : await (await fetch('http://127.0.0.1:8126/test/traces')).json(); }catch{ d=null; }
  const acc=[]; if(d)(function c(o){if(Array.isArray(o))o.forEach(c);else if(o&&typeof o==='object'){if(o.name&&o.start)acc.push(o);for(const v of Object.values(o))c(v);}})(d);
  SPANS=acc; return SPANS;}
const norm=s=>String(s).replace('openrouter/','').replace('openai/','');
function lapdogUsage(mn,t0,t1){ const bt={};
  for(const s of SPANS){ const meta=s.meta||{},mt=s.metrics||{};
    const vals=new Set(['_dd.llmobs.model_name','litellm.request.model','openai.request.model'].filter(k=>meta[k]).map(k=>norm(meta[k])));
    if(!vals.has(mn))continue; const sec=s.start/1e9; if(sec<t0-5||sec>t1+30)continue;
    const it=mt['_dd.llmobs.input_tokens'],ot=mt['_dd.llmobs.output_tokens'],cr=mt['_dd.llmobs.cache_read_input_tokens'];
    if(it==null&&ot==null)continue; bt[s.trace_id]=[it||0,ot||0,cr||0];}
  const v=Object.values(bt); if(!v.length)return null;
  const inp=v.reduce((a,x)=>a+x[0],0),out=v.reduce((a,x)=>a+x[1],0),cr=v.reduce((a,x)=>a+x[2],0);
  return {fresh:inp-cr,cached:cr,output:out,total:inp+out,calls:v.length};
}
// ---- grok (native + proxy): durable token accumulator, scoped to this run's iso-cwd sessions.
//      snapshot-grok-tokens.sh drains unified.jsonl here before it rotates; sid -> iso cwd is exact. ----
function grokUsageByCwd(outdir){
  const acc=path.join(HERE,'runs','_grok-tokens-all.jsonl');
  const sdir=path.join(HOME,'.grok/sessions', path.dirname(outdir).replace(/\//g,'%2F'));
  if(!fs.existsSync(acc)||!fs.existsSync(sdir))return null;
  const sids=new Set(fs.readdirSync(sdir).filter(x=>/^[0-9a-f]{8}-/.test(x)));
  if(!sids.size)return null;
  const seen=new Set(); let p=0,c=0,comp=0,found=false;
  for(const ln of lines(acc)){let r;try{r=JSON.parse(ln)}catch{continue}
    if(!sids.has(r.sid))continue; const ctx=r.ctx||{}; if(!('prompt_tokens'in ctx))continue;
    const k=r.ts+'|'+r.sid+'|'+(ctx.loop_index??''); if(seen.has(k))continue; seen.add(k); found=true;
    p+=ctx.prompt_tokens||0; c+=ctx.cached_prompt_tokens||0; comp+=ctx.completion_tokens||0;}
  return found?{fresh:p-c,cached:c,output:comp,total:p+comp}:null;}
async function orPricing(){ try{const cfg=fs.readFileSync(path.join(HOME,'.grok/config.toml'),'utf8');
  const key=(cfg.match(/api_key\s*=\s*"(sk-or-[^"]+)"/)||[])[1];
  const r=await fetch('https://openrouter.ai/api/v1/models',{headers:{Authorization:'Bearer '+key}});const d=await r.json();
  const mp={}; for(const m of d.data||[])mp[m.id]={in:parseFloat(m.pricing?.prompt||0)*1e6,cached:parseFloat(m.pricing?.input_cache_read||m.pricing?.prompt||0)*1e6,out:parseFloat(m.pricing?.completion||0)*1e6};
  return mp;}catch{return{};}}

(async()=>{
  await lapdogSpans(); const OR=await orPricing();
  const timings={}; if(fs.existsSync(LOGS))for(const f of fs.readdirSync(LOGS))if(f.endsWith('.timing.json')){const t=readJSON(path.join(LOGS,f));if(t)timings[t.name]=t;}
  const rows=[];
  for(const M of MODELS){ const t=timings[M.key]; if(!t||!t.outdir)continue;
    const [status,present]=fs.existsSync(t.outdir)?statusOf(t.outdir):['failed',[]];
    const run=readJSON(path.join(t.outdir,'run.json'));
    const t0=t.start_epoch,t1=t.end_epoch;
    let u=null,xcheck=null;
    const folderTag=path.basename(t.outdir);   // exact <dir>_<ts> — unambiguous across rounds
    if(M.src==='codex')u=codexUsage(folderTag);          // gpt: durable, per-cwd-tagged
    else if(M.src==='claude')u=claudeUsage(t.outdir);     // opus: durable, per-cwd project dir
    else { // grok native + proxy: durable per-cwd accumulator (sid-exact, round-clean); lapdog x-check
      u=grokUsageByCwd(t.outdir);
      if(M.src==='lapdog'){ const l=lapdogUsage(M.mn,t0,t1); if(l&&u){const a=u.fresh+u.output,b=l.fresh+l.output; xcheck=Math.abs(a-b)/Math.max(1,a);} else if(l&&!u)u=l; }
    }
    const rate=M.bill==='openrouter'?(OR[M.or]||null):RATE[M.key];
    let cost=null;
    if(u&&rate)cost=(u.fresh*rate.in+u.cached*rate.cached+u.output*rate.out)/1e6;
    rows.push({key:M.key,name:M.name,source:M.src,billing:M.bill,status,
      wall_seconds:t.wall_seconds??null, wall:t.wall_seconds!=null?`${Math.floor(t.wall_seconds/60)}m${String(t.wall_seconds%60).padStart(2,'0')}s`:null,
      image_model:run?.image_model??null,
      thinking:u?u.fresh+u.output:null, total:u?u.total:null, cached:u?u.cached:null,
      cost_usd:cost!=null?Number(cost.toFixed(4)):null,
      cost_kind:M.bill==='openrouter'?'real $':'equiv API $ ($0 marginal)',
      lapdog_vs_harness:xcheck!=null?(xcheck<0.02?'match':`${(xcheck*100).toFixed(0)}% diff`):null});
  }
  fs.writeFileSync(path.join(LOGS,'results.json'),JSON.stringify({round:SLUG,models:rows},null,2));
  const pad=(s,n)=>String(s??'—').padEnd(n);
  console.log(`\nround ${SLUG} — ${rows.length} models  (THINKING = fresh input + output)\n`);
  console.log(pad('model',13),pad('status',11),pad('src',7),pad('THINKING',10),pad('cost',12),pad('x-check',9),'image');
  let orTot=0;
  for(const r of rows){ if(r.billing==='openrouter'&&r.cost_usd)orTot+=r.cost_usd;
    console.log(pad(r.name,13),pad(r.status,11),pad(r.source,7),pad(r.thinking?.toLocaleString(),10),
      pad(r.cost_usd!=null?(`$${r.cost_usd} ${r.billing==='openrouter'?'(real)':'(eq)'}`):'—',12),pad(r.lapdog_vs_harness,9),r.image_model||'—');}
  console.log(`\nreal OpenRouter spend: $${orTot.toFixed(2)}   |   subs = $0 out-of-pocket (equiv API $ shown)`);
  console.log(`wrote ${path.join(LOGS,'results.json')}`);
})();
function walk(d){let out=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())out=out.concat(walk(p));else out.push(p);}return out;}
