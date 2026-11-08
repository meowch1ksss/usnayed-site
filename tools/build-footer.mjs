/**
 * Собирает футер на всех страницах из одного шаблона.
 * Повторный запуск безопасен: блок заменяется между маркерами.
 *
 *   node tools/build-footer.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const PHONE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11.5 11.5 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"/></svg>`;
const MAIL_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/></svg>`;
const PIN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>`;

const PROVIDERS = [
  ['gmail', 'Gmail', '@gmail.com', 'https://mail.google.com/mail/?view=cm&fs=1&to=kolibri831%40yandex.ru'],
  ['outlook', 'Outlook / Hotmail', '@outlook.com · @hotmail.com', 'https://outlook.live.com/mail/0/deeplink/compose?to=kolibri831%40yandex.ru'],
  ['yahoo', 'Yahoo Mail', '@yahoo.com', 'https://compose.mail.yahoo.com/?to=kolibri831%40yandex.ru'],
  ['icloud', 'iCloud Mail', '@icloud.com', 'https://www.icloud.com/mail/'],
  ['proton', 'Proton Mail', '@proton.me · @protonmail.com', 'https://mail.proton.me/u/0/inbox'],
  ['zoho', 'Zoho Mail', '@zoho.com', 'https://mail.zoho.com/'],
  ['yandex', 'Яндекс Почта', '@yandex.ru', 'https://mail.yandex.ru/compose?mailto=kolibri831@yandex.ru'],
  ['mailru', 'Mail.ru', '@mail.ru', 'https://e.mail.ru/compose/'],
  ['rambler', 'Rambler', '@rambler.ru', 'https://mail.rambler.ru/'],
];

const providerLinks = PROVIDERS.map(
  ([cls, name, domain, href]) =>
    `            <a href="${href}" target="_blank" rel="noopener noreferrer"><i class="mail-dot ${cls}"></i><span>${name}<small>${domain}</small></span></a>`,
).join('\n');

const FOOTER = `<!-- footer:start -->
  <footer class="site-footer">
    <span class="ft-glow" aria-hidden="true"></span>

    <div class="ft-main">
      <div class="ft-brand">
        <a class="brand footer-brand" href="index.html" aria-label="У нас обед — главная">
          <svg class="ft-logo" viewBox="0 0 49 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M48.4734 25.3728C48.4734 12.6485 38.9302 3.55976 26.8118 2.49941C26.8118 -0.833136 21.813 -0.833136 21.813 2.49941C9.54319 3.55976 0 12.497 0 25.2213C0 29.4627 48.4734 29.4627 48.4734 25.3728Z" fill="#FE0000"/>
            <path d="M22.7219 5.98346C18.4805 6.58938 14.6935 8.71009 12.1184 11.7397C9.54321 14.7693 8.33137 18.8592 8.63433 22.6462C8.63433 24.6154 5.30179 24.6154 5.30179 22.6462C5.60475 18.1018 7.57398 13.5574 10.9065 10.5278C14.2391 7.49825 18.4805 5.98346 22.7219 5.98346Z" fill="white"/>
            <path d="M45.4438 31.5834C45.4438 40.2177 35.2947 50.3668 24.2367 50.3668C13.1787 50.3668 3.02959 40.2177 3.02959 31.5834C3.02959 28.7053 0 28.7053 0 31.5834C0 48.2461 20.9041 64 24.2367 64C27.5692 64 48.4734 48.0947 48.4734 31.5834C48.4734 28.8568 45.4438 28.8568 45.4438 31.5834Z" fill="#FFAA00"/>
            <path d="M31.0533 37.0367C31.0533 27.9479 17.5716 27.9479 17.5716 37.0367C17.4201 49.155 31.0533 49.155 31.0533 37.0367Z" fill="#FFAA00"/>
          </svg>
          <span>У нас обед<span class="brand-dot">.</span><small>Столовая</small></span>
        </a>

        <p class="ft-tagline">
          Домашние обеды в офисы Ростова, Аксая и Батайска.
          Готовим каждое утро — привозим к обеду.
        </p>

        <a class="ft-cta" href="menu.html">
          Собрать обед
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <nav class="ft-col" aria-label="Меню">
        <h3 class="ft-title">Меню</h3>
        <a href="menu.html">Завтраки</a>
        <a href="menu.html">Обеды в офис</a>
        <a href="menu.html">Комплексные обеды</a>
        <a href="organizations.html">Банкеты и фуршеты</a>
      </nav>

      <nav class="ft-col" aria-label="Компания">
        <h3 class="ft-title">Компания</h3>
        <a href="about.html">О компании</a>
        <a href="delivery.html">Доставка и оплата</a>
        <a href="index.html#reviews">Отзывы</a>
        <a href="contacts.html">Контакты</a>
      </nav>

      <div class="ft-col ft-contact">
        <h3 class="ft-title">Связаться</h3>

        <a class="ft-phone" href="tel:+79185647212">
          <span class="ft-ico">${PHONE_ICON}</span>
          8 (918) 564-72-12
        </a>

        <a class="ft-phone" href="tel:+78633113212">
          <span class="ft-ico">${PHONE_ICON}</span>
          8 (863) 311-32-12
        </a>

        <p class="ft-address">
          <span class="ft-ico">${PIN_ICON}</span>
          Производственная ул., 8 · Батайск
        </p>

        <div class="email-picker line-email">
          <button class="footer-email email-picker-trigger" type="button"
                  aria-expanded="false" aria-controls="email-provider-list">
            <span class="ft-mail">${MAIL_ICON}</span>
            <span class="ft-email-text">kolibri831@yandex.ru</span>
            <span class="email-chevron" aria-hidden="true">▾</span>
          </button>

          <div class="email-provider-list" id="email-provider-list" hidden>
${providerLinks}
          </div>
        </div>

        <p class="ft-hours">
          <span class="ft-dot" aria-hidden="true"></span>
          Пн–Пт 8:30–15:00 · заказ до 13:30
        </p>
      </div>
    </div>

    <div class="ft-bottom">
      <p class="ft-copy">© 2026 ООО «У нас обед»</p>
      <a class="ft-policy" href="privacy.html">Политика конфиденциальности</a>
      <p class="ft-area">Доставка: Ростов-на-Дону · Аксай · Батайск</p>
      <button class="ft-up" type="button" data-scroll-top aria-label="Вернуться наверх">
        Наверх <span aria-hidden="true">↑</span>
      </button>
    </div>
  </footer>
  <!-- footer:end -->`;

const ROOT = process.cwd();
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let replaced = 0;
let linked = 0;

for (const page of pages) {
  const full = path.join(ROOT, page);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;

  // 1. Подключаем стили футера (после mobile.css)
  if (!html.includes('css/footer.css') && html.includes('css/mobile.css')) {
    html = html.replace(
      /(\s*<link rel="stylesheet" href="css\/mobile\.css">)/,
      '$1\n  <link rel="stylesheet" href="css/footer.css">',
    );
    if (html !== before) linked += 1;
  }

  // 2. Меняем сам футер
  if (html.includes('<!-- footer:start -->')) {
    html = html.replace(/<!-- footer:start -->[\s\S]*?<!-- footer:end -->/, FOOTER);
  } else {
    html = html.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, FOOTER);
  }

  if (html !== before) {
    fs.writeFileSync(full, html);
    replaced += 1;
  }
}

console.log(`страниц обновлено: ${replaced}`);
console.log(`подключили css/footer.css: ${linked}`);
