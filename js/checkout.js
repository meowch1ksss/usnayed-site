document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkoutForm');
  const payerBtns = document.querySelectorAll('.payer-btn');
  const payerSwitch = document.querySelector('.payer-switch');
  const fieldsPhys = document.getElementById('fieldsPhys');
  const fieldsJur = document.getElementById('fieldsJur');
  const paymentHint = document.getElementById('paymentHint');

  const tbody = document.getElementById('checkoutTableBody');
  const totalPriceEl = document.getElementById('checkoutTotalPrice');
  const totalWeightEl = document.getElementById('totalWeight');
  const totalPriceBottom = document.getElementById('totalPriceBottom');

  // Загружаем корзину
  let cart = JSON.parse(localStorage.getItem('nyxora:cart') || '[]');
  const products = window.LUNCH_DATA ? window.LUNCH_DATA.products : [];

  // Парсим вес
  function parseWeight(w) {
    const num = parseFloat(String(w).replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }

  // Рендер таблицы
  let totalSum = 0;
  let totalWeightGrams = 0;

  if (cart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">Корзина пуста</td></tr>`;
  } else {
    tbody.innerHTML = cart.map(item => {
      const p = products.find(x => String(x.id) === String(item.id));
      
      if (!p) return `<tr><td colspan="4" style="color:#ff6d78;">Товар ID ${item.id} не найден</td></tr>`;
      
      const sum = p.price * item.qty;
      totalSum += sum;
      totalWeightGrams += parseWeight(p.weight) * item.qty;
      
      return `
        <tr>
          <td>${p.name}</td>
          <td>${item.qty}</td>
          <td>${p.price} ₽</td>
          <td>${sum} ₽</td>
        </tr>
      `;
    }).join('');
  }

  // Выводим итоги
  if (totalPriceEl) totalPriceEl.textContent = `${totalSum} ₽`;
  if (totalPriceBottom) totalPriceBottom.textContent = `${totalSum} ₽`;
  if (totalWeightEl) {
    totalWeightEl.textContent = totalWeightGrams >= 1000 
      ? `${(totalWeightGrams / 1000).toFixed(2)} кг` 
      : `${totalWeightGrams} г`;
  }

  // ============================================================
  // КАСТОМНЫЕ СЕЛЕКТЫ
  // ============================================================
  function initCustomSelect(dropdownId, onChange) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return null;
    
    const trigger = dropdown.querySelector('.custom-dropdown-trigger');
    const options = dropdown.querySelectorAll('.custom-option');
    const input = dropdown.querySelector('input[type="hidden"]');
    const selectedText = dropdown.querySelector('.selected-text');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    });

    options.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.dataset.value;
        const text = option.textContent;
        
        input.value = value;
        selectedText.textContent = text;
        
        options.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        
        dropdown.classList.remove('open');
        if (onChange) onChange(value);
      });
    });

    return dropdown;
  }

  initCustomSelect('cityDropdown', (value) => {
    if (value) {
      document.getElementById('deliveryServiceGroup').classList.remove('hidden');
    }
  });

  const deliveryMethods = document.querySelectorAll('.delivery-method');
  const deliveryMethodInput = document.getElementById('deliveryMethodInput');

  deliveryMethods.forEach(method => {
    method.addEventListener('click', () => {
      deliveryMethods.forEach(m => m.classList.remove('active'));
      method.classList.add('active');
      
      const methodValue = method.dataset.method;
      deliveryMethodInput.value = methodValue;

      const addressInput = document.querySelector('input[name="address"]').closest('.form-group');
      if (methodValue === 'pickup') {
        addressInput.style.opacity = '0.5';
        addressInput.querySelector('label').textContent = 'Адрес доставки (не требуется при самовывозе)';
      } else {
        addressInput.style.opacity = '1';
        addressInput.querySelector('label').textContent = 'Адрес доставки';
      }
    });
  });

  const paymentDropdown = initCustomSelect('paymentDropdown', (value) => {
    if (value === 'bank' || value === 'sber') {
      paymentHint.textContent = 'Вы можете оплатить заказ в любом отделении Сбербанка. За услугу по переводу денег с Вас возьмут от 3 до 7% от стоимости заказа. Перечисление денег займет порядка 10 дней.';
    } else {
      paymentHint.textContent = 'Оплата наличными при получении заказа курьеру.';
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown')) {
      document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    }
  });

  // ============================================================
  // Переключатель Юр/Физ лицо
  // ============================================================
  payerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      
      payerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const paymentInput = document.getElementById('paymentInput');
      const paymentTriggerText = document.querySelector('#paymentDropdown .selected-text');
      const paymentOptions = document.querySelectorAll('#paymentDropdown .custom-option');
      
      if (type === 'jur') {
        payerSwitch.classList.add('jur-active');
        fieldsPhys.classList.add('hidden');
        fieldsJur.classList.remove('hidden');
        
        paymentOptions.forEach(opt => {
          if (opt.dataset.value === 'bank') opt.style.display = 'flex';
          else opt.style.display = 'none';
        });
        
        paymentInput.value = 'bank';
        paymentTriggerText.textContent = '🏦 Банковский перевод';
        paymentHint.textContent = 'Вы можете оплатить заказ в любом отделении Сбербанка. За услугу по переводу денег с Вас возьмут от 3 до 7% от стоимости заказа. Перечисление денег займет порядка 10 дней.';
        
      } else {
        payerSwitch.classList.remove('jur-active');
        fieldsPhys.classList.remove('hidden');
        fieldsJur.classList.add('hidden');
        
        paymentOptions.forEach(opt => opt.style.display = 'flex');
        
        paymentInput.value = 'cash';
        paymentTriggerText.textContent = '💵 Наличные курьеру';
        paymentHint.textContent = 'Оплата наличными при получении заказа курьеру.';
      }
    });
  });

  // ============================================================
  // ОТПРАВКА НА СЕРВЕР (ОБНОВЛЕНО)
  // ============================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Корзина пуста!');
      return;
    }
    
    if (!document.getElementById('cityInput').value) {
      alert('Пожалуйста, выберите город!');
      return;
    }

    const isJur = document.querySelector('.payer-btn.active').dataset.type === 'jur';
    const name = isJur 
      ? document.querySelector('input[name="companyName"]').value 
      : document.querySelector('input[name="fullName"]').value;
    const city = document.querySelector('#cityDropdown .selected-text').textContent;
    const phone = isJur
      ? document.querySelector('input[name="jurPhone"]').value
      : document.querySelector('input[name="phone"]').value;
    const address = document.querySelector('input[name="address"]').value;
    const comment = document.querySelector('textarea[name="comment"]').value;

    // Формируем объект заказа
    const orderData = {
      number: 'ORD-' + Math.floor(Math.random() * 900000 + 100000),
      items: cart.map(item => {
        const p = products.find(x => String(x.id) === String(item.id));
        return {
          id: item.id,
          name: p ? p.name : 'Блюдо',
          qty: item.qty,
          price: p ? p.price : 0
        };
      }),
      total: totalSum,
      name: name || 'Покупатель',
      phone: phone || '',
      city: city || 'Не указан',
      address: address || '',
      comment: comment || ''
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Отправка...';
    submitBtn.disabled = true;

    try {
      // Отправляем на сервер Cloudflare
      const response = await fetch('https://usnayed-api.aleksejmaculin1.workers.dev/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Ошибка сервера');

      alert('Заказ успешно оформлен! Спасибо!');
      localStorage.removeItem('nyxora:cart');
      
      // Очищаем сохраненные поля формы
      const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea');
      inputs.forEach(input => localStorage.removeItem('checkout_saved_' + input.name));
      localStorage.removeItem('checkout_saved_city');
      localStorage.removeItem('checkout_saved_payment');

      window.location.href = 'index.html';
    } catch (error) {
      alert('Не удалось отправить заказ. Проверьте интернет и попробуйте снова.');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  // ============================================================
  // Календарь
  // ============================================================
  if (typeof flatpickr !== 'undefined') {
    flatpickr("#deliveryTimeInput", {
      enableTime: true,
      dateFormat: "d.m.Y H:i",
      time_24hr: true,
      minDate: "today",
      minuteIncrement: 15,
      monthSelectorType: "static",
      locale: {
        firstDayOfWeek: 1,
        weekdays: {
          shorthand: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
          longhand: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
        },
        months: {
          shorthand: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
          longhand: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
        }
      }
    });
  }

  // ============================================================
  // АВТОСОХРАНЕНИЕ
  // ============================================================
  const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea');
  
  inputs.forEach(input => {
    const savedValue = localStorage.getItem('checkout_saved_' + input.name);
    if (savedValue) input.value = savedValue;
  });

  const savedCity = localStorage.getItem('checkout_saved_city');
  if (savedCity) {
    const cityOption = document.querySelector(`#cityDropdown .custom-option[data-value="${savedCity}"]`);
    if (cityOption) cityOption.click();
  }

  const savedPayment = localStorage.getItem('checkout_saved_payment');
  if (savedPayment) {
    const payOption = document.querySelector(`#paymentDropdown .custom-option[data-value="${savedPayment}"]`);
    if (payOption) payOption.click();
  }

  inputs.forEach(input => {
    input.addEventListener('input', (e) => {
      localStorage.setItem('checkout_saved_' + e.target.name, e.target.value);
    });
  });

  document.querySelectorAll('#cityDropdown .custom-option').forEach(opt => {
    opt.addEventListener('click', () => localStorage.setItem('checkout_saved_city', opt.dataset.value));
  });
  
  document.querySelectorAll('#paymentDropdown .custom-option').forEach(opt => {
    opt.addEventListener('click', () => localStorage.setItem('checkout_saved_payment', opt.dataset.value));
  });

  // ============================================================
  // МОДАЛКА ОЧИСТКИ
  // ============================================================
  const resetBtn = document.getElementById('resetFormBtn');
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmDelete = document.getElementById('confirmDelete');

  if (resetBtn && confirmOverlay) {
    resetBtn.addEventListener('click', () => confirmOverlay.classList.add('open'));
    confirmCancel.addEventListener('click', () => confirmOverlay.classList.remove('open'));
    confirmOverlay.addEventListener('click', (e) => {
      if (e.target === confirmOverlay) confirmOverlay.classList.remove('open');
    });

    confirmDelete.addEventListener('click', () => {
      confirmOverlay.classList.remove('open');
      inputs.forEach(input => localStorage.removeItem('checkout_saved_' + input.name));
      localStorage.removeItem('checkout_saved_city');
      localStorage.removeItem('checkout_saved_payment');
      
      form.reset();
      
      document.querySelector('#cityDropdown .selected-text').textContent = 'Выберите город...';
      document.getElementById('cityInput').value = '';
      document.querySelectorAll('#cityDropdown .custom-option').forEach(o => o.classList.remove('selected'));
      
      document.querySelector('#paymentDropdown .selected-text').textContent = '💵 Наличные курьеру';
      document.getElementById('paymentInput').value = 'cash';
      document.querySelectorAll('#paymentDropdown .custom-option').forEach(o => o.classList.remove('selected'));
      document.querySelector('#paymentDropdown .custom-option[data-value="cash"]').classList.add('selected');
      
      if (document.querySelector('#deliveryTimeInput')._flatpickr) {
        document.querySelector('#deliveryTimeInput')._flatpickr.clear();
      }

      document.getElementById('deliveryServiceGroup').classList.add('hidden');
      document.querySelector('.payer-btn[data-type="phys"]').click();
    });
  }
});