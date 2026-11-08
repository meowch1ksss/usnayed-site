/**
 * Проверка блока отзывов: 8 карточек на десктопе + кнопка,
 * карусель на телефоне. Ответ API подменяется 12 отзывами.
 *
 *   node tools/check-reviews.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9338;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extraReviews = Array.from({ length: 12 }, (_, i) => ({
  name: `Гость ${i + 1}`,
  text: `Проверочный отзыв номер ${i + 1}. Текст достаточной длины, чтобы карточка выглядела как настоящая.`,
}));
const payload = Buffer.from(JSON.stringify(extraReviews), 'utf8').toString('base64');

const profile = path.join(process.env.TEMP || '.', `dsh-reviews-${Date.now()}`);
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

// Подменяем ответ API отзывов
await cmd('Fetch.enable', { patterns: [{ urlPattern: '*api/reviews*', requestStage: 'Request' }] });
const paused = [];
events.set('Fetch.requestPaused', []);
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method !== 'Fetch.requestPaused') return;
  cmd('Fetch.fulfillRequest', {
    requestId: m.params.requestId,
    responseCode: 200,
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json; charset=utf-8' },
      { name: 'Access-Control-Allow-Origin', value: '*' },
    ],
    body: payload,
  });
  paused.push(m.params.request.url);
});

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cmd('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
};

async function openAt(width) {
  await cmd('Emulation.setDeviceMetricsOverride', {
    width, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  const loaded = once('Page.loadEventFired');
  await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/index.html` });
  await loaded;
  await sleep(900);
}

const SNAP = `(() => {
  const grid = document.getElementById('reviewsGrid');
  const cards = [...grid.querySelectorAll('.review-card')];
  const btn = document.getElementById('toggleReviewsBtn');
  const wrapper = document.getElementById('showMoreWrapper');
  return {
    total: cards.length,
    visible: cards.filter((c) => c.getClientRects().length > 0).length,
    buttonShown: wrapper ? getComputedStyle(wrapper).display !== 'none' : false,
    buttonText: btn ? btn.textContent.trim() : null,
    expanded: grid.classList.contains('show-all'),
    scrollable: grid.scrollWidth > grid.clientWidth + 2,
    scrollWidth: Math.round(grid.scrollWidth),
    clientWidth: Math.round(grid.clientWidth),
    firstCard: cards[0] ? Math.round(cards[0].getBoundingClientRect().width) : 0,
  };
})()`;

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

// --- Десктоп ---------------------------------------------------------------
await openAt(1440);
let s = await evaluate(SNAP);
console.log('\n1440px:', JSON.stringify(s));
check('десктоп: всего 20 отзывов', s.total === 20, `total=${s.total}`);
check('десктоп: видно ровно 8', s.visible === 8, `visible=${s.visible}`);
check('десктоп: кнопка показана', s.buttonShown, s.buttonText || '');
check('десктоп: на кнопке количество', /\+12/.test(s.buttonText || ''), s.buttonText || '');

await evaluate(`document.getElementById('toggleReviewsBtn').click()`);
await sleep(150);
s = await evaluate(SNAP);
check('десктоп: после клика видно все 20', s.visible === 20, `visible=${s.visible}`);
check('десктоп: подпись «Свернуть»', s.buttonText === 'Свернуть отзывы', s.buttonText);

await evaluate(`document.getElementById('toggleReviewsBtn').click()`);
await sleep(150);
s = await evaluate(SNAP);
check('десктоп: сворачивается обратно до 8', s.visible === 8, `visible=${s.visible}`);

// --- Телефон ---------------------------------------------------------------
await openAt(390);
s = await evaluate(SNAP);
console.log('\n390px:', JSON.stringify(s));
check('телефон: три копии ленты (20 × 3)', s.total === 60, `total=${s.total}`);
check('телефон: кнопки «показать все» нет', !s.buttonShown);
check('телефон: лента прокручивается вбок', s.scrollable, `${s.clientWidth} → ${s.scrollWidth}px`);
check('телефон: карточка уже экрана (видно две)', s.firstCard < 390 * 0.85, `${s.firstCard}px`);

const hint = await evaluate(`(() => {
  const h = document.querySelector('.reviews-hint');
  return h ? getComputedStyle(h).display : 'none';
})()`);
check('телефон: подсказка «листайте» видна', hint !== 'none', hint);

// Шаг одного набора и стартовая позиция (должна быть на средней копии)
const loop = await evaluate(`(async () => {
  const g = document.getElementById('reviewsGrid');
  const cards = [...g.querySelectorAll('.review-card')];
  const step = cards[20].offsetLeft - cards[0].offsetLeft;
  const start = g.scrollLeft;

  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  g.scrollLeft = 0;                       // ушли в самое начало
  await frame();
  const afterStart = g.scrollLeft;

  const max = g.scrollWidth - g.clientWidth;
  g.scrollLeft = max;                     // ушли в самый конец
  await frame();
  const afterEnd = g.scrollLeft;

  return { step: Math.round(step), start: Math.round(start), afterStart: Math.round(afterStart), max: Math.round(max), afterEnd: Math.round(afterEnd) };
})()`);
console.log('loop:', JSON.stringify(loop));

check('телефон: лента стартует с середины', Math.abs(loop.start - loop.step) <= 2, `${loop.start} ≈ ${loop.step}`);
check('телефон: у начала не упирается в край', Math.abs(loop.afterStart - loop.step) <= 2, `0 → ${loop.afterStart}`);
check('телефон: у конца переносится в начало', loop.afterEnd < loop.max - 10, `${loop.max} → ${loop.afterEnd}`);

console.log(`\nперехвачено запросов к API: ${paused.length}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\nПРОВАЛЕНО: ${failed}` : '\nвсе проверки пройдены');

ws.close();
child.kill();
await sleep(200);
process.exit(failed ? 1 : 0);
