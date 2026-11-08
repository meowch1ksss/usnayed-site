/**
 * Проверка липкой шапки: прокручиваем страницу и смотрим,
 * остаётся ли .site-header вверху.
 *
 *   node tools/check-header.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9339;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = path.join(process.env.TEMP || '.', `dsh-header-${Date.now()}`);
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
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});

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

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cmd('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
};

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

for (const width of [390, 768, 1440]) {
  await cmd('Emulation.setDeviceMetricsOverride', {
    width, height: 800, deviceScaleFactor: 1, mobile: false,
  });
  const loaded = once('Page.loadEventFired');
  await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/index.html` });
  await loaded;
  await sleep(400);

  const state = await evaluate(`(async () => {
    const header = document.querySelector('.site-header');
    const before = header.getBoundingClientRect().top;
    const style = getComputedStyle(header);
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);

    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({ top: 1800, behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = header.getBoundingClientRect().top;
    const scrolled = window.scrollY;

    return {
      position: style.position,
      top: style.top,
      zIndex: style.zIndex,
      scrollY: Math.round(scrolled),
      before: Math.round(before),
      after: Math.round(after),
      headerHeight: Math.round(header.getBoundingClientRect().height),
      htmlOverflowX: html.overflowX,
      htmlOverflowY: html.overflowY,
      bodyOverflowX: body.overflowX,
      bodyOverflowY: body.overflowY,
      scrollingElement: document.scrollingElement === document.documentElement ? 'html' : 'body',
      scrollPaddingTop: html.scrollPaddingTop,
    };
  })()`);

  console.log(`\n${width}px:`, JSON.stringify(state));
  check(`${width}px: шапка остаётся вверху`, state.after >= -1 && state.after <= 2, `top=${state.after}`);

  // Якорная ссылка не должна прятать заголовок под шапкой
  const anchor = await evaluate(`(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    location.hash = '#reviews';
    await new Promise((r) => setTimeout(r, 250));
    const header = document.querySelector('.site-header');
    const heading = document.querySelector('#reviews .reviews-heading');
    const h = header.getBoundingClientRect();
    const t = heading.getBoundingClientRect();
    return {
      headerBottom: Math.round(h.bottom),
      headingTop: Math.round(t.top),
      hidden: t.top < h.bottom - 1,
    };
  })()`);
  check(`${width}px: якорь не уходит под шапку`, !anchor.hidden, `шапка до ${anchor.headerBottom}, заголовок на ${anchor.headingTop}`);
}

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\nПРОВАЛЕНО: ${failed}` : '\nвсе проверки пройдены');

ws.close();
child.kill();
await sleep(200);
process.exit(failed ? 1 : 0);
