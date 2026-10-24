document.addEventListener('DOMContentLoaded', () => {
  const loginBox = document.getElementById('loginBox');
  const registerBox = document.getElementById('registerBox');
  const userProfile = document.getElementById('userProfile');

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutBtn = document.getElementById('logoutBtn');

  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const userAvatarEl = document.getElementById('userAvatar');

  // Элементы редактирования
  const editProfileBtn = document.getElementById('editProfileBtn');
  const editProfileForm = document.getElementById('editProfileForm');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const updateForm = document.getElementById('updateForm');

  const adminLink = document.getElementById('adminLink');

  let currentUser = JSON.parse(localStorage.getItem('nyxora:user') || 'null');

  // ============================================================
  // 1. УВЕДОМЛЕНИЯ (ТОСТЫ)
  // ============================================================
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'success') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : '!';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div>${message}</div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ============================================================
  // 2. ГЕНЕРАТОР КАПЧИ
  // ============================================================
  const captchaCanvas = document.getElementById('captchaCanvas');
  const regCaptchaInput = document.getElementById('regCaptcha');
  let currentCaptchaCode = '';

  function generateCaptcha() {
    if (!captchaCanvas) return;
    const ctx = captchaCanvas.getContext('2d');
    const w = captchaCanvas.width;
    const h = captchaCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    currentCaptchaCode = '';
    for (let i = 0; i < 5; i++) {
      currentCaptchaCode += chars[Math.floor(Math.random() * chars.length)];
    }

    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(${Math.random()*100},${Math.random()*100},${Math.random()*100},${Math.random()*0.5})`;
      ctx.beginPath();
      ctx.arc(Math.random()*w, Math.random()*h, Math.random()*2, 0, Math.PI*2);
      ctx.fill();
    }

    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(${Math.random()*100},${Math.random()*100},${Math.random()*100}, 0.4)`;
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random()*w, Math.random()*h);
      ctx.bezierCurveTo(Math.random()*w, Math.random()*h, Math.random()*w, Math.random()*h, Math.random()*w, Math.random()*h);
      ctx.stroke();
    }

    for (let i = 0; i < currentCaptchaCode.length; i++) {
      ctx.save();
      const x = 20 + i * 30 + (Math.random() * 10 - 5);
      const y = 30 + (Math.random() * 10 - 5);
      const angle = (Math.random() * 0.6) - 0.3;

      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.font = `bold ${24 + Math.random() * 10}px 'Courier New', monospace`;
      ctx.fillStyle = `rgb(${Math.random()*80},${Math.random()*80},${Math.random()*80})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(currentCaptchaCode[i], 0, 0);
      ctx.restore();
    }
  }

  if (captchaCanvas) {
    captchaCanvas.addEventListener('click', () => {
      generateCaptcha();
      if (regCaptchaInput) regCaptchaInput.value = '';
    });
  }

  // ============================================================
  // 3. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
  // ============================================================
  function updateUI() {
    if (currentUser) {
      loginBox.classList.add('hidden');
      registerBox.classList.add('hidden');
      userProfile.classList.remove('hidden');

      userNameEl.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Пользователь';
      userEmailEl.textContent = currentUser.email || '';
      userAvatarEl.textContent = (currentUser.firstName || 'U').charAt(0).toUpperCase();

      if (adminLink) {
        adminLink.classList.toggle('hidden', !currentUser.isAdmin);
      }
    } else {
      loginBox.classList.remove('hidden');
      registerBox.classList.add('hidden');
      userProfile.classList.add('hidden');
      editProfileForm.classList.add('hidden');
      if (adminLink) adminLink.classList.add('hidden');
    }
  }

  // ============================================================
  // 4. РЕДАКТИРОВАНИЕ ПРОФИЛЯ
  // ============================================================
  editProfileBtn?.addEventListener('click', () => {
    editProfileForm.classList.remove('hidden');
    document.getElementById('editFirstName').value = currentUser.firstName || '';
    document.getElementById('editLastName').value = currentUser.lastName || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editPassword').value = '';
  });

  cancelEditBtn?.addEventListener('click', () => {
    editProfileForm.classList.add('hidden');
  });

  updateForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const newFirstName = document.getElementById('editFirstName').value.trim();
    const newLastName = document.getElementById('editLastName').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim();
    const newPassword = document.getElementById('editPassword').value;

    let users = JSON.parse(localStorage.getItem('nyxora:users') || '[]');

    const emailTaken = users.find(u => u.email === newEmail && u.login !== currentUser.login);
    if (emailTaken) {
      showToast('Этот email уже используется другим аккаунтом', 'error');
      return;
    }

    const userIndex = users.findIndex(u => u.login === currentUser.login);
    if (userIndex !== -1) {
      users[userIndex].firstName = newFirstName;
      users[userIndex].lastName = newLastName;
      users[userIndex].email = newEmail;

      if (newPassword) {
        if (newPassword.length < 6) {
          showToast('Новый пароль должен быть минимум 6 символов', 'error');
          return;
        }
        users[userIndex].password = newPassword;
      }

      localStorage.setItem('nyxora:users', JSON.stringify(users));

      currentUser = users[userIndex];
      localStorage.setItem('nyxora:user', JSON.stringify(currentUser));

      showToast('Данные профиля обновлены', 'success');
      editProfileForm.classList.add('hidden');
      updateUI();
    }
  });

  // ============================================================
  // 5. РЕГИСТРАЦИЯ
  // ============================================================
  registerForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const login = document.getElementById('regLogin').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    const captchaInput = document.getElementById('regCaptcha').value.trim().toUpperCase();

    if (password !== passwordConfirm) {
      showToast('Пароли не совпадают', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Пароль должен быть минимум 6 символов', 'error');
      return;
    }
    if (captchaInput !== currentCaptchaCode) {
      showToast('Неверный код с картинки', 'error');
      generateCaptcha();
      document.getElementById('regCaptcha').value = '';
      return;
    }

    let users = JSON.parse(localStorage.getItem('nyxora:users') || '[]');

    if (users.find(u => u.login === login)) {
      showToast('Пользователь с таким логином уже существует', 'error');
      return;
    }
    if (users.find(u => u.email === email)) {
      showToast('Пользователь с таким email уже существует', 'error');
      return;
    }

    const newUser = { firstName, lastName, login, email, password, isAdmin: false };
    users.push(newUser);
    localStorage.setItem('nyxora:users', JSON.stringify(users));

    currentUser = newUser;
    localStorage.setItem('nyxora:user', JSON.stringify(currentUser));

    showToast('Регистрация успешна! Добро пожаловать!', 'success');
    updateUI();
  });

  // ============================================================
  // 6. ВХОД
  // ============================================================
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailOrLogin = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // СПЕЦ-ВХОД АДМИНИСТРАТОРА: admin / admin
    if (emailOrLogin === 'admin' && password === 'admin') {
      let users = JSON.parse(localStorage.getItem('nyxora:users') || '[]');
      let adminUser = users.find(u => u.login === 'admin');

      if (!adminUser) {
        adminUser = {
          firstName: 'Администратор',
          lastName: '',
          login: 'admin',
          username: 'admin',
          email: 'admin@usnayed.ru',
          password: 'admin',
          isAdmin: true
        };
        users.push(adminUser);
      } else {
        adminUser.isAdmin = true;
        adminUser.password = 'admin';
        adminUser.username = 'admin';
      }
      localStorage.setItem('nyxora:users', JSON.stringify(users));

      currentUser = { ...adminUser, username: 'admin', isAdmin: true };
      localStorage.setItem('nyxora:user', JSON.stringify(currentUser));

      // ============================================================
      // ВСТАВЬ СВОЙ НОВЫЙ ТОКЕН СЮДА (вместо ТВОЙ_НОВЫЙ_ТОКЕН_СЮДА)
      // ============================================================
      sessionStorage.setItem('nyxora:adminToken', '119d332b8282d04c0f1743b8e28396dd0247f20c4abb285b77e13eddef121d32');

      showToast('Вход администратора выполнен', 'success');
      updateUI();

      setTimeout(() => { window.location.href = 'admin.html'; }, 400);
      return;
    }

    // Обычный вход
    let users = JSON.parse(localStorage.getItem('nyxora:users') || '[]');
    const user = users.find(u =>
      (u.email === emailOrLogin || u.login === emailOrLogin) && u.password === password
    );

    if (user) {
      currentUser = { ...user, username: user.login };
      localStorage.setItem('nyxora:user', JSON.stringify(currentUser));
      showToast('Вы успешно вошли!', 'success');
      updateUI();
    } else {
      showToast('Неверный логин/email или пароль', 'error');
    }
  });

  // ============================================================
  // 7. ВЫХОД
  // ============================================================
  logoutBtn?.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('nyxora:user');
    sessionStorage.removeItem('nyxora:adminToken'); // Удаляем токен при выходе
    showToast('Вы вышли из аккаунта', 'success');
    updateUI();
  });

  // ============================================================
  // 8. СОЦСЕТИ (ДЕМО)
  // ============================================================
  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.dataset.provider;
      const providerName = btn.textContent.trim();

      const email = `user_${provider}@example.com`;
      const firstName = `Пользователь`;
      const lastName = providerName;
      const login = `user_${provider}`;

      let users = JSON.parse(localStorage.getItem('nyxora:users') || '[]');
      let user = users.find(u => u.email === email);

      if (!user) {
        user = { firstName, lastName, login, email, password: 'social_demo', isAdmin: false };
        users.push(user);
        localStorage.setItem('nyxora:users', JSON.stringify(users));
      }

      currentUser = { ...user, username: user.login };
      localStorage.setItem('nyxora:user', JSON.stringify(currentUser));

      showToast(`Вход через ${providerName} выполнен`, 'success');
      updateUI();
    });
  });

  //============================================================
  //ЖИВОЙ ПОИСК (Выпадающая подсказка)
  //============================================================
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  if (searchForm && searchInput) {
    // Создаем выпадающий список результатов
    const searchDropdown = document.createElement('div');
    searchDropdown.className = 'search-dropdown hidden';
    searchForm.appendChild(searchDropdown);

    // Функция очистки поиска
    function clearSearch() {
      searchDropdown.innerHTML = '';
      searchDropdown.classList.add('hidden');
    }

    // Слушаем ввод текста
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      
      if (query.length < 2) {
        clearSearch();
        return;
      }

      // Ищем по всем блюдам
      const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];
      const results = products.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.description && p.description.toLowerCase().includes(query))
      ).slice(0, 6); // Показываем максимум 6 результатов

      if (results.length === 0) {
        searchDropdown.innerHTML = `<div class="search-empty">Ничего не найдено по запросу "${e.target.value}"</div>`;
        searchDropdown.classList.remove('hidden');
        return;
      }

      // Рендерим результаты
      searchDropdown.innerHTML = results.map(item => `
        <a href="menu.html?search=${encodeURIComponent(query)}" class="search-result-item">
          <img src="${item.image}" alt="${item.name}" onerror="this.src='https://placehold.co/100x100/21182e/c8a9ff?text=Фото'">
          <div class="search-result-info">
            <div class="search-result-name">${item.name}</div>
            <div class="search-result-price">${item.price} ₽ <span>· ${item.weight || ''}</span></div>
          </div>
        </a>
      `).join('');

      // Добавляем кнопку "Показать все"
      searchDropdown.innerHTML += `
        <a href="menu.html?search=${encodeURIComponent(query)}" class="search-all-btn">
          Показать все результаты →
        </a>
      `;

      searchDropdown.classList.remove('hidden');
    });

    // Закрываем поиск при клике вне него
    document.addEventListener('click', (e) => {
      if (!searchForm.contains(e.target)) {
        clearSearch();
      }
    });

    // Обработка нажатия Enter (переход на страницу меню)
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (q) location.href = `menu.html?search=${encodeURIComponent(q)}`;
    });
  }

  // === ОТПРАВКА ОТЗЫВА ИЗ ЛК ===
  const toggleReviewBtn = document.getElementById('toggleReviewBtn');
  const profileReviewFormWrapper = document.getElementById('profileReviewFormWrapper');
  const profileReviewForm = document.getElementById('profileReviewForm');

  if (toggleReviewBtn && profileReviewFormWrapper) {
    toggleReviewBtn.addEventListener('click', () => {
      profileReviewFormWrapper.classList.toggle('open');
      if (profileReviewFormWrapper.classList.contains('open')) {
        // Меняем текст кнопки, когда форма открыта
        toggleReviewBtn.textContent = 'Свернуть форму';
        toggleReviewBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        toggleReviewBtn.style.color = '#a49ab8';
      } else {
        toggleReviewBtn.textContent = 'Оставить отзыв';
        toggleReviewBtn.style.background = 'rgba(168, 121, 255, 0.15)';
        toggleReviewBtn.style.color = '#c6a6ff';
      }
    });
  }

  if (profileReviewForm) {
    profileReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('profRevName').value.trim();
      const text = document.getElementById('profRevText').value.trim();
      if (!name || !text) return;

      const submitBtn = profileReviewForm.querySelector('button[type="submit"]');
      const original = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправка...';

      try {
        // Отправляем на твой воркер
        const res = await Store.apiFetch(APP_CONFIG.API.reviews, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, text }),
        });
        if (!res.ok) throw new Error('server');

        profileReviewForm.reset();
        profileReviewFormWrapper.classList.remove('open');
        toggleReviewBtn.textContent = 'Оставить отзыв';
        toggleReviewBtn.style.background = 'rgba(168, 121, 255, 0.15)';
        toggleReviewBtn.style.color = '#c6a6ff';
        
        showToast('Спасибо! Ваш отзыв отправлен на проверку.', 'success');
      } catch {
        showToast('Не удалось отправить отзыв. Попробуйте позже.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });
  }

  // Инициализация
  updateUI();
});