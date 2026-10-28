// js/site.js
(() => {
  'use strict';
  const $el  = (s, root = document) => root.querySelector(s);
  const $all = (s, root = document) => [...root.querySelectorAll(s)];

  function initFaq() {
    const items = $all('.faq-item');
    if (!items.length) return;

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

  function initParallax() {
    const scene = document.getElementById('scene');
    if (!scene) return;

    const layers = Array.from(scene.querySelectorAll('[data-depth]'));
    let mouseX = 0;
    let mouseY = 0;
    let w = window.innerWidth;
    let h = window.innerHeight;

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX - w / 2) / (w / 2);
      mouseY = (e.clientY - h / 2) / (h / 2);
    });

    window.addEventListener('resize', () => {
      w = window.innerWidth;
      h = window.innerHeight;
    });

    function animate() {
      layers.forEach(layer => {
        const depth = parseFloat(layer.getAttribute('data-depth')) || 0.2;
        
        const moveX = mouseX * depth * 80; 
        const moveY = mouseY * depth * 80;

        layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
      });
      requestAnimationFrame(animate);
    }
    animate();
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
    Store.updateBadges();
    initFaq();
    initEmailPicker();
    initPageFade();
    initParallax();

    const reviewsGrid = document.getElementById('reviewsGrid');
    const toggleReviewsBtn = document.getElementById('toggleReviewsBtn');
    const addReviewFormWrapper = document.getElementById('addReviewFormWrapper');
    const addReviewForm = document.getElementById('addReviewForm');

    let allReviews = [];
    let isReviewsExpanded = false;

    function renderReviews() {
      if (!reviewsGrid) return;
      
      const isMobile = window.innerWidth <= 760;
      
      reviewsGrid.innerHTML = allReviews.map(rev => `
        <article class="review-card">
          <div class="review-stars">★★★★★</div>
          <blockquote>${escapeHTML(rev.text || '')}</blockquote>
          <strong>— ${escapeHTML(rev.name || 'Гость')}</strong>
        </article>
      `).join('');

      if (isReviewsExpanded) {
        reviewsGrid.classList.add('show-all');
        if (addReviewFormWrapper) addReviewFormWrapper.classList.remove('hidden');
        if (toggleReviewsBtn) toggleReviewsBtn.innerHTML = 'Скрыть отзывы ↑';
      } else {
        reviewsGrid.classList.remove('show-all');
        if (addReviewFormWrapper) addReviewFormWrapper.classList.add('hidden');
        if (toggleReviewsBtn) toggleReviewsBtn.innerHTML = 'Показать все отзывы ↓';
      }

      if (isMobile && allReviews.length > 2) {
        if (toggleReviewsBtn) toggleReviewsBtn.style.display = 'inline-flex';
      } else {
        if (toggleReviewsBtn) toggleReviewsBtn.style.display = 'none';
        if (addReviewFormWrapper) addReviewFormWrapper.classList.remove('hidden');
        reviewsGrid.classList.add('show-all');
      }
    }

    if (toggleReviewsBtn) {
      toggleReviewsBtn.addEventListener('click', () => {
        isReviewsExpanded = !isReviewsExpanded;
        renderReviews();
      });
    }

    async function loadApprovedReviews() {
      if (!reviewsGrid) return;

      const staticReviews = [
        { name: 'Кристина', text: 'Все очень вкусно! Оперативно! Поднесли еду прям к вагону, накормили группу из 18 человек...' },
        { name: 'Виктор Васильевич', text: 'Заказывали в компании проведение корпоратива. Результатом более чем довольны...' }
      ];

      try {
        const res = await Store.apiFetch(APP_CONFIG.API.reviews);
        if (res.ok) {
          const serverReviews = await res.json();
          if (Array.isArray(serverReviews)) {
            allReviews = [...staticReviews, ...serverReviews];
          } else {
            allReviews = staticReviews;
          }
        } else {
          allReviews = staticReviews;
        }
      } catch (err) {
        console.error('Ошибка загрузки отзывов', err);
        allReviews = staticReviews;
      }

      renderReviews();
    }

    if (addReviewForm) {
      addReviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reviewName').value.trim();
        const text = document.getElementById('reviewText').value.trim();
        if (!name || !text) return;

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