/**
 * Считает вес страниц: HTML + CSS + JS + изображения из разметки,
 * в сравнении с исходными JPG/PNG (лежат рядом с webp).
 * Заодно проверяет JSON-LD, description и canonical.
 *
 *   node tools/page-weight.mjs
 */
import fs from 'node:fs';

const kb = (n) => Math.round(n / 1024);
const size = (f) => (fs.existsSync(f) ? fs.statSync(f).size : 0);

function originalBytes(webpPath) {
  const base = webpPath.replace(/\.webp$/, '');
  for (const ext of ['.jpg', '.jpeg', '.png']) {
    if (fs.existsSync(base + ext)) return fs.statSync(base + ext).size;
  }
  return size(webpPath);
}

const pages = fs.readdirSync('.').filter((f) => f.endsWith('.html')).sort();
const rows = [];

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');

  const css = [...html.matchAll(/href="(css\/[^"]+\.css)"/g)].map((m) => m[1]);
  const js = [...html.matchAll(/src="(js\/[^"]+\.js)"/g)].map((m) => m[1]);
  const imgs = [...html.matchAll(/<img[^>]+src="(images\/[^"]+\.webp)"/g)].map((m) => m[1]);

  let before = 0;
  let after = 0;
  for (const img of imgs) {
    before += originalBytes(img);
    after += size(img);
  }

  rows.push({
    page,
    imgs: imgs.length,
    imgBefore: kb(before),
    imgAfter: kb(after),
    code: kb(size(page) + css.reduce((s, f) => s + size(f), 0) + js.reduce((s, f) => s + size(f), 0)),
  });
}

console.log('страница            img   картинки было→стало   код (html+css+js)');
for (const r of rows) {
  console.log(
    `${r.page.padEnd(19)} ${String(r.imgs).padStart(3)}   ${String(r.imgBefore).padStart(6)} КБ → ${String(r.imgAfter).padStart(5)} КБ   ${String(r.code).padStart(5)} КБ`,
  );
}

// Каталог: все фото блюд
const menuFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel);
    else if (rel.endsWith('.webp')) menuFiles.push(rel);
  }
})('images/menu');

const b = menuFiles.reduce((s, f) => s + originalBytes(f), 0);
const a = menuFiles.reduce((s, f) => s + size(f), 0);
console.log(`\nфото блюд: ${menuFiles.length} шт, ${kb(b)} КБ → ${kb(a)} КБ`);

// Проверки разметки
let ldOk = 0;
let ldBad = 0;
let dupes = 0;
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
      ldOk += 1;
    } catch (err) {
      ldBad += 1;
      console.log(`JSON-LD ошибка в ${page}: ${err.message}`);
    }
  }
  const d = (html.match(/name="description"/g) || []).length;
  const c = (html.match(/rel="canonical"/g) || []).length;
  if (d !== 1 || c !== 1) {
    dupes += 1;
    console.log(`  ${page}: description=${d}, canonical=${c}`);
  }
}
console.log(`\nJSON-LD: ${ldOk} валидных, ${ldBad} с ошибками`);
console.log(dupes ? `страниц с дублями: ${dupes}` : 'description и canonical ровно по одному на странице');
