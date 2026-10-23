js
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

const response = (statusCode, data) => ({
  statusCode,
  headers,
  body: JSON.stringify(data)
});

const isAdmin = (event) =>
  Boolean(ADMIN_TOKEN) &&
  event.headers.authorization === `Bearer ${ADMIN_TOKEN}`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  const path = event.path.replace(
    '/.netlify/functions/api',
    ''
  );

  let body;

  try {
    body = event.body ? JSON.parse(event.body) : null;
  } catch {
    return response(400, { error: 'invalid_json' });
  }

  try {
    // =========================
    // ОТЗЫВЫ: СОЗДАНИЕ
    // =========================
    if (path === '/api/reviews' && event.httpMethod === 'POST') {
      if (
        !body ||
        typeof body.name !== 'string' ||
        typeof body.text !== 'string' ||
        !body.name.trim() ||
        !body.text.trim()
      ) {
        return response(400, {
          error: 'name_and_text_required'
        });
      }

      const id = 'REV-' + Date.now();
      const date = new Date().toISOString();

      const { error } = await supabase
        .from('reviews')
        .insert([{
          id,
          name: body.name.trim(),
          text: body.text.trim(),
          date,
          status: 'pending'
        }]);

      if (error) {
        console.error('Review creation error:', error);
        return response(500, {
          error: 'review_create_failed'
        });
      }

      return response(201, {
        success: true,
        id
      });
    }

    // =========================
    // ОТЗЫВЫ: ПОЛУЧЕНИЕ
    // =========================
    if (path === '/api/reviews' && event.httpMethod === 'GET') {
      const status =
        event.queryStringParameters?.status || 'approved';

      const allowedStatuses = [
        'approved',
        'pending',
        'rejected'
      ];

      if (!allowedStatuses.includes(status)) {
        return response(400, {
          error: 'invalid_status'
        });
      }

      // Не разрешаем получать скрытые отзывы без авторизации.
      if (status !== 'approved' && !isAdmin(event)) {
        return response(401, {
          error: 'unauthorized'
        });
      }

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('status', status)
        .order('date', { ascending: false });

      if (error) {
        console.error('Reviews fetch error:', error);
        return response(500, {
          error: 'reviews_fetch_failed'
        });
      }

      return response(200, data);
    }

    // =========================
    // ОТЗЫВЫ: ОДОБРЕНИЕ / ОТКЛОНЕНИЕ
    // =========================
    const reviewMatch = path.match(
      /^\/api\/reviews\/([^/]+)$/
    );

    if (reviewMatch && event.httpMethod === 'PUT') {
      if (!isAdmin(event)) {
        return response(401, {
          error: 'unauthorized'
        });
      }

      const id = decodeURIComponent(reviewMatch[1]);

      if (
        !body ||
        !['approved', 'rejected'].includes(body.status)
      ) {
        return response(400, {
          error: 'invalid_status'
        });
      }

      const { data, error } = await supabase
        .from('reviews')
        .update({
          status: body.status
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id, status')
        .maybeSingle();

      if (error) {
        console.error('Review moderation error:', error);
        return response(500, {
          error: 'review_update_failed'
        });
      }

      if (!data) {
        return response(404, {
          error: 'review_not_found_or_already_processed'
        });
      }

      return response(200, {
        success: true,
        review: data
      });
    }

    // =========================
    // ЗАКАЗЫ: СОЗДАНИЕ
    // =========================
    if (path === '/api/orders' && event.httpMethod === 'POST') {
      if (!body) {
        return response(400, {
          error: 'invalid_order'
        });
      }

      const id = 'ORD-' + Date.now();
      const date = new Date().toISOString();

      const order = {
        id,
        number: body.number,
        name: body.name,
        phone: body.phone,
        email: body.email,
        city: body.city,
        address: body.address,
        comment: body.comment,
        delivery_time: body.deliveryTime,
        weight: body.weight,
        total: body.total,
        date,
        status: 'Принят',
        items_json: JSON.stringify(body.items ?? []),
        delivery_method: body.deliveryMethod,
        payer_type: body.payerType,
        payment_method: body.paymentMethod,
        company_data: JSON.stringify(body.companyData ?? null)
      };

      const { error } = await supabase
        .from('orders')
        .insert([order]);

      if (error) {
        console.error('Order creation error:', error);
        return response(500, {
          error: 'order_create_failed'
        });
      }

      // Уведомление в Telegram.
      if (TG_TOKEN && TG_CHAT_ID) {
        const text =
          `🛍 Новый заказ!\n` +
          `ID: ${order.number}\n` +
          `Сумма: ${order.total} ₽\n` +
          `Клиент: ${order.name}\n` +
          `Телефон: ${order.phone}`;

        try {
          const tgResponse = await fetch(
            `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chat_id: TG_CHAT_ID,
                text
              })
            }
          );

          if (!tgResponse.ok) {
            console.error(
              'Telegram notification failed:',
              tgResponse.status
            );
          }
        } catch (err) {
          console.error('Telegram request error:', err);
        }
      }

      return response(201, {
        success: true,
        id
      });
    }

    // =========================
    // ЗАКАЗЫ: ПОЛУЧЕНИЕ
    // =========================
    if (path === '/api/orders' && event.httpMethod === 'GET') {
      if (!isAdmin(event)) {
        return response(401, {
          error: 'unauthorized'
        });
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Orders fetch error:', error);
        return response(500, {
          error: 'orders_fetch_failed'
        });
      }

      const parsed = data.map((order) => {
        let items = [];
        let companyData = null;

        try {
          items = JSON.parse(order.items_json || '[]');
        } catch {
          items = [];
        }

        try {
          companyData = JSON.parse(
            order.company_data || 'null'
          );
        } catch {
          companyData = null;
        }

        return {
          ...order,
          items,
          companyData
        };
      });

      return response(200, parsed);
    }

    return response(404, {
      error: 'not_found',
      path,
      method: event.httpMethod
    });

  } catch (err) {
    console.error('API error:', err);

    return response(500, {
      error: 'internal',
      message: 'Internal server error'
    });
  }
};