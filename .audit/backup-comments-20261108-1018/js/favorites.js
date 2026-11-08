// js/favorites.js
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('favoritesGrid');
  const products = window.LUNCH_DATA?.products ?? [];

  Store.updateBadges();

  function renderFavorites() {
    if (!grid) return;
    const favIds = Store.getFavorites();

    if (!favIds.length) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#a49ab8;padding:40px 0;">В избранном пока пусто.</p>`;
      return;
    }

    const items = products.filter(p => favIds.includes(String(p.id)));
    grid.innerHTML = items.map(it => ProductCard.render(it, {
      showFavoriteBtn: false,
      onRemoveFavorite: true,
    })).join('');
  }

  ProductCard.bind(grid, {
    onAdd:   (id, p) => ProductCard.defaultAdd(grid, id, p),
    onPlus:  (id, p) => ProductCard.defaultAdd(grid, id, p),
    onMinus: (id, p) => ProductCard.defaultMinus(grid, id, p),
    onInput: (id, p, el) => ProductCard.defaultInput(grid, id, p, el),

    // Специфично для избранного: удалить карточку + перерисовать
    onRemoveFavorite: (id, p) => {
      Store.toggleFavorite(id);
      renderFavorites();
      if (window.showToast && p) {
        window.showToast(`«${p.name}» удалён из избранного`, 'error', p.image);
      }
    },
  });

  renderFavorites();
});