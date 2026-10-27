(function() {
  const isLocalFile = window.location.protocol === 'file:';
  
  if (isLocalFile) {
    const disableApp = () => {
      const banner = document.createElement('div');
      banner.innerHTML = '⚠️ Сайт открыт локально. Функции заказа, корзины и избранного отключены.';
      banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0;
        background: linear-gradient(90deg, #ff6d78, #e53935);
        color: #fff; text-align: center; padding: 12px;
        font-weight: 700; font-size: 14px; z-index: 999999;
        font-family: 'Manrope', sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        pointer-events: none;
        transform: translateY(-100%);
        animation: slideDown 0.5s forwards;
      `;
      
      const style = document.createElement('style');
      style.innerHTML = `
        @keyframes slideDown { to { transform: translateY(0); } }
        body { padding-top: 45px !important; }
      `;
      document.head.appendChild(style);
      document.body.appendChild(banner);

      const showCustomAlert = (msg) => {
        const toast = document.createElement('div');
        toast.innerHTML = `<div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; background: rgba(255, 109, 120, 0.2); color: #ff6d78; margin-right: 10px;">!</div><div>${msg}</div>`;
        toast.style.cssText = `
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(20px);
          background: rgba(20, 15, 25, 0.95); backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); color: #fff;
          font-size: 13px; font-weight: 500; font-family: 'Manrope', sans-serif;
          display: flex; align-items: center; padding: 12px 16px; z-index: 1000000;
          opacity: 0; transition: all 0.3s ease; pointer-events: none;
        `;
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
          toast.style.transform = 'translateX(-50%) translateY(0)';
          toast.style.opacity = '1';
        });

        setTimeout(() => {
          toast.style.transform = 'translateX(-50%) translateY(20px)';
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      };

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, a, .add-cart, .qty-btn, .favorite-button, form');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          showCustomAlert('Действия заблокированы. Сайт открыт локально.');
        }
      }, true);

      document.querySelectorAll('form').forEach(f => {
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          showCustomAlert('Отправка форм заблокирована.');
        });
      });

      const btnStyle = document.createElement('style');
      btnStyle.innerHTML = `
        .add-cart, .qty-btn, .favorite-button, button[type="submit"], .button-primary { 
          pointer-events: none !important; opacity: 0.5 !important; cursor: not-allowed !important;
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