document.addEventListener('DOMContentLoaded', () => {
  const menuGrid = document.getElementById('menuGrid');
  const titleEl = document.getElementById('categoryTitle');
  
  const allProducts = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];
  
  let currentCategory = localStorage.getItem('currentCategory') || 'Завтраки';
  let currentDay = 'понедельник';

  // ============================================================
  // ОБНОВЛЕНИЕ СЧЕТЧИКОВ В ШАПКЕ (при загрузке)
  // ============================================================
  function updateHeaderBadges() {
    // Корзина
    const cart = JSON.parse(localStorage.getItem('nyxora:cart') || '[]');
    const totalCartItems = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const cartBadge = document.getElementById('cart-count');
    if (cartBadge) cartBadge.textContent = totalCartItems || '';

    // Избранное
    const favs = JSON.parse(localStorage.getItem('nyxora:favorites') || '[]');
    const favBadge = document.getElementById('favorite-count');
    if (favBadge) favBadge.textContent = favs.length || '';
  }

  // Запускаем обновление сразу при загрузке
  updateHeaderBadges();

  // ============================================================
  // ЛОГИКА КОРЗИНЫ
  // ============================================================
  function getCart() {
    let cart = JSON.parse(localStorage.getItem('nyxora:cart') || '[]');
    return cart.map(item => ({
      id: String(item.id),
      qty: Number(item.qty || item.quantity || 1)
    })).filter(item => item.id && item.id !== 'undefined' && item.id !== 'null');
  }

  function saveCart(cart) {
    const cleanCart = cart.map(item => ({ 
      id: String(item.id), 
      qty: Number(item.qty) 
    })).filter(i => i.qty > 0);
    
    localStorage.setItem('nyxora:cart', JSON.stringify(cleanCart));
    
    const cartBadge = document.getElementById('cart-count');
    if (cartBadge) {
      const totalCount = cleanCart.reduce((sum, item) => sum + item.qty, 0);
      cartBadge.textContent = totalCount || '';
    }
  }

  // ============================================================
  // ЛОГИКА ИЗБРАННОГО
  // ============================================================
  function getFavorites() {
    return JSON.parse(localStorage.getItem('nyxora:favorites') || '[]').map(String);
  }

  function toggleFavorite(id) {
    let favs = getFavorites();
    const stringId = String(id);
    
    if (favs.includes(stringId)) {
      favs = favs.filter(f => f !== stringId);
    } else {
      favs.push(stringId);
    }
    
    localStorage.setItem('nyxora:favorites', JSON.stringify(favs));
    
    const favBadge = document.getElementById('favorite-count');
    if (favBadge) {
      favBadge.textContent = favs.length || '';
    }
    
    return favs.includes(stringId);
  }

  // ============================================================
  // ОТРИСОВКА МЕНЮ
  // ============================================================
  function renderMenu(category, day) {
    if (!menuGrid) return;
    
    if (titleEl) titleEl.textContent = category;

    const searchCat = category.toLowerCase().trim();
    const cart = getCart();
    const favorites = getFavorites();

    const filtered = allProducts.filter(item => {
      const itemCat = (item.category || '').toLowerCase().trim();
      const itemDay = (item.day || '').toLowerCase().trim();
      const dayMatch = !itemDay || itemDay === day.toLowerCase().trim();
      return itemCat === searchCat && dayMatch;
    });

    if (filtered.length === 0) {
      menuGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #a49ab8; padding: 40px 0;">На этот день пока нет блюд из этой категории.</p>`;
      return;
    }

    menuGrid.innerHTML = filtered.map(item => {
      const cartItem = cart.find(i => i.id === String(item.id));
      const qty = cartItem ? cartItem.qty : 0;
      const isFav = favorites.includes(String(item.id));

      const actionButton = qty > 0 
        ? `<div class="qty-counter" data-id="${item.id}">
             <button type="button" class="qty-btn minus" data-action="minus">−</button>
             <span class="qty-value">${qty}</span>
             <button type="button" class="qty-btn plus" data-action="plus">+</button>
           </div>`
        : `<button class="add-cart" data-action="add" data-id="${item.id}" aria-label="Добавить в корзину">
             <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
           </button>`;

      return `
        <article class="product-card" data-card-id="${item.id}">
          <div class="product-image-wrap" data-product="${item.id}" role="button" tabindex="0" aria-label="Подробнее: ${item.name}">
            <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/600x600/21182e/c8a9ff?text=Блюдо'">
          </div>
          
          <button class="favorite-button ${isFav ? 'active' : ''}" data-action="favorite" data-id="${item.id}" aria-label="В избранное">
             <svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></svg>
          </button>

          <div class="product-info" style="padding: 20px;">
            <div class="product-category">${item.category}</div>
            <div class="product-title" style="font-size: 15px; margin-bottom: 8px;">${item.name}</div>
            <p style="font-size: 12px; color: var(--muted); margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.description || ''}</p>
            <div class="product-bottom">
              <div class="price-block">
                <span class="product-price">${item.price} ₽</span>
                <span class="old-price" style="margin-left: 8px;">${item.weight || ''}</span>
              </div>
              <div class="card-action-container">
                ${actionButton}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // ============================================================
  // ОБНОВЛЕНИЕ ОДНОЙ КАРТОЧКИ
  // ============================================================
  function updateCardUI(id, newQty, isFav) {
    const card = menuGrid.querySelector(`[data-card-id="${id}"]`);
    if (!card) return;
    
    const favBtn = card.querySelector('.favorite-button');
    if (favBtn && isFav !== undefined) {
      favBtn.classList.toggle('active', isFav);
    }

    const container = card.querySelector('.card-action-container');
    if (!container) return;

    if (newQty > 0) {
      container.innerHTML = `
        <div class="qty-counter" data-id="${id}">
          <button type="button" class="qty-btn minus" data-action="minus">−</button>
          <span class="qty-value">${newQty}</span>
          <button type="button" class="qty-btn plus" data-action="plus">+</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button class="add-cart" data-action="add" data-id="${id}" aria-label="Добавить в корзину">
          <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
        </button>
      `;
    }
  }

  // ============================================================
  // КЛИКИ ПО КНОПКАМ В КАРТОЧКАХ
  // ============================================================
  menuGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    
    if (btn && btn.dataset.action) {
      e.preventDefault();
      e.stopPropagation();
      
      const card = btn.closest('.product-card');
      const id = String(card.dataset.cardId);
      if (!id) return;

      // Обработка избранного
      if (btn.dataset.action === 'favorite') {
        const isFav = toggleFavorite(id);
        updateCardUI(id, undefined, isFav);
        return;
      }

      // Обработка корзины
      let cart = getCart();
      const itemIndex = cart.findIndex(i => i.id === id);
      let newQty = 0;

      if (btn.dataset.action === 'add' || btn.dataset.action === 'plus') {
        if (itemIndex > -1) {
          cart[itemIndex].qty += 1;
          newQty = cart[itemIndex].qty;
        } else {
          cart.push({ id: id, qty: 1 });
          newQty = 1;
        }
      } 
      else if (btn.dataset.action === 'minus') {
        if (itemIndex > -1) {
          cart[itemIndex].qty -= 1;
          newQty = cart[itemIndex].qty;
        }
      }

      saveCart(cart);
      updateCardUI(id, newQty);
      return;
    }
  });

  // ============================================================
  // КАТЕГОРИИ И ДНИ
  // ============================================================
  document.querySelectorAll('#categorySwitcher .category-switch').forEach(btn => {
    const isActive = btn.dataset.category.toLowerCase() === currentCategory.toLowerCase();
    btn.classList.toggle('active', isActive);
  });

  renderMenu(currentCategory, currentDay);

  document.getElementById('categorySwitcher')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-switch');
    if (!btn) return;
    
    currentCategory = btn.dataset.category;
    localStorage.setItem('currentCategory', currentCategory);
    
    document.querySelectorAll('#categorySwitcher .category-switch').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    renderMenu(currentCategory, currentDay);
  });

  document.getElementById('categoryDayTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.day-tab');
    if (!btn) return;
    
    currentDay = btn.dataset.day;
    document.querySelectorAll('#categoryDayTabs .day-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    renderMenu(currentCategory, currentDay);
  });
});