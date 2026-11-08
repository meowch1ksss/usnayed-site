/**
 * Проверка ссылок и ассетов: существование и точный регистр пути.
 * Регистр важен — на Cloudflare Pages (Linux) `Thursday` и `thursday`
 * это разные файлы, а на Windows ошибка не видна.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

const actual = new Set([
  ...readdirSync(ROOT).filter((f) => !f.startsWith('.')),
  ...walk('css'),
  ...walk('js'),
  ...walk('images'),
  ...walk('rimgs'),
]);

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const missing = new Map();
let checked = 0;

function check(url, where) {
  const clean = decodeURI(url.split('?')[0].split('#')[0]);
  if (!clean || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(clean)) return;
  checked += 1;
  if (!actual.has(clean)) {
    if (!missing.has(clean)) missing.set(clean, new Set());
    missing.get(clean).add(where);
  }
}

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) check(m[1], page);
}

for (const file of [...walk('css'), ...walk('js')]) {
  const text = readFileSync(file, 'latin1');
  for (const m of text.matchAll(/(?:url\(\s*['"]?|['"])((?:images|rimgs)\/[^'")\s]+)/g)) {
    check(m[1], file);
  }
}

console.log(`проверено ссылок: ${checked}`);
console.log(`битых/с неверным регистром: ${missing.size}`);
for (const [url, where] of missing) {
  console.log(`  ${url}  <- ${[...where].join(', ')}`);
}
