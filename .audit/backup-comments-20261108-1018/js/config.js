window.APP_CONFIG = {
  API_BASE: 'https://usnayed-api.aleksejmaculin1.workers.dev',
  API: {
    login: 'https://usnayed-api.aleksejmaculin1.workers.dev/api/login',
    orders: 'https://usnayed-api.aleksejmaculin1.workers.dev/api/orders', // Этот же URL, но с методом DELETE
    reviews: 'https://usnayed-api.aleksejmaculin1.workers.dev/api/reviews',
    review: (id) => `https://usnayed-api.aleksejmaculin1.workers.dev/api/reviews/${encodeURIComponent(id)}`,
  },
  FETCH_TIMEOUT: 10000,
  MIN_LUNCHES: 1,
};