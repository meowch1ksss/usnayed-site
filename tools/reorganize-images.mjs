/**
 * Реорганизация images/: раскладывает фото по папкам и даёт им
 * осмысленные имена, затем правит пути в HTML и data.js.
 *
 *   images/menu/<категория>/<день>/<название-блюда>.webp
 *   images/site/<раздел>/<что-это>.webp
 *   images/_unused/  — файлы, на которые никто не ссылается
 *
 *   node tools/reorganize-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const IMG = 'images';

// --- 1. Товары из data.js ----------------------------------------------------
const sandbox = { window: {}, console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('js/data.js', 'utf8'), sandbox);
const products = (sandbox.window.LUNCH_DATA || {}).products || [];

// --- 2. Транслитерация и слаг ------------------------------------------------
const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function translit(text) {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => (ch in MAP ? MAP[ch] : ch))
    .join('');
}

function slugify(text, maxLength = 60) {
  let slug = translit(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    const cut = slug.lastIndexOf('-');
    if (cut > 20) slug = slug.slice(0, cut);
  }
  return slug || 'dish';
}

const CATEGORY = {
  'Завтраки': 'breakfasts',
  'Обеды в офис': 'lunches',
  'Комплексные обеды': 'complex-lunches',
  'Банкеты и фуршеты': 'banquets',
};

const DAY = {
  понедельник: 'monday',
  вторник: 'tuesday',
  среда: 'wednesday',
  четверг: 'thursday',
  пятница: 'friday',
  суббота: 'saturday',
  воскресенье: 'sunday',
};

// --- 3. Карта переносов ------------------------------------------------------
const moves = new Map(); // старый .webp -> новый .webp
const taken = new Set();

function uniqueTarget(base) {
  let candidate = `${base}.webp`;
  let i = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${i}.webp`;
    i += 1;
  }
  taken.add(candidate);
  return candidate;
}

for (const product of products) {
  const oldPath = product.image;
  if (!oldPath || moves.has(oldPath)) continue;

  const category = CATEGORY[product.category] || 'other';
  const day = DAY[product.day] || 'any';
  const name = slugify(product.name || 'dish');
  const target = uniqueTarget(`${IMG}/menu/${category}/${day}/${name}`);
  moves.set(oldPath, target);
}

// Фотографии сайта — имена по смыслу
const SITE = {
  'images/about-pic1.webp': 'images/site/about/about-1.webp',
  'images/about-pic2.webp': 'images/site/about/about-2.webp',
  'images/about-pic3.webp': 'images/site/about/about-3.webp',
  'images/gallery/canteen-1.webp': 'images/site/gallery/canteen-1.webp',
  'images/gallery/canteen-2.webp': 'images/site/gallery/canteen-2.webp',
  'images/gallery/canteen-3.webp': 'images/site/gallery/canteen-3.webp',
  'images/gallery/canteen-4.webp': 'images/site/gallery/canteen-4.webp',
  'images/gallery/canteen-5.webp': 'images/site/gallery/canteen-5.webp',
  'images/our-menu-1.webp': 'images/site/categories/breakfasts.webp',
  'images/our-menu-2.webp': 'images/site/categories/office-lunches.webp',
  'images/our-menu-3.webp': 'images/site/categories/complex-lunches.webp',
  'images/our-menu-4.webp': 'images/site/categories/banquets.webp',
  'images/deliver-item.webp': 'images/site/delivery/step-1-choose-dish.webp',
  'images/deliver-item-1.webp': 'images/site/delivery/step-2-place-order.webp',
  'images/deliver-item-2.webp': 'images/site/delivery/step-3-in-time.webp',
  'images/chinese-food-delivery.webp': 'images/site/delivery/home-delivery.webp',
  'images/yandex-eda.webp': 'images/site/partners/yandex-eda.webp',
  'images/delivery.webp': 'images/site/partners/delivery-club.webp',
  'images/layer-1.webp': 'images/site/decor/leaf-shadow.webp',
  'images/layer-2.webp': 'images/site/decor/receipt.webp',
  'images/layer-3.webp': 'images/site/decor/tomato.webp',
  'images/layer-4.webp': 'images/site/decor/leaf.webp',
};

for (const [oldPath, newPath] of Object.entries(SITE)) {
  if (fs.existsSync(oldPath) && !moves.has(oldPath)) {
    taken.add(newPath);
    moves.set(oldPath, newPath);
  }
}

// Всё, что осталось без ссылок, — в _unused с прежним именем
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

for (const file of walk(IMG)) {
  if (!file.endsWith('.webp') || moves.has(file)) continue;
  moves.set(file, `${IMG}/_unused/${path.basename(file)}`);
}

// --- 4. Перенос файлов (webp + оригинал) -------------------------------------
const files = walk(IMG);
let moved = 0;

for (const [oldPath, newPath] of moves) {
  const newBase = newPath.replace(/\.webp$/, '');
  fs.mkdirSync(path.dirname(path.join(ROOT, newPath)), { recursive: true });

  fs.renameSync(path.join(ROOT, oldPath), path.join(ROOT, newPath));
  moved += 1;

  // Оригинал рядом (то же имя, другое расширение)
  const oldBase = oldPath.replace(/\.webp$/, '');
  for (const ext of ['.jpg', '.jpeg', '.png']) {
    const candidate = oldBase + ext;
    if (!fs.existsSync(path.join(ROOT, candidate))) continue;
    const targetOriginal = newBase + ext;
    if (fs.existsSync(path.join(ROOT, targetOriginal))) continue;
    fs.renameSync(path.join(ROOT, candidate), path.join(ROOT, targetOriginal));
  }
}

// Пустые папки
function pruneEmpty(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    pruneEmpty(full);
    if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
  }
}
pruneEmpty(IMG);

// --- 5. Правка ссылок --------------------------------------------------------
const pairs = [...moves].sort((a, b) => b[0].length - a[0].length);

for (const file of fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))) {
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  for (const [oldPath, newPath] of pairs) text = text.split(oldPath).join(newPath);
  if (text !== before) fs.writeFileSync(file, text);
}

for (const file of ['js/data.js']) {
  const raw = fs.readFileSync(file, 'latin1');
  let text = raw;
  for (const [oldPath, newPath] of pairs) text = text.split(oldPath).join(newPath);
  if (text !== raw) fs.writeFileSync(file, Buffer.from(text, 'latin1'));
}

// --- 6. Отчёт ----------------------------------------------------------------
fs.writeFileSync(
  'tools/image-reorg-map.json',
  JSON.stringify(Object.fromEntries(moves), null, 2),
);

console.log(`перемещено webp: ${moved}`);
console.log(`папок верхнего уровня: ${fs.readdirSync(IMG).filter((f) => fs.statSync(path.join(IMG, f)).isDirectory()).join(', ')}`);
console.log(`в _unused: ${[...moves.values()].filter((p) => p.includes('_unused')).length}`);
console.log('карта: tools/image-reorg-map.json');
