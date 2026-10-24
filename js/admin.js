// js/admin.js
// Требует: js/config.js, js/store.js (подключены ДО этого файла).
document.addEventListener('DOMContentLoaded', () => {
  // ============================================================
  // 1. ПРОВЕРКА ДОСТУПА (клиентская — для UX; реальная защита на воркере)
  // ============================================================
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

  // ============================================================
  // ХЕЛПЕРЫ
  // ============================================================
  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const escapeAttr = (s) => String(s ?? '').replace(/["'<>&]/g, c => (
    { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]
  ));

  // Authorization для админ-запросов (воркер проверяет Bearer)
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

  // ============================================================
  // ТОСТЫ (единый API — window.showToast из site.js, fallback ниже)
  // ============================================================
  function showAdminToast(message, type = 'success') {
    if (typeof window.showToast === 'function') return window.showToast(message, type);
    // fallback на случай, если site.js не подключён
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

  // ============================================================
  // 2. ТАБЫ
  // ============================================================
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
      if (!orders.length) { tabContent.innerHTML = '<div class="admin-empty">Заказов пока нет.</div>'; return; }

      tabContent.innerHTML = orders.map(o => `
        <div class="admin-order-card">
          <!-- Шапка заказа (всегда видна) -->
          <div class="admin-order-header" onclick="this.parentElement.classList.toggle('open')">
            <div class="admin-order-title">
              <h3>Заказ ${escapeHTML(o.number || '—')}</h3>
              <span class="admin-order-date">${o.date ? new Date(o.date).toLocaleString('ru-RU') : '—'}</span>
            </div>
            <div class="admin-order-price">
              ${o.total || 0} ₽ <span class="arrow">▼</span>
            </div>
          </div>

          <!-- Детали заказа (скрыты по умолчанию) -->
          <div class="admin-order-details">
            <div class="admin-order-info">
              <p>Клиент: <strong>${escapeHTML(o.name || 'Не указан')}</strong></p>
              <p>Телефон: ${escapeHTML(o.phone || 'Не указан')} · Город: ${escapeHTML(o.city || 'Не указан')}</p>
              <p>Адрес: ${escapeHTML(o.address || 'Не указан')}</p>
              ${o.comment ? `<p style="color:#ffaa00;">Комментарий: ${escapeHTML(o.comment)}</p>` : ''}
              ${o.deliveryTime ? `<p>Время доставки: ${escapeHTML(o.deliveryTime)}</p>` : ''}
              ${o.payerType ? `<p>Тип клиента: ${escapeHTML(o.payerType)}</p>` : ''}
              ${o.paymentMethod ? `<p>Оплата: ${escapeHTML(o.paymentMethod)}</p>` : ''}
            </div>

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
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
      tabContent.innerHTML = '<div class="admin-empty" style="color:#ff6d78;">Ошибка загрузки заказов.</div>';
    }
  }

  // ============================================================
  // 4. ОТЗЫВЫ
  // ============================================================
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

  // Делегирование вместо inline onclick (XSS-фикс)
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

      showAdminToast(
        action === 'approve' ? 'Отзыв опубликован' : 'Отзыв отклонён',
        action === 'approve' ? 'success' : 'error'
      );
      renderReviews();
    } catch {
      showAdminToast('Ошибка при обработке отзыва', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // ============================================================
  // 5. ЗАГРУЗКА МЕНЮ
  // ============================================================
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

  // ============================================================
  // 6. ВЫХОД
  // ============================================================
  document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    Store.clearUser();
    sessionStorage.removeItem('nyxora:adminToken');
    window.location.reload();
  });

  // ============================================================
  // Первый рендер
  // ============================================================
  renderTab();
});