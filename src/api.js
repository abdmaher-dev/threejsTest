// Frontend data layer. Every call the UI makes to "the server" goes through here.
//
// Right now it is a mock: menu data comes from src/data/menu.js and orders are only
// logged. When the backend is ready, set USE_MOCK to false (or point API_BASE at it)
// and the real fetch calls below take over. The UI does not need to change.

import { menu as mockMenu } from "./data/menu.js";

const USE_MOCK = true;
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET /api/menu → { currency, categories: [{ id, name, items: [...] }] } */
export async function getMenu() {
  if (USE_MOCK) {
    await delay(150);
    return structuredClone(mockMenu);
  }
  const res = await fetch(`${API_BASE}/menu`);
  if (!res.ok) throw new Error(`Menu request failed: ${res.status}`);
  return res.json();
}

/**
 * POST /api/orders
 * body: { items: [{ id, qty }], note? }
 * → { orderId, total, status }
 */
export async function submitOrder(order) {
  if (USE_MOCK) {
    await delay(500);
    const orderId = `DC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    console.info("[mock] order submitted", orderId, order);
    return { orderId, status: "received" };
  }
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error(`Order failed: ${res.status}`);
  return res.json();
}
