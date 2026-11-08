import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9377;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = path.join(process.env.TEMP || '.', `dsh-feat-${Date.now()}`);
const child = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore', windowsHide: true });

let wsUrl;
for (let i = 0; i < 100; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    if (res.ok) { wsUrl = (await res.json()).webSocketDebuggerUrl; break; }
  } catch { /* wait */ }
  await sleep(150);
}

const ws = new WebSocket(wsUrl);
await new Promise((res) => ws.addEventListener('open', res, { once: true }));

let seq = 0;
const pending = new Map();
const events = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); }
  else if (m.method) { const list = events.get(m.method); if (list?.length) list.shift()(m.params); }
});
const send = (method, params = {}, sessionId) => new Promise((resolve) => {
  const id = ++seq; pending.set(id, { resolve }); ws.send(JSON.stringify({ id, method, params, sessionId }));
});
const once = (method) => new Promise((resolve) => { const list = events.get(method) ?? []; list.push(resolve); events.set(method, list); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const cmd = (m, p) => send(m, p, sessionId);

await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cmd('Emulation.setTouchEmulationEnabled', { enabled: false });

const go = async (page) => {
  const loaded = once('Page.loadEventFired');
  await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/${page}` });
  await loaded;
  await sleep(900);
};

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
};

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

await go('index.html');

await sleep(1400);
const cookieState = await evaluate(`(() => {
  const banner = document.querySelector('.cookie-banner');
  if (!banner) return { missing: true };
  const buttons = [...banner.querySelectorAll('[data-cookie]')].map((b) => b.textContent.trim());
  const link = banner.querySelector('.cookie-more');
  return { buttons, link: link ? link.getAttribute('href') : '', text: banner.textContent.slice(0, 40) };
})()`);
check('плашка cookie появляется', !cookieState.missing, cookieState.missing ? 'нет' : 'есть');
check('в плашке три действия', cookieState.buttons?.length === 2 && cookieState.link === 'cookies.html', `${cookieState.buttons?.join(', ')} + ${cookieState.link}`);

await evaluate(`(() => {
  document.querySelector('.cookie-banner [data-cookie="accept"]')?.click();
  return true;
})()`);
await sleep(500);
const cookieAfter = await evaluate(`(() => ({
  banner: !!document.querySelector('.cookie-banner'),
  choice: localStorage.getItem('usnayed:cookie-choice'),
}))()`);
check('после «Принять» плашка скрывается', cookieAfter.banner === false && cookieAfter.choice === 'accepted', `choice=${cookieAfter.choice}`);

await go('index.html');
await sleep(1500);
const cookieAgain = await evaluate(`(() => !!document.querySelector('.cookie-banner'))()`);
check('повторно плашка не показывается', cookieAgain === false);


const tel = await evaluate(`(() => {
  const link = document.querySelector('a[href^="tel:"]');
  if (!link) return { missing: true };
  link.click();
  return { href: link.getAttribute('href') };
})()`);
await sleep(300);
const toast = await evaluate(`(() => {
  const region = document.getElementById('toast-region');
  return region ? region.textContent.trim() : '';
})()`);
check('клик по номеру на ПК показывает подсказку', toast.includes('телефон') || toast.includes('Позвонить'), toast.slice(0, 60));

await go('cart.html');
await evaluate(`(() => {
  localStorage.setItem('nyxora:cart', JSON.stringify([{ id: '101', qty: 2 }, { id: '102', qty: 1 }]));
  return true;
})()`);
await go('cart.html');

const weight = await evaluate(`(() => {
  const el = document.getElementById('cartTotalWeight');
  const items = document.querySelectorAll('.cart-item').length;
  return { text: el ? el.textContent.trim() : '', items };
})()`);
check('в корзине считается общий вес', weight.text !== '—' && weight.text.length > 0, `вес=${weight.text}, позиций=${weight.items}`);

const footerGap = await evaluate(`(() => {
  const footer = document.querySelector('.site-footer');
  if (!footer) return { missing: true };
  const cs = getComputedStyle(footer);
  return { marginBottom: cs.marginBottom };
})()`);
check('отступ снизу у футера 8px', footerGap.marginBottom === '8px', footerGap.marginBottom);

const headerRadius = await evaluate(`(() => {
  const header = document.querySelector('.site-header');
  return header ? getComputedStyle(header).borderRadius : '';
})()`);
check('у шапки скруглённые углы', headerRadius.startsWith('20px'), headerRadius);

await go('admin.html');
const galleryGone = await evaluate(`(() => {
  const btn = document.querySelector('.admin-nav-btn[data-tab="gallery"]');
  return btn === null;
})()`);
check('вкладки «Галерея» в админке больше нет', galleryGone === true);


await evaluate(`(() => {
  localStorage.setItem('nyxora:user', JSON.stringify({ name: 'Гость', email: 'guest@mail.ru', isAdmin: false }));
  localStorage.setItem('nyxora:token', 'test-token');
  return true;
})()`);
await go('admin.html');
await sleep(600);
const adminRedirect = await evaluate(`(() => location.pathname.split('/').pop())()`);
check('обычного пользователя кидает на 403', adminRedirect === '403.html', adminRedirect);

await evaluate(`(() => { localStorage.removeItem('nyxora:user'); localStorage.removeItem('nyxora:token'); return true; })()`);


await evaluate(`(() => {
  localStorage.setItem('nyxora:user', JSON.stringify({ name: 'Админ', email: 'admin@mail.ru', isAdmin: true }));
  localStorage.setItem('nyxora:token', 'test-token');
  return true;
})()`);

await go('admin.html');
await sleep(500);
const adminPanel = await evaluate(`(() => {
  const btn = document.querySelector('.admin-nav-btn[data-tab="settings"]');
  if (btn) btn.click();
  return new Promise((resolve) => setTimeout(() => {
    const toggle = document.getElementById('maintenanceToggle');
    resolve({
      panel: !!document.getElementById('adminPanel'),
      toggle: !!toggle,
      link: document.querySelector('a[href="maintenance.html"]') ? true : false,
    });
  }, 400));
})()`);
check('в админке есть переключатель техработ', adminPanel.toggle === true, `панель=${adminPanel.panel}`);
check('есть ссылка на страницу техработ', adminPanel.link === true);

await evaluate(`(() => {
  const toggle = document.getElementById('maintenanceToggle');
  if (toggle) {
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return true;
})()`);
await sleep(300);
const flagOn = await evaluate(`(() => localStorage.getItem('usnayed:maintenance'))()`);
check('включение сохраняет флаг', flagOn === 'on', String(flagOn));

await go('index.html');
await sleep(500);
const adminStays = await evaluate(`(() => location.pathname.split('/').pop() || 'index.html')()`);
check('админ не выкидывается с сайта', adminStays === 'index.html', adminStays);

await evaluate(`(() => {
  localStorage.removeItem('nyxora:user');
  localStorage.removeItem('nyxora:token');
  return true;
})()`);
await go('index.html');
await sleep(600);
const guestRedirect = await evaluate(`(() => location.pathname.split('/').pop())()`);
check('гостя кидает на страницу техработ', guestRedirect === 'maintenance.html', guestRedirect);

await evaluate(`(() => { localStorage.removeItem('usnayed:maintenance'); return true; })()`);
await go('maintenance.html');
const maintPage = await evaluate(`(() => {
  const title = document.querySelector('.error-title');
  const gear = document.querySelector('.maint-gear');
  const btn = document.getElementById('retryBtn');
  return { title: title ? title.textContent.trim() : '', gear: !!gear, retry: !!btn };
})()`);
check('страница техработ на месте', maintPage.gear && maintPage.retry, maintPage.title);

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\nПРОВАЛЕНО: ${failed}` : '\nвсе проверки пройдены');

ws.close();
child.kill();
await sleep(200);
process.exit(failed ? 1 : 0);
