import { getMenu, submitOrder } from "./api.js";
import { createCoffeeScene } from "./scene.js";

const $ = (id) => document.getElementById(id);

const els = {
  canvasHost: $("canvas-host"),
  tabs: $("tabs"),
  list: $("menu-list"),
  featureCategory: $("feature-category"),
  featureName: $("feature-name"),
  featureDesc: $("feature-desc"),
  featurePrice: $("feature-price"),
  featureAdd: $("feature-add"),
  orderLines: $("order-lines"),
  orderCount: $("order-count"),
  orderTotal: $("order-total"),
  orderClear: $("order-clear"),
  orderSubmit: $("order-submit"),
  toast: $("toast"),
};

const state = {
  items: new Map(), // id → item (with categoryName)
  selectedId: null,
  order: new Map(), // id → qty
  submitting: false,
};

let money = (n) => n.toFixed(2);
const coffee = createCoffeeScene(els.canvasHost);

init();

async function init() {
  try {
    const menu = await getMenu();
    const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency: menu.currency });
    money = (n) => formatter.format(n);

    for (const category of menu.categories) {
      for (const item of category.items) state.items.set(item.id, { ...item, categoryName: category.name });
    }
    renderMenu(menu);
    const linked = decodeURIComponent(location.hash.slice(1)); // e.g. #flat-white
    select(state.items.has(linked) ? linked : menu.categories[0].items[0].id);
    if (state.items.has(linked) && matchMedia("(min-width: 861px)").matches) {
      els.list.querySelector(`[data-id="${CSS.escape(linked)}"]`)?.scrollIntoView({ block: "center" });
    }
    syncActiveTab();
  } catch (error) {
    console.error(error);
    els.list.innerHTML = `<p class="status">Couldn't load the menu. Try refreshing.</p>`;
  }
}

// ---------- rendering ----------

function renderMenu(menu) {
  els.tabs.replaceChildren(
    ...menu.categories.map((category, i) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tab";
      tab.textContent = category.name;
      tab.dataset.target = category.id;
      tab.setAttribute("aria-current", String(i === 0));
      return tab;
    }),
  );

  els.list.replaceChildren(
    ...menu.categories.map((category) => {
      const section = document.createElement("section");
      section.className = "category";
      section.id = `cat-${category.id}`;
      section.innerHTML = `<h3>${escapeHtml(category.name)}</h3>`;

      const ul = document.createElement("ul");
      ul.className = "items";
      for (const item of category.items) {
        const li = document.createElement("li");
        li.className = "item";
        li.dataset.id = item.id;
        li.innerHTML = `
          <button class="item-select" type="button" aria-pressed="false">
            <span class="item-head">
              <span class="item-name">${escapeHtml(item.name)}</span>
              ${item.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
              <span class="item-leader" aria-hidden="true"></span>
              <span class="item-price">${money(item.price)}</span>
            </span>
            <p class="item-desc">${escapeHtml(item.description)}</p>
          </button>
          <button class="item-add" type="button" aria-label="Add ${escapeHtml(item.name)} to order">+</button>`;
        ul.append(li);
      }
      section.append(ul);
      return section;
    }),
  );
}

function select(id) {
  const item = state.items.get(id);
  if (!item || state.selectedId === id) return;
  state.selectedId = id;

  for (const li of els.list.querySelectorAll(".item")) {
    const selected = li.dataset.id === id;
    li.classList.toggle("is-selected", selected);
    li.querySelector(".item-select").setAttribute("aria-pressed", String(selected));
  }

  els.featureCategory.textContent = item.categoryName;
  els.featureName.textContent = item.name;
  els.featureDesc.textContent = item.description;
  els.featurePrice.textContent = money(item.price);
  els.featureAdd.disabled = false;
  history.replaceState(null, "", `#${id}`);

  coffee.setDrink(item.visual);
}

