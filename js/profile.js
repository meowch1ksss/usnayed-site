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
  const editProfileBtn = document.getElementById('editProfileBtn');
  const editProfileForm = document.getElementById('editProfileForm');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const updateForm = document.getElementById('updateForm');
  const adminLink = document.getElementById('adminLink');

  let currentUser = Store.getUser();
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : '!';
    toast.innerHTML = `<div class="toast-icon">${icon}</div><div>${message}</div>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

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
    generateCaptcha();
  }

  function updateUI() {
    if (currentUser) {
      if (loginBox) loginBox.classList.add('hidden');
      if (registerBox) registerBox.classList.add('hidden');
      if (userProfile) userProfile.classList.remove('hidden');

      if (userNameEl) userNameEl.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Пользователь';
      if (userEmailEl) userEmailEl.textContent = currentUser.email || '';
      if (userAvatarEl) userAvatarEl.textContent = (currentUser.firstName || 'U').charAt(0).toUpperCase();

      if (adminLink) {
        adminLink.classList.toggle('hidden', !currentUser.isAdmin);
      }
    } else {
      if (loginBox) loginBox.classList.remove('hidden');
      if (registerBox) registerBox.classList.add('hidden');
      if (userProfile) userProfile.classList.add('hidden');
      if (editProfileForm) editProfileForm.classList.add('hidden');
      if (adminLink) adminLink.classList.add('hidden');
    }
  }

  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      editProfileForm.classList.remove('hidden');
      document.getElementById('editFirstName').value = currentUser.firstName || '';
      document.getElementById('editLastName').value = currentUser.lastName || '';
      document.getElementById('editEmail').value = currentUser.email || '';
      document.getElementById('editPassword').value = '';
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => editProfileForm.classList.add('hidden'));
  }

  if (updateForm) {
    updateForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const newFirstName = document.getElementById('editFirstName').value.trim();
      const newLastName = document.getElementById('editLastName').value.trim();
      const newEmail = document.getElementById('editEmail').value.trim();
      const newPassword = document.getElementById('editPassword').value;

      let users = Store.getUsers();

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

        Store.saveUsers(users);
        currentUser = users[userIndex];
        Store.setUser(currentUser);

        showToast('Данные профиля обновлены', 'success');
        editProfileForm.classList.add('hidden');
        updateUI();
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const firstName = document.getElementById('regFirstName').value.trim();
      const lastName = document.getElementById('regLastName').value.trim();
      const login = document.getElementById('regLogin').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const passwordConfirm = document.getElementById('regPasswordConfirm').value;
      const captchaInput = document.getElementById('regCaptcha').value.trim().toUpperCase();

      if (password !== passwordConfirm) return showToast('Пароли не совпадают', 'error');
      if (password.length < 6) return showToast('Пароль должен быть минимум 6 символов', 'error');
      
      if (captchaInput !== currentCaptchaCode) {
        showToast('Неверный код с картинки', 'error');
        generateCaptcha();
        document.getElementById('regCaptcha').value = '';
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Регистрация...';

      try {
        const res = await fetch(APP_CONFIG.API_BASE + '/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, login, email, password }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.message || 'Ошибка регистрации', 'error');
          return;
        }

        const data = await res.json();
        Store.setToken(data.token);
        Store.setUser(data.user);
        currentUser = data.user;

        showToast('Регистрация успешна! Добро пожаловать!', 'success');
        updateUI();
      } catch (err) {
        console.error(err);
        showToast('Ошибка соединения с сервером', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailOrLogin = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Вход...';

      try {
        const res = await fetch(APP_CONFIG.API_BASE + '/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: emailOrLogin, password }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.message || 'Неверный логин или пароль', 'error');
          return;
        }

        const data = await res.json();
        Store.setToken(data.token);
        Store.setUser(data.user);
        currentUser = data.user;

        showToast('Вы успешно вошли!', 'success');
        updateUI();

        if (data.user.isAdmin) {
          setTimeout(() => { window.location.href = 'admin.html'; }, 400);
        }
      } catch (err) {
        console.error(err);
        showToast('Ошибка соединения с сервером', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      currentUser = null;
      Store.clearUser();
      Store.clearToken();

      if (window.supabaseClient) {
        try { await window.supabaseClient.auth.signOut(); } catch (e) { console.error(e); }
      }

      showToast('Вы вышли из аккаунта', 'success');
      updateUI();
    });
  }

  const SUPABASE_URL = 'https://jaotffxttfwkzueivmru.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_J0eXhuE8bJd3Vz1eGWxnFQ_JOO1f_p9';

  if (window.supabase && !window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.supabaseClient) {
        showToast('Ошибка: Библиотека Supabase не загружена.', 'error');
        return;
      }
      try {
        const { error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: 'https://usnayed-site.pages.dev/profile.html' }
        });
        if (error) throw error;
      } catch (err) {
        showToast(`Ошибка входа: ${err.message}`, 'error');
      }
    });
  });

  async function checkSocialSession() {
    if (!window.supabaseClient) return;
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session && session.user) {
        const user = session.user;
        const email = user.email;
        const name = user.user_metadata.full_name || user.user_metadata.name || 'Пользователь';
        
        let users = Store.getUsers();
        let localUser = users.find(u => u.email === email);

        if (!localUser) {
          const nameParts = name.split(' ');
          localUser = { 
            firstName: nameParts[0] || 'Пользователь', 
            lastName: nameParts[1] || '', 
            login: email.split('@')[0], 
            email: email, 
            password: 'social_auth', 
            isAdmin: false 
          };
          users.push(localUser);
          Store.saveUsers(users);
        }

        currentUser = { ...localUser, username: localUser.login };
        Store.setUser(currentUser);
        
        if (window.location.hash.includes('access_token')) {
          showToast('Вы успешно вошли через Google!', 'success');
        }
        updateUI();
        
        if (window.location.hash) window.history.replaceState(null, null, window.location.pathname);
      }
    } catch (err) {
      console.error('Ошибка проверки сессии Google:', err);
    }
  }

  checkSocialSession();
  updateUI();

  document.querySelectorAll('form').forEach(f => {
    f.addEventListener('submit', (e) => {
      if (!e.defaultPrevented) {
        e.preventDefault();
        console.warn('Форма перехвачена глобально.');
      }
    });
  });
});