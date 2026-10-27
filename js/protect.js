(function() {
  const isLocalFile = window.location.protocol === 'file:';
  
  if (isLocalFile) {
    const disableApp = () => {
      // Красивая плашка сверху
      const banner = document.createElement('div');
      banner.innerHTML = '⚠️ Сайт открыт локально. Функции заказа, корзины и избранного отключены.';
      banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0;
        background: linear-gradient(90deg, #7c3aed, #a879ff);
        color: #fff; text-align: center; padding: 12px;
        font-weight: 700; font-size: 14px; z-index: 999999;
        font-family: 'Manrope', sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        pointer-events: none;
        transform: translateY(-100%);
        animation: slideDown 0.5s forwards;
      `;
      
      // Анимация выпадения
      const style = document.createElement('style');
      style.innerHTML = `
        @keyframes slideDown { to { transform: translateY(0); } }
        body { padding-top: 45px !important; }
      `;
      document.head.appendChild(style);
      document.body.appendChild(banner);

      // Блокировка кликов
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, a, .add-cart, .qty-btn, .favorite-button, form');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          
          // Используем наш красивый тост
          if (typeof window.showToast === 'function') {
            window.showToast('Действия заблокированы. Сайт открыт локально.', 'error');
          }
        }
      }, true);

      // Блокировка форм
      document.querySelectorAll('form').forEach(f => {
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          if (typeof window.showToast === 'function') {
            window.showToast('Отправка форм заблокирована.', 'error');
          }
        });
      });

      // Делаем кнопки полупрозрачными
      const btnStyle = document.createElement('style');
      btnStyle.innerHTML = `
        .add-cart, .qty-btn, .favorite-button, button[type="submit"], .button-primary { 
          pointer-events: none !important; 
          opacity: 0.5 !important; 
          cursor: not-allowed !important;
        }
      `;
      document.head.appendChild(btnStyle);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', disableApp);
    } else {
      disableApp();
    }
  }
})();