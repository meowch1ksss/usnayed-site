/**
 * Проставляет SEO-теги на все страницы: description, canonical,
 * Open Graph, Twitter, иконки, theme-color, JSON-LD, preload hero.
 * Блок обёрнут в маркеры, поэтому скрипт можно запускать повторно.
 *
 *   node tools/build-seo.mjs
 */
import fs from 'node:fs';

const SITE = 'https://usnayed-site.pages.dev';
const OG_IMAGE = `${SITE}/images/og-image.png`;
const OG_ALT = 'У нас обед — доставка обедов в офисы Ростова-на-Дону';

const PAGES = {
  'index.html': {
    url: '/',
    desc: 'Домашние обеды с доставкой в офисы Ростова-на-Дону, Аксая и Батайска. Комплексные обеды, завтраки, банкеты и фуршеты. Заказ до 13:30 — привезём к обеду.',
    priority: '1.0',
    changefreq: 'weekly',
    preload: 'images/our-menu-1.webp',
  },
  'menu.html': {
    url: '/menu.html',
    desc: 'Меню столовой «У нас обед»: завтраки, обеды в офис, комплексные обеды, банкеты и фуршеты. Состав, вес и цены блюд на каждый день недели.',
    priority: '0.9',
    changefreq: 'daily',
  },
  'delivery.html': {
    url: '/delivery.html',
    desc: 'Доставка и оплата обедов в офисы Ростова-на-Дону, Аксая и Батайска: зоны и сроки доставки, способы оплаты, приём заказов до 13:30 следующего дня.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  'organizations.html': {
    url: '/organizations.html',
    desc: 'Питание для организаций: комплексные обеды в офис, кейтеринг, банкеты и фуршеты в Ростове-на-Дону. Подбор меню и расчёт стоимости для коллектива.',
    priority: '0.8',
    changefreq: 'monthly',
  },
  'about.html': {
    url: '/about.html',
    desc: 'О компании «У нас обед»: домашняя столовая в Батайске, доставка обедов в офисы Ростова. Свежие продукты, ежедневное меню, повара с большим опытом.',
    priority: '0.6',
    changefreq: 'monthly',
  },
  'contacts.html': {
    url: '/contacts.html',
    desc: 'Контакты «У нас обед»: адрес в Батайске на Производственной, 8, телефоны 8 (918) 564-72-12 и 8 (863) 311-32-12, часы работы Пн–Пт с 8:30 до 15:00.',
    priority: '0.6',
    changefreq: 'monthly',
  },
  'privacy.html': {
    url: '/privacy.html',
    desc: 'Политика конфиденциальности сайта «У нас обед»: какие персональные данные собираются при заказе, с какой целью и как они защищаются.',
    priority: '0.3',
    changefreq: 'yearly',
  },
  'cart.html': {
    url: '/cart.html',
    desc: 'Корзина заказа «У нас обед»: проверьте состав и количество блюд, итоговую сумму и переходите к оформлению доставки в офис.',
    robots: 'noindex, follow',
  },
  'checkout.html': {
    url: '/checkout.html',
    desc: 'Оформление заказа «У нас обед»: укажите контактные данные и удобное время доставки обедов в офис Ростова-на-Дону.',
    robots: 'noindex, follow',
  },
  'orders.html': {
    url: '/orders.html',
    desc: 'История заказов «У нас обед»: состав, суммы и статусы ваших обедов, повторный заказ в один клик.',
    robots: 'noindex, follow',
  },
  'favorites.html': {
    url: '/favorites.html',
    desc: 'Избранные блюда «У нас обед»: сохраняйте понравившиеся обеды, чтобы заказать их снова в пару кликов.',
    robots: 'noindex, follow',
  },
  'profile.html': {
    url: '/profile.html',
    desc: 'Личный кабинет «У нас обед»: контактные данные, адреса доставки и настройки профиля.',
    robots: 'noindex, follow',
  },
  'admin.html': {
    url: '/admin.html',
    desc: 'Служебная страница администратора сайта «У нас обед».',
    robots: 'noindex, nofollow',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Restaurant',
      '@id': `${SITE}/#restaurant`,
      name: 'У нас обед',
      description:
        'Домашняя столовая в Батайске: комплексные обеды с доставкой в офисы Ростова-на-Дону, Аксая и Батайска.',
      url: `${SITE}/`,
      image: OG_IMAGE,
      logo: `${SITE}/images/icon-512.png`,
      telephone: '+7-918-564-72-12',
      priceRange: '₽₽',
      servesCuisine: ['Русская', 'Домашняя кухня'],
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Производственная ул., 8',
        addressLocality: 'Батайск',
        addressRegion: 'Ростовская область',
        addressCountry: 'RU',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 47.1367, longitude: 39.7536 },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '08:30',
          closes: '15:00',
        },
      ],
      areaServed: ['Ростов-на-Дону', 'Батайск', 'Аксай'],
      hasMenu: `${SITE}/menu.html`,
      sameAs: ['https://eda.yandex.ru', 'https://www.delivery-club.ru'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: 'У нас обед',
      inLanguage: 'ru-RU',
      publisher: { '@id': `${SITE}/#restaurant` },
    },
  ],
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const START = '  <!-- seo:start -->';
const END = '  <!-- seo:end -->';

