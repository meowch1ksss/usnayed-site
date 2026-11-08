/**
 * Проверка счётчика на странице «Избранное»: кладём товар в избранное
 * и в корзину, затем смотрим, как отрисована карточка.
 *
 *   node tools/check-favorites.mjs
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9341;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = path.join(process.env.TEMP || '.', `dsh-fav-${Date.now()}`);
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
await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await mkdir(path.join(ROOT, '.audit'), { recursive: true });

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

// Сначала меню: добавляем первый товар в избранное и в корзину
let loaded = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/menu.html` });
await loaded;
await sleep(700);

await evaluate(`(() => {
  document.querySelector('.favorite-button')?.click();
  document.querySelector('.add-cart')?.click();
  return true;
})()`);
await sleep(500);

// Теперь избранное
loaded = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/favorites.html` });
await loaded;
await sleep(700);

const state = await evaluate(`(() => {
  const cards = [...document.querySelectorAll('.product-card')];
  const counter = document.querySelector('.favorites-page .qty-counter, .qty-counter');
  const input = document.querySelector('.qty-input');
  if (!cards.length) return { cards: 0 };
  if (!counter || !input) return { cards: cards.length, counter: false };

  const cs = getComputedStyle(input);
  const r = input.getBoundingClientRect();
  const card = cards[0].getBoundingClientRect();
  return {
    cards: cards.length,
    counter: true,
    inputWidth: Math.round(r.width),
    borderWidth: cs.borderTopWidth,
    background: cs.backgroundColor,
    overflows: r.right > card.right + 1,
    cardWidth: Math.round(card.width),
  };
})()`);

console.log('\nизбранное:', JSON.stringify(state));
check('в избранном есть карточка', state.cards > 0, `${state.cards} шт`);
check('счётчик отрисован', state.counter === true);
if (state.counter) {
  check('поле без нативной рамки', state.borderWidth === '0px', state.borderWidth);
  check('фон поля прозрачный', state.background === 'rgba(0, 0, 0, 0)', state.background);
  check('поле узкое', state.inputWidth <= 40, `${state.inputWidth}px`);
  check('не вылезает из карточки', !state.overflows, `карточка ${state.cardWidth}px`);
}

// Снимок карточки — до кликов, пока она на месте
const box = JSON.parse(await evaluate(`(() => {
  const card = document.querySelector('.product-card');
  const r = card.getBoundingClientRect();
  return JSON.stringify({ x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height });
})()`));
const shot = await cmd('Page.captureScreenshot', {
  format: 'png', captureBeyondViewport: true, clip: { ...box, scale: 1 },
});
await writeFile(path.join(ROOT, '.audit', 'favorites-card.png'), Buffer.from(shot.data, 'base64'));

// --- Поведение: + / − / × ---
const snapshot = `(() => {
  const input = document.querySelector('.qty-input');
  const cart = JSON.parse(localStorage.getItem('nyxora:cart') || '[]');
  return {
    shown: input ? input.value : null,
    cartQty: cart.length ? cart[0].qty : 0,
    cards: document.querySelectorAll('.product-card').length,
    favorites: JSON.parse(localStorage.getItem('nyxora:favorites') || '[]').length,
  };
})()`;

const before = await evaluate(snapshot);
console.log('до кликов:', JSON.stringify(before));

await evaluate(`document.querySelector('.qty-btn.plus').click()`);
await sleep(250);
const afterPlus = await evaluate(snapshot);
console.log('после +:', JSON.stringify(afterPlus));
check('плюс увеличивает счётчик на карточке', Number(afterPlus.shown) === Number(before.shown) + 1, `${before.shown} → ${afterPlus.shown}`);
check('плюс увеличивает количество в корзине', afterPlus.cartQty === before.cartQty + 1, `${before.cartQty} → ${afterPlus.cartQty}`);

await evaluate(`document.querySelector('.qty-btn.minus').click()`);
await sleep(250);
const afterMinus = await evaluate(snapshot);
console.log('после −:', JSON.stringify(afterMinus));
check('минус уменьшает счётчик на карточке', Number(afterMinus.shown) === Number(before.shown), `${afterPlus.shown} → ${afterMinus.shown}`);

await evaluate(`document.querySelector('.favorite-card-remove').click()`);
await sleep(300);
const afterRemove = await evaluate(snapshot);
console.log('после ×:', JSON.stringify(afterRemove));
check('крестик убирает карточку', afterRemove.cards === 0, `${before.cards} → ${afterRemove.cards}`);
check('крестик убирает из избранного', afterRemove.favorites === 0, `${before.favorites} → ${afterRemove.favorites}`);

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\nПРОВАЛЕНО: ${failed}` : '\nвсе проверки пройдены');

ws.close();
child.kill();
await sleep(200);
process.exit(failed ? 1 : 0);

