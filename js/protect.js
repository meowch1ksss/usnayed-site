(function() {
  const isLocalFile = window.location.protocol === 'file:';
  const isProtectDisabled = localStorage.getItem('nyxora:disable_local_protect') === 'true';

  console.log('Проверка защиты: isLocalFile =', isLocalFile, ', isProtectDisabled =', isProtectDisabled);

  if (isLocalFile && !isProtectDisabled) {
    const disableApp = () => {
      // Удаляем скрипты карт Яндекса
      document.querySelectorAll('script[src*="api-maps.yandex.ru"]').forEach(s => s.remove());
      document.querySelectorAll('iframe').forEach(iframe => {
        if (iframe.src && iframe.src.includes('yandex')) iframe.remove();
      });

      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName, ...args) {
        const el = originalCreateElement(tagName, ...args);
        if (tagName.toLowerCase() === 'script') {
          const originalSetAttribute = el.setAttribute.bind(el);
          el.setAttribute = function(name, value) {
            if (name === 'src' && value.includes('yandex')) return;
            originalSetAttribute(name, value);
          };
        }
        return el;
      };

      // Заглушка для карты
      const mapStyle = document.createElement('style');
      mapStyle.innerHTML = `
        .map-wrapper, .contacts-layout > div[style*="background"] {
          background: #1c142b !important; position: relative;
        }
        .map-wrapper::after {
          content: '🔒 Карта недоступна'; position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          color: #a49ab8; font-size: 16px; font-weight: 700; background: #1c142b;
          border-radius: 19px; border: 1px solid rgba(183, 145, 255, 0.22);
        }
      `;
      document.head.appendChild(mapStyle);

      // Плашка сверху
      const banner = document.createElement('div');
      banner.innerHTML = '⚠️ Сайт открыт локально. Действия и загрузка изображений заблокированы.';
      banner.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(30, 22, 45, 0.95); backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 109, 120, 0.5); color: #ff6d78; text-align: center;
        padding: 10px 24px; border-radius: 30px; font-weight: 700; font-size: 13px;
        z-index: 1000000; font-family: 'Manrope', sans-serif; pointer-events: none;
        display: flex; align-items: center; gap: 8px; opacity: 0; transition: opacity 0.5s ease;
      `;
      document.body.appendChild(banner);
      requestAnimationFrame(() => { banner.style.opacity = '1'; });

      // Блокировка картинок
      const removeImages = () => {
        document.querySelectorAll('img').forEach(img => {
          img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          img.style.opacity = '0';
        });
        document.querySelectorAll('*').forEach(el => {
          if (el.style.backgroundImage && el.style.backgroundImage !== 'none') {
            el.style.backgroundImage = 'none';
            el.style.backgroundColor = '#1c142b';
          }
        });
      };
      removeImages();

      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.tagName === 'IMG') {
              node.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
              node.style.opacity = '0';
            }
            if (node.querySelectorAll) {
              node.querySelectorAll('img').forEach(img => {
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                img.style.opacity = '0';
              });
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Тост
      const showCustomAlert = (msg) => {
        const oldToast = document.getElementById('local-protect-toast');
        if (oldToast) oldToast.remove();
        const toast = document.createElement('div');
        toast.id = 'local-protect-toast';
        toast.innerHTML = `<div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; background: rgba(255, 109, 120, 0.2); color: #ff6d78; margin-right: 10px; flex-shrink: 0;">!</div><div>${msg}</div>`;
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
        }, 2500);
      };

      // Блокировка кликов
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