let processed = 0;

for (const [file, meta] of Object.entries(PAGES)) {
  if (!fs.existsSync(file)) {
    console.log('пропуск (нет файла):', file);
    continue;
  }

  let html = fs.readFileSync(file, 'utf8');

  // Чистим прошлую вставку и старые одиночные теги
  html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}\\n?`), '');
  html = html.replace(/^\s*<meta name="description"[^>]*>\n/gm, '');
  html = html.replace(/^\s*<meta name="theme-color"[^>]*>\n/gm, '');

  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'У нас обед';
  const url = SITE + meta.url;

  const lines = [
    START,
    `  <meta name="description" content="${esc(meta.desc)}">`,
    `  <link rel="canonical" href="${url}">`,
  ];

  if (meta.robots) lines.push(`  <meta name="robots" content="${meta.robots}">`);

  lines.push(
    '  <meta property="og:type" content="website">',
    '  <meta property="og:site_name" content="У нас обед">',
    '  <meta property="og:locale" content="ru_RU">',
    `  <meta property="og:title" content="${esc(title)}">`,
    `  <meta property="og:description" content="${esc(meta.desc)}">`,
    `  <meta property="og:url" content="${url}">`,
    `  <meta property="og:image" content="${OG_IMAGE}">`,
    '  <meta property="og:image:width" content="1200">',
    '  <meta property="og:image:height" content="630">',
    `  <meta property="og:image:alt" content="${esc(OG_ALT)}">`,
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${esc(title)}">`,
    `  <meta name="twitter:description" content="${esc(meta.desc)}">`,
    `  <meta name="twitter:image" content="${OG_IMAGE}">`,
    '  <meta name="theme-color" content="#100b1c">',
    '  <link rel="icon" href="favicon.ico" sizes="any">',
    '  <link rel="icon" type="image/png" sizes="32x32" href="images/favicon-32.png">',
    '  <link rel="icon" type="image/png" sizes="16x16" href="images/favicon-16.png">',
    '  <link rel="apple-touch-icon" sizes="180x180" href="images/apple-touch-icon.png">',
  );

  if (meta.preload) {
    lines.push(`  <link rel="preload" as="image" href="${meta.preload}" fetchpriority="high">`);
  }

  if (file === 'index.html') {
    lines.push(`  <script type="application/ld+json">${JSON.stringify(JSON_LD)}</script>`);
  }

  lines.push(END);

  html = html.replace(/(<\/title>)/, `$1\n${lines.join('\n')}`);
  fs.writeFileSync(file, html);
  processed += 1;

  const len = meta.desc.length;
  console.log(`${file.padEnd(20)} description ${String(len).padStart(3)} симв.${len > 165 ? '  (!) длинно' : ''}`);
}

// sitemap.xml — только публичные страницы
const sitemapPages = Object.entries(PAGES).filter(([, m]) => m.priority);
const today = new Date().toISOString().slice(0, 10);
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapPages.map(
    ([, m]) =>
      `  <url>\n    <loc>${SITE}${m.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${m.changefreq}</changefreq>\n    <priority>${m.priority}</priority>\n  </url>`,
  ),
  '</urlset>',
  '',
].join('\n');
fs.writeFileSync('sitemap.xml', sitemap);

const robots = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin.html',
  'Disallow: /cart.html',
  'Disallow: /checkout.html',
  '',
  `Sitemap: ${SITE}/sitemap.xml`,
  '',
].join('\n');
fs.writeFileSync('robots.txt', robots);

console.log(`\nстраниц обработано: ${processed}`);
console.log(`sitemap.xml: ${sitemapPages.length} URL`);
console.log('robots.txt: создан');
