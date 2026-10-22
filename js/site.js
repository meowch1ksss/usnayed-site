// js/site.js
// Требует: js/config.js, js/store.js (подключены ДО этого файла).
(() => {
  'use strict';
  const $el  = (s, root = document) => root.querySelector(s);
  const $all = (s, root = document) => [...root.querySelectorAll(s)];

  /* ============================================================
   * FAQ: плавный аккордеон
   * ============================================================ */
  function initFaq() {
    const items = $all('.faq-item');
    if (!items.length) return;

    items.forEach((item) => {
      const btn    = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!btn || !answer) return;

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        items.forEach((other) => {
          if (other !== item && other.classList.contains('is-open')) {
            other.classList.remove('is-open');
            other.querySelector('.faq-answer').style.height = '0px';
            other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
          }
        });

        if (isOpen) {
          item.classList.remove('is-open');
          answer.style.height = '0px';
          btn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('is-open');
          answer.style.height = answer.scrollHeight + 'px';
          btn.setAttribute('aria-expanded', 'true');
          setTimeout(() => {
            if (item.classList.contains('is-open')) answer.style.height = 'auto';
          }, 300);
        }
      });
    });
  }

  /* ============================================================
   * Email picker
   * ============================================================ */
  function initEmailPicker() {
    const trigger = $el('.email-picker-trigger');
    const list    = $el('.email-provider-list');
    if (!trigger || !list) return;

    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') !== 'true';
      trigger.setAttribute('aria-expanded', String(open));
      list.hidden = !open;
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.email-picker')) {
        trigger.setAttribute('aria-expanded', 'false');
        list.hidden = true;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !list.hidden) {
        trigger.setAttribute('aria-expanded', 'false');
        list.hidden = true;
        trigger.focus();
      }
    });
  }

  /* ============================================================
   * Fade-переход между страницами
   * ============================================================ */
  function initPageFade() {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    $all('a[href$=".html"], a[href*=".html#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.hash) return;

        event.preventDefault();
        document.body.classList.add('page-leaving');
        setTimeout(() => { location.href = url.href; }, 250);
      });
    });
  }

  /* ============================================================
   * Init
   * ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    Store.updateBadges(); // ← вместо локального updateGlobalBadges
    initFaq();
    initEmailPicker();
    initPageFade();
  });

  /* ============================================================
   * Полноэкранное меню категорий (если есть на странице)
   * ============================================================ */
  const categoryOverlay   = document.getElementById('categoryOverlay');
  const categoryModalMenu = document.getElementById('categoryModalMenu');
  const categoryTitle     = document.getElementById('categoryModalTitle');

  const demoMenu = [
    { id: 1, name: 'Сырники со сгущёнкой', price: 190, weight: '220 г', category: 'завтраки', day: 'понедельник' },
    { id: 2, name: 'Омлет с ветчиной',     price: 170, weight: '200 г', category: 'завтраки', day: 'понедельник' },
    { id: 3, name: 'Борщ с говядиной',     price: 220, weight: '350 мл', category: 'обеды в офис', day: 'понедельник' },
    { id: 4, name: 'Котлета по-киевски',   price: 290, weight: '180 г', category: 'обеды в офис', day: 'понедельник' },
    { id: 5, name: 'Комплекс «Домашний»',  price: 420, weight: '820 г', category: 'комплексные обеды', day: 'вторник' },
    { id: 6, name: 'Фуршет на 10 персон',   price: 8900, weight: '≈ 4 кг', category: 'банкеты и фуршеты', day: 'среда' },
  ];

  let currentCategory = 'завтраки';
  let currentDay = 'понедельник';

  function renderCategoryMenu() {
    if (!categoryModalMenu) return;

    const items = demoMenu.filter(i => i.category === currentCategory && i.day === currentDay);

    if (!items.length) {
      categoryModalMenu.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#a49ab8;padding:40px;">На этот день пока нет блюд.</p>`;
      return;
    }

    categoryModalMenu.innerHTML = items.map(item => `
      <article class="product-card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div class="product-info" style="padding:20px;">
          <div class="product-category" style="margin-bottom:8px;">${item.category}</div>
          <div class="product-title" style="font-size:16px; min-height:auto; margin-bottom:10px;">${item.name}</div>
          <div class="product-bottom">
            <div class="price-block">
              <span class="product-price">${item.price} ₽</span>
              <span class="old-price" style="margin-left:8px; font-size:11px;">${item.weight}</span>
            </div>
            <button class="add-cart" data-add-cart="${item.id}">+</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  function openCategoryModal(category) {
    currentCategory = category;
    currentDay = 'понедельник';

    document.querySelectorAll('#categorySwitcher .category-switch').forEach(b => {
      b.classList.toggle('active', b.dataset.category === category);
    });
    document.querySelectorAll('#categoryDayTabs .day-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.day === 'понедельник');
    });

    const activeBtn = document.querySelector(`#categorySwitcher .category-switch[data-category="${category}"]`);
    if (categoryTitle && activeBtn) categoryTitle.textContent = activeBtn.textContent;

    renderCategoryMenu();
    categoryOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCategoryModal() {
    categoryOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('categoryBackBtn')?.addEventListener('click', closeCategoryModal);
  document.getElementById('categoryCloseBtn')?.addEventListener('click', closeCategoryModal);

  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      openCategoryModal(card.dataset.category);
    });
  });

  document.getElementById('categorySwitcher')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-switch');
    if (!btn) return;
    openCategoryModal(btn.dataset.category);
  });

  document.getElementById('categoryDayTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.day-tab');
    if (!btn) return;
    document.querySelectorAll('#categoryDayTabs .day-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDay = btn.dataset.day;
    renderCategoryMenu();
  });

  // Добавление в корзину из демо-модалки (id из demoMenu, не из LUNCH_DATA — только UX-демо)
  categoryModalMenu?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-cart]');
    if (!btn) return;
    e.preventDefault();
    // demoMenu-ids не пересекаются с LUNCH_DATA — просто подсветим кнопку
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = '+'; }, 1200);
  });

  /* ============================================================
   * Уведомления в стиле Яндекс Музыки
   * ============================================================ */
  function showToast(message, type = 'success', imageUrl = null) {
    let region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.className = 'toast-region yandex-style';
      document.body.appendChild(region);
    }

    const toast = document.createElement('div');
    toast.className = `toast yandex-toast ${type}`;
    
    // Иконка или картинка (если передан imageUrl)
    const iconHtml = imageUrl 
      ? `<div class="toast-img"><img src="${imageUrl}" alt=""></div>`
      : `<div class="toast-icon">${type === 'success' ? '✓' : '!'}</div>`;

    toast.innerHTML = `
      ${iconHtml}
      <div class="toast-message">${message}</div>
      <button class="toast-close" aria-label="Закрыть">✕</button>
    `;
    
    region.appendChild(toast);

    // Плавное появление
    setTimeout(() => toast.classList.add('show'), 10);

    // Обработчик закрытия по крестику
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });

    // Автоматическое скрытие через 4 секунды
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }
  window.showToast = showToast;

  /* ============================================================
   * Отзывы: показать все / отправить / загрузить одобренные
   * ============================================================ */
  const showMoreBtn        = document.getElementById('showMoreReviewsBtn');
  const hiddenReviews      = document.getElementById('hiddenReviews');
  const showMoreWrapper    = document.getElementById('showMoreWrapper');
  const addReviewFormWrapper = document.getElementById('addReviewFormWrapper');
  const addReviewForm      = document.getElementById('addReviewForm');

  if (showMoreBtn && hiddenReviews) {
    showMoreBtn.addEventListener('click', () => {
      hiddenReviews.style.display = 'block';
      addReviewFormWrapper?.classList.remove('hidden');
      showMoreWrapper.style.display = 'none';
    });
  }

  if (addReviewForm) {
    addReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reviewName').value.trim();
      const text = document.getElementById('reviewText').value.trim();
      if (!name || !text) return;

      const submitBtn = addReviewForm.querySelector('button[type="submit"]');
      const original = submitBtn?.textContent;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Отправка...'; }

      try {
        const res = await Store.apiFetch(APP_CONFIG.API.reviews, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, text }),
        });
        if (!res.ok) throw new Error('server');

        addReviewForm.reset();
        showToast('Спасибо! Ваш отзыв отправлен на проверку.', 'success');
      } catch {
        showToast('Не удалось отправить отзыв. Попробуйте позже.', 'error');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = original; }
      }
    });
  }

  async function loadApprovedReviews() {
    const hiddenGrid = document.querySelector('#hiddenReviews .reviews-grid');
    if (!hiddenGrid) return;

    try {
      const res = await Store.apiFetch(APP_CONFIG.API.reviews);
      if (!res.ok) return;
      const approved = await res.json();
      if (!Array.isArray(approved)) return;

      approved.forEach(rev => {
        if (document.getElementById('rev-' + rev.id)) return;
        const el = document.createElement('article');
        el.className = 'review-card';
        el.id = 'rev-' + rev.id;
        el.innerHTML = `
          <div class="review-stars">★★★★★</div>
          <blockquote>${escapeHTML(rev.text || '')}</blockquote>
          <strong>— ${escapeHTML(rev.name || 'Гость')}</strong>
        `;
        hiddenGrid.prepend(el);
      });
    } catch (err) {
      console.error('Ошибка загрузки отзывов', err);
    }
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
    ));
  }

  loadApprovedReviews();
})();