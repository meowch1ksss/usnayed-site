// js/config.js
// Единая точка конфигурации. Подключать ПЕРВЫМ, до store.js и остальных.
(() => {
  'use strict';
  const API_BASE = 'https://usnayed-api.aleksejmaculin1.workers.dev';

  window.APP_CONFIG = {
    API_BASE,
    API: {
      orders:  `${API_BASE}/api/orders`,
      reviews: `${API_BASE}/api/reviews`,
      review:  (id) => `${API_BASE}/api/reviews/${encodeURIComponent(id)}`,
    },
    FETCH_TIMEOUT: 10_000,
    MIN_LUNCHES: 5, // «от 5 комплексных обедов» — из вашего копирайта
  };
})();