document.addEventListener('DOMContentLoaded', () => {
  // 1. Проверка доступа
  const currentUser = JSON.parse(localStorage.getItem('nyxora:user') || 'null');
  
  if (!currentUser || currentUser.isAdmin !== true) {
    // Нет доступа
    document.getElementById('accessDenied').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    return;
  }

  // Есть доступ
  document.getElementById('accessDenied').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  document.getElementById('adminUserName').textContent = currentUser.username || 'Администратор';

  // ============================================================
  // ФУНКЦИЯ КРАСИВЫХ УВЕДОМЛЕНИЙ (ТОСТОВ)
  // ============================================================
  function showAdminToast(message, type = 'success') {
    let toastRegion = document.getElementById('admin-toast-region');
    
    if (!toastRegion) {
      toastRegion = document.createElement('div');
      toastRegion.id = 'admin-toast-region';
      toastRegion.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px;';
      document.body.appendChild(toastRegion);
    }

    const toast = document.createElement('div');
    const icon = type === 'success' ? '✓' : '✕';
    const bgColor = type === 'success' ? 'rgba(183, 255, 112, 0.15)' : 'rgba(255, 109, 120, 0.15)';
    const borderColor = type === 'success' ? 'rgba(183, 255, 112, 0.3)' : 'rgba(255, 109, 120, 0.3)';
    const iconColor = type === 'success' ? '#b7ff70' : '#ff6d78';

    toast.style.cssText = `
      display: flex; align-items: center; gap: 12px; 
      padding: 16px 20px; border-radius: 16px; 
      background: rgba(30, 22, 45, 0.95); 
      backdrop-filter: blur(10px);
      border: 1px solid ${borderColor}; 
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      color: #f6f1ff; font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 600;
      min-width: 250px; max-width: 350px;
      animation: slideInRight 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    `;

    toast.innerHTML = `
      <div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; background: ${bgColor}; color: ${iconColor};">${icon}</div>
      <div>${message}</div>
    `;

    if (!document.getElementById('toast-anim-style')) {
      const style = document.createElement('style');
      style.id = 'toast-anim-style';
      style.innerHTML = `
        @keyframes slideInRight { from { opacity: 0; transform: translateX(50px) scale(0.9); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes slideOutRight { from { opacity: 1; transform: translateX(0) scale(1); } to { opacity: 0; transform: translateX(50px) scale(0.9); } }
      `;
      document.head.appendChild(style);
    }

    toastRegion.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ============================================================

  // 2. Логика табов
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

  // 3. ЗАКАЗЫ (Оставляем в localStorage, так как это личные заказы пользователя)
  function renderOrders() {
    const orders = JSON.parse(localStorage.getItem('nyxora:orders') || '[]');
    
    if (!orders.length) {
      tabContent.innerHTML = '<div class="admin-empty">Заказов пока нет.</div>';
      return;
    }

    tabContent.innerHTML = orders.map(o => `
      <div class="admin-card">
        <h3>Заказ ${o.number || '—'} — ${o.total || 0} ₽</h3>
        <p>${new Date(o.date).toLocaleString('ru-RU')}</p>
        <p>Клиент: ${o.name || 'Не указан'} · Город: ${o.city || 'Не указан'}</p>
        <small>Состав: ${(o.items || []).map(i => `${i.name} × ${i.qty}`).join(', ')}</small>
      </div>
    `).join('');
  }

  // 4. ОТЗЫВЫ (Теперь через Cloudflare API)
  async function renderReviews() {
    tabContent.innerHTML = '<div class="admin-empty">Загрузка отзывов с сервера...</div>';
    
    try {
      const response = await fetch('https://usnayed-api.aleksejmaculin1.workers.dev/api/reviews?status=pending');
      const pending = await response.json();
      
      if (!pending.length) {
        tabContent.innerHTML = '<div class="admin-empty">Нет отзывов на модерации.</div>';
        return;
      }

      tabContent.innerHTML = pending.map(r => `
        <div class="admin-card">
          <h3>${r.name || 'Гость'}</h3>
          <p>${r.text || ''}</p>
          <small>${new Date(r.date).toLocaleString('ru-RU')}</small>
          <div class="admin-actions">
            <button class="admin-btn-success" onclick="approveReview('${r.id}')">✓ Одобрить</button>
            <button class="admin-btn-danger" onclick="rejectReview('${r.id}')">✕ Отклонить</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      tabContent.innerHTML = '<div class="admin-empty" style="color:#ff6d78;">Ошибка загрузки отзывов. Проверьте интернет.</div>';
    }
  }

  // Одобрить отзыв (PUT запрос на сервер)
  window.approveReview = async (id) => {
    try {
      await fetch(`https://usnayed-api.aleksejmaculin1.workers.dev/api/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      
      renderReviews(); // Перерисовываем список
      showAdminToast('Отзыв успешно опубликован!', 'success');
    } catch (err) {
      showAdminToast('Ошибка при публикации', 'error');
    }
  };

  // Отклонить отзыв (PUT запрос на сервер)
  window.rejectReview = async (id) => {
    try {
      await fetch(`https://usnayed-api.aleksejmaculin1.workers.dev/api/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      
      renderReviews();
      showAdminToast('Отзыв отклонён и удалён.', 'error');
    } catch (err) {
      showAdminToast('Ошибка при удалении', 'error');
    }
  };

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

    const dropzone = document.getElementById('adminDropzone');
    const fileInput = document.getElementById('adminFileInput');
    const menuText = document.getElementById('adminMenuText');
    const processBtn = document.getElementById('adminProcessBtn');
    const status = document.getElementById('adminStatus');

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
                description: 'Добавлено через админ-панель'
              });
            }
          });
        }

        if (!items.length) throw new Error('Не удалось распознать блюда. Формат: "Название — 250"');

        const existing = JSON.parse(localStorage.getItem('nyxora:menu') || '[]');
        const updated = [...existing, ...items];
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

  // 6. Кнопка выхода
  document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    localStorage.removeItem('nyxora:user');
    window.location.reload();
  });

  // Первый рендер
  renderTab();
});