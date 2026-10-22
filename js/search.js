document.addEventListener('DOMContentLoaded', () => {
  console.log('Скрипт поиска загружен!');
  
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  if (!searchForm || !searchInput) {
    console.error('Форма поиска не найдена на этой странице');
    return;
  }

  // Создаем выпадающий список
  const searchDropdown = document.createElement('div');
  searchDropdown.className = 'search-dropdown hidden';
  searchForm.appendChild(searchDropdown);

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length < 2) {
      searchDropdown.classList.add('hidden');
      return;
    }

    const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];
    const results = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query))
    ).slice(0, 6);

    if (results.length === 0) {
      searchDropdown.innerHTML = `<div class="search-empty">Ничего не найдено по запросу "${e.target.value}"</div>`;
    } else {
      searchDropdown.innerHTML = results.map(item => `
        <a href="menu.html?search=${encodeURIComponent(query)}" class="search-result-item">
          <img src="${item.image}" alt="${item.name}" onerror="this.src='https://placehold.co/100x100/21182e/c8a9ff?text=Фото'">
          <div class="search-result-info">
            <div class="search-result-name">${item.name}</div>
            <div class="search-result-price">${item.price} ₽ <span>· ${item.weight || ''}</span></div>
          </div>
        </a>
      `).join('');

      searchDropdown.innerHTML += `
        <a href="menu.html?search=${encodeURIComponent(query)}" class="search-all-btn">
          Показать все результаты →
        </a>
      `;
    }
    
    searchDropdown.classList.remove('hidden');
  });

  // Закрываем при клике вне
  document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) {
      searchDropdown.classList.add('hidden');
    }
  });

  // Обработка Enter
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q) location.href = `menu.html?search=${encodeURIComponent(q)}`;
  });
});