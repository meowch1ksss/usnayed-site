document.addEventListener('DOMContentLoaded', () => {
  try {
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
      toast.innerHTML = `<div class="toast-icon">${type === 'success' ? '✓' : '!'}</div><div>${message}</div>`;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
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

    updateUI();

    // Форма входа
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
          const res = await fetch(APP_CONFIG.API.login, {
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

    // Выход
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

    // Supabase
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
  } catch (globalError) {
    console.error('КРИТИЧЕСКАЯ ОШИБКА ПРИ ЗАГРУЗКЕ ПРОФИЛЯ:', globalError);
  }
});