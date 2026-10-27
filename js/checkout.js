document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const cart = Store.getCart();
  const products = window.LUNCH_DATA?.products ?? [];
  const currentUser = Store.getUser();
  const SAVE_PREFIX = 'checkout_saved_';

  try {
    const tbody = document.getElementById('checkoutTableBody');
    const totalPriceEl = document.getElementById('checkoutTotalPrice');
    const totalWeightEl = document.getElementById('totalWeight');
    const totalPriceBottom = document.getElementById('totalPriceBottom');

    let totalSum = 0;
    let totalWeightGrams = 0;

    function parseWeight(w) {
      if (!w) return 0;
      const num = parseFloat(String(w).replace(/[^\d.,]/g, '').replace(',', '.'));
      return isNaN(num) ? 0 : num;
    }

    if (!cart.length) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">Корзина пуста</td></tr>`;
    } else if (tbody) {
      tbody.innerHTML = cart.map(item => {
        const p = products.find(x => String(x.id) === String(item.id));
        if (!p) return '';
        
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

    let formattedWeight = totalWeightGrams >= 1000 
      ? `${(totalWeightGrams / 1000).toFixed(2)} кг` 
      : `${totalWeightGrams} г`;

    if (totalPriceEl) totalPriceEl.textContent = `${totalSum} ₽`;
    if (totalPriceBottom) totalPriceBottom.textContent = `${totalSum} ₽`;
    if (totalWeightEl) totalWeightEl.textContent = formattedWeight;

    window._checkoutTotals = { totalSum, formattedWeight };
  } catch (e) {
    console.error('Ошибка отрисовки таблицы:', e);
  }

  try {
    if (currentUser) {
      const nameInput = document.querySelector('input[name="fullName"]');
      const emailInput = document.querySelector('input[name="email"]');
      
      if (nameInput && !nameInput.value) {
        nameInput.value = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      }
      if (emailInput && !emailInput.value) {
        emailInput.value = currentUser.email || '';
      }
    }
  } catch (e) {
    console.error('Ошибка автозаполнения:', e);
  }

  function initCustomSelect(dropdownId, onChange) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return null;
    
    const trigger = dropdown.querySelector('.custom-dropdown-trigger');
    const options = dropdown.querySelectorAll('.custom-option');
    const input = dropdown.querySelector('input[type="hidden"]');
    const selectedText = dropdown.querySelector('.selected-text');

    if (!trigger || !input) return null;

    trigger.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    };

    options.forEach(option => {
      option.onclick = () => {
        const value = option.dataset.value;
        const text = option.textContent.trim();
        
        input.value = value;
        if (selectedText) selectedText.textContent = text;
        
        options.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        dropdown.classList.remove('open');
        
        sessionStorage.setItem(`${SAVE_PREFIX}${input.name}`, value);
        if (onChange) onChange(value);
      };
    });

    return dropdown;
  }

  try {
    initCustomSelect('cityDropdown', (value) => {
      if (value) {
        const dsg = document.getElementById('deliveryServiceGroup');
        if (dsg) dsg.classList.remove('hidden');
      }
    });

    initCustomSelect('paymentDropdown', (value) => {
      const paymentHint = document.getElementById('paymentHint');
      if (!paymentHint) return;
      if (value === 'bank' || value === 'sber') {
        paymentHint.textContent = 'Вы можете оплатить заказ в любом отделении Сбербанка...';
      } else {
        paymentHint.textContent = 'Оплата наличными при получении заказа курьеру.';
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
      }
    });
  } catch (e) {
    console.error('Ошибка инициализации селектов:', e);
  }

  try {
    const deliveryMethods = document.querySelectorAll('.delivery-method');
    const deliveryMethodInput = document.getElementById('deliveryMethodInput');

    deliveryMethods.forEach(method => {
      method.onclick = () => {
        deliveryMethods.forEach(m => m.classList.remove('active'));
        method.classList.add('active');
        if (deliveryMethodInput) deliveryMethodInput.value = method.dataset.method;

        const addressInput = document.querySelector('input[name="address"]');
        if (addressInput) {
          const addressGroup = addressInput.closest('.form-group');
          if (method.dataset.method === 'pickup') {
            addressGroup.style.opacity = '0.5';
            addressGroup.querySelector('label').textContent = 'Адрес доставки (не требуется при самовывозе)';
          } else {
            addressGroup.style.opacity = '1';
            addressGroup.querySelector('label').textContent = 'Адрес доставки';
          }
        }
      };
    });
  } catch (e) {
    console.error('Ошибка инициализации способов доставки:', e);
  }

  try {
    const payerBtns = document.querySelectorAll('.payer-btn');
    const payerSwitch = document.querySelector('.payer-switch');
    const fieldsPhys = document.getElementById('fieldsPhys');
    const fieldsJur = document.getElementById('fieldsJur');
    const paymentHint = document.getElementById('paymentHint');

    payerBtns.forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.type;
        payerBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const paymentInput = document.getElementById('paymentInput');
        const paymentTriggerText = document.querySelector('#paymentDropdown .selected-text');
        const paymentOptions = document.querySelectorAll('#paymentDropdown .custom-option');
        
        if (type === 'jur') {
          if (payerSwitch) payerSwitch.classList.add('jur-active');
          if (fieldsPhys) fieldsPhys.classList.add('hidden');
          if (fieldsJur) fieldsJur.classList.remove('hidden');
          
          paymentOptions.forEach(opt => {
            opt.style.display = (opt.dataset.value === 'bank') ? 'flex' : 'none';
          });
          
          if (paymentInput) paymentInput.value = 'bank';
          if (paymentTriggerText) paymentTriggerText.textContent = '🏦 Банковский перевод';
          if (paymentHint) paymentHint.textContent = 'Вы можете оплатить заказ в любом отделении Сбербанка...';
        } else {
          if (payerSwitch) payerSwitch.classList.remove('jur-active');
          if (fieldsPhys) fieldsPhys.classList.remove('hidden');
          if (fieldsJur) fieldsJur.classList.add('hidden');
          
          paymentOptions.forEach(opt => opt.style.display = 'flex');
          
          if (paymentInput) paymentInput.value = 'cash';
          if (paymentTriggerText) paymentTriggerText.textContent = '💵 Наличные курьеру';
          if (paymentHint) paymentHint.textContent = 'Оплата наличными при получении заказа курьеру.';
        }
      };
    });
  } catch (e) {
    console.error('Ошибка переключателя лиц:', e);
  }

  try {
    if (typeof flatpickr !== 'undefined') {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      let minDate = "today";
      if (currentHour > 13 || (currentHour === 13 && currentMinute > 30)) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        minDate = tomorrow;
      }

      const fpInstance = flatpickr("#deliveryTimeInput", {
        enableTime: true,
        dateFormat: "d.m.Y H:i",
        time_24hr: true,
        minDate: minDate,
        minuteIncrement: 15,
        minTime: "08:00",
        maxTime: "15:00",
        disableMobile: "true",
        locale: {
          firstDayOfWeek: 1,
          weekdays: { shorthand: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], longhand: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'] },
          months: { shorthand: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'], longhand: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'] }
        }
      });

      const savedDate = sessionStorage.getItem(`${SAVE_PREFIX}deliveryTime`);
      if (savedDate) fpInstance.setDate(savedDate);

      document.getElementById('deliveryTimeInput').addEventListener('change', (e) => {
        sessionStorage.setItem(`${SAVE_PREFIX}deliveryTime`, e.target.value);
      });
    } else {
      console.warn('⚠️ Flatpickr не загружен! Календарь не работает.');
    }
  } catch (e) {
    console.error('Ошибка инициализации календаря:', e);
  }

  try {
    const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea');
    
    inputs.forEach(input => {
      if (input.id === 'deliveryTimeInput') return;

      const savedValue = sessionStorage.getItem(`${SAVE_PREFIX}${input.name}`);
      if (savedValue) input.value = savedValue;

      input.addEventListener('input', (e) => {
        sessionStorage.setItem(`${SAVE_PREFIX}${e.target.name}`, e.target.value);
      });
    });

    const savedCity = sessionStorage.getItem(`${SAVE_PREFIX}city`);
    if (savedCity) {
      const cityOption = document.querySelector(`#cityDropdown .custom-option[data-value="${savedCity}"]`);
      if (cityOption) cityOption.click();
    }

    const savedPayment = sessionStorage.getItem(`${SAVE_PREFIX}payment`);
    if (savedPayment) {
      const payOption = document.querySelector(`#paymentDropdown .custom-option[data-value="${savedPayment}"]`);
      if (payOption) payOption.click();
    }
  } catch (e) {
    console.error('Ошибка автосохранения:', e);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const totals = window._checkoutTotals || { totalSum: 0, formattedWeight: '0 г' };
    const isJur = document.querySelector('.payer-btn.active')?.dataset.type === 'jur';
    
    if (!cart.length) return window.showToast && window.showToast('Корзина пуста!', 'error');

    // Получаем значения из скрытых полей!
    const deliveryTime = document.getElementById('deliveryTimeInput').value;
    const cityValue = document.getElementById('cityInput').value;
    
    if (!deliveryTime) return window.showToast && window.showToast('Выберите время доставки!', 'error');
    if (!cityValue) return window.showToast && window.showToast('Выберите город!', 'error');

    let name = '', email = '', phone = '';
    let companyData = null;

    if (isJur) {
      name = document.querySelector('input[name="companyName"]').value;
      email = document.querySelector('input[name="jurEmail"]').value;
      phone = document.querySelector('input[name="jurPhone"]').value;
      if (!name || !phone) return window.showToast && window.showToast('Заполните название компании и телефон!', 'error');
      
      companyData = {
        legalAddress: document.querySelector('input[name="legalAddress"]')?.value || '—',
        inn: document.querySelector('input[name="inn"]')?.value || '—',
        kpp: document.querySelector('input[name="kpp"]')?.value || '—',
        fax: document.querySelector('input[name="fax"]')?.value || '—',
        contactPerson: document.querySelector('input[name="contactPerson"]')?.value || '—'
      };
    } else {
      name = document.querySelector('input[name="fullName"]').value;
      email = document.querySelector('input[name="email"]').value;
      phone = document.querySelector('input[name="phone"]').value;
      if (!name || !phone) return window.showToast && window.showToast('Заполните ФИО и телефон!', 'error');
    }

    const orderData = {
      number: 'ORD-' + Math.floor(Math.random() * 900000 + 100000),
      items: cart.map(item => {
        const p = products.find(x => String(x.id) === String(item.id));
        return { id: item.id, name: p ? p.name : 'Блюдо', qty: item.qty, price: p ? p.price : 0 };
      }),
      total: totals.totalSum,
      weight: totals.formattedWeight,
      deliveryTime: deliveryTime,
      name: name || 'Покупатель',
      email: email || '',
      phone: phone || '',
      city: document.querySelector('#cityDropdown .selected-text').textContent || 'Не указан',
      address: document.querySelector('input[name="address"]').value || '',
      comment: document.querySelector('textarea[name="comment"]').value || '',
      deliveryMethod: document.getElementById('deliveryMethodInput').value,
      payerType: isJur ? 'Юр. лицо' : 'Физ. лицо',
      paymentMethod: isJur ? 'bank' : document.getElementById('paymentInput').value,
      companyData: companyData,
      userEmail: currentUser ? currentUser.email : email,
      userId: currentUser ? currentUser.id : null
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Отправка...';
    submitBtn.disabled = true;

    try {
      const response = await Store.apiFetch(APP_CONFIG.API.orders, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Ошибка сервера');

      if (window.showToast) window.showToast('Заказ успешно оформлен! Спасибо!', 'success');
      Store.clearCart();
      
      const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea');
      inputs.forEach(input => sessionStorage.removeItem(`${SAVE_PREFIX}${input.name}`));
      sessionStorage.removeItem(`${SAVE_PREFIX}city`);
      sessionStorage.removeItem(`${SAVE_PREFIX}payment`);

      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    } catch (error) {
      console.error(error);
      if (window.showToast) window.showToast('Не удалось отправить заказ. Проверьте интернет.', 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  try {
    const resetBtn = document.getElementById('resetFormBtn');
    const confirmOverlay = document.getElementById('confirmOverlay');
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmDelete = document.getElementById('confirmDelete');

    if (resetBtn && confirmOverlay) {
      resetBtn.onclick = () => confirmOverlay.classList.add('open');
      confirmCancel.onclick = () => confirmOverlay.classList.remove('open');
      confirmOverlay.onclick = (e) => {
        if (e.target === confirmOverlay) confirmOverlay.classList.remove('open');
      };

      confirmDelete.onclick = () => {
        confirmOverlay.classList.remove('open');
        
        const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea');
        inputs.forEach(input => sessionStorage.removeItem(`${SAVE_PREFIX}${input.name}`));
        sessionStorage.removeItem(`${SAVE_PREFIX}city`);
        sessionStorage.removeItem(`${SAVE_PREFIX}payment`);
        
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
      };
    }
  } catch(e) {
    console.error('Ошибка модалки очистки:', e);
  }
});