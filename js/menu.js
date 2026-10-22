document.addEventListener('DOMContentLoaded', () => {
  const menuGrid = document.getElementById('menuGrid');
  const titleEl  = document.getElementById('categoryTitle');
  const allProducts = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];

  let currentCategory = localStorage.getItem('currentCategory') || 'Завтраки';
  let currentDay = 'понедельник';
  Store.updateBadges();

  function renderMenu(category, day) {
    if (!menuGrid) return;
    if (titleEl) titleEl.textContent = category;

    const searchCat = category.toLowerCase().trim();
    const cart      = Store.getCart();
    const favorites = Store.getFavorites();
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');

    let filtered = allProducts.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
      }
      const itemCat = (item.category || '').toLowerCase().trim();
      const itemDay = (item.day || '').toLowerCase().trim();
      const dayMatch = !itemDay || itemDay === day.toLowerCase().trim();
      return itemCat === searchCat && dayMatch;
    });

    if (searchQuery) {
      if (titleEl) titleEl.textContent = `Поиск: "${searchQuery}"`;
      document.querySelector('.menu-controls-wrapper').style.display = 'none';
    }

    if (filtered.length === 0) {
      menuGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #a49ab8; padding: 40px 0;">По вашему запросу ничего не найдено.</p>`;
      return;
    }

    menuGrid.innerHTML = filtered.map(item => {
      const sid = String(item.id);
      const cartItem = cart.find(i => i.id === sid);
      const qty = cartItem ? cartItem.qty : 0;
      const isFav = favorites.includes(sid);

      const actionButton = qty > 0
        ? `<div class="qty-counter" data-id="${sid}">
             <button type="button" class="qty-btn minus" data-action="minus">−</button>
             <input type="number" class="qty-input" data-action="input" data-id="${sid}" value="${qty}" min="1" max="99">
             <button type="button" class="qty-btn plus" data-action="plus">+</button>
           </div>`
        : `<button class="add-cart" data-action="add" data-id="${sid}" aria-label="Добавить в корзину">
             <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
           </button>`;

      return `
        <article class="product-card" data-card-id="${sid}">
          <div class="product-image-wrap" data-product="${sid}" role="button" tabindex="0" aria-label="Подробнее: ${item.name}">
            <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/600x600/21182e/c8a9ff?text=Блюдо'">
          </div>
          <button class="favorite-button ${isFav ? 'active' : ''}" data-action="favorite" data-id="${sid}" aria-label="В избранное">
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
              <div class="card-action-container">${actionButton}</div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function updateCardUI(id, newQty, isFav) {
    const card = menuGrid.querySelector(`[data-card-id="${id}"]`);
    if (!card) return;
    const favBtn = card.querySelector('.favorite-button');
    if (favBtn && isFav !== undefined) favBtn.classList.toggle('active', isFav);

    const container = card.querySelector('.card-action-container');
    if (!container) return;

    if (newQty > 0) {
      container.innerHTML = `
        <div class="qty-counter" data-id="${id}">
          <button type="button" class="qty-btn minus" data-action="minus">−</button>
          <input type="number" class="qty-input" data-action="input" data-id="${id}" value="${newQty}" min="1" max="99">
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

  menuGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !btn.dataset.action) return;
    e.preventDefault();
    e.stopPropagation();

    const card = btn.closest('.product-card');
    if (!card) return;
    const id = String(card.dataset.cardId);
    if (!id) return;
    const product = allProducts.find(p => String(p.id) === id);

    if (btn.dataset.action === 'favorite') {
      const isFav = Store.toggleFavorite(id);
      updateCardUI(id, undefined, isFav);
      if (window.showToast && product) {
        const msg = isFav ? `«${product.name}» добавлен в избранное` : `«${product.name}» удалён из избранного`;
        window.showToast(msg, isFav ? 'success' : 'error', product.image);
      }
      return;
    }

    if (btn.dataset.action === 'add' || btn.dataset.action === 'plus') {
      Store.addToCart(id, +1);
      if (window.showToast && product) {
        window.showToast(`«${product.name}» добавлен в корзину`, 'success', product.image);
      }
    } else if (btn.dataset.action === 'minus') {
      const currentQty = Store.getCartQty(id);
      if (currentQty > 0) {
        Store.addToCart(id, -1);
        if (window.showToast && product) {
          window.showToast(`«${product.name}» удалён из корзины`, 'error', product.image);
        }
      }
    }

    updateCardUI(id, Store.getCartQty(id));
  });

  menuGrid.addEventListener('change', (e) => {
    if (e.target.classList.contains('qty-input')) {
      const id = e.target.dataset.id;
      let newQty = parseInt(e.target.value, 10);
      if (isNaN(newQty) || newQty < 1) newQty = 1;
      if (newQty > 99) newQty = 99;

      const cart = Store.getCart();
      const item = cart.find(i => i.id === String(id));
      if (item) {
        item.qty = newQty;
        Store.saveCart(cart);
        updateCardUI(id, newQty);
      }
    }
  });

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