export const ORDER_STATES = ["payment_pending","paid","validated","supplier_pending","supplier_ordered","fulfilled","tracking_available","delivered","cancelled","blocked"];

export const EVENT_TYPES = ["payment.confirmed","order.created","order.validated","supplier.order.requested","supplier.order.confirmed","shipment.tracking.updated","order.delivered","order.cancelled","order.blocked","product.quality_gate.updated","system.error"];

export function createOrderEvent({ type, orderId, businessId = "ecommerce", payload = {} }) {
  if (!EVENT_TYPES.includes(type)) throw new Error("Unsupported event type: " + type);
  if (!orderId) throw new Error("orderId is required");
  return { id: "evt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), type, orderId, businessId, payload, createdAt: new Date().toISOString() };
}

export function nextOrderState(current, eventType) {
  const transitions = {
    "payment.confirmed": { payment_pending: "paid" },
    "order.created": { paid: "validated", payment_pending: "payment_pending" },
    "order.validated": { validated: "supplier_pending" },
    "supplier.order.requested": { supplier_pending: "supplier_ordered" },
    "supplier.order.confirmed": { supplier_ordered: "fulfilled" },
    "shipment.tracking.updated": { fulfilled: "tracking_available" },
    "order.delivered": { tracking_available: "delivered", fulfilled: "delivered" },
    "order.cancelled": { payment_pending: "cancelled", paid: "cancelled", validated: "cancelled", supplier_pending: "cancelled" },
    "order.blocked": { payment_pending: "blocked", paid: "blocked", validated: "blocked", supplier_pending: "blocked", supplier_ordered: "blocked" }
  };
  return transitions[eventType]?.[current] ?? current;
}

export function evaluateOrderAutomation({ paymentConfirmed, productApproved, supplierVerified, marginApproved, riskFlags = [] }) {
  const blockers = [];
  if (!paymentConfirmed) blockers.push("payment_not_confirmed");
  if (!productApproved) blockers.push("product_not_approved");
  if (!supplierVerified) blockers.push("supplier_not_verified");
  if (!marginApproved) blockers.push("margin_not_approved");
  if (riskFlags.length) blockers.push(...riskFlags);
  return { canAutoFulfill: blockers.length === 0, blockers };
}
