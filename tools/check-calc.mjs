import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9366;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = path.join(process.env.TEMP || '.', `dsh-calc-${Date.now()}`);
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

const loaded = once('Page.loadEventFired');
await cmd('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/organizations.html` });
await loaded;
await sleep(900);

const evaluate = async (expression) => {
  const { result } = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return result.value;
};

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const initial = await evaluate(`(() => ({
  day: document.querySelector('[data-sum-day]')?.textContent,
  week: document.querySelector('[data-sum-week]')?.textContent,
  month: document.querySelector('[data-sum-month]')?.textContent,
  people: document.getElementById('orgPeople')?.value,
}))()`);
check('калькулятор посчитал при загрузке', initial.day && initial.day !== '0 ₽', `день=${initial.day}, месяц=${initial.month}`);

const changed = await evaluate(`(() => {
  const people = document.getElementById('orgPeople');
  people.value = '100';
  people.dispatchEvent(new Event('input', { bubbles: true }));
  const menu = document.querySelector('input[name="orgMenu"][value="350"]');
  menu.checked = true;
  menu.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`);
await sleep(600);

const after = await evaluate(`(() => ({
  day: document.querySelector('[data-sum-day]')?.textContent,
  month: document.querySelector('[data-sum-month]')?.textContent,
  peopleOut: document.querySelector('[data-people-out]')?.textContent,
}))()`);
check('пересчёт при 100 чел. и комплексном обеде', after.day.replace(/\u00a0/g, ' ') === '35 000 ₽', `день=${after.day}, месяц=${after.month}`);
check('подпись количества обновилась', after.peopleOut === '100', after.peopleOut);

const formOk = await evaluate(`(() => {
  const form = document.getElementById('orgLeadForm');
  return !!form && form.querySelectorAll('input').length >= 4;
})()`);
check('форма заявки на месте', formOk === true);

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\nПРОВАЛЕНО: ${failed}` : '\nвсе проверки пройдены');

ws.close();
child.kill();
await sleep(200);
process.exit(failed ? 1 : 0);
