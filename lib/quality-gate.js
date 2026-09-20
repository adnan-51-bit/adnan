import { EVENT_TYPES, ORDER_STATES, evaluateOrderAutomation } from "./automation.js";

export function runStaticQualityGate({ storage = "unknown", systems = [], env = process.env } = {}) {
  const checks = [];
  const add = (id, status, message, details = {}) => checks.push({ id, status, message, ...details });

  add("automation", EVENT_TYPES.length > 0 && ORDER_STATES.length > 0 ? "pass" : "fail", "Automation-Modul ist geladen.");

  const automationSafety = evaluateOrderAutomation({
    paymentConfirmed: false,
    productApproved: true,
    supplierVerified: true,
    marginApproved: true
  });
  add("automation-safety", automationSafety.canAutoFulfill ? "fail" : "pass", automationSafety.canAutoFulfill ? "Payment-Gate würde blockieren." : "Automation stoppt korrekt ohne bestätigte Zahlung.");

  const systemIds = new Set(systems.map(s => s.id));
  const requiredSystems = ["github", "vercel", "supabase", "famulor", "easybell", "stripe", "paypal", "shopify", "email", "slack"];
  const missingSystems = requiredSystems.filter(id => !systemIds.has(id));
  add("system-registry", missingSystems.length === 0 ? "pass" : "fail", missingSystems.length === 0 ? "System-Registry vollständig." : "System-Registry unvollständig.", { missing: missingSystems });

  add("persistence", storage === "supabase" ? "pass" : "warning", storage === "supabase" ? "Persistente Datenbank ist konfiguriert." : "Aktuell läuft der Fallback-Speicher; Neustarts können Daten verlieren.", { storage });

  const secretNames = Object.keys(env).filter(k => /(SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)/i.test(k));
  add("secret-exposure", "pass", "Quality-Gate prüft nur Variablennamen; Secret-Werte werden nicht ausgegeben.", { checkedNames: secretNames.length });

  const stripe = systems.find(s => s.id === "stripe");
  add("payments", stripe?.status === "🔴" ? "blocked" : "warning", stripe?.status === "🔴" ? "Zahlungen bleiben bis zur sicheren Integration gesperrt." : "Payment-Gate muss vor Produktivzahlungen erneut geprüft werden.");

  const ok = checks.every(c => c.status === "pass");
  const blocking = checks.filter(c => ["fail", "warning", "blocked"].includes(c.status)).map(c => c.id);
  return { ok, productionReady: ok, checkedAt: new Date().toISOString(), checks, blocking };
}
