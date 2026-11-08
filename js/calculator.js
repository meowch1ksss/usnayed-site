document.addEventListener('DOMContentLoaded', () => {
  const peopleInput = document.getElementById('orgPeople');
  const peopleNumber = document.getElementById('orgPeopleNum');
  const daysInput = document.getElementById('orgDays');
  const menuInputs = document.querySelectorAll('input[name="orgMenu"]');
  const peopleOut = document.querySelector('[data-people-out]');
  const daysOut = document.querySelector('[data-days-out]');
  const sumDay = document.querySelector('[data-sum-day]');
  const sumWeek = document.querySelector('[data-sum-week]');
  const sumMonth = document.querySelector('[data-sum-month]');
  const form = document.getElementById('orgLeadForm');

  if (!peopleInput || !daysInput || !sumDay) return;

  const WORK_DAYS = 22;
  const MIN_PEOPLE = 5;
  const MAX_PEOPLE = 300;
  const fmt = new Intl.NumberFormat('ru-RU');
  const shown = new WeakMap();

  const clampPeople = (value) => {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed)) return MIN_PEOPLE;
    return Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, parsed));
  };

  const animateNumber = (el, value) => {
    const from = shown.get(el) ?? 0;
    shown.set(el, value);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = `${fmt.format(Math.round(value))} ₽`;
      return;
    }
    const start = performance.now();
    const duration = 380;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      el.textContent = `${fmt.format(Math.round(current))} ₽`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const price = () => {
    const checked = document.querySelector('input[name="orgMenu"]:checked');
    return Number(checked?.value || 260);
  };

  const recalc = () => {
    const people = Number(peopleInput.value);
    const days = Number(daysInput.value);
    const perDay = people * price();

    peopleOut && (peopleOut.textContent = String(people));
    daysOut && (daysOut.textContent = String(days));

    animateNumber(sumDay, perDay);
    animateNumber(sumWeek, perDay * days);
    animateNumber(sumMonth, perDay * WORK_DAYS);
  };

  peopleInput.addEventListener('input', () => {
    if (peopleNumber) peopleNumber.value = peopleInput.value;
    recalc();
  });

  if (peopleNumber) {
    peopleNumber.addEventListener('input', () => {
      if (peopleNumber.value === '') return;
      const value = clampPeople(peopleNumber.value);
      peopleInput.value = String(value);
      peopleOut && (peopleOut.textContent = String(value));
      recalc();
    });

    peopleNumber.addEventListener('blur', () => {
      const value = clampPeople(peopleNumber.value);
      peopleNumber.value = String(value);
      peopleInput.value = String(value);
      recalc();
    });
  }

  daysInput.addEventListener('input', recalc);
  menuInputs.forEach((input) => input.addEventListener('change', recalc));
  recalc();

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const people = Number(peopleInput.value);
    const days = Number(daysInput.value);
    const perDay = people * price();
    const totals = `Расчёт: ${people} чел. × ${price()} ₽ — ${fmt.format(perDay)} ₽ в день, ${fmt.format(perDay * days)} ₽ в неделю, ${fmt.format(perDay * WORK_DAYS)} ₽ в месяц.`;

    const lines = [
      `Организация: ${data.get('org') || '—'}`,
      `Контакт: ${data.get('name') || '—'}`,
      `Телефон: ${data.get('phone') || '—'}`,
      `E-mail: ${data.get('email') || '—'}`,
      '',
      totals,
      '',
      `Комментарий: ${data.get('comment') || '—'}`,
    ];

    const subject = encodeURIComponent('Заявка с сайта: питание для организаций');
    const body = encodeURIComponent(lines.join('\n'));

    window.location.href = `mailto:kolibri831@yandex.ru?subject=${subject}&body=${body}`;

    if (typeof window.showToast === 'function') {
      window.showToast('Открываем почту — останется нажать «Отправить»', 'success');
    }
  });
});
