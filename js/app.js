// js/app.js
(() => {
  "use strict";

  /* ---------- helpers ---------- */
  const $el  = (s, root = document) => root.querySelector(s);
  const $all = (s, root = document) => [...root.querySelectorAll(s)];

  const money = (n) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(n);

  const escapeHTML = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const plural = (n, one, few, many) => {
    const n10 = n % 10, n100 = n % 100;
    return n100 >= 11 && n100 <= 14 ? many : n10 === 1 ? one : n10 >= 2 && n10 <= 4 ? few : many;
  };

  /* ---------- data ---------- */
  const data = window.LUNCH_DATA || { products: [] };
  const products = data.products;
  const productById = (id) => products.find((p) => p.id === id);

  /* ---------- storage ---------- */
  const storage = {
    get(key, fallback) {
      try {
        const v = JSON.parse(localStorage.getItem("nyxora:" + key));
        return v ?? fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("nyxora:" + key, JSON.stringify(value)); }
      catch { /* приватный режим / квота */ }
    },
  };

  /* ---------- state ---------- */
  const state = {
    cart:      storage.get("cart", []),
    favorites: storage.get("favorites", []),
    orders:    storage.get("orders", []),
    profile:   storage.get("profile", {
      name: "Покупатель NYXORA", email: "", phone: "", city: "", address: "",
    }),
    view: "home",
  };

  /* ---------- icons ---------- */
  const icon = (name) =>
    ({
      heart: '<svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 5-8.8 10-8.8 10s-8.8-5-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></svg>',
      cart:  '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
      check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    })[name] || "";

  /* ---------- persistence ---------- */
  const persist = () => {
    storage.set("cart", state.cart);
    storage.set("favorites", state.favorites);
    storage.set("orders", state.orders);
    storage.set("profile", state.profile);
    updateCounts();
  };

  const updateCounts = () => {
    const count = state.cart.reduce((sum, i) => sum + i.qty, 0);
    const map = {
      "#cart-count":         count || "",
      "#favorite-count":     state.favorites.length || "",
      "#mobile-cart-count":  count || "",
      "#mobile-fav-count":   state.favorites.length || "",
    };
    for (const [sel, val] of Object.entries(map)) {
      const node = $el(sel);
      if (node) node.textContent = val;
    }
  };

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(message, symbol = "✓") {
    const region = $el("#toast-region");
    if (!region) return;
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<span class="toast-icon">${symbol}</span><span></span>`;
    node.lastElementChild.textContent = message;
    region.append(node);

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      node.style.opacity = "0";
      node.style.transform = "translateY(8px)";
      setTimeout(() => node.remove(), 220);
    }, 2600);
  }

  /* ---------- product card ---------- */
  function productCard(p) {
    const fav = state.favorites.includes(p.id);
    return `<article class="product-card">
      <div class="product-image-wrap" data-product="${p.id}" role="button" tabindex="0" aria-label="Подробнее: ${escapeHTML(p.name)}">
        <img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/600x600/21182e/c8a9ff?text=NYXORA'">
        <div class="product-badges">${p.hit ? '<span class="product-badge badge-new">ХИТ</span>' : ""}${p.discount ? `<span class="product-badge">−${p.discount}%</span>` : ""}</div>
      </div>
      <button class="favorite-button ${fav ? "active" : ""}" data-favorite="${p.id}" aria-label="${fav ? "Убрать из избранного" : "В избранное"}">${icon("heart")}</button>
      <div class="product-info">
        <div class="product-category">${escapeHTML(p.category)}</div>
        <div class="product-title" data-product="${p.id}" role="button" tabindex="0">${escapeHTML(p.name)}</div>
        <div class="product-rating">★ ${p.rating.toFixed(1)} <span>(${p.reviews} отзывов)</span></div>
        <div class="product-bottom">
          <div class="price-block">
            <span class="product-price">${money(p.price)}</span>
            ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}
          </div>
          <button class="add-cart" data-add-cart="${p.id}" aria-label="Добавить ${escapeHTML(p.name)} в корзину">${icon("cart")}</button>
        </div>
      </div>
    </article>`;
  }

  /* ---------- cart / favorites ---------- */
  function addToCart(id) {
    const p = productById(id);
    if (!p) return;
    const item = state.cart.find((i) => i.id === id);
    if (item) {
      if (item.qty >= p.stock) return toast("Достигнуто максимальное количество", "!");
      item.qty++;
    } else {
      state.cart.push({ id, qty: 1 });
    }
    persist();
    toast(`${p.name} добавлен в корзину`, "＋");
    if (state.view === "cart") renderView();
  }

  function toggleFavorite(id) {
    const p = productById(id);
    if (!p) return;
    if (state.favorites.includes(id)) {
      state.favorites = state.favorites.filter((x) => x !== id);
      toast("Удалено из избранного", "♡");
    } else {
      state.favorites.push(id);
      toast("Сохранено в избранное", "♡");
    }
    persist();
    // Перерисовываем кнопки на текущей странице, если они есть
    $all(`[data-favorite="${id}"]`).forEach((btn) => {
      const active = state.favorites.includes(id);
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-label", active ? "Убрать из избранного" : "В избранное");
      btn.innerHTML = active ? "♥" : "♡";
    });
    if (state.view === "favorites") renderView();
  }

  function changeQty(id, delta) {
    const item = state.cart.find((i) => i.id === id);
    const p = productById(id);
    if (!item || !p) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter((i) => i.id !== id);
    else if (item.qty > p.stock) item.qty = p.stock;
    persist();
    renderView();
  }

  /* ---------- product dialog ---------- */
  function openProduct(id) {
    const p = productById(id);
    if (!p) return;

    const dialog = $el("#product-dialog");
    const content = $el("#dialog-content");
    if (!dialog || !content) return;

    content.innerHTML = `<div class="product-detail">
      <div class="detail-image"><img src="${p.image}" alt="${escapeHTML(p.name)}" onerror="this.onerror=null;this.src='https://placehold.co/600x600/21182e/c8a9ff?text=NYXORA'"></div>
      <div class="detail-copy">
        <div class="eyebrow">${escapeHTML(p.category.toUpperCase())}${p.hit ? " · ХИТ" : ""}</div>
        <h2 id="product-dialog-title">${escapeHTML(p.name)}</h2>
        <div class="product-rating">★ ${p.rating.toFixed(1)} <span>(${p.reviews} отзывов)</span></div>
        <div class="detail-price">${money(p.price)} ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}</div>
        <p>${escapeHTML(p.description)}</p>
        <div class="detail-specs">
          <div class="detail-spec"><small>Вес порции</small><strong>${escapeHTML(p.weight)}</strong></div>
          <div class="detail-spec"><small>Наличие</small><strong>${p.stock > 0 ? "В наличии" : "Нет в наличии"}</strong></div>
          <div class="detail-spec"><small>Категория</small><strong>${escapeHTML(p.category)}</strong></div>
          <div class="detail-spec"><small>Артикул</small><strong>${p.id.toUpperCase()}</strong></div>
        </div>
        <div class="detail-actions">
          <button class="button button-primary" data-add-cart="${p.id}">В корзину ${icon("cart")}</button>
          <button class="button button-secondary" data-favorite="${p.id}">${state.favorites.includes(p.id) ? "♥ В избранном" : "♡ В избранное"}</button>
        </div>
      </div>
    </div>`;

    dialog.setAttribute("aria-labelledby", "product-dialog-title");
    dialog.showModal();
  }

  /* ---------- navigation between views ---------- */
  function navigate(view) {
    state.view = view;
    const home = view === "home";
    const appMain  = $el("#app-main");
    const viewMain = $el("#view-main");
    if (!appMain || !viewMain) return;

    appMain.hidden = !home;
    viewMain.hidden = home;

    $all(".mobile-nav button").forEach((b) =>
      b.classList.toggle("mobile-nav-active", b.dataset.view === view)
    );

    if (!home) renderView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- empty panel ---------- */
  function emptyPanel(symbol, title, desc, buttonText, buttonAction) {
    return `<div class="empty-panel">
      <div class="empty-icon">${symbol}</div>
      <h2>${title}</h2>
      <p>${desc}</p>
      <button class="button button-primary" ${buttonAction}>${buttonText} →</button>
    </div>`;
  }

  /* ---------- view renderer ---------- */
  function renderView() {
    const main = $el("#view-main");
    if (!main) return;

    const heading = (eyebrow, title, desc, action = "") =>
      `<div class="view-heading">
        <div>
          <div class="eyebrow">${eyebrow}</div>
          <h1>${title}</h1>
          <p>${desc}</p>
        </div>${action}
      </div>`;

    if (state.view === "favorites") {
      const list = state.favorites.map(productById).filter(Boolean);
      main.innerHTML =
        heading("ТВОЯ ЛИЧНАЯ КОЛЛЕКЦИЯ", "Избранное.", "Сохраняй то, что зацепило.") +
        (list.length
          ? `<div class="view-products">${list.map(productCard).join("")}</div>`
          : emptyPanel("♡", "Пока здесь пусто", "Добавляй сердечком товары, к которым захочется вернуться.", "Исследовать каталог", "data-go-catalog"));
    }

    else if (state.view === "cart") {
      const items = state.cart
        .map((i) => ({ ...i, product: productById(i.id) }))
        .filter((i) => i.product);

      const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
      const discount = items.reduce(
        (s, i) => s + ((i.product.oldPrice || i.product.price) - i.product.price) * i.qty,
        0
      );

      main.innerHTML =
        heading("ПОЧТИ ТВОЁ", "Корзина.", "Всё выбранное — в одном месте.",
          `<button class="text-link" data-go-catalog>← Продолжить покупки</button>`) +
        (items.length
          ? `<div class="cart-layout">
              <div class="cart-list">
                ${items.map(({ id, qty, product: p }) => `
                  <article class="cart-item">
                    <img src="${p.image}" alt="${escapeHTML(p.name)}" onerror="this.onerror=null;this.src='https://placehold.co/200x200/21182e/c8a9ff?text=NYXORA'">
                    <div>
                      <div class="product-category">${escapeHTML(p.category)}</div>
                      <h3>${escapeHTML(p.name)}</h3>
                      <div class="product-rating">★ ${p.rating.toFixed(1)}</div>
                      <div class="cart-item-actions">
                        <div class="qty-control">
                          <button data-qty="${id}" data-delta="-1" aria-label="Уменьшить">−</button>
                          <span>${qty}</span>
                          <button data-qty="${id}" data-delta="1" aria-label="Увеличить">+</button>
                        </div>
                        <button class="remove-button" data-remove-cart="${id}">Удалить</button>
                      </div>
                    </div>
                    <div class="cart-item-price">${money(p.price * qty)}</div>
                  </article>`).join("")}
              </div>
              <aside class="summary-card">
                <h2>Твой заказ</h2>
                <div class="summary-line"><span>Товары (${items.reduce((s, i) => s + i.qty, 0)})</span><strong>${money(subtotal + discount)}</strong></div>
                <div class="summary-line"><span>Скидка</span><strong style="color:var(--lime)">−${money(discount)}</strong></div>
                <div class="summary-line"><span>Доставка</span><strong style="color:var(--lime)">Бесплатно</strong></div>
                <div class="summary-line summary-total"><span>Итого</span><strong>${money(subtotal)}</strong></div>
                <button class="button button-primary" data-checkout>Перейти к оформлению →</button>
                <p class="summary-note">Демо-оформление. Оплата не производится.</p>
              </aside>
            </div>`
          : emptyPanel("🛍", "Корзина ждёт находок", "Добавь товары, которые хочется забрать с собой.", "Перейти в каталог", "data-go-catalog"));
    }

    else if (state.view === "orders") {
      const orders = state.orders;
      main.innerHTML =
        heading("ВСЁ ПОД КОНТРОЛЕМ", "Мои заказы.", "История твоих покупок и статусы доставки.") +
        (orders.length
          ? `<div class="orders-list">${orders.map((o) => `
              <article class="order-card">
                <div class="order-top">
                  <div><strong>Заказ ${o.number}</strong><small>${new Date(o.date).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}</small></div>
                  <span class="order-status">${escapeHTML(o.status)}</span>
                </div>
                <div class="order-items">
                  ${o.items.map((i) => {
                    const p = productById(i.id);
                    return p ? `<img src="${p.image}" alt="${escapeHTML(p.name)}" title="${escapeHTML(p.name)}">` : "";
                  }).join("")}
                  <small style="color:var(--muted)"> ${o.items.reduce((s, i) => s + i.qty, 0)} ${plural(o.items.reduce((s, i) => s + i.qty, 0), "товар", "товара", "товаров")}</small>
                </div>
                <div class="order-bottom"><span>${escapeHTML(o.name)} · ${escapeHTML(o.city)}</span><strong>${money(o.total)}</strong></div>
              </article>`).join("")}</div>`
          : emptyPanel("▤", "Заказов пока нет", "Когда оформишь первую покупку, она появится здесь.", "Выбрать товары", "data-go-catalog"));
    }

    else if (state.view === "profile") {
      const p = state.profile;
      main.innerHTML =
        heading("ТВОЁ ПРОСТРАНСТВО", "Личный кабинет.", "Управляй данными и следи за своими покупками.") +
        `<div class="profile-layout">
          <aside class="profile-card">
            <div class="profile-large-avatar">${escapeHTML((p.name || "N").trim().charAt(0).toUpperCase())}</div>
            <h2>${escapeHTML(p.name || "Покупатель NYXORA")}</h2>
            <p>${escapeHTML(p.email || "Добавь email в данные профиля")}</p>
            <div class="profile-stat-row">
              <div class="profile-stat"><strong>${state.orders.length}</strong><small>заказов</small></div>
              <div class="profile-stat"><strong>${state.favorites.length}</strong><small>избранное</small></div>
            </div>
          </aside>
          <section class="profile-content-card">
            <h2>Личные данные</h2>
            <p style="color:var(--muted);font-size:11px">Данные сохраняются только в этом браузере в демо-режиме.</p>
            <form id="profile-form" class="profile-form">
              <div class="form-field"><label for="profile-name">Имя</label><input id="profile-name" name="name" value="${escapeHTML(p.name || "")}" required></div>
              <div class="form-field"><label for="profile-email">Email</label><input id="profile-email" name="email" type="email" value="${escapeHTML(p.email || "")}" placeholder="name@example.com"></div>
              <div class="form-field"><label for="profile-phone">Телефон</label><input id="profile-phone" name="phone" type="tel" value="${escapeHTML(p.phone || "")}" placeholder="+7 ..."></div>
              <div class="form-field"><label for="profile-city">Город</label><input id="profile-city" name="city" value="${escapeHTML(p.city || "")}" placeholder="Твой город"></div>
              <div class="form-field full"><label for="profile-address">Адрес доставки</label><input id="profile-address" name="address" value="${escapeHTML(p.address || "")}" placeholder="Улица, дом, квартира"></div>
              <button class="button button-primary" type="submit">Сохранить изменения ${icon("check")}</button>
            </form>
          </section>
        </div>`;
    }
  }

  /* ---------- checkout ---------- */
  function showCheckout() {
    if (!state.cart.length) return;
    const content = $el("#checkout-content");
    const dialog  = $el("#checkout-dialog");
    if (!content || !dialog) return;

    content.innerHTML = `<div class="checkout-content">
      <div class="eyebrow">ПОСЛЕДНИЙ ШАГ</div>
      <h2 id="checkout-dialog-title">Оформление заказа</h2>
      <p>Заполни данные доставки. Это демонстрационный сценарий — реальные платежи не выполняются.</p>
      <form id="checkout-form" class="checkout-form">
        <div class="form-field"><label for="checkout-name">Имя и фамилия *</label><input id="checkout-name" name="name" value="${escapeHTML(state.profile.name === "Покупатель NYXORA" ? "" : state.profile.name)}" required></div>
        <div class="form-field"><label for="checkout-email">Email *</label><input id="checkout-email" name="email" type="email" value="${escapeHTML(state.profile.email || "")}" required></div>
        <div class="form-field"><label for="checkout-phone">Телефон *</label><input id="checkout-phone" name="phone" type="tel" value="${escapeHTML(state.profile.phone || "")}" required></div>
        <div class="form-field"><label for="checkout-city">Город *</label><input id="checkout-city" name="city" value="${escapeHTML(state.profile.city || "")}" required></div>
        <div class="form-field"><label for="checkout-address">Адрес доставки *</label><textarea id="checkout-address" name="address" required>${escapeHTML(state.profile.address || "")}</textarea></div>
        <div class="summary-line summary-total"><span>К оплате (демо)</span><strong>${money(state.cart.reduce((s, i) => s + (productById(i.id)?.price || 0) * i.qty, 0))}</strong></div>
        <button class="button button-primary" type="submit">Подтвердить заказ →</button>
      </form>
    </div>`;
    dialog.setAttribute("aria-labelledby", "checkout-dialog-title");
    dialog.showModal();
  }

  function placeOrder(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const items = state.cart.map((i) => ({ ...i }));
    const total = items.reduce((s, i) => s + (productById(i.id)?.price || 0) * i.qty, 0);

    state.profile = { ...state.profile, ...values };
    const order = {
      number: "NX-" + Date.now().toString().slice(-7),
      date: new Date().toISOString(),
      status: "Принят · демо",
      items, total,
      name: values.name, city: values.city,
    };
    state.orders.unshift(order);
    state.cart = [];
    persist();

    const content = $el("#checkout-content");
    if (content) {
      content.innerHTML = `<div class="checkout-content checkout-success">
        <div class="success-icon">✓</div>
        <div class="eyebrow" style="justify-content:center">ВСЁ ГОТОВО</div>
        <h2>Заказ создан!</h2>
        <p>Номер <strong>${escapeHTML(order.number)}</strong>. Это демонстрационный заказ: оплата и доставка не оформлялись.</p>
        <button class="button button-primary" data-view="orders">Перейти к заказам →</button>
      </div>`;
    }
    toast("Демо-заказ успешно создан");
  }

  /* ---------- delegated click ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a, [data-product]");
    if (!t) return;

    if (t.dataset.view) { e.preventDefault(); navigate(t.dataset.view); return; }
    if (t.dataset.product) { openProduct(t.dataset.product); return; }
    if (t.dataset.addCart) { addToCart(t.dataset.addCart); return; }
    if (t.dataset.favorite) { toggleFavorite(t.dataset.favorite); return; }
    if (t.dataset.goCatalog !== undefined) { navigate("home"); return; }
    if (t.dataset.qty) { changeQty(t.dataset.qty, Number(t.dataset.delta)); return; }
    if (t.dataset.removeCart) {
      state.cart = state.cart.filter((i) => i.id !== t.dataset.removeCart);
      persist();
      renderView();
      toast("Товар удалён из корзины");
      return;
    }
    if (t.id === "explore-button") {
      e.preventDefault();
      const menu = $el("#menu");
      if (menu) menu.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (t.hasAttribute("data-checkout")) { showCheckout(); return; }
    if (t.id === "dialog-close")         { $el("#product-dialog")?.close(); return; }
    if (t.id === "checkout-close")       { $el("#checkout-dialog")?.close(); return; }
  });

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    // Cmd/Ctrl+K — фокус в поиск
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      const input = $el("#search-input");
      if (input) { e.preventDefault(); input.focus(); }
    }
    // Enter на «карточке товара»
    if (e.key === "Enter" && e.target.matches?.("[data-product]")) {
      openProduct(e.target.dataset.product);
    }
    // Esc — закрыть диалоги
    if (e.key === "Escape") {
      const pd = $el("#product-dialog");
      const cd = $el("#checkout-dialog");
      if (pd?.open) pd.close();
      if (cd?.open) cd.close();
    }
  });

  /* ---------- search form (header) ---------- */
  const searchForm  = $el("#search-form");
  const searchInput = $el("#search-input");

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // Каталога на странице нет — уводим на главную к разделу меню
      const q = (searchInput?.value || "").trim();
      if (q) location.href = "index.html#menu";
    });
  }

  if (searchInput) {
    // «мягкий» сброс при очистке — перерисовки каталога нет, оставляем как noop
    searchInput.addEventListener("input", () => { /* no-op без каталога */ });
  }

  /* ---------- dialogs submit / close ---------- */
  $el("#checkout-close")?.addEventListener("click", () => $el("#checkout-dialog")?.close());
  $el("#dialog-close")?.addEventListener("click",   () => $el("#product-dialog")?.close());

  const checkoutContent = $el("#checkout-content");
  if (checkoutContent) {
    checkoutContent.addEventListener("submit", (e) => {
      if (e.target.id === "checkout-form") {
        e.preventDefault();
        placeOrder(e.target);
      }
    });
    checkoutContent.addEventListener("click", (e) => {
      const b = e.target.closest("[data-view]");
      if (b) {
        $el("#checkout-dialog")?.close();
        navigate(b.dataset.view);
      }
    });
  }

  /* ---------- profile form ---------- */
  const viewMain = $el("#view-main");
  if (viewMain) {
    viewMain.addEventListener("submit", (e) => {
      if (e.target.id === "profile-form") {
        e.preventDefault();
        state.profile = Object.fromEntries(new FormData(e.target).entries());
        persist();
        renderView();
        toast("Данные профиля сохранены");
      }
    });
  }

  /* ---------- init ---------- */
  updateCounts();

    // ============================================================
  // ОТКРЫТИЕ МОДАЛОК (Избранное, Заказы, Профиль)
  // ============================================================
  const favOverlay = document.getElementById('favOverlay');
  const ordersOverlay = document.getElementById('ordersOverlay');
  const authOverlay = document.getElementById('authOverlay');

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const view = btn.dataset.view;
      
      if (view === 'favorites') {
        if (favOverlay) favOverlay.style.display = 'flex';
      } else if (view === 'orders') {
        if (ordersOverlay) ordersOverlay.style.display = 'flex';
      } else if (view === 'profile') {
        if (authOverlay) authOverlay.style.display = 'flex';
      } else if (view === 'cart') {
        window.location.href = 'cart.html';
      }
    });
  });

  // Закрытие модалок
  document.getElementById('favCloseBtn')?.addEventListener('click', () => favOverlay.style.display = 'none');
  document.getElementById('ordersCloseBtn')?.addEventListener('click', () => ordersOverlay.style.display = 'none');
  document.getElementById('authCloseBtn')?.addEventListener('click', () => authOverlay.style.display = 'none');

  // Закрытие при клике на фон
  [favOverlay, ordersOverlay, authOverlay].forEach(overlay => {
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    }
  });

  // Проверяем, не пришли ли мы с другой страницы с просьбой открыть модалку
  const urlParams = new URLSearchParams(window.location.search);
  const openView = urlParams.get('open');
  if (openView) {
      // Если пришли с параметром, открываем нужную модалку
      setTimeout(() => {
          if (openView === 'favorites') {
              if (typeof renderFavorites === 'function') renderFavorites();
              const favOverlay = document.getElementById('favOverlay');
              if (favOverlay) favOverlay.classList.add('open');
          } else if (openView === 'orders') {
              if (typeof renderOrdersHistory === 'function') renderOrdersHistory();
              const ordersOverlay = document.getElementById('ordersOverlay');
              if (ordersOverlay) ordersOverlay.classList.add('open');
          } else if (openView === 'profile') {
              if (typeof updateAuthUI === 'function') updateAuthUI();
              const authOverlay = document.getElementById('authOverlay');
              if (authOverlay) authOverlay.classList.add('open');
          }
          
          // Очищаем URL от параметра, чтобы при обновлении страницы модалка не открывалась снова
          window.history.replaceState({}, document.title, window.location.pathname);
      }, 100); // Небольшая задержка, чтобы DOM успел прогрузиться
  }
})();