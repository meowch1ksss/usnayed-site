/**
 * Проверка эффектов главной: печать строки, наклон карточек,
 * появление блоков при прокрутке.
 *
 *   node tools/check-effects.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9342;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = path.join(process.env.TEMP || '.', `dsh-fx-${Date.now()}`);
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

const loaded = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/index.html` });
await loaded;
await sleep(1800);

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

// 1. Печать строки
const typed = await evaluate(`(() => document.getElementById('heroTyping')?.textContent || '')()`);
check('строка в hero печатается', typed.length > 0, `«${typed}»`);

// 2. Класс наклона
const hasTilt = await evaluate(`[...document.querySelectorAll('#menu .category-card')].every((el) => el.classList.contains('tilt'))`);
check('карточкам включён наклон', hasTilt === true);

// 3. Наклон реально меняет transform
const tiltResult = await evaluate(`(async () => {
  const card = document.querySelector('#menu .category-card');
  const rect = card.getBoundingClientRect();
  const x = rect.left + rect.width * 0.85;
  const y = rect.top + rect.height * 0.2;
  card.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const t = getComputedStyle(card).transform;
  return { transform: t, changed: t !== 'none' && t.includes('matrix') };
})()`);
check('наклон меняет transform карточки', tiltResult.changed, tiltResult.transform.slice(0, 40));

// 4. Появление блоков при прокрутке
const revealResult = await evaluate(`(async () => {
  const target = document.querySelector('.why-us-card');
  const before = target.classList.contains('is-in');
  target.scrollIntoView({ block: 'center', behavior: 'instant' });
  await new Promise((r) => setTimeout(r, 600));
  return {
    before,
    after: target.classList.contains('is-in'),
    opacity: getComputedStyle(target).opacity,
  };
})()`);
check('блок появляется при прокрутке', revealResult.after === true, `opacity=${revealResult.opacity}`);

// 5. FAQ: наведение «прогибает», клик плавно раскрывает
const faqBox = await evaluate(`(() => {
  const item = document.querySelector('.faq-item:nth-child(2)');
  item.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = item.getBoundingClientRect();
  return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
})()`);
const { x: faqX, y: faqY } = JSON.parse(faqBox);
await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: faqX, y: faqY, button: 'none' });
await sleep(500);

const hoverFx = await evaluate(`(() => {
  const item = document.querySelector('.faq-item:nth-child(2)');
  const cs = getComputedStyle(item);
  const why = document.querySelector('.why-us-card');
  return {
    transform: cs.transform,
    bent: cs.transform !== 'none' && cs.transform.startsWith('matrix'),
    whyLift: why ? getComputedStyle(why).getPropertyValue('--tilt-lift').trim() : null,
  };
})()`);
check('FAQ «прогибается» под курсором', hoverFx.bent, hoverFx.transform.slice(0, 42));

await evaluate(`(() => {
  const item = document.querySelector('.faq-item:nth-child(2)');
  item.querySelector('.faq-question').click();
  return true;
})()`);
await sleep(700);

const opened = await evaluate(`(() => {
  const item = document.querySelector('.faq-item:nth-child(2)');
  const content = item.querySelector('.faq-answer-content');
  const icon = getComputedStyle(item.querySelector('.faq-question'), '::after');
  return {
    isOpen: item.classList.contains('is-open'),
    opacity: getComputedStyle(content).opacity,
    iconTransform: icon.transform,
    rows: getComputedStyle(item.querySelector('.faq-answer')).gridTemplateRows,
  };
})()`);
check('FAQ открывается по клику', opened.isOpen === true);
check('ответ проявляется', Number(opened.opacity) > 0.9, `opacity=${opened.opacity}`);
check('плюс поворачивается в крестик', opened.iconTransform !== 'none', opened.iconTransform.slice(0, 40));

const openTilt = JSON.parse(await evaluate(`(() => {
  const item = document.querySelector('.faq-item:nth-child(2)');
  item.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = item.getBoundingClientRect();
  return JSON.stringify({ x: Math.round(r.left + r.width * 0.85), y: Math.round(r.top + r.height * 0.25) });
})()`));
await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: openTilt.x, y: openTilt.y, button: 'none' });
await sleep(420);
const openTiltState = await evaluate(`(() => {
  const item = document.querySelector('.faq-item:nth-child(2)');
  const cs = getComputedStyle(item);
  return { open: item.classList.contains('is-open'), transform: cs.transform, tilted: cs.transform !== 'none' };
})()`);
check('раскрытый FAQ тоже наклоняется', openTiltState.open && openTiltState.tilted, openTiltState.transform.slice(0, 40));

// 6. Карточка преимуществ мягко опускается под курсором
const whyBox = JSON.parse(await evaluate(`(() => {
  const card = document.querySelector('.why-us-card');
  card.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = card.getBoundingClientRect();
  return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
})()`));
await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: whyBox.x, y: whyBox.y, button: 'none' });
await sleep(500);

const whySink = await evaluate(`(() => {
  const card = document.querySelector('.why-us-card');
  return getComputedStyle(card).getPropertyValue('--tilt-lift').trim();
})()`);
check('карточка преимуществ наклоняется и приподнимается', whySink === '-6px', `--tilt-lift=${whySink}`);

// 7. Фотографии и отзывы тоже наклоняются
const photoTilt = await evaluate(`(() => {
  const fig = document.querySelector('.gallery-grid figure');
  const card = document.querySelector('.review-card');
  return {
    photo: fig ? fig.classList.contains('tilt') : false,
    review: card ? card.classList.contains('tilt') : false,
  };
})()`);
check('фотографии галереи получили наклон', photoTilt.photo === true);
check('отзывы получили наклон', photoTilt.review === true);

// 8. Отключаем анимации при prefers-reduced-motion
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
const loaded2 = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/index.html` });
await loaded2;
await sleep(700);

const reduced = await evaluate(`(() => {
  const card = document.querySelector('#menu .category-card');
  const typing = document.getElementById('heroTyping');
  return {
    tilted: card ? card.classList.contains('tilt') : false,
    typing: typing ? typing.textContent : '',
    hidden: card ? getComputedStyle(card).opacity : '1',
  };
})()`);
check('reduced-motion: без наклона', reduced.tilted === false);
check('reduced-motion: строка показана сразу', reduced.typing.length > 0, `«${reduced.typing}»`);
check('reduced-motion: блоки не скрыты', reduced.hidden === '1', `opacity=${reduced.hidden}`);

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\nПРОВАЛЕНО: ${failed}` : '\nвсе проверки пройдены');

ws.close();
child.kill();
await sleep(200);
process.exit(failed ? 1 : 0);
