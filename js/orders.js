document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('ordersList');
  const clearBtn = document.getElementById('clearOrdersBtn');
  const clearWrapper = document.getElementById('clearOrdersWrapper');
  
  const currentUser = Store.getUser();

  // 1. Если не авторизован — показываем заглушку
  if (!currentUser) {
    if (clearWrapper) clearWrapper.style.display = 'none';
    if (list) {
      list.innerHTML = `
        <div class="empty-cart" style="max-width: 600px; margin: 0 auto;">
          <h3>История заказов доступна только авторизованным</h3>
          <p>Пожалуйста, войдите в свой профиль, чтобы видеть историю заказов и повторять их.</p>
          <a href="profile.html" class="button button-primary">Перейти в профиль</a>
        </div>
      `;
    }
    return;
  }

  // 2. Функция загрузки с сервера
  async function loadOrders() {
    if (!list) return;
    list.innerHTML = '<p style="text-align: center; color: #a49ab8; padding: 40px 0;">Загрузка истории...</p>';
    if (clearWrapper) clearWrapper.style.display = 'none';

    try {
      // Ищем заказы по email текущего пользователя
      const res = await Store.apiFetch(`${APP_CONFIG.API.orders}?email=${encodeURIComponent(currentUser.email)}`);
      if (!res.ok) throw new Error('server');
      const orders = await res.json();

      if (!Array.isArray(orders) || !orders.length) {
        list.innerHTML = `<p style="text-align: center; color: #a49ab8; padding: 40px 0;">Вы пока не сделали ни одного заказа.</p>`;
        return;
      }

      list.innerHTML = orders.map(order => {
        const date = new Date(order.date).toLocaleString('ru-RU', { 
          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        const itemsHtml = order.items.map(i => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed rgba(220, 204, 255, 0.1);">
            <div style="flex: 1; padding-right: 15px;">
              <div style="color: #f6f1ff; font-weight: 600; font-size: 15px; line-height: 1.4;">${i.name}</div>
              <div style="color: #a49ab8; font-size: 13px; margin-top: 4px;">${i.qty} шт.</div>
            </div>
            <div style="font-weight: 700; color: #a879ff; font-size: 16px; white-space: nowrap;">
              ${Number(i.price) * Number(i.qty)} ₽
            </div>
          </div>
        `).join('');
        
        return `
          <article class="order-card" style="margin-bottom: 20px; padding: 24px; border: 1px solid rgba(220, 204, 255, 0.1); border-radius: 16px; background: rgba(255,255,255,0.02);">
            <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid rgba(220,204,255,0.1); padding-bottom: 15px;">
              <div>
                <div class="order-number" style="font-size: 20px; font-weight: 800; color: #f6f1ff;">Заказ ${order.number}</div>
                <div class="order-date" style="font-size: 13px; color: #a49ab8; margin-top: 5px;">${date}</div>
              </div>
              <div class="order-status" style="background: rgba(183, 255, 112, 0.1); color: #b7ff70; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;">${order.status || 'Принят'}</div>
            </div>
            
            <div class="order-items" style="display: block; margin-bottom: 20px;">
              ${itemsHtml}
            </div>

            <div class="order-bottom" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(220,204,255,0.1); padding-top: 15px;">
              <div class="order-client" style="font-size: 13px; color: #a49ab8;">
                <strong>${order.name || 'Покупатель'}</strong> · ${order.city || 'Город не указан'}
              </div>
              <div style="display: flex; align-items: center; gap: 15px;">
                <button onclick='repeatOrder(${JSON.stringify(order).replace(/'/g, "&#39;")})' class="button button-quiet" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 13px; border: 1px solid rgba(168, 121, 255, 0.3); color: #c6a6ff;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 1l4 4-4 4"></path>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <path d="M7 23l-4-4 4-4"></path>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                  </svg>
                  Повторить
                </button>
                <div class="order-total" style="font-size: 24px; font-weight: 800; color: #a879ff;">${order.total} ₽</div>
              </div>
            </div>
          </article>
        `;
      }).join('');
      
    } catch (err) {
      console.error(err);
      list.innerHTML = `<p style="text-align: center; color: #ff6d78; padding: 40px 0;">Ошибка загрузки истории заказов.</p>`;
    }
  }

  // 3. Очистка (для теста)
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const confirmOverlay = document.getElementById('confirmOverlay');
      if (confirmOverlay) {
        confirmOverlay.classList.add('open');
        document.getElementById('confirmDelete').onclick = () => {
          localStorage.removeItem('nyxora:orders');
          if (list) list.innerHTML = `<p style="text-align: center; color: #a49ab8; padding: 40px 0;">История очищена.</p>`;
          confirmOverlay.classList.remove('open');
        };
        document.getElementById('confirmCancel').onclick = () => confirmOverlay.classList.remove('open');
      }
    });
  }

  // Функция для кнопки "Повторить"
  window.repeatOrder = function(order) {
    if (!order || !order.items) return;
    const newCart = order.items.map(i => ({ id: i.id, qty: i.qty }));
    Store.saveCart(newCart);
    
    if (window.showToast) window.showToast('Заказ добавлен в корзину!', 'success');
    setTimeout(() => location.href = 'cart.html', 500);
  };

  loadOrders();
});