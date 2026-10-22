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

  // Инициализация
  updateUI();
});