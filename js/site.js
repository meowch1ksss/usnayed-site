(() => {
  'use strict';
  const $el  = (s, root = document) => root.querySelector(s);
  const $all = (s, root = document) => [...root.querySelectorAll(s)];

  function initFaq() {
    const items = $all('.faq-item');
    if (!items.length) return;

    const isMobile = window.innerWidth <= 760;

    items.forEach((item) => {
      const btn    = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!btn || !answer) return;

      if (!answer.querySelector('.faq-answer-inner')) {
        const content = answer.innerHTML;
        answer.innerHTML = `<div class="faq-answer-inner">${content}</div>`;
      }

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        items.forEach((other) => {
          if (other !== item && other.classList.contains('is-open')) {
            other.classList.remove('is-open');
            other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
          }
        });

        if (isOpen) {
          item.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  function initEmailPicker() {
    const trigger = $el('.email-picker-trigger');
    const list    = $el('.email-provider-list');
    if (!trigger || !list) return;

    list.removeAttribute('hidden');
    list.classList.add('email-list-hidden');

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        trigger.setAttribute('aria-expanded', 'false');
        list.classList.add('email-list-hidden');
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        list.classList.remove('email-list-hidden');
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.email-picker')) {
        trigger.setAttribute('aria-expanded', 'false');
        list.classList.add('email-list-hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !list.classList.contains('email-list-hidden')) {
        trigger.setAttribute('aria-expanded', 'false');
        list.classList.add('email-list-hidden');
        trigger.focus();
      }
    });
  }

  function initPageFade() {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    $all('a[href$=".html"], a[href*=".html#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.hash) return;

        event.preventDefault();
        document.body.classList.add('page-leaving');
        setTimeout(() => { location.href = url.href; }, 250);
      });
    });
  }

  function showToast(message, type = 'success', imageUrl = null) {
    let region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.className = 'toast-region yandex-style';
      document.body.appendChild(region);
    }

    region.style.position = 'fixed';
    region.style.bottom = '20px';
    region.style.left = '50%';
    region.style.transform = 'translateX(-50%)';
    region.style.zIndex = '9999';
    region.style.width = '100%';
    region.style.maxWidth = '380px';
    region.style.height = '100px';
    region.style.pointerEvents = 'none';

    const toast = document.createElement('div');
    toast.className = `toast yandex-toast ${type}`;

    toast.style.position = 'absolute';
    toast.style.bottom = '0';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(20px) scale(0.9)';
    toast.style.width = 'max-content';
    toast.style.maxWidth = '100%';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.padding = '10px 14px';
    toast.style.background = 'rgba(20, 15, 25, 0.95)';
    toast.style.backdropFilter = 'blur(20px)';
    toast.style.webkitBackdropFilter = 'blur(20px)';
    toast.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
    toast.style.color = '#ffffff';
    toast.style.fontSize = '13px';
    toast.style.fontWeight = '500';
    toast.style.fontFamily = 'Manrope, sans-serif';
    toast.style.pointerEvents = 'auto';
    toast.style.transition = 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
    toast.style.opacity = '0';

    let iconHtml = '';
    if (imageUrl) {
      iconHtml = `<div style="width: 44px; height: 44px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: #222;"><img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;"></div>`;
    } else {
      const bgColor = type === 'success' ? 'rgba(183, 255, 112, 0.2)' : 'rgba(255, 109, 120, 0.2)';
      const colColor = type === 'success' ? '#b7ff70' : '#ff6d78';
      const iconChar = type === 'success' ? '✓' : '!';
      iconHtml = `<div style="width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; background: ${bgColor}; color: ${colColor};">${iconChar}</div>`;
    }

    toast.innerHTML = `
      ${iconHtml}
      <div style="line-height: 1.4; flex: 1; white-space: normal; word-wrap: break-word;">${message}</div>
      <button class="toast-close" style="background: transparent; border: none; color: #888; font-size: 16px; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s; flex-shrink: 0;">✕</button>
    `;

    region.appendChild(toast);

    function updateStack() {
      const toasts = Array.from(region.querySelectorAll('.yandex-toast')).reverse();

      toasts.forEach((t, index) => {
        if (index === 0) {
          t.style.transform = 'translateX(-50%) translateY(0) scale(1)';
          t.style.opacity = '1';
          t.style.zIndex = '10';
          t.style.pointerEvents = 'auto';
        } else if (index === 1) {
          t.style.transform = 'translateX(-50%) translateY(-12px) scale(0.96)';
          t.style.opacity = '0.8';
          t.style.zIndex = '9';
          t.style.pointerEvents = 'none';
        } else if (index === 2) {
          t.style.transform = 'translateX(-50%) translateY(-24px) scale(0.92)';
          t.style.opacity = '0.5';
          t.style.zIndex = '8';
          t.style.pointerEvents = 'none';
        } else {
          t.remove();
        }
      });
    }

    setTimeout(updateStack, 10);

    toast.querySelector('.toast-close').addEventListener('click', (e) => {
      e.stopPropagation();
      toast.remove();
      updateStack();
    });

    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
        updateStack();
      }
    }, 4000);
  }
  window.showToast = showToast;

  document.addEventListener('DOMContentLoaded', () => {
    const pageName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const isServicePage = pageName === 'maintenance.html' || /^(403|404|500)\.html$/.test(pageName);

    if (!isServicePage && localStorage.getItem('usnayed:maintenance') === 'on') {
      let admin = false;
      try {
        admin = Store.getUser()?.isAdmin === true;
      } catch (error) {
        admin = false;
      }
      if (!admin) {
        window.location.replace('maintenance.html');
        return;
      }
    }

    Store.updateBadges();
    initFaq();
    initEmailPicker();
    initPageFade();


    if (!document.querySelector('.page-aura')) {
      const aura = document.createElement('div');
      aura.className = 'page-aura';
      aura.setAttribute('aria-hidden', 'true');
      document.body.appendChild(aura);
    }

    const COOKIE_KEY = 'usnayed:cookie-choice';

    const pinFooter = () => {
      const main = document.querySelector('body > main');
      const footer = document.querySelector('.site-footer');
      if (!main || !footer) return;

      main.style.minHeight = '';
      const header = document.querySelector('.site-header');
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const footerHeight = footer.getBoundingClientRect().height;
      const available = window.innerHeight - headerHeight - footerHeight - 24;

      if (main.getBoundingClientRect().height < available) {
        main.style.minHeight = `${Math.max(0, available)}px`;
      }
    };

    pinFooter();
    window.addEventListener('load', pinFooter);
    window.addEventListener('resize', pinFooter);
    setTimeout(pinFooter, 400);

    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }

    const showCookieBanner = () => {
      if (localStorage.getItem(COOKIE_KEY)) return;
      if (document.querySelector('.cookie-banner')) return;

      const banner = document.createElement('div');
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Использование cookie');
      banner.innerHTML = `
        <div class="cookie-text">
          <strong>Мы используем cookie 🍪</strong>
          <p>Они помогают запомнить корзину, избранное и вход в кабинет. Подробнее — в разделе «Что это такое».</p>
        </div>
        <div class="cookie-actions">
          <button type="button" class="button button-primary" data-cookie="accept">Принять</button>
          <button type="button" class="button button-quiet" data-cookie="decline">Отказаться</button>
          <a class="cookie-more" href="cookies.html">Что это такое?</a>
        </div>
      `;

      document.body.appendChild(banner);

      banner.addEventListener('click', (event) => {
        const button = event.target.closest('[data-cookie]');
        if (!button) return;
        localStorage.setItem(COOKIE_KEY, button.dataset.cookie === 'accept' ? 'accepted' : 'declined');
        banner.classList.add('is-closing');
        setTimeout(() => banner.remove(), 320);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(showCookieBanner, 1200));
    } else {
      setTimeout(showCookieBanner, 1200);
    }

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="tel:"]');
      if (!link) return;
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

      event.preventDefault();
      const number = (link.getAttribute('href') || '').replace(/^tel:/, '');
      const pretty = link.textContent.trim() || number;

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(number).catch(() => {});
      }

      showToast(`Позвонить можно только с телефона: ${pretty} — номер скопирован`, 'success');
    }, true);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (!reduceMotion && finePointer && !document.querySelector('.cursor-glow')) {
      const glow = document.createElement('div');
      glow.className = 'cursor-glow';
      glow.setAttribute('aria-hidden', 'true');
      document.body.appendChild(glow);

      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight * 0.35;
      let currentX = targetX;
      let currentY = targetY;
      let frame = null;

      const tick = () => {
        currentX += (targetX - currentX) * 0.09;
        currentY += (targetY - currentY) * 0.09;
        glow.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
        if (Math.abs(targetX - currentX) < 0.4 && Math.abs(targetY - currentY) < 0.4) {
          frame = null;
          return;
        }
        frame = requestAnimationFrame(tick);
      };

      glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

      window.addEventListener('pointermove', (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        if (!frame) frame = requestAnimationFrame(tick);
      }, { passive: true });
    }


    document.querySelectorAll('[data-scroll-top]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      });
    });

    const reviewsGrid = document.getElementById('reviewsGrid');
    const toggleReviewsBtn = document.getElementById('toggleReviewsBtn');
    const showMoreWrapper = document.getElementById('showMoreWrapper');
    const addReviewFormWrapper = document.getElementById('addReviewFormWrapper');
    const addReviewForm = document.getElementById('addReviewForm');

    const REVIEWS_VISIBLE_DESKTOP = 8;
    const MOBILE_BREAKPOINT = 760;

    const REVIEWS_LOOP_LIMIT = 30;


    const staticReviews = reviewsGrid
      ? [...reviewsGrid.querySelectorAll('.review-card')].map((card) => ({
          name: (card.querySelector('strong')?.textContent || '').replace(/^—\s*/, '').trim(),
          stars: (card.querySelector('.review-stars')?.textContent || '★★★★★').trim(),
          text: (card.querySelector('blockquote')?.textContent || '').trim(),
        }))
      : [];

    let allReviews = [...staticReviews];
    let isReviewsExpanded = false;

    if (addReviewFormWrapper) addReviewFormWrapper.classList.remove('hidden');

    const isMobileView = () => window.innerWidth <= MOBILE_BREAKPOINT;

    const reviewCardHtml = (rev, cloned) => `
        <article class="review-card"${cloned ? ' aria-hidden="true"' : ''}>
          <div class="review-stars">${rev.stars || '★★★★★'}</div>
          <blockquote>${escapeHTML(rev.text || '')}</blockquote>
          <strong>— ${escapeHTML(rev.name || 'Гость')}</strong>
        </article>`;


    function setupReviewsLoop() {
      const count = allReviews.length;
      const cards = reviewsGrid.querySelectorAll('.review-card');

      if (cards.length < count * 2) {
        reviewsGrid.onscroll = null;
        return;
      }


      const step = cards[count].offsetLeft - cards[0].offsetLeft;
      if (!step) {
        reviewsGrid.onscroll = null;
        return;
      }

      reviewsGrid.onscroll = () => {
        const x = reviewsGrid.scrollLeft;
        if (x >= step * 1.5) reviewsGrid.scrollLeft = x - step;
        else if (x < step * 0.5) reviewsGrid.scrollLeft = x + step;
      };


      reviewsGrid.scrollLeft = step;
    }

    function renderReviews() {
      if (!reviewsGrid) return;

      const mobile = isMobileView();
      const loop = mobile && allReviews.length > 2 && allReviews.length <= REVIEWS_LOOP_LIMIT;

      const base = allReviews.map((rev) => reviewCardHtml(rev, false)).join('');
      reviewsGrid.innerHTML = loop
        ? base + allReviews.map((rev) => reviewCardHtml(rev, true)).join('')
          + allReviews.map((rev) => reviewCardHtml(rev, true)).join('')
        : base;


      const canExpand = !mobile && allReviews.length > REVIEWS_VISIBLE_DESKTOP;
      reviewsGrid.classList.toggle('show-all', isReviewsExpanded && !mobile);

      if (showMoreWrapper) showMoreWrapper.hidden = !canExpand;

      if (toggleReviewsBtn) {
        const extra = allReviews.length - REVIEWS_VISIBLE_DESKTOP;
        toggleReviewsBtn.textContent = isReviewsExpanded
          ? 'Свернуть отзывы'
          : `Показать все отзывы (+${extra})`;
        toggleReviewsBtn.setAttribute('aria-expanded', String(isReviewsExpanded));
      }

      if (loop) {

        requestAnimationFrame(setupReviewsLoop);
      } else {
        reviewsGrid.onscroll = null;
        reviewsGrid.scrollLeft = 0;
      }
    }

    if (toggleReviewsBtn) {
      toggleReviewsBtn.addEventListener('click', () => {
        isReviewsExpanded = !isReviewsExpanded;
        renderReviews();
        if (!isReviewsExpanded) {
          document.getElementById('reviews')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      });
    }


    let reviewsResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(reviewsResizeTimer);
      reviewsResizeTimer = setTimeout(renderReviews, 150);
    });

    async function loadApprovedReviews() {
      if (!reviewsGrid) return;

      const key = (rev) =>
        `${(rev.name || '').trim().toLowerCase()}|${(rev.text || '').trim().toLowerCase()}`;

      const seen = new Set(staticReviews.map(key));
      const merged = [...staticReviews];

      try {
        const res = await Store.apiFetch(APP_CONFIG.API.reviews);
        if (res.ok) {
          const serverReviews = await res.json();
          if (Array.isArray(serverReviews)) {
            for (const rev of serverReviews) {
              const k = key(rev);
              if (seen.has(k)) continue;
              seen.add(k);
              merged.push({ name: rev.name, text: rev.text, stars: rev.stars || '★★★★★' });
            }
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки отзывов', err);
      }

      allReviews = merged;
      renderReviews();
    }

    loadApprovedReviews();

    if (addReviewForm) {
      addReviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reviewName').value.trim();
        const text = document.getElementById('reviewText').value.trim();
        if (!name || !text) return;

        const consent = document.getElementById('reviewConsent');
        if (consent && !consent.checked) {
          const field = consent.closest('.consent-field');
          field?.classList.add('consent-field--error');
          consent.addEventListener('change', () => field?.classList.remove('consent-field--error'), { once: true });
          consent.focus();
          showToast('Подтвердите согласие на обработку персональных данных', 'error');
          return;
        }

        const submitBtn = addReviewForm.querySelector('button[type="submit"]');
        const original = submitBtn?.textContent;
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Отправка...'; }

        try {
          const res = await Store.apiFetch(APP_CONFIG.API.reviews, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, text }),
          });
          if (!res.ok) throw new Error('server');

          addReviewForm.reset();
          showToast('Спасибо! Ваш отзыв отправлен на проверку.', 'success');
        } catch {
          showToast('Не удалось отправить отзыв. Попробуйте позже.', 'error');
        } finally {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = original; }
        }
      });
    }

    loadApprovedReviews();
  });

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
    ));
  }
})();