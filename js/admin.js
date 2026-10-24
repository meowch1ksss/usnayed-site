// js/admin.js
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = Store.getUser();
  const accessDenied = document.getElementById('accessDenied');
  const adminPanel   = document.getElementById('adminPanel');

  if (!currentUser || currentUser.isAdmin !== true) {
    accessDenied?.classList.remove('hidden');
    adminPanel?.classList.add('hidden');
    return;
  }

  accessDenied?.classList.add('hidden');
  adminPanel?.classList.remove('hidden');
  document.getElementById('adminUserName').textContent = currentUser.username || 'Администратор';

  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const escapeAttr = (s) => String(s ?? '').replace(/["'<>&]/g, c => (
    { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]
  ));

  function adminHeaders(extra = {}) {
    const token = sessionStorage.getItem('nyxora:adminToken');
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }

  async function adminFetch(url, options = {}) {
    const opts = {
      ...options,
      headers: { ...adminHeaders(), ...(options.headers || {}) },
    };
    return Store.apiFetch(url, opts);
  }

  function showAdminToast(message, type = 'success') {
    if (typeof window.showToast === 'function') return window.showToast(message, type);
    let region = document.getElementById('admin-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'admin-toast-region';
      region.className = 'toast-region';
      document.body.appendChild(region);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '!'}</span><span>${escapeHTML(message)}</span>`;
    region.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); }, 3000);
  }

  let activeTab = 'orders';
  const pageTitle = document.getElementById('adminPageTitle');
  const tabContent = document.getElementById('adminTabContent');

  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderTab();
    });
  });

  function renderTab() {
    if (activeTab === 'orders') {
      pageTitle.textContent = 'Заказы';
      renderOrders();
    } else if (activeTab === 'reviews') {
      pageTitle.textContent = 'Отзывы на модерации';
      renderReviews();
    } else if (activeTab === 'menu') {
      pageTitle.textContent = 'Управление меню';
      renderMenuUpload();
    }
  }

  // 3. ЗАКАЗЫ
  async function renderOrders() {
    tabContent.innerHTML = '<div class="admin-empty">Загрузка заказов...</div>';
    try {
      const res = await adminFetch(APP_CONFIG.API.orders);
      if (res.status === 401) {
        tabContent.innerHTML = '<div class="admin-empty" style="color:#ff6d78;">Нет доступа. Вы не админ.</div>';
        return;
      }
      const orders = await res.json();
      window.ordersData = orders; // Сохраняем для функции печати

      if (!orders.length) { tabContent.innerHTML = '<div class="admin-empty">Заказов пока нет.</div>'; return; }

      tabContent.innerHTML = orders.map(o => {
        const isJur = (o.payerType || o.payer_type || '').includes('Юр');
        
        let deliveryText = 'Курьером';
        if (o.deliveryMethod === 'pickup') deliveryText = 'Самовывоз';

        let paymentText = 'Наличные';
        if (isJur) {
          paymentText = 'Банковский перевод';
        } else {
          if (o.paymentMethod === 'sber') paymentText = 'Сбербанк (перевод)';
          if (o.paymentMethod === 'bank') paymentText = 'Банковский перевод';
        }

        let cData = {};
        try {
          if (o.companyData) cData = typeof o.companyData === 'string' ? JSON.parse(o.companyData) : o.companyData;
          else if (o.company_data) cData = typeof o.company_data === 'string' ? JSON.parse(o.company_data) : o.company_data;
        } catch (e) { console.error('Ошибка парсинга companyData', e); }

        let detailsHtml = '';
        
        if (isJur) {
          detailsHtml = `
            <li><strong>Желаемое время доставки:</strong> ${escapeHTML(o.deliveryTime || o.delivery_time || '—')}</li>
            <li><strong>Компания:</strong> ${escapeHTML(o.name || '—')}</li>
            <li><strong>Юридический адрес:</strong> ${escapeHTML(cData.legalAddress || '—')}</li>
            <li><strong>ИНН:</strong> ${escapeHTML(cData.inn || '—')}</li>
            <li><strong>КПП:</strong> ${escapeHTML(cData.kpp || '—')}</li>
            <li><strong>Телефон:</strong> ${escapeHTML(o.phone || '—')}</li>
            <li><strong>Email:</strong> ${escapeHTML(o.email || '—')}</li>
            <li><strong>Факс:</strong> ${escapeHTML(cData.fax || '—')}</li>
            <li><strong>Контактное лицо:</strong> ${escapeHTML(cData.contactPerson || '—')}</li>
            <li><strong>Адрес доставки:</strong> ${escapeHTML(o.address || '—')}</li>
            <li><strong>Город:</strong> ${escapeHTML(o.city || '—')}</li>
            <li><strong>Комментарий:</strong> ${escapeHTML(o.comment || '—')}</li>
            <li><strong>Тип доставки:</strong> ${deliveryText}</li>
            <li><strong>Оплата:</strong> ${paymentText}</li>
          `;
        } else {
          detailsHtml = `
            <li><strong>Желаемое время доставки:</strong> ${escapeHTML(o.deliveryTime || o.delivery_time || '—')}</li>
            <li><strong>ФИО:</strong> ${escapeHTML(o.name || '—')}</li>
            <li><strong>Email:</strong> ${escapeHTML(o.email || '—')}</li>
            <li><strong>Телефон:</strong> ${escapeHTML(o.phone || '—')}</li>
            <li><strong>Адрес доставки:</strong> ${escapeHTML(o.address || '—')}</li>
            <li><strong>Город:</strong> ${escapeHTML(o.city || '—')}</li>
            <li><strong>Комментарий:</strong> ${escapeHTML(o.comment || '—')}</li>
            <li><strong>Тип доставки:</strong> ${deliveryText}</li>
            <li><strong>Оплата:</strong> ${paymentText}</li>
          `;
        }

        return `
        <div class="admin-order-card">
          <div class="admin-order-header" onclick="this.parentElement.classList.toggle('open')">
            <div class="admin-order-title">
              <h3>Заказ ${escapeHTML(o.number || '—')}</h3>
              <span class="admin-order-date">${o.date ? new Date(o.date).toLocaleString('ru-RU') : '—'}</span>
            </div>
            <div class="admin-order-price">
              ${o.total || 0} ₽ <span class="arrow">▼</span>
            </div>
          </div>

          <div class="admin-order-details">
            <div class="admin-order-details-inner">
              <div class="admin-order-info">
                <ul class="admin-details-list" style="list-style: none; padding: 0; margin: 0 0 20px 0; color: #b5a9c6; font-size: 14px; line-height: 1.8;">
                  ${detailsHtml}
                </ul>
                <hr style="border: none; border-top: 1px dashed rgba(220, 204, 255, 0.2); margin: 20px 0;">
                <div class="admin-order-items">
                  <small style="color: #a49ab8; display: block; margin-bottom: 8px;">Состав заказа:</small>
                  <ul style="list-style: none; padding: 0; margin: 0; color: #f6f1ff; font-size: 14px;">
                    ${(o.items || []).map(i => `
                      <li style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                        <span>${escapeHTML(i.name || '—')}</span>
                        <span style="color:#a879ff;">${Number(i.qty || 0)} шт. × ${Number(i.price || 0)} ₽</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>

                <div style="margin-top: 20px; text-align: right;">
                  <button class="admin-btn admin-btn-primary" onclick="printOrder('${escapeAttr(o.number)}')" style="font-size: 13px; padding: 8px 16px;">
                    🖨 Распечатать чек
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      tabContent.innerHTML = '<div class="admin-empty" style="color:#ff6d78;">Ошибка загрузки заказов.</div>';
    }
  }

  // 4. ОТЗЫВЫ
  async function renderReviews() {
    tabContent.innerHTML = '<div class="admin-empty">Загрузка отзывов...</div>';
    try {
      const res = await adminFetch(`${APP_CONFIG.API.reviews}?status=pending`);
      if (res.status === 401) {
        tabContent.innerHTML = '<div class="admin-empty" style="color:#ff6d78;">Нет доступа к отзывам. Войдите как администратор.</div>';
        return;
      }
      if (!res.ok) throw new Error('server');
      const pending = await res.json();

      if (!Array.isArray(pending) || !pending.length) {
        tabContent.innerHTML = '<div class="admin-empty">Нет отзывов на модерации.</div>';
        return;
      }

      tabContent.innerHTML = pending.map(r => `
        <div class="admin-card">
          <h3>${escapeHTML(r.name || 'Гость')}</h3>
          <p>${escapeHTML(r.text || '')}</p>
          <small>${r.date ? new Date(r.date).toLocaleString('ru-RU') : '—'}</small>
          <div class="admin-actions">
            <button class="admin-btn-success" data-review-action="approve" data-review-id="${escapeAttr(r.id)}">✓ Одобрить</button>
            <button class="admin-btn-danger"  data-review-action="reject"  data-review-id="${escapeAttr(r.id)}">✕ Отклонить</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
      tabContent.innerHTML = '<div class="admin-empty" style="color:#ff6d78;">Ошибка загрузки отзывов. Проверьте интернет.</div>';
    }
  }

  tabContent.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-review-action]');
    if (!btn) return;

    const id = btn.dataset.reviewId;
    const action = btn.dataset.reviewAction;
    const status = action === 'approve' ? 'approved' : 'rejected';

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = '...';

    try {
      const res = await adminFetch(APP_CONFIG.API.review(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) { showAdminToast('Нет прав', 'error'); return; }
      if (!res.ok) throw new Error('server');

      showAdminToast(action === 'approve' ? 'Отзыв опубликован' : 'Отзыв отклонён', action === 'approve' ? 'success' : 'error');
      renderReviews();
    } catch {
      showAdminToast('Ошибка при обработке отзыва', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // 5. ЗАГРУЗКА МЕНЮ
  function renderMenuUpload() {
    tabContent.innerHTML = `
      <div class="admin-card">
        <h3>🤖 ИИ-загрузка меню</h3>
        <p>Загрузите файл (JSON, CSV, TXT, XLSX, DOCX, PNG, JPG) или вставьте текст. ИИ разберёт блюда, цены и категории.</p>
        <div class="admin-dropzone" id="adminDropzone">
          <div class="admin-dropzone-icon">📎</div>
          <div class="admin-dropzone-text">Перетащите файл сюда или нажмите</div>
          <div class="admin-dropzone-hint">JSON · CSV · TXT · XLSX · DOCX · PNG · JPG</div>
          <input type="file" id="adminFileInput" accept=".json,.csv,.txt,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.webp" hidden>
        </div>
        <textarea class="admin-textarea" id="adminMenuText" placeholder="…или вставьте текст меню вручную. Формат: 'Название блюда — 250'"></textarea>
        <button class="admin-btn admin-btn-primary" id="adminProcessBtn" style="width:100%;">🚀 Обработать меню</button>
        <div class="admin-status" id="adminStatus"></div>
      </div>
    `;

    const dropzone  = document.getElementById('adminDropzone');
    const fileInput = document.getElementById('adminFileInput');
    const menuText  = document.getElementById('adminMenuText');
    const processBtn = document.getElementById('adminProcessBtn');
    const status    = document.getElementById('adminStatus');

    let pendingFiles = [];

    function showStatus(msg, type) {
      status.textContent = msg;
      status.className = `admin-status show ${type}`;
    }

    dropzone.addEventListener('click', () => fileInput.click());
    ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, e => {
      e.preventDefault(); dropzone.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => {
      e.preventDefault(); dropzone.classList.remove('dragover');
    }));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length) { pendingFiles = files; showStatus(`Выбран файл: ${files[0].name}`, 'success'); }
    });
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files);
      if (files.length) { pendingFiles = files; showStatus(`Выбран файл: ${files[0].name}`, 'success'); }
    });

    processBtn.addEventListener('click', async () => {
      const text = menuText.value.trim();
      if (!text && !pendingFiles.length) {
        showStatus('Загрузите файл или вставьте текст меню', 'error');
        return;
      }

      showStatus('🤖 Обрабатываю...', 'success');
      processBtn.disabled = true;

      try {
        let items = [];
        if (text) {
          const lines = text.split('\n').filter(l => l.trim());
          lines.forEach(line => {
            const m = line.match(/^(.+?)[\s—–-]+(\d+)\s*(₽|руб)?/);
            if (m) {
              items.push({
                id: 'MENU-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                name: m[1].trim(),
                price: Number(m[2]),
                category: 'Обеды в офис',
                day: 'понедельник',
                description: 'Добавлено через админ-панель',
              });
            }
          });
        }

        if (!items.length) throw new Error('Не удалось распознать блюда. Формат: "Название — 250"');
        const existing = JSON.parse(localStorage.getItem('nyxora:menu') || '[]');
        const updated  = [...existing, ...items];
        localStorage.setItem('nyxora:menu', JSON.stringify(updated));

        showStatus(`✓ Добавлено блюд: ${items.length}`, 'success');
        menuText.value = '';
        pendingFiles = [];
        fileInput.value = '';
      } catch (err) {
        showStatus(`❌ ${err.message}`, 'error');
      } finally {
        processBtn.disabled = false;
      }
    });
  }

  document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    Store.clearUser();
    sessionStorage.removeItem('nyxora:adminToken');
    window.location.reload();
  });

  renderTab();
});

