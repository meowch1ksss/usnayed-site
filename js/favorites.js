// js/favorites.js
// Требует: js/config.js, js/store.js (подключены ДО этого файла).
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('favoritesGrid');
  const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];

  // Бейджи — единая точка
  Store.updateBadges();

  // ============================================================
  // ОТРИСОВКА
  // ============================================================
  function renderFavorites() {
    if (!grid) return;

    const favorites = Store.getFavorites();
    if (favorites.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #a49ab8; padding: 40px 0;">В избранном пока пусто.</p>`;
      return;
    }

    const items = products.filter(p => favorites.includes(String(p.id)));
    const cart  = Store.getCart();

    grid.innerHTML = items.map(item => {
      const sid = String(item.id);
      const cartItem = cart.find(i => i.id === sid);
      const qty = cartItem ? cartItem.qty : 0;

      const actionButton = qty > 0
        ? `<div class="qty-counter" data-id="${sid}">
             <button type="button" class="qty-btn minus" data-action="minus">−</button>
             <span class="qty-value">${qty}</span>
             <button type="button" class="qty-btn plus" data-action="plus">+</button>
           </div>`
        : `<button class="add-cart" data-action="add" data-id="${sid}" aria-label="В корзину">
             <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
           </button>`;

      return `
        <article class="product-card" data-card-id="${sid}">
          <div class="product-image-wrap" style="background-image: url('${item.image}'); background-size: cover; background-position: center;"></div>

          <button class="favorite-card-remove" data-id="${sid}" aria-label="Удалить">✕</button>

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
  function updateCardUI(id, newQty) {
    const card = grid.querySelector(`[data-card-id="${id}"]`);
    if (!card) return;

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
        <button class="add-cart" data-action="add" data-id="${id}" aria-label="В корзину">
          <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
        </button>
      `;
    }
  }

  // ============================================================
  // КЛИКИ
  // ============================================================
  grid.addEventListener('click', (e) => {
    // 1. Удаление из избранного
    const removeBtn = e.target.closest('.favorite-card-remove');
    if (removeBtn) {
      const id = String(removeBtn.dataset.id);
      const product = products.find(p => String(p.id) === id);
      
      Store.toggleFavorite(id);
      renderFavorites();
      
      if (window.showToast && product) {
        window.showToast('Удалено из избранного', 'error', product.image);
      }
      return;
    }

    // 2. Корзина
    const btn = e.target.closest('button');
    if (btn && btn.dataset.action) {
      e.preventDefault();
      e.stopPropagation();

      const card = btn.closest('.product-card');
      if (!card) return;
      const id = String(card.dataset.cardId);
      if (!id) return;
      
      const product = products.find(p => String(p.id) === id);

      if (btn.dataset.action === 'add' || btn.dataset.action === 'plus') {
        Store.addToCart(id, +1);
        if (window.showToast && product) {
          window.showToast('Добавлено в корзину', 'success', product.image);
        }
      } else if (btn.dataset.action === 'minus') {
        Store.addToCart(id, -1);
      }

      updateCardUI(id, Store.getCartQty(id));
    }
  });

  renderFavorites();
});