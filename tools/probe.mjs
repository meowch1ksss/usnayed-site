/**
 * Probe computed layout for selectors at a given viewport width.
 *
 *   node tools/probe.mjs <page> <width> "<css selector>" ["<selector>" ...]
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [page = 'index.html', widthArg = '390', ...selectors] = process.argv.slice(2);
const width = Number(widthArg);

const profile = path.join(process.env.TEMP || '.', `dsh-probe-${Date.now()}`);
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
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });

const loaded = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/${page}` });
await loaded;
await sleep(400);

const expression = `JSON.stringify((() => {
  const out = [];
  const sel = ${JSON.stringify(selectors)};
  for (const s of sel) {
    const els = [...document.querySelectorAll(s)];
    if (!els.length) { out.push({ sel: s, missing: true }); continue; }
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      out.push({
        sel: s,
        rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        display: c.display, grid: c.gridTemplateColumns, gap: c.gap,
        width: c.width, minWidth: c.minWidth, maxWidth: c.maxWidth,
        padding: c.padding, margin: c.margin, overflow: c.overflow,
        position: c.position, flex: c.flex, fontSize: c.fontSize, transform: c.transform, textAlign: c.textAlign, textTransform: c.textTransform,
        border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
        outline: c.outlineWidth + ' ' + c.outlineStyle + ' ' + c.outlineColor,
        boxShadow: c.boxShadow, filter: c.filter, background: c.backgroundColor, borderRadius: c.borderRadius,
      });
    }
  }
  return { vw: document.documentElement.clientWidth, bodyW: document.body.getBoundingClientRect().width, out };
})())`;

const { result } = await cmd('Runtime.evaluate', { expression, returnByValue: true });
const data = JSON.parse(result.value);
console.log(`vw=${data.vw} bodyW=${data.bodyW}`);
for (const row of data.out) {
  if (row.missing) { console.log(`\n${row.sel}  -- NOT FOUND`); continue; }
  const { sel, rect, ...rest } = row;
  const props = Object.entries(rest).filter(([, v]) => v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)')
    .map(([k, v]) => `${k}:${v}`).join('  ');
  console.log(`\n${sel}  [L${rect[0]} T${rect[1]} W${rect[2]} H${rect[3]}]\n  ${props}`);
}

ws.close();
child.kill();
await sleep(200);
