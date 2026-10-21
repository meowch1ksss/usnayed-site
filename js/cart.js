document.addEventListener('DOMContentLoaded', () => {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotalPrice = document.getElementById('cartTotalPrice');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const cartCountBadge = document.getElementById('cart-count');

  // Берем данные из localStorage
  let cart = JSON.parse(localStorage.getItem('nyxora:cart') || '[]');
  const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];

  // Приводим корзину к единому формату (id - строка, qty - число)
  cart = cart.map(item => ({
    id: String(item.id),
    qty: Number(item.qty || item.quantity || 1)
  })).filter(item => item.id && item.qty > 0);

  function saveCart() {
    localStorage.setItem('nyxora:cart', JSON.stringify(cart));
    updateHeaderBadge();
  }

  function updateHeaderBadge() {
    if (cartCountBadge) {
      const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
      cartCountBadge.textContent = totalCount || '';
    }
  }

  function renderCart() {
    updateHeaderBadge();

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart">
          <h3>Ваша корзина пуста</h3>
          <p>Самое время добавить что-нибудь вкусное!</p>
          <a href="menu.html" class="button button-primary">Перейти в меню</a>
        </div>
      `;
      if (cartTotalPrice) cartTotalPrice.textContent = '0 ₽';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (checkoutBtn) checkoutBtn.disabled = false;
    let totalPrice = 0;

    cartItemsContainer.innerHTML = cart.map(cartItem => {
      // Ищем товар, сравнивая ID как строки!
      const product = products.find(p => String(p.id) === String(cartItem.id));
      
      if (!product) {
        // Если товар не найден в базе, выводим заглушку
        return `<div style="color: #ff6d78; padding: 10px;">Товар с ID ${cartItem.id} не найден в базе.</div>`;
      }
      
      const itemTotal = product.price * cartItem.qty;
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
              <button type="button" onclick="changeQty('${product.id}', -1)">−</button>
              <span>${cartItem.qty}</span>
              <button type="button" onclick="changeQty('${product.id}', 1)">+</button>
            </div>
            <div class="cart-item-price">${itemTotal} ₽</div>
            <button type="button" class="remove-btn" onclick="removeItem('${product.id}')">Удалить</button>
          </div>
        </article>
      `;
    }).join('');

    if (cartTotalPrice) cartTotalPrice.textContent = `${totalPrice} ₽`;
  }

  // Делаем функции глобальными, чтобы onclick их видел
  window.changeQty = (id, delta) => {
    const item = cart.find(i => String(i.id) === String(id));
    if (item) {
      item.qty += delta;
      if (item.qty <= 0) {
        cart = cart.filter(i => String(i.id) !== String(id));
      }
      saveCart();
      renderCart();
    }
  };

  window.removeItem = (id) => {
    cart = cart.filter(i => String(i.id) !== String(id));
    saveCart();
    renderCart();
  };

  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if(confirm('Вы уверены, что хотите очистить корзину?')) {
        cart = [];
        saveCart();
        renderCart();
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (cart.length > 0) {
        window.location.href = 'checkout.html';
      }
    });
  }

  // Первая отрисовка
  renderCart();
});