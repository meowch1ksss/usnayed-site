window.APP_CONFIG = {
  API_BASE: 'https://usnayed-api.aleksejmaculin1.workers.dev',
  API: {
    orders: 'https://usnayed-api.aleksejmaculin1.workers.dev/api/orders',
    reviews: 'https://usnayed-api.aleksejmaculin1.workers.dev/api/reviews',
    review: (id) => `https://usnayed-api.aleksejmaculin1.workers.dev/api/reviews/${encodeURIComponent(id)}`,
  },
  FETCH_TIMEOUT: 10000,
  MIN_LUNCHES: 1,
};