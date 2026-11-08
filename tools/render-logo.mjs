/**
 * Рендерит логотип из index.html в PNG с прозрачным фоном.
 * Нужен для favicon, apple-touch-icon и OG-картинки.
 *
 *   node tools/render-logo.mjs
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9337;
const W = 600;
const H = 784;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
const svgStart = html.indexOf('<svg viewBox="0 0 49 64"');
const svgEnd = html.indexOf('</svg>', svgStart) + 6;
const svg = html.slice(svgStart, svgEnd);

await mkdir(path.join(ROOT, '.audit'), { recursive: true });
const pagePath = path.join(ROOT, '.audit', 'logo.html');
await writeFile(
  pagePath,
  `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent}
    svg{display:block;width:${W}px;height:${H}px}
  </style>${svg}`,
  'utf8',
);

const profile = path.join(process.env.TEMP || '.', `dsh-logo-${Date.now()}`);
const child = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore', windowsHide: true });

let browserWs;
for (let i = 0; i < 100; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    if (res.ok) { browserWs = (await res.json()).webSocketDebuggerUrl; break; }
  } catch { /* wait */ }
  await sleep(150);
}
if (!browserWs) throw new Error('no debugger');

const ws = new WebSocket(browserWs);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });

let seq = 0;
const pending = new Map();
const events = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  } else if (m.method) {
    const list = events.get(m.method);
    if (list?.length) list.shift()(m.params);
  }
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});
const once = (method) => new Promise((resolve) => {
  const list = events.get(method) ?? [];
  list.push(resolve);
  events.set(method, list);
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const cmd = (m, p) => send(m, p, sessionId);

await cmd('Page.enable');
await cmd('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: 1, mobile: false,
});
// Без этого omitBackground даёт белый фон вместо прозрачного
await cmd('Emulation.setDefaultBackgroundColorOverride', {
  color: { r: 0, g: 0, b: 0, a: 0 },
});

const loaded = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${pagePath.replace(/\\/g, '/')}` });
await loaded;
await sleep(300);

const shot = await cmd('Page.captureScreenshot', { format: 'png', omitBackground: true });
await writeFile(path.join(ROOT, '.audit', 'logo.png'), Buffer.from(shot.data, 'base64'));
console.log('saved .audit/logo.png');

ws.close();
child.kill();
