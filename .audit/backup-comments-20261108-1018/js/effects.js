// js/effects.js — эффекты главной: появление, наклон карточек, печать строки
(() => {
  'use strict';

  window.__dshAnim = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ============================================================
   * 1. Появление блоков при прокрутке
   * ============================================================ */
  const GROUPS = [
    ['#menu .section-header', 0],
    ['#menu .categories-grid .category-card', 80],
    ['.why-us-section .section-center', 0],
    ['.why-us-grid .why-us-card', 70],
    ['.reviews-section .reviews-heading', 0],
    ['.reviews-section .reviews-grid', 0],
    ['.gallery-section .section-center', 0],
    ['.gallery-grid figure', 70],
    ['.faq-section .section-center', 0],
    ['.faq-list', 0],
    ['.hours-section .section-center', 0],
    ['.hours-section .hours-grid', 0],
    ['.promo-banner', 0],
    ['.newsletter', 0],
  ];

  const revealItems = [];

  if (!reduce) {
    GROUPS.forEach(([selector, step]) => {
      document.querySelectorAll(selector).forEach((el, index) => {
        el.setAttribute('data-fx', 'reveal');
        if (step) el.style.setProperty('--fx-delay', `${index * step}ms`);
        revealItems.push(el);
      });
    });
  }

  if (revealItems.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach((el) => observer.observe(el));

    // Страховка: если наблюдатель почему-то не сработал — показать всё
    setTimeout(() => {
      revealItems.forEach((el) => el.classList.add('is-in'));
    }, 3000);
  }

  /* ============================================================
   * 2. Наклон карточек за курсором
   * ============================================================ */
  if (!reduce && canHover) {
    const MAX_X = 11;
    const MAX_Y = 13;

    const bindTilt = (el) => {
      if (el.dataset.tiltReady === '1') return;
      el.dataset.tiltReady = '1';
      el.classList.add('tilt');

      // У FAQ карточка широкая и с текстом — наклон мягче, чтобы читалось
      const strength = el.classList.contains('faq-item') ? 0.45 : 1;

      let frame = null;
      let lastEvent = null;

      const apply = () => {
        frame = null;
        if (!lastEvent) return;
        const rect = el.getBoundingClientRect();
        const px = (lastEvent.clientX - rect.left) / rect.width - 0.5;
        const py = (lastEvent.clientY - rect.top) / rect.height - 0.5;

        el.style.setProperty('--tilt-x', `${(-py * MAX_X * strength).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(px * MAX_Y * strength).toFixed(2)}deg`);
        el.style.setProperty('--glare-x', `${((px + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty('--glare-y', `${((py + 0.5) * 100).toFixed(1)}%`);
      };

      el.addEventListener('pointermove', (event) => {
        lastEvent = event;
        if (frame) return;
        frame = requestAnimationFrame(apply);
      }, { passive: true });

      el.addEventListener('pointerleave', () => {
        lastEvent = null;
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      });
    };

    document.querySelectorAll('#menu .category-card, .why-us-card, .faq-item').forEach(bindTilt);
  }

  /* ============================================================
   * 3. Печатающаяся строка в hero
   * ============================================================ */
  const typingEl = document.getElementById('heroTyping');

  if (typingEl) {
    const phrases = ['завтраки', 'обеды в офис', 'комплексные обеды', 'банкеты и фуршеты'];

    if (reduce) {
      typingEl.textContent = phrases[0];
    } else {
      let phraseIndex = 0;
      let charIndex = 0;
      let deleting = false;

      const step = () => {
        const word = phrases[phraseIndex];
        charIndex += deleting ? -1 : 1;
        typingEl.textContent = word.slice(0, charIndex);

        let delay = deleting ? 40 : 90;

        if (!deleting && charIndex >= word.length) {
          deleting = true;
          delay = 1700;
        } else if (deleting && charIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          delay = 420;
        }

        setTimeout(step, delay);
      };

      setTimeout(step, 800);
    }
  }
})();
