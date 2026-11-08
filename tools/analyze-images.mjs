import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('js/data.js', 'utf8'), sandbox);
const products = (sandbox.window.LUNCH_DATA || {}).products || [];

const byFile = new Map();
for (const p of products) {
  if (!p.image) continue;
  if (!byFile.has(p.image)) byFile.set(p.image, []);
  byFile.get(p.image).push(p);
}

console.log('уникальных файлов у товаров:', byFile.size);
console.log('\nфайлы, используемые несколькими блюдами / днями:');
for (const [file, items] of byFile) {
  if (items.length < 2) continue;
  const names = [...new Set(items.map((i) => i.name))];
  const days = [...new Set(items.map((i) => i.day))];
  console.log(`  ${file.split('/').pop()}  x${items.length}  «${names.join('» / «')}»  дни: ${days.join(', ')}`);
}

console.log('\nфайлы вне папок breakfasts / lunches_in_the_office:');
for (const file of byFile.keys()) {
  if (!file.includes('/breakfasts/') && !file.includes('/lunches_in_the_office/')) console.log('  ' + file);
}

const htmlRefs = new Set();
for (const page of fs.readdirSync('.').filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(page, 'utf8');
  for (const m of html.matchAll(/(?:src)="(images\/[^"]+)"/g)) htmlRefs.add(m[1]);
  for (const m of html.matchAll(/url\('(images\/[^']+)'\)/g)) htmlRefs.add(m[1]);
}
console.log('\nвсе картинки из HTML (' + htmlRefs.size + '):');
for (const r of [...htmlRefs].sort()) console.log('  ' + r);

const webp = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel);
    else if (rel.endsWith('.webp')) webp.push(rel);
  }
})('images');

const used = new Set([...htmlRefs, ...byFile.keys()]);
const unused = webp.filter((f) => !used.has(f));
console.log('\nне используются (' + unused.length + '):');
for (const u of unused) console.log('  ' + u);
