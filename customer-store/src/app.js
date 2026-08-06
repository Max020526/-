const config = window.NEXORA_CONFIG || {};
const productGrid = document.querySelector("#productGrid");
const storeNotice = document.querySelector("#storeNotice");
const searchInput = document.querySelector("#searchInput");
const cartDrawer = document.querySelector("#cartDrawer");
const drawerBackdrop = document.querySelector("#drawerBackdrop");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const cartSubtotal = document.querySelector("#cartSubtotal");
const checkoutSubtotal = document.querySelector("#checkoutSubtotal");
const checkoutDialog = document.querySelector("#checkoutDialog");
const orderDialog = document.querySelector("#orderDialog");

let products = [];
let cart = readJson("nexora-cart", []);
const guestSessionId = localStorage.getItem("nexora-guest-session") || crypto.randomUUID();
localStorage.setItem("nexora-guest-session", guestSessionId);

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "") || fallback; } catch { return fallback; }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function money(value, currency = "EUR") {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency }).format(Number(value || 0));
}

function mediaUrl(media) {
  if (!media?.media_path || !config.internalApiUrl) return "";
  return `${String(config.internalApiUrl).replace(/\/$/, "")}${media.media_path}`;
}

async function rpc(name, body) {
  if (!config.supabaseUrl || !config.publishableKey) throw new Error("商城测试环境尚未配置完成。");
  const response = await fetch(`${String(config.supabaseUrl).replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${config.publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "请求失败，请稍后重试。");
  return payload;
}

function showNotice(message) {
  storeNotice.textContent = message;
  storeNotice.classList.toggle("hidden", !message);
}

function renderProducts() {
  const needle = searchInput.value.trim().toLowerCase();
  const visible = products.filter((product) => [product.style_no, product.title, product.name_it, product.name_en, product.category_name]
    .some((value) => String(value || "").toLowerCase().includes(needle)));
  if (!visible.length) {
    productGrid.innerHTML = '<div class="empty-card">没有找到商品。</div>';
    return;
  }
  productGrid.innerHTML = visible.map((product) => {
    const variants = (product.variants || []).filter((variant) => Number(variant.available_quantity) > 0);
    const media = mediaUrl((product.media || []).find((item) => item.is_primary) || product.media?.[0]);
    const options = variants.map((variant) => `<option value="${escapeHtml(variant.id)}">${escapeHtml(variant.color_name)} · ${escapeHtml(variant.size_name)} · ${escapeHtml(variant.available_quantity)} 件</option>`).join("");
    return `<article class="product-card" data-product-id="${escapeHtml(product.id)}">
      <div class="product-image">${media ? `<img src="${escapeHtml(media)}" alt="${escapeHtml(product.title)}" loading="lazy">` : "N"}</div>
      <div class="product-body">
        <div class="product-meta"><span>${escapeHtml(product.category_name || "新品")}</span><span>${escapeHtml(product.style_no)}</span></div>
        <h3>${escapeHtml(product.title || product.style_no)}</h3>
        <div><span class="price">${money(product.unit_price, product.currency)}</span>${product.compare_at_price ? `<span class="compare-price">${money(product.compare_at_price, product.currency)}</span>` : ""}</div>
        <div class="variant-row">
          <select aria-label="选择颜色和尺码" ${variants.length ? "" : "disabled"}>${options || '<option>暂时缺货</option>'}</select>
          <input type="number" min="1" max="10" value="1" aria-label="数量">
        </div>
        <button class="add-button" type="button" ${variants.length ? "" : "disabled"}>${variants.length ? "加入购物袋" : "暂时缺货"}</button>
      </div>
    </article>`;
  }).join("");
}

async function loadCatalog() {
  try {
    const data = await rpc("rpc_get_storefront_catalog", { p_slug: null, p_limit: 200 });
    products = Array.isArray(data?.products) ? data.products : [];
    renderProducts();
    showNotice("");
  } catch (error) {
    productGrid.innerHTML = '<div class="empty-card">商城暂时无法加载。</div>';
    showNotice(error instanceof Error ? error.message : "商城暂时无法加载。");
  }
}

function persistCart() {
  localStorage.setItem("nexora-cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  cartCount.textContent = String(totalQuantity);
  cartSubtotal.textContent = money(subtotal);
  checkoutSubtotal.textContent = money(subtotal);
  cartItems.innerHTML = cart.length ? cart.map((item, index) => `<div class="cart-line">
    <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.colorName)} · ${escapeHtml(item.sizeName)} · ${item.quantity} 件</p><p>${money(item.unitPrice)}</p></div>
    <button type="button" data-remove-index="${index}">移除</button>
  </div>`).join("") : '<div class="empty-card">购物袋是空的。</div>';
  document.querySelector("#checkoutButton").disabled = cart.length === 0;
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.classList.remove("hidden");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.classList.add("hidden");
}

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".add-button");
  if (!button) return;
  const card = button.closest(".product-card");
  const product = products.find((item) => item.id === card.dataset.productId);
  const variant = product?.variants?.find((item) => item.id === card.querySelector("select").value);
  const quantity = Math.max(1, Math.min(10, Number(card.querySelector('input[type="number"]').value || 1)));
  if (!product || !variant || quantity > Number(variant.available_quantity)) return showNotice("该规格库存不足。");
  const existing = cart.find((item) => item.variantId === variant.id);
  if (existing) existing.quantity = Math.min(10, existing.quantity + quantity);
  else cart.push({ variantId: variant.id, title: product.title || product.style_no, colorName: variant.color_name, sizeName: variant.size_name, unitPrice: Number(product.unit_price), quantity });
  persistCart();
  openCart();
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-index]");
  if (!button) return;
  cart.splice(Number(button.dataset.removeIndex), 1);
  persistCart();
});

document.querySelector("#cartButton").addEventListener("click", openCart);
document.querySelector("#closeCartButton").addEventListener("click", closeCart);
drawerBackdrop.addEventListener("click", closeCart);
searchInput.addEventListener("input", renderProducts);

document.querySelector("#checkoutButton").addEventListener("click", () => {
  closeCart();
  checkoutDialog.showModal();
});

const checkoutForm = document.querySelector("#checkoutForm");
checkoutForm.elements.fulfillment_method.addEventListener("change", () => {
  const delivery = checkoutForm.elements.fulfillment_method.value === "DELIVERY";
  document.querySelectorAll(".delivery-field").forEach((field) => field.classList.toggle("hidden", !delivery));
});

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = document.querySelector("#submitOrderButton");
  const message = document.querySelector("#checkoutMessage");
  const form = new FormData(checkoutForm);
  const fulfillmentMethod = String(form.get("fulfillment_method"));
  submit.disabled = true;
  message.textContent = "正在提交订单…";
  try {
    const result = await rpc("rpc_create_storefront_order", {
      p_items: cart.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
      p_fulfillment_method: fulfillmentMethod,
      p_contact: { full_name: form.get("full_name"), email: form.get("email"), phone: form.get("phone") },
      p_shipping_address: fulfillmentMethod === "DELIVERY" ? { country: form.get("country"), city: form.get("city"), postal_code: form.get("postal_code"), address_line: form.get("address_line") } : null,
      p_customer_note: form.get("customer_note") || null,
      p_idempotency_key: `store-${crypto.randomUUID()}`,
      p_guest_session_id: guestSessionId,
      p_request_id: crypto.randomUUID(),
    });
    const savedOrder = { orderId: result.order_id, lookupToken: result.lookup_token, orderNo: result.order_no };
    localStorage.setItem("nexora-last-order", JSON.stringify(savedOrder));
    cart = [];
    persistCart();
    checkoutDialog.close();
    openOrderDialog(savedOrder, `订单 ${result.order_no} 已创建，合计 ${money(result.total_amount, result.currency)}。`);
    await loadCatalog();
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "订单创建失败，请重试。";
  } finally { submit.disabled = false; }
});

function openOrderDialog(saved = readJson("nexora-last-order", {}), message = "") {
  const form = document.querySelector("#orderLookupForm");
  form.elements.order_id.value = saved.orderId || "";
  form.elements.lookup_token.value = saved.lookupToken || "";
  document.querySelector("#orderMessage").textContent = message;
  document.querySelector("#orderResult").classList.add("hidden");
  orderDialog.showModal();
}

document.querySelector("#orderLookupButton").addEventListener("click", () => openOrderDialog());
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#${button.dataset.closeDialog}`).close()));

document.querySelector("#orderLookupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const message = document.querySelector("#orderMessage");
  const resultBox = document.querySelector("#orderResult");
  message.textContent = "正在查询…";
  try {
    const result = await rpc("rpc_get_storefront_order", { p_order_id: form.get("order_id"), p_lookup_token: form.get("lookup_token"), p_request_id: crypto.randomUUID() });
    resultBox.innerHTML = `<dl><dt>订单号</dt><dd>${escapeHtml(result.order_no)}</dd><dt>状态</dt><dd>${escapeHtml(result.status)}</dd><dt>付款</dt><dd>${escapeHtml(result.payment_status)}</dd><dt>合计</dt><dd>${money(result.total_amount, result.currency)}</dd></dl>`;
    resultBox.classList.remove("hidden");
    message.textContent = "";
  } catch (error) {
    resultBox.classList.add("hidden");
    message.textContent = error instanceof Error ? error.message : "订单查询失败。";
  }
});

renderCart();
void loadCatalog();
