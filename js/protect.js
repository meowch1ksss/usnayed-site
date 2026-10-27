(function() {
  const isLocalFile = window.location.protocol === 'file:';
  
  if (isLocalFile) {
    const disableApp = () => {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, a, .add-cart, .qty-btn, .favorite-button, form');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          alert('Действия заблокированы. Сайт открыт локально.');
        }
      }, true);

      document.querySelectorAll('form').forEach(f => {
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          alert('Отправка форм заблокирована.');
        });
      });

      const style = document.createElement('style');
      style.innerHTML = `
        body::before {
          content: "⚠️ ВНИМАНИЕ! Сайт открыт локально. Функции заказа, корзины и избранного отключены.";
          position: fixed;
          top: 0; left: 0; right: 0;
          background: #ff6d78;
          color: #fff;
          text-align: center;
          padding: 10px;
          font-weight: bold;
          z-index: 999999;
          font-family: sans-serif;
        }
        .add-cart, .qty-btn, .favorite-button, button[type="submit"], .button-primary { pointer-events: none; opacity: 0.5; }
      `;
      document.head.appendChild(style);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', disableApp);
    } else {
      disableApp();
    }
  }
})();