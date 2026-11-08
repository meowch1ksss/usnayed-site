// js/error.js — лёгкий параллакс числа и кнопка «Обновить» на страницах ошибок
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  if (!reduceMotion && finePointer) {
    let frame = null;

    window.addEventListener('pointermove', (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        root.style.setProperty('--mx', x.toFixed(3));
        root.style.setProperty('--my', y.toFixed(3));
        frame = null;
      });
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
      root.style.setProperty('--mx', '0');
      root.style.setProperty('--my', '0');
    });
  }

  document.getElementById('retryBtn')?.addEventListener('click', () => location.reload());
})();
