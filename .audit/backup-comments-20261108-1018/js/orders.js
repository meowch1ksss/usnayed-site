document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('ordersList');
  const clearBtn = document.getElementById('clearOrdersBtn');
  const clearWrapper = document.getElementById('clearOrdersWrapper');
  
  const currentUser = Store.getUser();

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

  async function loadOrders() {
    if (!list) return;
    list.innerHTML = '<p style="text-align: center; color: #a49ab8; padding: 40px 0;">Загрузка истории...</p>';
    if (clearWrapper) clearWrapper.style.display = 'none';

    try {
      const res = await Store.apiFetch(APP_CONFIG.API.orders + '?email=' + encodeURIComponent(currentUser.email));
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
        
        const totalQty = order.items.reduce((sum, i) => sum + Number(i.qty), 0);

        const itemsHtml = order.items.map(i => `
          <div class="order-item-row">
            <span class="order-item-name">${i.name}</span>
            <span class="order-item-qty">${i.qty} шт.</span>
            <span class="order-item-price">${Number(i.price) * Number(i.qty)} ₽</span>
          </div>
        `).join('');

        return `
          <article class="user-order-card" id="order-${order.number}">
            <div class="user-order-header" onclick="document.getElementById('order-${order.number}').classList.toggle('open')">
              <div class="user-order-title">
                <h3><span class="user-order-num">Заказ №${order.number}</span><span class="user-order-status">выполнен</span></h3>
                <span class="user-order-date">${date} · ${totalQty} шт.</span>
              </div>
              <div class="user-order-total">
                ${order.total} ₽ <span class="arrow">▼</span>
              </div>
            </div>

            <div class="user-order-details">
              <div class="user-order-details-inner">
                <div class="user-order-items">
                  <small class="user-order-items-title">Состав заказа</small>
                  ${itemsHtml}
                </div>

                <div class="user-order-footer">
                  <div class="user-order-client">
                    <strong>${order.name || 'Покупатель'}</strong> · ${order.city || 'Город не указан'}
                  </div>
                  <button onclick='window.repeatOrder(${JSON.stringify(order).replace(/'/g, "&#39;")})' class="button button-quiet user-order-repeat">
                    ↻ Повторить
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

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const confirmOverlay = document.getElementById('confirmOverlay');
      if (confirmOverlay) {
        confirmOverlay.classList.add('open');
        document.getElementById('confirmDelete').onclick = async () => {
          confirmOverlay.classList.remove('open');
          
          // Если нужно чистить локально (в базе мы чистим только через админку)
          Store.clearOrders();
          if (list) list.innerHTML = `<p style="text-align: center; color: #a49ab8; padding: 40px 0;">История очищена.</p>`;
          if (clearWrapper) clearWrapper.style.display = 'none';
        };
        document.getElementById('confirmCancel').onclick = () => confirmOverlay.classList.remove('open');
      }
    });
  }

  window.repeatOrder = function(order) {
    if (!order || !order.items) return;
    const newCart = order.items.map(i => ({ id: i.id, qty: i.qty }));
    Store.saveCart(newCart);
    
    if (window.showToast) window.showToast('Заказ добавлен в корзину!', 'success');
    setTimeout(() => location.href = 'cart.html', 500);
  };

  loadOrders();
});