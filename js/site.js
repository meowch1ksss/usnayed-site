// js/site.js
(() => {
  "use strict";
  const $el = (s, root = document) => root.querySelector(s);
  const $all = (s, root = document) => [...root.querySelectorAll(s)];

  /* ============================================================
   * ОБНОВЛЕНИЕ СЧЕТЧИКОВ КОРЗИНЫ И ИЗБРАННОГО В ШАПКЕ
   * ============================================================ */
  function updateGlobalBadges() {
    // Корзина
    const cart = JSON.parse(localStorage.getItem('nyxora:cart') || '[]');
    const cartCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const cartBadge = $el('#cart-count');
    if (cartBadge) cartBadge.textContent = cartCount || '';

    // Избранное
    const favs = JSON.parse(localStorage.getItem('nyxora:favorites') || '[]');
    const favBadge = $el('#favorite-count');
    if (favBadge) favBadge.textContent = favs.length || '';
  }

  /* ============================================================
   * FAQ: плавный аккордеон без details
   * ============================================================ */
  function initFaq() {
    const items = $all(".faq-item");
    if (!items.length) return;

    items.forEach((item) => {
      const btn = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      if (!btn || !answer) return;

      // Обработчик клика
      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");

        // Закрываем все остальные
        items.forEach((other) => {
          if (other !== item && other.classList.contains("is-open")) {
            other.classList.remove("is-open");
            other.querySelector(".faq-answer").style.height = "0px";
            other.querySelector(".faq-question").setAttribute("aria-expanded", "false");
          }
        });

        // Переключаем текущий
        if (isOpen) {
          // Закрываем
          item.classList.remove("is-open");
          answer.style.height = "0px";
          btn.setAttribute("aria-expanded", "false");
        } else {
          // Открываем
          item.classList.add("is-open");
          answer.style.height = answer.scrollHeight + "px";
          btn.setAttribute("aria-expanded", "true");

          // После анимации ставим auto, чтобы контент мог расти
          setTimeout(() => {
            if (item.classList.contains("is-open")) {
              answer.style.height = "auto";
            }
          }, 300);
        }
      });
    });
  }

  /* ============================================================
   * Email picker
   * ============================================================ */
  function initEmailPicker() {
    const trigger = $el(".email-picker-trigger");
    const list = $el(".email-provider-list");
    if (!trigger || !list) return;

    trigger.addEventListener("click", () => {
      const open = trigger.getAttribute("aria-expanded") !== "true";
      trigger.setAttribute("aria-expanded", String(open));
      list.hidden = !open;
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".email-picker")) {
        trigger.setAttribute("aria-expanded", "false");
        list.hidden = true;
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !list.hidden) {
        trigger.setAttribute("aria-expanded", "false");
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
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

        const url = new URL(link.href, location.href);

        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.hash) return;

        event.preventDefault();
        
        document.body.classList.add("page-leaving");
        
        setTimeout(() => { 
          location.href = url.href; 
        }, 250);
      });
    });
  }

  /* ============================================================
   * Init
   * ============================================================ */
  document.addEventListener("DOMContentLoaded", () => {
    updateGlobalBadges(); // <--- ОБНОВЛЯЕМ ЦИФРЫ ПРИ ЗАГРУЗКЕ
    initFaq();
    initEmailPicker();
    initPageFade();
  });

  /* ============================================================
   * Полноэкранное меню (если оно есть на странице)
   * ============================================================ */
  const categoryOverlay = document.getElementById('categoryOverlay');
  const categoryModalMenu = document.getElementById('categoryModalMenu');
  const categoryTitle = document.getElementById('categoryModalTitle');
  
  const demoMenu = [
    { id: 1, name: 'Сырники со сгущёнкой', price: 190, weight: '220 г', category: 'завтраки', day: 'понедельник' },
    { id: 2, name: 'Омлет с ветчиной', price: 170, weight: '200 г', category: 'завтраки', day: 'понедельник' },
    { id: 3, name: 'Борщ с говядиной', price: 220, weight: '350 мл', category: 'обеды в офис', day: 'понедельник' },
    { id: 4, name: 'Котлета по-киевски', price: 290, weight: '180 г', category: 'обеды в офис', day: 'понедельник' },
    { id: 5, name: 'Комплекс «Домашний»', price: 420, weight: '820 г', category: 'комплексные обеды', day: 'вторник' },
    { id: 6, name: 'Фуршет на 10 персон', price: 8900, weight: '≈ 4 кг', category: 'банкеты и фуршеты', day: 'среда' },
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
             <button class="add-cart">+</button>
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
    categoryOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  document.getElementById('categoryBackBtn')?.addEventListener('click', () => {
    categoryOverlay.classList.remove('open');
    document.body.style.overflow = '';
  });
  document.getElementById('categoryCloseBtn')?.addEventListener('click', () => {
    categoryOverlay.classList.remove('open');
    document.body.style.overflow = '';
  });

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

  // ============================================================
  // ОТЗЫВЫ: Показать все и добавить новый
  // ============================================================
  const showMoreBtn = document.getElementById('showMoreReviewsBtn');
  const hiddenReviews = document.getElementById('hiddenReviews');
  const showMoreWrapper = document.getElementById('showMoreWrapper');
  const addReviewFormWrapper = document.getElementById('addReviewFormWrapper');
  const addReviewForm = document.getElementById('addReviewForm');

  // Универсальная функция для красивых уведомлений
  function showCustomToast(message, type = 'success') {
    let toastRegion = document.getElementById('toast-region');
    
    // Если контейнера нет, создаем его
    if (!toastRegion) {
      toastRegion = document.createElement('div');
      toastRegion.id = 'toast-region';
      toastRegion.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px;';
      document.body.appendChild(toastRegion);
    }

    const toast = document.createElement('div');
    const icon = type === 'success' ? '✓' : '!';
    const bgColor = type === 'success' ? 'rgba(183, 255, 112, 0.15)' : 'rgba(255, 109, 120, 0.15)';
    const borderColor = type === 'success' ? 'rgba(183, 255, 112, 0.3)' : 'rgba(255, 109, 120, 0.3)';
    const iconColor = type === 'success' ? '#b7ff70' : '#ff6d78';

    // Инлайн-стили, чтобы работало даже без подключения CSS
    toast.style.cssText = `
      display: flex; align-items: center; gap: 12px; 
      padding: 16px 20px; border-radius: 16px; 
      background: rgba(30, 22, 45, 0.95); 
      backdrop-filter: blur(10px);
      border: 1px solid ${borderColor}; 
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      color: #f6f1ff; font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 600;
      min-width: 250px; max-width: 350px;
      animation: slideInRight 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    `;

    toast.innerHTML = `
      <div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; background: ${bgColor}; color: ${iconColor};">${icon}</div>
      <div>${message}</div>
    `;

    // Добавляем анимацию в документ, если ее еще нет
    if (!document.getElementById('toast-anim-style')) {
      const style = document.createElement('style');
      style.id = 'toast-anim-style';
      style.innerHTML = `
        @keyframes slideInRight { from { opacity: 0; transform: translateX(50px) scale(0.9); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes slideOutRight { from { opacity: 1; transform: translateX(0) scale(1); } to { opacity: 0; transform: translateX(50px) scale(0.9); } }
      `;
      document.head.appendChild(style);
    }

    toastRegion.appendChild(toast);

    // Удаление через 3.5 секунды
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  if (showMoreBtn && hiddenReviews) {
    showMoreBtn.addEventListener('click', () => {
      hiddenReviews.style.display = 'block';
      addReviewFormWrapper.classList.remove('hidden');
      showMoreWrapper.style.display = 'none';
    });
  }

  // Отправка отзыва на сервер
  if (addReviewForm) {
    addReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reviewName').value.trim();
      const text = document.getElementById('reviewText').value.trim();
      
      if (!name || !text) return;

      try {
        const response = await fetch('https://usnayed-api.aleksejmacu1n1.workers.dev/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, text })
        });
        
        if (!response.ok) throw new Error('Ошибка сервера');

        addReviewForm.reset();
        showCustomToast('Спасибо! Ваш отзыв отправлен на проверку.', 'success');
      } catch (err) {
        showCustomToast('Не удалось отправить отзыв. Попробуйте позже.', 'error');
      }
    });
  }

  // Загрузка одобренных отзывов при открытии страницы
  async function loadApprovedReviews() {
    try {
      const response = await fetch('https://usnayed-api.aleksejmacu1n1.workers.dev/api/reviews?status=approved');
      const approved = await response.json();
      const hiddenGrid = document.querySelector('#hiddenReviews .reviews-grid');
      
      if (hiddenGrid && approved.length > 0) {
        approved.forEach(rev => {
          if (document.getElementById('rev-' + rev.id)) return;
          const el = document.createElement('article');
          el.className = 'review-card';
          el.id = 'rev-' + rev.id;
          el.innerHTML = `
            <div class="review-stars">★★★★★</div>
            <blockquote>${rev.text}</blockquote>
            <strong>— ${rev.name}</strong>
          `;
          hiddenGrid.prepend(el);
        });
      }
    } catch (err) { console.error('Ошибка загрузки отзывов', err); }
  }
  loadApprovedReviews();

  // ============================================================
  // ВЫВОД ОДОБРЕННЫХ ОТЗЫВОВ ИЗ АДМИНКИ
  // ============================================================
  function renderApprovedReviews() {
    const hiddenGrid = document.querySelector('#hiddenReviews .reviews-grid');
    if (!hiddenGrid) return;

    // Берем одобренные отзывы
    const approved = JSON.parse(localStorage.getItem('nyxora:reviews') || '[]');
    
    // Если есть новые одобренные, добавляем их в начало скрытой сетки
    if (approved.length > 0) {
      approved.forEach(rev => {
        // Проверяем, нет ли уже такого отзыва на странице (чтобы не дублировать при перезагрузке)
        if (document.getElementById('rev-' + rev.id)) return;

        const el = document.createElement('article');
        el.className = 'review-card';
        el.id = 'rev-' + rev.id;
        
        const dateStr = new Date(rev.date).toLocaleDateString('ru-RU');
        
        el.innerHTML = `
          <div class="review-stars">★★★★★</div>
          <blockquote>${rev.text}</blockquote>
          <strong>— ${rev.name}</strong>
        `;
        
        hiddenGrid.prepend(el);
      });
    }
  }

  // Запускаем при загрузке
  renderApprovedReviews();

})();