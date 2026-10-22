// js/cart.js
// Требует: js/config.js, js/store.js (подключены ДО этого файла).
document.addEventListener('DOMContentLoaded', () => {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotalPrice      = document.getElementById('cartTotalPrice');
  const clearCartBtn        = document.getElementById('clearCartBtn');
  const checkoutBtn         = document.getElementById('checkoutBtn');

  const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];

  // Бейджи — единая точка
  Store.updateBadges();

  // ============================================================
  // ОТРИСОВКА
  // ============================================================
  function renderCart() {
    const cart = Store.getCart(); // всегда свежие

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart">
          <h3>Ваша корзина пуста</h3>
          <p>Самое время добавить что-нибудь вкусное!</p>
          <a href="menu.html" class="button button-primary">Перейти в меню</a>
        </div>`;
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

      return `
        <article class="cart-item">
          <div class="cart-item-img" style="background-image: url('${product.image}');"></div>
          <div class="cart-item-info">
            <h3>${product.name}</h3>
            <p>${product.weight || ''} · ${product.category}</p>
          </div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button type="button" data-cart-action="minus" data-id="${id}">−</button>
              <span>${qty}</span>
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

  // ============================================================
  // ДЕЙСТВИЯ (делегирование вместо inline onclick)
  // ============================================================
  cartItemsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cart-action]');
    if (!btn) return;

    e.preventDefault();
    const id = btn.dataset.id;
    const action = btn.dataset.cartAction;

    if (action === 'plus')   Store.addToCart(id, +1);
    if (action === 'minus')  Store.addToCart(id, -1);
    if (action === 'remove') Store.removeFromCart(id);

    renderCart();
  });

  // ============================================================
  // ОЧИСТКА КОРЗИНЫ
  // ============================================================
  clearCartBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Вы уверены, что хотите очистить корзину?')) {
      Store.clearCart();
      renderCart();
    }
  });

  // ============================================================
  // ПЕРЕХОД К ОФОРМЛЕНИЮ
  // ============================================================
  checkoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (Store.getCart().length > 0) location.href = 'checkout.html';
  });

  renderCart();
});