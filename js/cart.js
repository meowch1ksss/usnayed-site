document.addEventListener('DOMContentLoaded', () => {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotalPrice      = document.getElementById('cartTotalPrice');
  const clearCartBtn        = document.getElementById('clearCartBtn');
  const checkoutBtn         = document.getElementById('checkoutBtn');
  const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];

  Store.updateBadges();

  function renderCart() {
    const cart = Store.getCart(); 
    const favorites = Store.getFavorites();

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<div class="empty-cart"><h3>Ваша корзина пуста</h3><p>Самое время добавить что-нибудь вкусное!</p><a href="menu.html" class="button button-primary">Перейти в меню</a></div>`;
      if (cartTotalPrice) cartTotalPrice.textContent = '0 ₽';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }
    if (checkoutBtn) checkoutBtn.disabled = false;

    let totalPrice = 0;
    cartItemsContainer.innerHTML = cart.map(({ id, qty }) => {
      const product = products.find(p => String(p.id) === id);
      if (!product) return '';
      
      const itemTotal = product.price * qty;
      totalPrice += itemTotal;
      
      // Проверяем, есть ли товар в избранном
      const isFav = favorites.includes(id);

      return `
        <article class="cart-item">
          <div class="cart-item-img" style="background-image: url('${product.image}');"></div>
          <div class="cart-item-info">
            <div class="cart-item-header">
              <h3>${product.name}</h3>
              <button class="cart-fav-btn ${isFav ? 'active' : ''}" data-cart-action="favorite" data-id="${id}" title="${isFav ? 'Убрать из избранного' : 'В избранное'}">
                <svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></svg>
              </button>
            </div>
            <p>${product.weight || ''} · ${product.category}</p>
          </div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button type="button" data-cart-action="minus" data-id="${id}">−</button>
              <input type="number" class="qty-input" data-cart-action="input" data-id="${id}" value="${qty}" min="1" max="99">
              <button type="button" data-cart-action="plus" data-id="${id}">+</button>
            </div>
            <div class="cart-item-price">${itemTotal} ₽</div>
            <button type="button" class="remove-btn" data-cart-action="remove" data-id="${id}">Удалить</button>
          </div>
        </article>
      `;
    }).join('');
    if (cartTotalPrice) cartTotalPrice.textContent = `${totalPrice} ₽`;
  }

  cartItemsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cart-action]');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.id;
    const action = btn.dataset.cartAction;
    const product = products.find(p => String(p.id) === id);
    const img = product ? product.image : null;
    const name = product ? product.name : 'Товар';

    if (action === 'favorite') {
      const isFav = Store.toggleFavorite(id);
      // Перерисовываем корзину, чтобы обновить иконку
      renderCart();
      if (window.showToast) {
        window.showToast(
          isFav ? `«${name}» добавлен в избранное` : `«${name}» удалён из избранного`, 
          isFav ? 'success' : 'error', 
          img
        );
      }
      return;
    }

    if (action === 'plus') {
      Store.addToCart(id, +1);
      if (window.showToast) window.showToast(`«${name}» добавлен в корзину`, 'success', img);
      renderCart();
    }
    if (action === 'minus') {
      const currentQty = Store.getCartQty(id);
      if (currentQty > 0) {
        Store.addToCart(id, -1);
        if (window.showToast) window.showToast(`«${name}» удалён из корзины`, 'error', img);
      }
      renderCart();
    }
    if (action === 'remove') {
      Store.removeFromCart(id);
      if (window.showToast) window.showToast(`«${name}» удалён из корзины`, 'error', img);
      renderCart();
    }
  });

  cartItemsContainer.addEventListener('change', (e) => {
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
        renderCart();
      }
    }
  });

  clearCartBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Вы уверены, что хотите очистить корзину?')) {
      Store.clearCart();
      renderCart();
    }
  });

  checkoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (Store.getCart().length > 0) location.href = 'checkout.html';
  });

  renderCart();
});