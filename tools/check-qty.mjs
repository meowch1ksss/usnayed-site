/**
 * Проверка счётчика «добавлено в корзину» в карточке товара.
 * Открывает меню, добавляет первый товар и смотрит на стили и размеры.
 *
 *   node tools/check-qty.mjs
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9340;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = path.join(process.env.TEMP || '.', `dsh-qty-${Date.now()}`);
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

await mkdir(path.join(ROOT, '.audit'), { recursive: true });

for (const [width, name] of [[1440, 'desktop'], [390, 'mobile']]) {
  await cmd('Emulation.setDeviceMetricsOverride', {
    width, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  const loaded = once('Page.loadEventFired');
  await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/menu.html` });
  await loaded;
  await sleep(700);

  // Добавляем первый товар в корзину
  await evaluate(`(() => {
    const btn = document.querySelector('.add-cart');
    if (btn) btn.click();
    return true;
  })()`);
  await sleep(400);

  const state = await evaluate(`(() => {
    const counter = document.querySelector('.qty-counter');
    const input = document.querySelector('.qty-input');
    const card = document.querySelector('.product-card');
    if (!counter || !input || !card) return { missing: true };

    const cs = getComputedStyle(input);
    const r = counter.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();

    return {
      counterWidth: Math.round(r.width),
      inputWidth: Math.round(inputRect.width),
      inputHeight: Math.round(inputRect.height),
      background: cs.backgroundColor,
      borderWidth: cs.borderTopWidth,
      fontSize: cs.fontSize,
      overflowsCard: inputRect.right > cardRect.right + 1 || counter.getBoundingClientRect().right > cardRect.right + 1,
      cardWidth: Math.round(cardRect.width),
    };
  })()`);

  console.log(`\n${name} (${width}px):`, JSON.stringify(state));
  check(`${name}: счётчик найден`, !state.missing);
  check(`${name}: поле без нативной рамки`, state.borderWidth === '0px', `border=${state.borderWidth}`);
  check(`${name}: фон поля прозрачный`, state.background === 'rgba(0, 0, 0, 0)', state.background);
  check(`${name}: поле узкое (не 150px)`, state.inputWidth <= 40, `${state.inputWidth}px`);
  check(`${name}: счётчик не вылезает из карточки`, !state.overflowsCard, `карточка ${state.cardWidth}px`);

  const box = JSON.parse(await evaluate(`(() => {
      const card = document.querySelector('.product-card');
      const r = card.getBoundingClientRect();
      return JSON.stringify({ x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height });
    })()`));
  const shot = await cmd('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { ...box, scale: 1 },
  });
  await writeFile(path.join(ROOT, '.audit', `qty-${name}.png`), Buffer.from(shot.data, 'base64'));
}

// --- Корзина: плюс/минус должны менять количество ---
await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const cartLoaded = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/cart.html` });
await cartLoaded;
await sleep(700);

const cartState = `(() => {
  const input = document.querySelector('.cart-item .qty-input');
  const price = document.querySelector('.cart-item-price');
  return { shown: input ? input.value : null, price: price ? price.textContent.trim() : null };
})()`;

const cartBefore = await evaluate(cartState);
await evaluate(`document.querySelector('.cart-item .qty-btn.plus')?.click()`);
await sleep(300);
const cartAfter = await evaluate(cartState);
console.log('\nкорзина:', JSON.stringify(cartBefore), '->', JSON.stringify(cartAfter));
check('корзина: плюс увеличивает количество', Number(cartAfter.shown) === Number(cartBefore.shown) + 1, `${cartBefore.shown} → ${cartAfter.shown}`);
check('корзина: пересчитывается цена', cartAfter.price !== cartBefore.price, `${cartBefore.price} → ${cartAfter.price}`);

const debugRemove = await evaluate(`(() => {
  const btn = document.querySelector('.cart-item .remove-btn');
  const info = {
    found: !!btn,
    action: btn ? btn.dataset.action : null,
    id: btn ? btn.dataset.id : null,
    inCartItem: btn ? !!btn.closest('.cart-item') : false,
    bound: !!window.__pcBound,
    cartBefore: JSON.parse(localStorage.getItem('nyxora:cart') || '[]').length,
  };
  if (btn) btn.click();
  info.cartAfter = JSON.parse(localStorage.getItem('nyxora:cart') || '[]').length;
  info.itemsAfter = document.querySelectorAll('.cart-item').length;
  return info;
})()`);
console.log('debug remove:', JSON.stringify(debugRemove));
await sleep(300);
const cartEmpty = await evaluate(`(() => ({
  items: document.querySelectorAll('.cart-item').length,
  stored: JSON.parse(localStorage.getItem('nyxora:cart') || '[]').length,
}))()`);
console.log('после «Удалить»:', JSON.stringify(cartEmpty));
check('корзина: «Удалить» убирает позицию', cartEmpty.stored === debugRemove.cartBefore - 1, `${debugRemove.cartBefore} → ${cartEmpty.stored} позиций`);



await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const menuLoaded = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/menu.html` });
await menuLoaded;
await sleep(700);

await evaluate(`(() => { document.querySelector('.add-cart')?.click(); return true; })()`);
await sleep(350);

const pulse = await evaluate(`(() => {
  const counter = document.querySelector('.product-card .qty-counter');
  if (!counter) return { missing: true };
  counter.querySelector('.qty-btn.plus').click();
  const fresh = document.querySelector('.product-card .qty-counter');
  const input = fresh?.querySelector('.qty-input');
  return {
    prev: fresh?.dataset.prev || '',
    value: input?.value || '',
    animations: input ? input.getAnimations().length : 0,
  };
})()`);

check('плюс запускает анимацию числа', pulse.animations > 0, `animations=${pulse.animations}`);
check('в анимации ровно одно число', pulse.value === '2', `значение=${pulse.value}`);

await sleep(600);
const settled = await evaluate(`(() => {
  const counter = document.querySelector('.product-card .qty-counter');
  const input = counter?.querySelector('.qty-input');
  return {
    value: input?.value || '',
    animations: input ? input.getAnimations().length : 0,
    reel: counter ? counter.querySelectorAll('.qty-reel, .qty-roll').length : 0,
  };
})()`);
check('после анимации стоит новое число', settled.value === '2' && settled.animations === 0, `value=${settled.value}`);
check('второго слоя с числом нет', settled.reel === 0, `слоёв=${settled.reel}`);

const cartLoaded2 = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/cart.html` });
await cartLoaded2;
await sleep(700);

const cartPulse = await evaluate(`(() => {
  const counter = document.querySelector('.cart-item .qty-counter');
  if (!counter) return { missing: true };
  counter.querySelector('.qty-btn.plus').click();
  const fresh = document.querySelector('.cart-item .qty-counter');
  const input = fresh?.querySelector('.qty-input');
  return { prev: fresh?.dataset.prev || '', value: input?.value || '', animations: input ? input.getAnimations().length : 0 };
})()`);
check('в корзине плюс анимирует число', cartPulse.animations > 0, `animations=${cartPulse.animations}`);

const badgeClass = await evaluate(`(() => {
  const badge = document.getElementById('cart-count');
  return badge ? badge.className : '';
})()`);
check('бейдж корзины анимируется', badgeClass.includes('is-bump'), badgeClass);

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\nПРОВАЛЕНО: ${failed}` : '\nвсе проверки пройдены');

ws.close();
child.kill();
await sleep(200);
process.exit(failed ? 1 : 0);
