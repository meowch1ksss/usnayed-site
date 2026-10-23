window.APP_CONFIG = {
  API_BASE: '',
  API: {
    orders: '/.netlify/functions/api/api/orders',
    reviews: '/.netlify/functions/api/api/reviews',
    review: (id) => `/.netlify/functions/api/api/reviews/${encodeURIComponent(id)}`,
  },
  FETCH_TIMEOUT: 10000,
  MIN_LUNCHES: 1,
};