document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('favoritesGrid');
  const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];
  
  let favorites = JSON.parse(localStorage.getItem('nyxora:favorites') || '[]').map(String);

  // Обновляем бейджик в шапке при загрузке
  const favBadge = document.getElementById('favorite-count');
  if (favBadge) favBadge.textContent = favorites.length || '';

  // ============================================================
  // КОРЗИНА
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
  // ОТРИСОВКА
  // ============================================================
  function renderFavorites() {
    if (!grid) return;
    if (favorites.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #a49ab8; padding: 40px 0;">В избранном пока пусто.</p>`;
      return;
    }

    const items = products.filter(p => favorites.includes(String(p.id)));
    const cart = getCart(); // Получаем текущую корзину
    
    grid.innerHTML = items.map(item => {
      const cartItem = cart.find(i => i.id === String(item.id));
      const qty = cartItem ? cartItem.qty : 0;

      // Если товар в корзине, показываем плюс/минус, иначе иконку корзины
      const actionButton = qty > 0 
        ? `<div class="qty-counter" data-id="${item.id}">
             <button type="button" class="qty-btn minus" data-action="minus">−</button>
             <span class="qty-value">${qty}</span>
             <button type="button" class="qty-btn plus" data-action="plus">+</button>
           </div>`
        : `<button class="add-cart" data-action="add" data-id="${item.id}" aria-label="В корзину">
             <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
           </button>`;

      return `
        <article class="product-card" data-card-id="${item.id}">
          <div class="product-image-wrap" style="background-image: url('${item.image}'); background-size: cover; background-position: center;"></div>
          
          <button class="favorite-card-remove" data-id="${item.id}" aria-label="Удалить">✕</button>
          
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
      favorites = favorites.filter(f => f !== id);
      localStorage.setItem('nyxora:favorites', JSON.stringify(favorites));
      if (favBadge) favBadge.textContent = favorites.length || '';
      renderFavorites();
      return;
    }

    // 2. Работа с корзиной (плюс/минус/добавить)
    const btn = e.target.closest('button');
    if (btn && btn.dataset.action) {
      e.preventDefault();
      e.stopPropagation();
      
      const card = btn.closest('.product-card');
      const id = String(card.dataset.cardId);
      if (!id) return;

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

  renderFavorites();
});