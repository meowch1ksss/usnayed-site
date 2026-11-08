(() => {
  'use strict';

  window.__dshAnim = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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

    setTimeout(() => {
      revealItems.forEach((el) => el.classList.add('is-in'));
    }, 3000);
  }

  if (!reduce && canHover) {
    const MAX_X = 11;
    const MAX_Y = 13;

    const bindTilt = (el) => {
      if (el.dataset.tiltReady === '1') return;
      el.dataset.tiltReady = '1';
      el.classList.add('tilt');

      const strength = el.classList.contains('faq-item')
        ? 0.45
        : el.classList.contains('review-card')
          ? 0.7
          : el.matches('.gallery-grid figure')
            ? 0.8
            : 1;

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

    const TILT_SELECTOR = '#menu .category-card, .why-us-card, .faq-item, .gallery-grid figure, .review-card';

    const bindAll = (root = document) => {
      root.querySelectorAll(TILT_SELECTOR).forEach(bindTilt);
    };

    bindAll();
    window.__bindTilt = () => bindAll();

    const reviewsGrid = document.querySelector('.reviews-grid');
    if (reviewsGrid) {
      new MutationObserver(() => bindAll(reviewsGrid)).observe(reviewsGrid, { childList: true });
    }
  }

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

  const startReviewsTyping = () => {
    const section = document.querySelector('.reviews-section');
    const grid = document.querySelector('.reviews-grid');
    if (!section || !grid || reduce || !('IntersectionObserver' in window)) return;

    const typeCard = (el, delay) => {
      const text = (el.textContent || '').trim();
      if (text.length < 20) return;
      const height = el.offsetHeight;
      if (height) el.style.minHeight = `${height}px`;
      el.textContent = '';
      el.classList.add('is-typing');

      let index = 0;
      const chunk = Math.max(2, Math.round(text.length / 40));

      const step = () => {
        index = Math.min(text.length, index + chunk);
        el.textContent = text.slice(0, index);
        if (index < text.length) {
          setTimeout(step, 22);
        } else {
          el.classList.remove('is-typing');
          el.style.minHeight = '';
        }
      };

      setTimeout(step, delay);
    };

    let armed = false;

    const arm = () => {
      if (armed) return true;
      const quotes = [...grid.querySelectorAll('.review-card blockquote')];
      if (!quotes.length) return false;
      armed = true;

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          quotes.forEach((el, i) => typeCard(el, i * 90));
        });
      }, { threshold: 0.15 });

      observer.observe(section);
      return true;
    };

    if (arm()) return;

    const watcher = new MutationObserver(() => {
      if (arm()) watcher.disconnect();
    });
    watcher.observe(grid, { childList: true });
    setTimeout(() => watcher.disconnect(), 8000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(startReviewsTyping, 400));
  } else {
    setTimeout(startReviewsTyping, 400);
  }
})();
