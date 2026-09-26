#!/usr/bin/env node
// Render code-style frames headless and print the checks.
//
//   node scripts/code-styles-render.mjs --style kirie --subject cat --t 0.1,0.5,1 --out /tmp/frames
//
// Serves ui/code-styles on a local port, opens render.html in headless Chrome and writes one PNG
// per requested t, plus the rule checks and a determinism result.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../code-styles', import.meta.url)));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const out = args.out || '/tmp/code-styles';
const chrome = args.chrome || process.env.CHROME || 'google-chrome';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/markdown' };
const server = createServer(async (req, res) => {
  try {
    const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/code-styles/, ''));
    if (!path.startsWith(root)) throw new Error('outside');
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const q = new URLSearchParams({
  style: args.style || 'kirie',
  subject: args.subject || 'cat',
  seed: args.seed || '1',
  t: args.t || '1',
  size: args.size || '1080',
  params: args.params || '{}',
  ...(args.text ? { text: args.text } : {}),
  ...(args.determinism ? { determinism: args.determinism } : {}),
});
const url = `http://127.0.0.1:${port}/code-styles/render.html?${q}`;

// Drive Chrome over the DevTools protocol and wait until the page writes its result.
const chromeProc = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--remote-debugging-port=0',
  '--user-data-dir=' + join(process.env.TMPDIR || '/tmp', `code-styles-chrome-${process.pid}`), 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res, rej) => {
  let err = '';
  chromeProc.stderr.on('data', (d) => {
    err += d;
    const hit = err.match(/DevTools listening on (ws:\/\/\S+)/);
    if (hit) res(hit[1]);
  });
  chromeProc.on('close', () => rej(new Error('chrome exited: ' + err)));
});
const version = await (await fetch(wsUrl.replace('ws://', 'http://').replace(/\/devtools\/browser\/.*/, '/json/list'))).json();
const target = version.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const id = nextId++;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
await send('Page.enable');
await send('Page.navigate', { url });
const deadline = Date.now() + Number(args.timeout || 180000);
let text = 'pending';
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 400));
  const r = await send('Runtime.evaluate', { expression: "document.getElementById('out')?.textContent || 'pending'", returnByValue: true });
  text = r.result?.result?.value ?? 'pending';
  if (text !== 'pending') break;
}
ws.close();
chromeProc.kill();
server.close();
if (text === 'pending') {
  console.error('the page did not finish');
  process.exit(1);
}
const result = JSON.parse(text);
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
await mkdir(out, { recursive: true });
const name = `${result.style}-${args.text ? 'text' : result.subject}-s${result.seed}`;
for (const f of result.frames) {
  const file = join(out, `${name}-t${String(f.t).replace('.', '_')}.png`);
  await writeFile(file, Buffer.from(f.png.split(',')[1], 'base64'));
  f.file = file;
  delete f.png;
}
console.log(JSON.stringify({ ...result, frames: result.frames }, null, 2));
if (result.checks.some((c) => !c.pass) || result.deterministic === false) process.exitCode = 2;
