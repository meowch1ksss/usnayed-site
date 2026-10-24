document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('ordersList');
  const clearBtn = document.getElementById('clearOrdersBtn');
  const clearWrapper = document.getElementById('clearOrdersWrapper');
  
  const STORAGE_KEY = 'nyxora:orders';
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

  let orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  // 2. Фильтруем по дате (старше 30 дней удаляем)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const validOrders = orders.filter(order => {
    const orderDate = new Date(order.date);
    return orderDate >= thirtyDaysAgo;
  });

  if (validOrders.length !== orders.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validOrders));
  }

  // 3. Отображение
  function renderOrders() {
    if (!list) return;

    if (validOrders.length === 0) {
      list.innerHTML = `<p style="text-align: center; color: #a49ab8; padding: 40px 0;">Вы пока не сделали ни одного заказа.</p>`;
      if (clearWrapper) clearWrapper.style.display = 'none';
      return;
    }

    if (clearWrapper) clearWrapper.style.display = 'block';

    list.innerHTML = validOrders.map(order => {
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
              <button onclick="repeatOrder('${order.number}')" class="button button-quiet" style="padding: 8px 16px; font-size: 13px; border: 1px solid rgba(168, 121, 255, 0.3); color: #c6a6ff;">
                🔄 Повторить
              </button>
              <div class="order-total" style="font-size: 24px; font-weight: 800; color: #a879ff;">${order.total} ₽</div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // 4. Очистка с кастомным уведомлением
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const confirmOverlay = document.getElementById('confirmOverlay');
      const confirmDelete = document.getElementById('confirmDelete');
      const confirmCancel = document.getElementById('confirmCancel');

      if (confirmOverlay) {
        confirmOverlay.classList.add('open');
        
        // Временный слушатель для подтверждения
        const onConfirm = () => {
          localStorage.removeItem(STORAGE_KEY);
          validOrders.length = 0;
          renderOrders();
          confirmOverlay.classList.remove('open');
          confirmDelete.removeEventListener('click', onConfirm);
        };

        confirmDelete.addEventListener('click', onConfirm);
        confirmCancel.addEventListener('click', () => confirmOverlay.classList.remove('open'));
      } else {
        // Фоллбек на confirm
        if (confirm('Вы уверены, что хотите удалить всю историю заказов?')) {
          localStorage.removeItem(STORAGE_KEY);
          validOrders.length = 0;
          renderOrders();
        }
      }
    });
  }

  renderOrders();
});

// Функция для кнопки "Повторить"
window.repeatOrder = function(orderNumber) {
  const orders = JSON.parse(localStorage.getItem('nyxora:orders') || '[]');
  const order = orders.find(o => o.number === orderNumber);
  if (!order) return;

  // Заменяем текущую корзину на товары из заказа
  const newCart = order.items.map(i => ({ id: i.id, qty: i.qty }));
  Store.saveCart(newCart);
  
  if (window.showToast) window.showToast('Заказ добавлен в корзину!', 'success');
  setTimeout(() => location.href = 'cart.html', 500);
};