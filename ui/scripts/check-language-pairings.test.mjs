import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import test from 'node:test';

async function check(languages, styles) {
  const server=createServer((req,res)=>{
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify({value:req.url.includes('DesignLanguages')?languages:styles}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const child=spawn(process.execPath,[new URL('./audit-language-pairings.mjs',import.meta.url).pathname],{
      env:{...process.env,TEMPER_API_URL:`http://127.0.0.1:${server.address().port}`,TEMPER_API_KEY:'local-fixture'},
    });
    let output='';child.stdout.on('data',chunk=>{output+=chunk});child.stderr.on('data',chunk=>{output+=chunk});
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)});
    return {code,output};
  } finally {await new Promise(resolve=>server.close(resolve));}
}
const language=(name,slug,id='published')=>({entity_id:name,status:'Published',fields:{name,default_art_style_id:id,imagery_direction:JSON.stringify({pairs_with:slug})}});
const art=(id,status)=>({entity_id:id,status,fields:{slug:'ink'}});

test('an unnamed pair fails instead of reporting every language is paired',async()=>{
  const result=await check([language('Unpaired','')],[]);
  assert.equal(result.code,1);assert.match(result.output,/FAIL: 1 Published languages/);
});
test('counts languages rather than distinct styles in the failure total',async()=>{
  const result=await check([language('One','ink','draft'),language('Two','ink','draft')],[art('draft','Draft')]);
  assert.equal(result.code,1);assert.match(result.output,/FAIL: 2 Published languages/);
});
test('a Published match is not masked by an older unpublished duplicate slug',async()=>{
  const result=await check([language('One','ink')],[art('draft','Draft'),art('published','Published')]);
  assert.equal(result.code,0);assert.match(result.output,/pair Published:\s+1/);
});

test('a different Published ID cannot satisfy the named slug',async()=>{
  const result=await check([language('One','ink','other')],[art('published','Published'),{entity_id:'other',status:'Published',fields:{slug:'different'}}]);
  assert.equal(result.code,1);
});
test('a missing ID fails even when the slug names a Published style',async()=>{
  assert.equal((await check([language('One','ink','')],[art('published','Published')])).code,1);
});
test('slug matching is exact and explicit ID resolves duplicate Published slugs',async()=>{
  assert.equal((await check([language('One','Ink')],[art('published','Published')])).code,1);
  assert.equal((await check([language('One','ink')],[art('published','Published'),art('second','Published')])).code,0);
});

test('missing ID does not hide an existing Published slug',async()=>{
  const result=await check([language('One','ink','')],[art('published','Published')]);
  assert.equal(result.code,1);
  assert.match(result.output,/pair Published:\s+1/);
  assert.match(result.output,/pair names no entity:\s+0/);
  assert.match(result.output,/default ID inconsistent:\s+1/);
});
test('mismatched ID reports the named unpublished style and counts one language once',async()=>{
  const result=await check([language('One','ink','other')],[art('draft','Draft'),{entity_id:'other',status:'Published',fields:{slug:'different'}}]);
  assert.equal(result.code,1);
  assert.match(result.output,/pair NOT Published:\s+1 languages, 1 distinct art styles/);
  assert.match(result.output,/pair names no entity:\s+0/);
  assert.match(result.output,/default ID inconsistent:\s+1/);
  assert.match(result.output,/FAIL: 1 Published languages/);
});
test('a genuinely absent slug is missing even if the ID names another style',async()=>{
  const result=await check([language('One','absent')],[art('published','Published')]);
  assert.equal(result.code,1);
  assert.match(result.output,/pair names no entity:\s+1/);
  assert.match(result.output,/FAIL: 1 Published languages/);
});
test('missing ID does not hide unpublished backlog and duplicate candidates are explicit',async()=>{
  const result=await check([language('One','ink','')],[art('draft','Draft')]);
  assert.equal(result.code,1);
  assert.match(result.output,/pair NOT Published:\s+1 languages, 1 distinct art styles/);
  assert.match(result.output,/FAIL: 1 Published languages/);
  const ambiguous=await check([language('One','ink','')],[art('draft','Draft'),art('published','Published')]);
  assert.equal(ambiguous.code,1);
  assert.match(ambiguous.output,/pair ambiguous:\s+1/);
  assert.match(ambiguous.output,/draft \(Draft\).*published \(Published\)/);
  assert.match(ambiguous.output,/FAIL: 1 Published languages/);
});
test('case differences retain slug lookup evidence but fail exact ID consistency',async()=>{
  const result=await check([language('One','Ink')],[art('published','Published')]);
  assert.equal(result.code,1);
  assert.match(result.output,/pair names no entity:\s+0/);
  assert.match(result.output,/default ID inconsistent:\s+1/);
});
