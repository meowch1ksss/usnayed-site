// js/ui/product-card.js
// Единый рендер карточки товара + счётчика количества + делегированные обработчики.
// Требует: js/store.js (Store), js/data.js (window.LUNCH_DATA)
(() => {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const cartSvg = `<svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>`;
  const heartSvg = `<svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></svg>`;

  /* ---------- рендер блока действий (кнопка / счётчик) ---------- */
  function renderAction(id, qty) {
    const sid = String(id);
    if (qty > 0) {
      return `
        <div class="qty-counter" data-id="${sid}">
          <button type="button" class="qty-btn minus" data-action="minus">−</button>
          <input type="number" class="qty-input" data-action="input" data-id="${sid}" value="${qty}" min="1" max="99">
          <button type="button" class="qty-btn plus" data-action="plus">+</button>
        </div>`;
    }
    return `
      <button class="add-cart" data-action="add" data-id="${sid}" aria-label="В корзину">
        ${cartSvg}
      </button>`;
  }

  /* ---------- рендер всей карточки ---------- */
  // opts: { favorite: bool, onRemoveFavorite: bool, showFavoriteBtn: bool }
  function renderProductCard(item, opts = {}) {
    const sid = String(item.id);
    const qty = Store.getCartQty(sid);
    const isFav = opts.favorite ?? Store.isFavorite(sid);
    const showFavBtn = opts.showFavoriteBtn !== false;
    const showRemoveFav = opts.onRemoveFavorite === true;

    return `
      <article class="product-card" data-card-id="${sid}">
        <div class="product-image-wrap" data-product="${sid}" role="button" tabindex="0" aria-label="Подробнее: ${esc(item.name)}">
          <img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy"
               onerror="this.onerror=null;this.src='https://placehold.co/600x600/21182e/c8a9ff?text=Блюдо'">
        </div>

        ${showFavBtn ? `
          <button class="favorite-button ${isFav ? 'active' : ''}"
                  data-action="favorite" data-id="${sid}"
                  aria-label="${isFav ? 'Убрать из избранного' : 'В избранное'}"
                  aria-pressed="${isFav}">
            ${heartSvg}
          </button>` : ''}

        ${showRemoveFav ? `
          <button class="favorite-card-remove" data-action="remove-favorite" data-id="${sid}" aria-label="Удалить из избранного">✕</button>` : ''}

        <div class="product-info" style="padding: 20px;">
          <div class="product-category">${esc(item.category)}</div>
          <div class="product-title" style="font-size: 15px; margin-bottom: 8px;">${esc(item.name)}</div>
          <p style="font-size: 12px; color: var(--muted); margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${esc(item.description || '')}</p>
          <div class="product-bottom">
            <div class="price-block">
              <span class="product-price">${item.price} ₽</span>
              <span class="old-price" style="margin-left: 8px;">${esc(item.weight || '')}</span>
            </div>
            <div class="card-action-container">${renderAction(sid, qty)}</div>
          </div>
        </div>
      </article>`;
  }

  /* ---------- обновить только блок действий + состояние избранного ---------- */
  function updateActionUI(grid, id, { qty, favorite } = {}) {
    const card = grid.querySelector(`[data-card-id="${id}"]`);
    if (!card) return;

    if (qty !== undefined) {
      const container = card.querySelector('.card-action-container');
      if (container) container.innerHTML = renderAction(id, qty);
    }
    if (favorite !== undefined) {
      const favBtn = card.querySelector('.favorite-button');
      if (favBtn) {
        favBtn.classList.toggle('active', favorite);
        favBtn.setAttribute('aria-pressed', String(favorite));
        favBtn.setAttribute('aria-label', favorite ? 'Убрать из избранного' : 'В избранное');
      }
    }
  }

  /* ---------- делегированные обработчики ---------- */
  // handlers: { onAdd, onMinus, onPlus, onInput, onFavorite, onRemoveFavorite }
  // onAdd/onMinus/... получают (id, product)
  function bindProductGrid(grid, handlers = {}) {
    if (!grid) return;

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const product = findProduct(id);

      switch (action) {
        case 'add':
          handlers.onAdd?.(id, product);
          break;
        case 'plus':
          handlers.onPlus?.(id, product);
          break;
        case 'minus':
          handlers.onMinus?.(id, product);
          break;
        case 'favorite':
          handlers.onFavorite?.(id, product);
          break;
        case 'remove-favorite':
          handlers.onRemoveFavorite?.(id, product);
          break;
      }
    });

    grid.addEventListener('change', (e) => {
      if (!e.target.classList.contains('qty-input')) return;
      const id = e.target.dataset.id;
      const product = findProduct(id);
      handlers.onInput?.(id, product, e.target);
    });
  }

  function findProduct(id) {
    const products = window.LUNCH_DATA?.products ?? [];
    return products.find(p => String(p.id) === String(id));
  }

  /* ---------- универсальные хелперы для обработчиков ---------- */
  // Стандартное поведение: добавить/убавить/ввести кол-во + тост
  function defaultAdd(grid, id, product, toast = window.showToast) {
    Store.addToCart(id, +1);
    updateActionUI(grid, id, { qty: Store.getCartQty(id) });
    if (toast && product) toast(`«${product.name}» добавлен в корзину`, 'success', product.image);
  }
  function defaultMinus(grid, id, product, toast = window.showToast) {
    if (Store.getCartQty(id) > 0) {
      Store.addToCart(id, -1);
      updateActionUI(grid, id, { qty: Store.getCartQty(id) });
      if (toast && product) toast(`«${product.name}» удалён из корзины`, 'error', product.image);
    }
  }
  function defaultInput(grid, id, _product, inputEl) {
    let q = parseInt(inputEl.value, 10);
    if (isNaN(q) || q < 1) q = 1;
    if (q > 99) q = 99;
    const cart = Store.getCart();
    const item = cart.find(i => i.id === String(id));
    if (item) { item.qty = q; Store.saveCart(cart); }
    updateActionUI(grid, id, { qty: q });
  }
  function defaultFavorite(grid, id, product, toast = window.showToast) {
    const isFav = Store.toggleFavorite(id);
    updateActionUI(grid, id, { favorite: isFav });
    if (toast && product) {
      toast(
        isFav ? `«${product.name}» добавлен в избранное` : `«${product.name}» удалён из избранного`,
        isFav ? 'success' : 'error',
        product.image
      );
    }
    return isFav;
  }

  window.ProductCard = {
    render: renderProductCard,
    renderAction,
    updateUI: updateActionUI,
    bind: bindProductGrid,
    find: findProduct,
    esc,
    // хелперы
    defaultAdd, defaultMinus, defaultInput, defaultFavorite,
  };
})();