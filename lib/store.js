// Process-local fallback store. Production adapters must implement the same interface.
// No real customer/payment data should be stored here.
const state = globalThis.__MASTER_ZENTRALE_STORE__ || {
  events: new Map(),
  orders: new Map(),
  idempotency: new Map()
};
globalThis.__MASTER_ZENTRALE_STORE__ = state;

export function saveEvent(event, idempotencyKey) {
  if (idempotencyKey && state.idempotency.has(idempotencyKey)) {
    return { duplicate: true, event: state.events.get(state.idempotency.get(idempotencyKey)) };
  }
  state.events.set(event.id, event);
  if (idempotencyKey) state.idempotency.set(idempotencyKey, event.id);
  return { duplicate: false, event };
}

export function saveOrder(order) {
  state.orders.set(order.id, order);
  return order;
}

export function getOrder(id) {
  return state.orders.get(id) || null;
}

export function storeStats() {
  return {
    events: state.events.size,
    orders: state.orders.size,
    idempotencyKeys: state.idempotency.size,
    persistence: "process-memory-only"
  };
}

export function resetStoreForTests() {
  state.events.clear();
  state.orders.clear();
  state.idempotency.clear();
}
