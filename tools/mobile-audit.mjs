/**
 * Mobile audit harness: renders every page at several widths in headless Edge
 * via Chrome DevTools Protocol and reports layout defects.
 *
 *   node tools/mobile-audit.mjs [--shots]
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;
const OUT = path.join(ROOT, '.audit');

const WIDTHS = [320, 360, 390, 414, 768, 1024, 1440];
const PAGES = [
  'index.html', 'menu.html', 'cart.html', 'checkout.html', 'orders.html',
  'favorites.html', 'profile.html', 'admin.html', 'about.html', 'contacts.html',
  'delivery.html', 'organizations.html', 'privacy.html', 'cookies.html', '404.html', '403.html', '500.html',
];

const SHOTS = process.argv.includes('--shots');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const profile = path.join(process.env.TEMP || '.', `dsh-edge-${Date.now()}`);
  const child = spawn(EDGE, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });

  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return { child, browserWs: (await res.json()).webSocketDebuggerUrl, profile };
    } catch { /* not up yet */ }
    await sleep(150);
  }
  throw new Error('Edge did not expose the debugging port');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        const waiters = this.events.get(msg.method);
        if (waiters?.length) waiters.shift()(msg.params);
      }
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    return new Cdp(ws);
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  once(method) {
    return new Promise((resolve) => {
      const list = this.events.get(method) ?? [];
      list.push(resolve);
      this.events.set(method, list);
    });
  }
}

const AUDIT_FN = `(() => {
  const vw = document.documentElement.clientWidth;
  const label = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = [...el.classList].slice(0, 3).map((c) => '.' + c).join('');
    return el.tagName.toLowerCase() + id + cls;
  };
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      const x = o.overflowX;
      // auto/scroll — осознанная горизонтальная лента (карусель отзывов)
      if (x === 'hidden' || x === 'clip' || x === 'auto' || x === 'scroll') return true;
      if (o.overflow === 'hidden' || o.overflow === 'clip') return true;
    }
    return false;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };

  const overflow = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    if (el.closest('.ambient, .scene, .error-blob, .hero-atmosphere')) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      if (clipped(el)) continue;
      overflow.push({
        sel: label(el),
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
        text: (el.children.length ? '' : (el.textContent || '')).trim().slice(0, 40),
      });
    }
  }

  const tiny = [];
  for (const el of document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], summary')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) {
      tiny.push({ sel: label(el), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }

  const smallText = [];
  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (!visible(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) smallText.push({ sel: label(el), fs });
  }

  const overflowScroll = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw;

  const before = window.scrollX;
  window.scrollTo(99999, 0);
  const realScroll = window.scrollX;
  window.scrollTo(before, 0);

  return {
    vw,
    overflowScroll,
    realScroll,
    overflow: overflow.slice(0, 25),
    overflowCount: overflow.length,
    tiny: tiny.slice(0, 25),
    tinyCount: tiny.length,
    smallFontFields: smallText.slice(0, 10),
    docHeight: Math.round(document.documentElement.scrollHeight),
  };
})()`;

function fmt(n) { return String(n).padStart(4); }

async function main() {
  await mkdir(OUT, { recursive: true });
  const { child, browserWs, profile } = await launch();
  const cdp = await Cdp.connect(browserWs);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (m, p) => cdp.send(m, p, sessionId);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  const report = [];
  let failures = 0;

  for (const width of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: width < 768,
    });

    for (const page of PAGES) {
      const errors = [];
      const onError = (ev) => errors.push(ev.exceptionDetails?.exception?.description || ev.text || 'error');
      cdp.events.set('Runtime.exceptionThrown', [onError]);

      const loaded = cdp.once('Page.loadEventFired');
      await send('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/${page}` });
      await loaded;
      await sleep(350);

      let result;
      try {
        result = (await send('Runtime.evaluate', { expression: AUDIT_FN, returnByValue: true })).result.value;
      } catch (err) {
        result = { error: String(err) };
      }
      cdp.events.delete('Runtime.exceptionThrown');

      const entry = { page, width, ...result, errors: errors.slice(0, 3) };
      report.push(entry);

      const bad = result.realScroll > 0 || result.overflowCount > 0;
      if (bad) failures++;
      console.log(
        `w${width} ${page.padEnd(17)} ` +
        `scrollX:${fmt(result.realScroll ?? -1)}  offscreen:${fmt(result.overflowCount ?? -1)}  ` +
        `tiny:${fmt(result.tinyCount ?? -1)}  h:${fmt(result.docHeight ?? -1)}` +
        (bad ? '  <-- LAYOUT' : '') + (result.error ? '  ERR ' + result.error : '')
      );
      if (bad) {
        for (const o of result.overflow.slice(0, 4)) {
          console.log(`        ${o.sel}  L${o.left} R${o.right} w${o.w} ${o.text}`);
        }
      }
      if (process.argv.includes('--tiny')) {
        for (const t of result.tiny.slice(0, 6)) {
          console.log(`        tiny ${t.sel} ${t.w}x${t.h}`);
        }
      }

      if (SHOTS && [320, 390, 768, 1440].includes(width)) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(path.join(OUT, `${page.replace('.html', '')}-${width}.png`), Buffer.from(shot.data, 'base64'));
      }
    }
  }

  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\nLayout pages with issues: ${failures}/${report.length}`);

  cdp.ws.close();
  child.kill();
  await sleep(300);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}

main().catch((err) => { console.error(err); process.exit(1); });
