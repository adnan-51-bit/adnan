export const providerCapabilities = {
  shopify: ["orders.webhook", "fulfillment", "tracking"],
  stripe: ["payment.webhook", "checkout"],
  supplier: ["order.submit", "tracking.import"],
  notifications: ["email", "slack"]
};

export function providerStatus() {
  return {
    shopify: { configured: Boolean(process.env.SHOPIFY_WEBHOOK_SECRET), productionReady: false },
    stripe: { configured: Boolean(process.env.STRIPE_WEBHOOK_SECRET), productionReady: false },
    supplier: { configured: false, productionReady: false },
    notifications: {
      email: Boolean(process.env.RESEND_API_KEY),
      slack: Boolean(process.env.SLACK_WEBHOOK_URL),
      productionReady: false
    },
    // Vorher fest false - seit Supabase (26.09.2026) aus den echten Variablen abgeleitet.
    persistence: { configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY), productionReady: false }
  };
}
