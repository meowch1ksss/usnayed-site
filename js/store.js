// js/store.js
(() => {
  'use strict';

  const KEYS = {
    cart:      'nyxora:cart',
    favorites: 'nyxora:favorites',
    orders:    'nyxora:orders',
    user:      'nyxora:user',
    users:     'nyxora:users',
    token:     'nyxora:token', // Для JWT админа
  };

  /* ---------- низкоуровневые ---------- */
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Store] write failed', key, e);
    }
  };

  /* ---------- корзина ---------- */
  function getCart() {
    const raw = read(KEYS.cart, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map(item => ({
        id:  String(item.id),
        qty: Math.max(0, Number(item.qty ?? item.quantity ?? 0)),
      }))
      .filter(item => item.id && item.id !== 'undefined' && item.id !== 'null' && item.qty > 0);
  }

  function saveCart(cart) {
    const clean = (Array.isArray(cart) ? cart : [])
      .map(item => ({ id: String(item.id), qty: Number(item.qty) }))
      .filter(i => i.id && i.qty > 0);
    write(KEYS.cart, clean);
    updateBadges();
    return clean;
  }

  function addToCart(id, delta = 1) {
    const cart = getCart();
    const sid = String(id);
    const item = cart.find(i => i.id === sid);
    if (item) {
      item.qty += delta;
      if (item.qty <= 0) cart.splice(cart.indexOf(item), 1);
    } else if (delta > 0) {
      cart.push({ id: sid, qty: delta });
    }
    return saveCart(cart);
  }

  function removeFromCart(id) {
    const sid = String(id);
    return saveCart(getCart().filter(i => i.id !== sid));
  }

  function clearCart() {
    return saveCart([]);
  }

  function getCartQty(id) {
    const item = getCart().find(i => i.id === String(id));
    return item ? item.qty : 0;
  }

  /* ---------- избранное ---------- */
  function getFavorites() {
    const raw = read(KEYS.favorites, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(String).filter(Boolean);
  }

  function saveFavorites(list) {
    const clean = [...new Set((Array.isArray(list) ? list : []).map(String).filter(Boolean))];
    write(KEYS.favorites, clean);
    updateBadges();
    return clean;
  }

  function toggleFavorite(id) {
    const sid = String(id);
    const favs = getFavorites();
    const idx = favs.indexOf(sid);
    if (idx === -1) favs.push(sid);
    else favs.splice(idx, 1);
    saveFavorites(favs);
    return favs.includes(sid);
  }

  function isFavorite(id) {
    return getFavorites().includes(String(id));
  }

  /* ---------- бейджи шапки ---------- */
  function updateBadges() {
    const cartCount = getCart().reduce((sum, i) => sum + i.qty, 0);
    const favCount  = getFavorites().length;

    const cartBadge = document.getElementById('cart-count');
    if (cartBadge) cartBadge.textContent = cartCount || '';

    const favBadge = document.getElementById('favorite-count');
    if (favBadge) favBadge.textContent = favCount || '';
  }

  /* ---------- заказы ---------- */
  const getOrders = () => read(KEYS.orders, []);
  const saveOrders = (list) => write(KEYS.orders, Array.isArray(list) ? list : []);
  const clearOrders = () => write(KEYS.orders, []);

  /* ---------- пользователь ---------- */
  const getUser  = () => read(KEYS.user, null);
  const setUser  = (u) => write(KEYS.user, u);
  const clearUser = () => localStorage.removeItem(KEYS.user);
  const getUsers = () => read(KEYS.users, []);
  const saveUsers = (list) => write(KEYS.users, Array.isArray(list) ? list : []);

  /* ---------- токены (JWT) ---------- */
  const getToken = () => localStorage.getItem(KEYS.token);
  const setToken = (t) => localStorage.setItem(KEYS.token, t);
  const clearToken = () => localStorage.removeItem(KEYS.token);

  /* ---------- fetch с таймаутом и авторизацией ---------- */
  async function apiFetch(url, options = {}) {
    const timeout = window.APP_CONFIG?.FETCH_TIMEOUT ?? 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      const res = await fetch(url, { ...options, headers, signal: controller.signal });
      
      // Если токен протух или неверный — разлогиниваем
      if (res.status === 401 && !url.includes('/api/login')) {
        clearToken();
        clearUser();
        // Если мы на странице админки или заказов, можно редиректнуть (опционально)
        if (location.pathname.includes('admin.html')) {
          location.href = 'profile.html';
        }
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', updateBadges);

  // ЭКСПОРТ ВСЕХ ФУНКЦИЙ
  window.Store = {
    KEYS,
    getCart, saveCart, addToCart, removeFromCart, clearCart, getCartQty,
    getFavorites, saveFavorites, toggleFavorite, isFavorite,
    updateBadges,
    getOrders, saveOrders, clearOrders,
    getUser, setUser, clearUser, getUsers, saveUsers,
    getToken, setToken, clearToken,
    apiFetch,
  };
})();