// ============================================================
// ФУНКЦИЯ ПЕЧАТИ ЧЕКА/НАКЛАДНОЙ
// ============================================================
window.printOrder = function(orderNumber) {
  const orders = window.ordersData || [];
  const order = orders.find(o => o.number === orderNumber);
  if (!order) return;

  const printWindow = window.open('', '', 'width=700,height=800');
  const allProducts = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];

  let itemsHtml = (order.items || []).map(i => {
    const prod = allProducts.find(p => String(p.id) === String(i.id));
    const weight = prod ? prod.weight : '—';
    return `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid #ccc;">${i.name}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #ccc; text-align: center;">${weight}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #ccc; text-align: center;">${i.qty} шт.</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #ccc; text-align: right;">${i.price * i.qty} ₽</td>
    </tr>
  `}).join('');

  let detailsHtml = '';
  if (order.payerType && order.payerType.includes('Юр')) {
    let c = {};
    try { c = JSON.parse(order.companyData || order.company_data); } catch(e){}
    detailsHtml = `
      <div><strong>Тип:</strong> Юридическое лицо</div>
      <div><strong>Компания:</strong> ${order.name || '—'}</div>
      <div><strong>ИНН:</strong> ${c.inn || '—'} / <strong>КПП:</strong> ${c.kpp || '—'}</div>
      <div><strong>Юр. адрес:</strong> ${c.legalAddress || '—'}</div>
    `;
  } else {
    detailsHtml = `
      <div><strong>Тип:</strong> Физическое лицо</div>
      <div><strong>Клиент:</strong> ${order.name || '—'}</div>
    `;
  }

  const deliveryTimeStr = order.deliveryTime || order.delivery_time || '—';
  const paymentStr = order.paymentMethod === 'bank' ? 'Банковский перевод' : (order.paymentMethod === 'sber' ? 'Сбербанк (перевод)' : 'Наличные');
  const deliveryMethodStr = order.deliveryMethod === 'pickup' ? 'Самовывоз' : 'Курьером';
  const orderDate = new Date(order.date).toLocaleString('ru-RU');

  printWindow.document.write(`
    <html>
      <head>
        <title>Чек ${order.number}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 30px; color: #000; max-width: 700px; margin: 0 auto; }
          h1 { font-size: 22px; text-align: center; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;}
          .subtitle { text-align: center; font-size: 14px; color: #555; margin-bottom: 25px; }
          .info-block { margin-bottom: 25px; font-size: 14px; line-height: 1.6; }
          .info-block div { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
          th { text-align: left; padding: 8px; border-bottom: 2px solid #000; font-weight: bold; }
          th:nth-child(2), th:nth-child(3) { text-align: center; }
          th:nth-child(4) { text-align: right; }
          .total-row { font-size: 18px; font-weight: bold; text-align: right; padding-top: 20px; }
          .footer { margin-top: 40px; text-align: center; font-size: 14px; font-weight: bold; border-top: 1px dashed #ccc; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>Накладная на заказ</h1>
        <div class="subtitle">Заказ №${order.number} от ${orderDate}</div>
        
        <div class="info-block">
          ${detailsHtml}
          <div><strong>Телефон:</strong> ${order.phone || '—'}</div>
          <div><strong>Адрес доставки:</strong> г. ${order.city || '—'}, ${order.address || '—'}</div>
          <div><strong>Желаемое время доставки:</strong> ${deliveryTimeStr}</div>
          <div><strong>Тип доставки:</strong> ${deliveryMethodStr}</div>
          <div><strong>Вид оплаты:</strong> ${paymentStr}</div>
          ${order.comment ? `<div><strong>Комментарий:</strong> ${order.comment}</div>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Наименование</th>
              <th>Порция</th>
              <th>Кол-во</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="total-row">
          Итого к оплате: ${order.total} ₽
        </div>
        
        <div class="footer">
          Спасибо большое за заказ! Ждём вас снова.
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};