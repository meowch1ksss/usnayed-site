document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('ordersList');
  const clearBtn = document.getElementById('clearOrdersBtn');
  const clearWrapper = document.getElementById('clearOrdersWrapper');
  
  const STORAGE_KEY = 'nyxora:orders';

  // 1. Получаем заказы
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
      
      // Правильное формирование списка товаров (название слева, кол-во и сумма справа)
      const itemsHtml = order.items.map(i => `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed rgba(220, 204, 255, 0.1);">
          <div style="flex: 1; padding-right: 20px;">
            <div style="color: #f6f1ff; font-weight: 600; font-size: 15px;">${i.name}</div>
            <div style="color: #a49ab8; font-size: 13px; margin-top: 4px;">${i.qty} шт.</div>
          </div>
          <div style="font-weight: 700; color: #a879ff; font-size: 16px; white-space: nowrap;">
            ${Number(i.price) * Number(i.qty)} ₽
          </div>
        </div>
      `).join('');
      
      return `
        <article class="order-card">
          <div class="order-header">
            <div>
              <div class="order-number">Заказ ${order.number}</div>
              <div class="order-date">${date}</div>
            </div>
            <div class="order-status">${order.status || 'Принят'}</div>
          </div>
          
          <div class="order-items">
            ${itemsHtml}
          </div>

          <div class="order-bottom">
            <div class="order-client">
              <strong>${order.name || 'Покупатель'}</strong> · ${order.city || 'Город не указан'}
            </div>
            <div class="order-total">${order.total} ₽</div>
          </div>
        </article>
      `;
    }).join('');
  }

  // 4. Очистка истории
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Вы уверены, что хотите удалить всю историю заказов? Это действие нельзя отменить.')) {
        localStorage.removeItem(STORAGE_KEY);
        validOrders.length = 0;
        renderOrders();
      }
    });
  }

  renderOrders();
});