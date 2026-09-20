import test from "node:test";
import assert from "node:assert/strict";
import { createOrderEvent, nextOrderState, evaluateOrderAutomation } from "../lib/automation.js";

test("automation rejects unsupported events", () => {
  assert.throws(() => createOrderEvent({type:"unknown.event",orderId:"ord_1"}), /Unsupported event type/);
});

test("automation creates a valid event", () => {
  const event=createOrderEvent({type:"payment.confirmed",orderId:"ord_1"});
  assert.equal(event.type,"payment.confirmed");
  assert.equal(event.orderId,"ord_1");
  assert.equal(event.businessId,"ecommerce");
  assert.match(event.id,/^evt_/);
});

test("order state transitions follow the safety flow", () => {
  assert.equal(nextOrderState("payment_pending","payment.confirmed"),"paid");
  assert.equal(nextOrderState("paid","order.created"),"validated");
  assert.equal(nextOrderState("validated","order.validated"),"supplier_pending");
  assert.equal(nextOrderState("supplier_pending","supplier.order.requested"),"supplier_ordered");
  assert.equal(nextOrderState("supplier_ordered","supplier.order.confirmed"),"fulfilled");
  assert.equal(nextOrderState("fulfilled","shipment.tracking.updated"),"tracking_available");
  assert.equal(nextOrderState("tracking_available","order.delivered"),"delivered");
});

test("automation blocks fulfilment when any gate is missing", () => {
  const result=evaluateOrderAutomation({paymentConfirmed:true,productApproved:true,supplierVerified:false,marginApproved:true});
  assert.equal(result.canAutoFulfill,false);
  assert.deepEqual(result.blockers,["supplier_not_verified"]);
});

test("automation allows fulfilment only when all gates pass", () => {
  const result=evaluateOrderAutomation({paymentConfirmed:true,productApproved:true,supplierVerified:true,marginApproved:true});
  assert.equal(result.canAutoFulfill,true);
  assert.deepEqual(result.blockers,[]);
});
