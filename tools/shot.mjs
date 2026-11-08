/**
 * Screenshot a single element (or the first screen) at a given width.
 *
 *   node tools/shot.mjs <page> <width> <selector|top> <out.png>
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9336;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [page = 'index.html', widthArg = '390', selector = 'top', out = '.audit/shot.png', ...flags] = process.argv.slice(2);
const noJs = flags.includes('nojs');
const width = Number(widthArg);

const profile = path.join(process.env.TEMP || '.', `dsh-shot-${Date.now()}`);
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
await cmd('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
if (noJs) await cmd('Emulation.setScriptExecutionDisabled', { value: true });

const loaded = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/${page}` });
await loaded;
await sleep(600);

if (selector !== 'top' && !noJs) {
  // Дожидаемся картинок и шрифтов: иначе контент выше «догружается»
  // уже после прокрутки и элемент уезжает вниз.
  const scrollTo = `(async () => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return 'missing';
    document.documentElement.style.scrollBehavior = 'auto';
    // Прокрутка в конец запускает ленивую загрузку картинок,
    // иначе они догружаются уже после замера и элемент уезжает.
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 700));
    await Promise.all([...document.images].map((img) => {
      img.loading = 'eager';
      if (img.complete) return Promise.resolve();
      return new Promise((res) => {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      });
    }));
    if (document.fonts) await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const top = el.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top, behavior: 'instant' });
    return 'ok';
  })()`;

  await cmd('Runtime.evaluate', { expression: scrollTo, returnByValue: true, awaitPromise: true });
  await sleep(400);
  await cmd('Runtime.evaluate', { expression: scrollTo, returnByValue: true, awaitPromise: true });
  await sleep(200);

  const debug = await cmd('Runtime.evaluate', {
    expression: `JSON.stringify({
      scrollY: Math.round(window.scrollY),
      innerHeight: window.innerHeight,
      visual: window.visualViewport ? Math.round(window.visualViewport.height) : null,
      docScroll: document.documentElement.scrollHeight,
      bodyScroll: document.body.scrollHeight,
      scrollingEl: document.scrollingElement === document.documentElement ? 'html' : 'body',
      top: Math.round(document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top),
    })`,
    returnByValue: true,
  });
  console.log('scroll state:', debug.result.value);
}

const shot = selector === 'top' || noJs
  ? await cmd('Page.captureScreenshot', { format: 'png' })
  : await (async () => {
      const box = await cmd('Runtime.evaluate', {
        expression: `(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          const r = el.getBoundingClientRect();
          return JSON.stringify({
            x: r.left + window.scrollX, y: r.top + window.scrollY,
            width: r.width, height: r.height,
          });
        })()`,
        returnByValue: true,
      });
      const b = JSON.parse(box.result.value);
      console.log('capture box:', JSON.stringify(b));
      return cmd('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 1 },
      });
    })();
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, Buffer.from(shot.data, 'base64'));
console.log('saved', out);

ws.close();
child.kill();
await sleep(200);
