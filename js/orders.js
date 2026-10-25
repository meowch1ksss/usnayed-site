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

  // 2. Загрузка заказов
  async function loadOrders() {
    if (!list) return;
    list.innerHTML = '<p style="text-align: center; color: #a49ab8; padding: 40px 0;">Загрузка истории...</p>';
    if (clearWrapper) clearWrapper.style.display = 'none';

    try {
      const res = await Store.apiFetch(`${APP_CONFIG.API.orders}?email=${encodeURIComponent(currentUser.email)}`);
      if (!res.ok) throw new Error('server');
      const orders = await res.json();

      if (!Array.isArray(orders) || !orders.length) {
        list.innerHTML = `<p style="text-align: center; color: #a49ab8; padding: 40px 0;">Вы пока не сделали ни одного заказа.</p>`;
        return;
      }

      if (clearWrapper) clearWrapper.style.display = 'block';

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
          <article class="user-order-card" id="order-${order.number}">
            <!-- Шапка заказа (всегда видна) -->
            <div class="user-order-header" onclick="document.getElementById('order-${order.number}').classList.toggle('open')">
              <div class="user-order-title">
                <h3>Заказ ${order.number}</h3>
                <span class="user-order-date">${date}</span>
              </div>
              <div class="user-order-total">
                ${order.total} ₽ <span class="arrow">▼</span>
              </div>
            </div>

            <!-- Скрытые детали -->
            <div class="user-order-details">
              <div class="user-order-details-inner">
                <div class="user-order-items">
                  <small style="color: #a49ab8; display: block; margin-bottom: 8px;">Состав заказа:</small>
                  ${itemsHtml}
                </div>
                
                <div class="user-order-footer">
                  <div class="user-order-client">
                    <strong>${order.name || 'Покупатель'}</strong> · ${order.city || 'Город не указан'}
                  </div>
                  <button onclick='repeatOrder(${JSON.stringify(order).replace(/'/g, "&#39;")})' class="button button-quiet" style="padding: 8px 16px; font-size: 13px; border: 1px solid rgba(168, 121, 255, 0.3); color: #c6a6ff;">
                    🔄 Повторить
                  </button>
                </div>
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

  // 3. Очистка
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const confirmOverlay = document.getElementById('confirmOverlay');
      if (confirmOverlay) {
        confirmOverlay.classList.add('open');
        document.getElementById('confirmDelete').onclick = () => {
          localStorage.removeItem('nyxora:orders');
          if (list) list.innerHTML = `<p style="text-align: center; color: #a49ab8; padding: 40px 0;">История очищена.</p>`;
          confirmOverlay.classList.remove('open');
          if (clearWrapper) clearWrapper.style.display = 'none';
        };
        document.getElementById('confirmCancel').onclick = () => confirmOverlay.classList.remove('open');
      }
    });
  }

  // 4. Повторить заказ
  window.repeatOrder = function(order) {
    if (!order || !order.items) return;
    const newCart = order.items.map(i => ({ id: i.id, qty: i.qty }));
    Store.saveCart(newCart);
    
    if (window.showToast) window.showToast('Заказ добавлен в корзину!', 'success');
    setTimeout(() => location.href = 'cart.html', 500);
  };

  loadOrders();
});