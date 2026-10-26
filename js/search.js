// js/search.js
document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  if (!searchForm || !searchInput) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'search-dropdown hidden';
  searchForm.appendChild(dropdown);

  const products = window.LUNCH_DATA?.products ?? [];

  function updateDropdown() {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) { dropdown.classList.add('hidden'); return; }

    const results = products
      .filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)))
      .slice(0, 6);

    if (!results.length) {
      dropdown.innerHTML = `<div class="search-empty">Ничего не найдено по запросу "${ProductCard.esc(searchInput.value)}"</div>`;
    } else {
      dropdown.innerHTML = results.map(item => {
        const sid = String(item.id);
        const isFav = Store.isFavorite(sid);
        const qty = Store.getCartQty(sid);
        return `
          <div class="search-result-item">
            <a href="menu.html?search=${encodeURIComponent(q)}" class="search-result-link">
              <img src="${ProductCard.esc(item.image)}" alt="${ProductCard.esc(item.name)}"
                   onerror="this.src='https://placehold.co/100x100/21182e/c8a9ff?text=Фото'">
              <div class="search-result-info">
                <div class="search-result-name">${ProductCard.esc(item.name)}</div>
                <div class="search-result-price">${item.price} ₽ <span>· ${ProductCard.esc(item.weight || '')}</span></div>
              </div>
            </a>
            <div class="search-result-actions">
              <button class="search-fav-btn ${isFav ? 'active' : ''}" data-action="favorite" data-id="${sid}" title="В избранное">
                <svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></svg>
              </button>
              <div class="search-qty-wrap">${ProductCard.renderAction(sid, qty)}</div>
            </div>
          </div>`;
      }).join('') +
      `<a href="menu.html?search=${encodeURIComponent(q)}" class="search-all-btn">Показать все результаты →</a>`;
    }
    dropdown.classList.remove('hidden');
  }

  searchInput.addEventListener('input', updateDropdown);

  ProductCard.bind(dropdown, {
    onAdd:   (id, p) => { ProductCard.defaultAdd(dropdown, id, p); updateDropdown(); },
    onPlus:  (id, p) => { ProductCard.defaultAdd(dropdown, id, p); updateDropdown(); },
    onMinus: (id, p) => { ProductCard.defaultMinus(dropdown, id, p); updateDropdown(); },
    onInput: (id, p, el) => { ProductCard.defaultInput(dropdown, id, p, el); updateDropdown(); },
    onFavorite: (id, p) => { ProductCard.defaultFavorite(dropdown, id, p); updateDropdown(); },
  });

  document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) dropdown.classList.add('hidden');
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q) location.href = `menu.html?search=${encodeURIComponent(q)}`;
  });
});