// js/menu.js
document.addEventListener('DOMContentLoaded', () => {
  const menuGrid = document.getElementById('menuGrid');
  const titleEl  = document.getElementById('categoryTitle');
  const allProducts = window.LUNCH_DATA?.products ?? [];

  let currentCategory = localStorage.getItem('currentCategory') || 'Завтраки';
  let currentDay = 'понедельник';

  Store.updateBadges();

  function getFiltered(category, day) {
    const searchQuery = new URLSearchParams(location.search).get('search');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return allProducts.filter(it =>
        it.name.toLowerCase().includes(q) ||
        (it.description && it.description.toLowerCase().includes(q))
      );
    }
    const cat = category.toLowerCase().trim();
    const d   = day.toLowerCase().trim();
    return allProducts.filter(it => {
      const itemCat = (it.category || '').toLowerCase().trim();
      const itemDay = (it.day || '').toLowerCase().trim();
      return itemCat === cat && (!itemDay || itemDay === d);
    });
  }

  function renderMenu(category, day) {
    if (!menuGrid) return;

    const searchQuery = new URLSearchParams(location.search).get('search');
    if (titleEl) {
      titleEl.textContent = searchQuery ? `Поиск: "${searchQuery}"` : category;
    }
    const controls = document.querySelector('.menu-controls-wrapper');
    if (controls) controls.style.display = searchQuery ? 'none' : '';

    const items = getFiltered(category, day);
    if (!items.length) {
      menuGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#a49ab8;padding:40px 0;">По вашему запросу ничего не найдено.</p>`;
      return;
    }
    menuGrid.innerHTML = items.map(it => ProductCard.render(it)).join('');
  }

  // Навешиваем обработчики (сработает только один раз при загрузке)
  ProductCard.bind(menuGrid, {
    onAdd:    (id, p) => ProductCard.defaultAdd(menuGrid, id, p),
    onPlus:   (id, p) => ProductCard.defaultAdd(menuGrid, id, p),
    onMinus:  (id, p) => ProductCard.defaultMinus(menuGrid, id, p),
    onInput:  (id, p, el) => ProductCard.defaultInput(menuGrid, id, p, el),
    onFavorite: (id, p) => ProductCard.defaultFavorite(menuGrid, id, p),
  });

  // Категории
  document.querySelectorAll('#categorySwitcher .category-switch').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category.toLowerCase() === currentCategory.toLowerCase());
  });

  document.getElementById('categorySwitcher')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-switch');
    if (!btn) return;
    currentCategory = btn.dataset.category;
    localStorage.setItem('currentCategory', currentCategory);
    document.querySelectorAll('#categorySwitcher .category-switch').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMenu(currentCategory, currentDay);
  });

  document.getElementById('categoryDayTabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.day-tab');
    if (!btn) return;
    currentDay = btn.dataset.day;
    document.querySelectorAll('#categoryDayTabs .day-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMenu(currentCategory, currentDay);
  });

  renderMenu(currentCategory, currentDay);
});