function renderOrder() {
  let count = 0;
  let total = 0;
  const lines = [];

  for (const [id, qty] of state.order) {
    const item = state.items.get(id);
    count += qty;
    total += item.price * qty;
    const line = document.createElement("div");
    line.className = "order-line";
    line.innerHTML = `
      <span>${escapeHtml(item.name)}</span>
      <span class="qty">
        <button type="button" data-qty="-1" data-id="${id}" aria-label="Remove one ${escapeHtml(item.name)}">−</button>
        <span>${qty}</span>
        <button type="button" data-qty="1" data-id="${id}" aria-label="Add one ${escapeHtml(item.name)}">+</button>
      </span>
      <span class="order-line-price">${money(item.price * qty)}</span>`;
    lines.push(line);
  }

  els.orderLines.replaceChildren(...lines);
  els.orderCount.textContent = count ? `${count} item${count === 1 ? "" : "s"}` : "Your order is empty";
  els.orderTotal.textContent = count ? money(total) : "";
  els.orderClear.hidden = count === 0;
  els.orderSubmit.disabled = count === 0 || state.submitting;
}

// ---------- order actions ----------

function changeQty(id, delta) {
  const qty = (state.order.get(id) ?? 0) + delta;
  if (qty <= 0) state.order.delete(id);
  else state.order.set(id, qty);
  renderOrder();
}

function add(id) {
  changeQty(id, 1);
  showToast(`${state.items.get(id).name} added`);
}

async function placeOrder() {
  if (!state.order.size || state.submitting) return;
  state.submitting = true;
  els.orderSubmit.textContent = "Sending…";
  renderOrder();

  try {
    const items = [...state.order].map(([id, qty]) => ({ id, qty }));
    const result = await submitOrder({ items });
    state.order.clear();
    showToast(`Order ${result.orderId} received`);
  } catch (error) {
    console.error(error);
    showToast("Couldn't place the order. Please try again.");
  } finally {
    state.submitting = false;
    els.orderSubmit.textContent = "Place order";
    renderOrder();
  }
}

// ---------- events ----------

els.list.addEventListener("click", (event) => {
  const li = event.target.closest(".item");
  if (!li) return;
  if (event.target.closest(".item-add")) {
    select(li.dataset.id);
    add(li.dataset.id);
  } else if (event.target.closest(".item-select")) {
    select(li.dataset.id);
  }
});

els.tabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;
  for (const t of els.tabs.children) t.setAttribute("aria-current", String(t === tab));
  $(`cat-${tab.dataset.target}`)?.scrollIntoView({ block: "start" });
});

// highlight the tab of the category currently at the top of the list
function syncActiveTab() {
  const line = els.tabs.getBoundingClientRect().bottom + 24;
  const sections = [...els.list.querySelectorAll(".category")];
  let active = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= line) active = section;
  }
  const atBottom =
    els.list.scrollTop + els.list.clientHeight >= els.list.scrollHeight - 2 &&
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  if (atBottom && sections.length) active = sections.at(-1); // the last category may never reach the top
  if (!active) return;
  for (const tab of els.tabs.children) {
    tab.setAttribute("aria-current", String(`cat-${tab.dataset.target}` === active.id));
  }
}
els.list.addEventListener("scroll", syncActiveTab, { passive: true }); // desktop: the list scrolls
window.addEventListener("scroll", syncActiveTab, { passive: true }); // mobile: the page scrolls

els.featureAdd.addEventListener("click", () => state.selectedId && add(state.selectedId));

els.orderLines.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-qty]");
  if (button) changeQty(button.dataset.id, Number(button.dataset.qty));
});

els.orderClear.addEventListener("click", () => {
  state.order.clear();
  renderOrder();
});

els.orderSubmit.addEventListener("click", placeOrder);

// ---------- helpers ----------

let toastTimeout;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

if (import.meta.hot) import.meta.hot.dispose(() => coffee.dispose());
