// js/cart.js
document.addEventListener('DOMContentLoaded', () => {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotalPrice      = document.getElementById('cartTotalPrice');
  const clearCartBtn        = document.getElementById('clearCartBtn');
  const checkoutBtn         = document.getElementById('checkoutBtn');
  const products = window.LUNCH_DATA?.products ?? [];

  Store.updateBadges();

  function renderCart() {
    const cart = Store.getCart();
    const favs = Store.getFavorites();

    if (!cart.length) {
      cartItemsContainer.innerHTML = `<div class="empty-cart"><h3>Ваша корзина пуста</h3><p>Самое время добавить что-нибудь вкусное!</p><a href="menu.html" class="button button-primary">Перейти в меню</a></div>`;
      if (cartTotalPrice) cartTotalPrice.textContent = '0 ₽';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }
    if (checkoutBtn) checkoutBtn.disabled = false;

    let total = 0;
    cartItemsContainer.innerHTML = cart.map(({ id, qty }) => {
      const p = products.find(x => String(x.id) === id);
      if (!p) return '';
      total += p.price * qty;
      const isFav = favs.includes(id);
      return `
        <article class="cart-item">
          <div class="cart-item-img" style="background-image:url('${ProductCard.esc(p.image)}')"></div>
          <div class="cart-item-info">
            <h3 style="margin:0 0 6px;font-size:15px;line-height:1.3;">${ProductCard.esc(p.name)}</h3>
            <p style="margin:0;font-size:13px;color:#a49ab8;">${ProductCard.esc(p.weight || '')} · ${ProductCard.esc(p.category)}</p>
          </div>
          <div class="cart-item-controls">
            ${ProductCard.renderAction(id, qty)}
            <div class="cart-item-price">${p.price * qty} ₽</div>
            <button type="button" class="cart-fav-btn ${isFav ? 'active' : ''}" data-action="favorite" data-id="${id}"
                    title="${isFav ? 'Убрать из избранного' : 'В избранное'}">
              <svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></svg>
            </button>
            <button type="button" class="remove-btn" data-action="remove" data-id="${id}">Удалить</button>
          </div>
        </article>`;
    }).join('');
    if (cartTotalPrice) cartTotalPrice.textContent = `${total} ₽`;
  }

  // ВСЕ действия (включая remove) через единый биндер ProductCard
  ProductCard.bind(cartItemsContainer, {
    onAdd: (id, p) => {
      ProductCard.defaultAdd(cartItemsContainer, id, p);
      renderCart();
    },
    onPlus: (id, p) => {
      ProductCard.defaultAdd(cartItemsContainer, id, p);
      renderCart();
    },
    onMinus: (id, p) => {
      ProductCard.defaultMinus(cartItemsContainer, id, p);
      renderCart();
    },
    onInput: (id, p, el) => {
      ProductCard.defaultInput(cartItemsContainer, id, p, el);
      renderCart();
    },
    onFavorite: (id, p) => {
      const isFav = Store.toggleFavorite(id);
      renderCart();
      if (window.showToast && p) {
        window.showToast(
          isFav ? `«${p.name}» добавлен в избранное` : `«${p.name}» удалён из избранного`,
          isFav ? 'success' : 'error',
          p.image
        );
      }
    },
    onRemove: (id, p) => {
      Store.removeFromCart(id);
      if (window.showToast && p) {
        window.showToast(`«${p.name}» удалён из корзины`, 'error', p.image);
      }
      renderCart();
    },
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