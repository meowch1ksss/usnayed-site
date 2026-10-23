const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const TG_TOKEN = process.env.TG_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/api', '');
  const body = event.body ? JSON.parse(event.body) : null;

  try {
    // === ОТЗЫВЫ ===
    if (path === '/api/reviews' && event.httpMethod === 'POST') {
      const id = 'REV-' + Date.now();
      const date = new Date().toISOString();
      await supabase.from('reviews').insert([{ id, name: body.name, text: body.text, date, status: 'pending' }]);
      return { statusCode: 201, headers, body: JSON.stringify({ success: true, id }) };
    }

    if (path === '/api/reviews' && event.httpMethod === 'GET') {
      const status = event.queryStringParameters?.status || 'approved';
      const { data } = await supabase.from('reviews').select('*').eq('status', status).order('date', { ascending: false });
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // === ЗАКАЗЫ ===
    if (path === '/api/orders' && event.httpMethod === 'POST') {
      const id = 'ORD-' + Date.now();
      const date = new Date().toISOString();
      const order = {
        id, number: body.number, name: body.name, phone: body.phone, email: body.email,
        city: body.city, address: body.address, comment: body.comment,
        delivery_time: body.deliveryTime, weight: body.weight, total: body.total,
        date, status: 'Принят', items_json: JSON.stringify(body.items),
        delivery_method: body.deliveryMethod, payer_type: body.payerType,
        payment_method: body.paymentMethod, company_data: JSON.stringify(body.companyData)
      };
      
      await supabase.from('orders').insert([order]);

      // Отправка в Telegram
      if (TG_TOKEN && TG_CHAT_ID) {
        const text = `🛍 Новый заказ!\nID: ${order.number}\nСумма: ${order.total} ₽\nКлиент: ${order.name}\nТелефон: ${order.phone}`;
        fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TG_CHAT_ID, text })
        }).catch(console.error);
      }

      return { statusCode: 201, headers, body: JSON.stringify({ success: true, id }) };
    }

    if (path === '/api/orders' && event.httpMethod === 'GET') {
      const auth = event.headers.authorization;
      if (auth !== `Bearer ${ADMIN_TOKEN}`) return { statusCode: 401, headers, body: JSON.stringify({ error: 'unauthorized' }) };

      const { data } = await supabase.from('orders').select('*').order('date', { ascending: false });
      const parsed = data.map(o => ({ ...o, items: JSON.parse(o.items_json), companyData: JSON.parse(o.company_data || 'null') }));
      return { statusCode: 200, headers, body: JSON.stringify(parsed) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'not_found' }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'internal', message: err.message }) };
  }
};