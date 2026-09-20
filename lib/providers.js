export const providerCapabilities = {
  shopify: ["orders.webhook", "fulfillment", "tracking"],
  stripe: ["payment.webhook", "checkout"],
  supplier: ["order.submit", "tracking.import"]
};

export function providerStatus() {
  return Object.fromEntries(Object.keys(providerCapabilities).map(name => [
    name,
    { configured: false, capabilities: providerCapabilities[name] }
  ]));
}
