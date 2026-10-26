// js/store.js (фрагмент, добавь в существующий файл)
(() => {
  'use strict';

  const KEYS = {
    cart:      'nyxora:cart',
    favorites: 'nyxora:favorites',
    orders:    'nyxora:orders',
    user:      'nyxora:user',
    users:     'nyxora:users',
    token:     'nyxora:token', // <-- НОВОЕ
  };

  // ... существующие функции ...

  /* ---------- токен ---------- */
  const getToken = () => localStorage.getItem(KEYS.token);
  const setToken = (t) => localStorage.setItem(KEYS.token, t);
  const clearToken = () => localStorage.removeItem(KEYS.token);

  /* ---------- fetch с токеном ---------- */
  async function apiFetch(url, options = {}) {
    const timeout = window.APP_CONFIG?.FETCH_TIMEOUT ?? 10_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      const res = await fetch(url, { ...options, headers, signal: controller.signal });
      if (res.status === 401) {
        // Токен протух или невалидный — разлогиниваем
        clearToken();
        clearUser();
        if (location.pathname !== '/profile.html') {
          location.href = 'profile.html';
        }
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  window.Store = {
    // ... старый экспорт ...
    apiFetch,
    getToken, setToken, clearToken,
  };
})();