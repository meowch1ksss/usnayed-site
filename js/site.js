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

      // Переносим контент внутрь обертки для анимации
      if (!answer.querySelector('.faq-answer-inner')) {
        const content = answer.innerHTML;
        answer.innerHTML = `<div class="faq-answer-inner">${content}</div>`;
      }

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        // Закрываем все остальные
        items.forEach((other) => {
          if (other !== item && other.classList.contains('is-open')) {
            other.classList.remove('is-open');
            other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
          }
        });

        // Переключаем текущий
        if (isOpen) {
          item.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* ============================================================
   * Email picker (Плавное открытие)
   * ============================================================ */
  function initEmailPicker() {
    const trigger = $el('.email-picker-trigger');
    const list    = $el('.email-provider-list');
    if (!trigger || !list) return;

    // Убираем атрибут hidden, если он есть в HTML, и заменяем на класс
    list.removeAttribute('hidden');
    list.classList.add('email-list-hidden');

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      
      if (isOpen) {
        // Закрываем
        trigger.setAttribute('aria-expanded', 'false');
        list.classList.add('email-list-hidden');
      } else {
        // Открываем
        trigger.setAttribute('aria-expanded', 'true');
        list.classList.remove('email-list-hidden');
      }
    });

    // Закрываем при клике вне
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.email-picker')) {
        trigger.setAttribute('aria-expanded', 'false');
        list.classList.add('email-list-hidden');
      }
    });

    // Закрываем по Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !list.classList.contains('email-list-hidden')) {
        trigger.setAttribute('aria-expanded', 'false');
        list.classList.add('email-list-hidden');
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
    Store.updateBadges();
    initFaq();
    initEmailPicker();
    initPageFade();
  });

  // === ПЛАВАЮЩАЯ КОРЗИНА ===
  function updateFloatingCart() {
    const floatingCart = document.getElementById('floatingCart');
    if (!floatingCart) return; // На главной этого блока нет, код просто пропустится

    const cart = Store.getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    
    if (count === 0) {
      floatingCart.classList.remove('visible');
      return;
    }

    const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];
    const totalSum = cart.reduce((sum, item) => {
      const p = products.find(x => String(x.id) === String(item.id));
      return sum + (p ? p.price * item.qty : 0);
    }, 0);

    document.getElementById('floatingCartSum').textContent = `${totalSum} ₽`;
    document.getElementById('floatingCartCount').textContent = `${count} ${count === 1 ? 'товар' : count < 5 ? 'товара' : 'товаров'}`;
    
    floatingCart.classList.add('visible');
  }

  updateFloatingCart();

  // Перехватываем сохранение корзины, чтобы обновлять панель
  const originalSaveCart = Store.saveCart;
  Store.saveCart = function(cart) {
    const result = originalSaveCart(cart);
    updateFloatingCart();
    return result;
  };

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

  categoryModalMenu?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-cart]');
    if (!btn) return;
    e.preventDefault();
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = '+'; }, 1200);
  });

  /* ============================================================
   * Уведомления (Плотная стопка, текст не обрезается)
   * ============================================================ */
  function showToast(message, type = 'success', imageUrl = null) {
    let region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.className = 'toast-region yandex-style';
      document.body.appendChild(region);
    }

    // Контейнер: привязываем к низу по центру
    region.style.position = 'fixed';
    region.style.bottom = '20px';
    region.style.left = '50%';
    region.style.transform = 'translateX(-50%)';
    region.style.zIndex = '9999';
    region.style.width = '100%';
    region.style.maxWidth = '380px'; // Ограничитель, чтобы не растягивалось на весь экран
    region.style.height = '100px'; // Высота контейнера (чтобы стопка не летела вверх)
    region.style.pointerEvents = 'none';

    const toast = document.createElement('div');
    toast.className = `toast yandex-toast ${type}`;
    
    // Абсолютное позиционирование для наложения
    toast.style.position = 'absolute';
    toast.style.bottom = '0';
    toast.style.left = '50%';
    // Начальное состояние: чуть ниже и прозрачное
    toast.style.transform = 'translateX(-50%) translateY(20px) scale(0.9)'; 
    toast.style.width = 'max-content';
    toast.style.maxWidth = '100%';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.padding = '10px 14px';
    
    toast.style.background = 'rgba(20, 15, 25, 0.95)'; 
    toast.style.backdropFilter = 'blur(20px)';
    toast.style.webkitBackdropFilter = 'blur(20px)';
    toast.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
    toast.style.color = '#ffffff';
    toast.style.fontSize = '13px';
    toast.style.fontWeight = '500';
    toast.style.fontFamily = 'Manrope, sans-serif';
    toast.style.pointerEvents = 'auto';
    toast.style.transition = 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
    toast.style.opacity = '0';
    
    let iconHtml = '';
    if (imageUrl) {
      iconHtml = `<div style="width: 44px; height: 44px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: #222;"><img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;"></div>`;
    } else {
      const bgColor = type === 'success' ? 'rgba(183, 255, 112, 0.2)' : 'rgba(255, 109, 120, 0.2)';
      const colColor = type === 'success' ? '#b7ff70' : '#ff6d78';
      const iconChar = type === 'success' ? '✓' : '!';
      iconHtml = `<div style="width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; background: ${bgColor}; color: ${colColor};">${iconChar}</div>`;
    }

    toast.innerHTML = `
      ${iconHtml}
      <div style="line-height: 1.4; flex: 1; white-space: normal; word-wrap: break-word;">${message}</div>
      <button class="toast-close" style="background: transparent; border: none; color: #888; font-size: 16px; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s; flex-shrink: 0;">✕</button>
    `;
    
    region.appendChild(toast);

    // Функция для перерасчета стопки (эффект карт)
    function updateStack() {
      // Получаем все уведомления и переворачиваем (новое будет первым)
      const toasts = Array.from(region.querySelectorAll('.yandex-toast')).reverse();
      
      toasts.forEach((t, index) => {
        if (index === 0) {
          // Новое (самое переднее)
          t.style.transform = 'translateX(-50%) translateY(0) scale(1)';
          t.style.opacity = '1';
          t.style.zIndex = '10';
          t.style.pointerEvents = 'auto';
        } else if (index === 1) {
          // Второе (уходит назад и вверх, чуть уменьшается)
          t.style.transform = 'translateX(-50%) translateY(-12px) scale(0.96)';
          t.style.opacity = '0.8';
          t.style.zIndex = '9';
          t.style.pointerEvents = 'none';
        } else if (index === 2) {
          // Третье (еще дальше назад)
          t.style.transform = 'translateX(-50%) translateY(-24px) scale(0.92)';
          t.style.opacity = '0.5';
          t.style.zIndex = '8';
          t.style.pointerEvents = 'none';
        } else {
          // Все, что глубже 3-го, удаляем (оно уже за экраном)
          t.remove();
        }
      });
    }

    // Появление
    setTimeout(updateStack, 10);

    // Кнопка закрытия
    toast.querySelector('.toast-close').addEventListener('click', (e) => {
      e.stopPropagation();
      toast.remove();
      updateStack(); 
    });

    // Автоскрытие через 4 секунды
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
        updateStack();
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

  // Проверяем, если перешли по ссылке из профиля
  if (window.location.hash === '#reviews' && hiddenReviews) {
    setTimeout(() => {
      hiddenReviews.style.display = 'block';
      addReviewFormWrapper?.classList.remove('hidden');
      showMoreWrapper.style.display = 'none';
      document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }

  if (showMoreBtn && hiddenReviews) {
    showMoreBtn.addEventListener('click', () => {
      const isOpen = hiddenReviews.style.display === 'block';
      
      if (isOpen) {
        // Сворачиваем
        hiddenReviews.style.display = 'none';
        addReviewFormWrapper?.classList.add('hidden');
        showMoreBtn.innerHTML = 'Показать все отзывы ↓';
      } else {
        // Разворачиваем
        hiddenReviews.style.display = 'block';
        addReviewFormWrapper?.classList.remove('hidden');
        showMoreBtn.innerHTML = 'Свернуть отзывы ↑';
      }
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

      // === ПРОВЕРКА НАЛИЧИЯ СКРЫТЫХ ОТЗЫВОВ (ПОСЛЕ ЗАГРУЗКИ) ===
      if (hiddenGrid.children.length === 0) {
        if (showMoreBtn) showMoreBtn.style.display = 'none';
        if (showMoreWrapper) showMoreWrapper.style.display = 'none';
      }

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