import { storeStats, saveEvent, saveOrder, getOrder } from "./store.js";

export function persistenceMode() {
  return process.env.DATABASE_URL ? "postgres-configured" : "memory";
}

export const persistence = {
  mode: persistenceMode,
  saveEvent,
  saveOrder,
  getOrder,
  stats: storeStats
};
