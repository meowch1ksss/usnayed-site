document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  if (!searchForm || !searchInput) return;

  const searchDropdown = document.createElement('div');
  searchDropdown.className = 'search-dropdown hidden';
  searchForm.appendChild(searchDropdown);

  function updateDropdown() {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length < 2) {
      searchDropdown.classList.add('hidden');
      return;
    }

    const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];
    const results = products.filter(p => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query))).slice(0, 6);

    if (results.length === 0) {
      searchDropdown.innerHTML = `<div class="search-empty">Ничего не найдено по запросу "${searchInput.value}"</div>`;
    } else {
      searchDropdown.innerHTML = results.map(item => {
        const sid = String(item.id);
        const isFav = Store.isFavorite(sid);
        const qty = Store.getCartQty(sid);

        const cartBtn = qty > 0 
          ? `<div class="search-qty">
               <button data-action="minus" data-id="${sid}">−</button>
               <input type="number" class="qty-input" data-action="input" data-id="${sid}" value="${qty}" min="1" max="99">
               <button data-action="plus" data-id="${sid}">+</button>
             </div>`
          : `<button class="search-add-btn" data-action="add" data-id="${sid}" title="В корзину">
               <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
             </button>`;

        return `
        <div class="search-result-item">
          <a href="menu.html?search=${encodeURIComponent(query)}" class="search-result-link">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://placehold.co/100x100/21182e/c8a9ff?text=Фото'">
            <div class="search-result-info">
              <div class="search-result-name">${item.name}</div>
              <div class="search-result-price">${item.price} ₽ <span>· ${item.weight || ''}</span></div>
            </div>
          </a>
          <div class="search-result-actions">
            <button class="search-fav-btn ${isFav ? 'active' : ''}" data-action="fav" data-id="${sid}" title="В избранное">
              <svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></svg>
            </button>
            ${cartBtn}
          </div>
        </div>
        `;
      }).join('');

      searchDropdown.innerHTML += `<a href="menu.html?search=${encodeURIComponent(query)}" class="search-all-btn">Показать все результаты →</a>`;
    }
    searchDropdown.classList.remove('hidden');
  }

  searchInput.addEventListener('input', updateDropdown);

  searchDropdown.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    e.preventDefault(); 
    e.stopPropagation();

    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const product = window.LUNCH_DATA.products.find(p => String(p.id) === id);
    const img = product ? product.image : null;

    if (action === 'fav') {
      const isFav = Store.toggleFavorite(id);
      if (window.showToast) {
        window.showToast(isFav ? 'Добавлено в избранное' : 'Удалено из избранного', isFav ? 'success' : 'error', img);
      }
    } 
    else if (action === 'add' || action === 'plus') {
      Store.addToCart(id, +1);
      if (window.showToast) window.showToast('Добавлено в корзину', 'success', img);
    } 
    else if (action === 'minus') {
      const currentQty = Store.getCartQty(id);
      if (currentQty > 0) {
        Store.addToCart(id, -1);
        if (window.showToast) window.showToast('Удалено из корзины', 'error', img);
      }
    }
    
    // Обновляем дропдаун, чтобы обновить кнопки
    updateDropdown();
  });

  searchDropdown.addEventListener('change', (e) => {
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
        updateDropdown();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) searchDropdown.classList.add('hidden');
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q) location.href = `menu.html?search=${encodeURIComponent(q)}`;
  });
});