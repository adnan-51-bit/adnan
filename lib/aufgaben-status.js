// Aufgaben-Status der Master-Zentrale (27.09.2026) - eine Liste fuer alle Bereiche.
// "Blockiert" war der alte Name fuer "Wartet auf Benutzer" (per Migration umbenannt, wird nur noch gelesen).
export const TASK_STATUS = ["Offen", "In Arbeit", "Wartet auf Benutzer", "Erledigt", "Gestoppt"];
export const TASK_PRIO = ["Hoch", "Mittel", "Niedrig"];
export const istAbgeschlossen = s => s === "Erledigt" || s === "Gestoppt";
export const istOffen = s => !istAbgeschlossen(s);
export const istWartend = s => s === "Wartet auf Benutzer" || s === "Blockiert";
const PRIO_RANG = { Hoch: 0, Mittel: 1, Niedrig: 2 };
// Reihenfolge fuer "wichtigste Aufgabe": Prioritaet, dann Faelligkeit (frueher zuerst), dann Alter.
export function sortiereAufgaben(liste) {
  return [...liste].sort((a, b) => (PRIO_RANG[a.priority] ?? 3) - (PRIO_RANG[b.priority] ?? 3)
    || (a.due_at ? Date.parse(a.due_at) : Infinity) - (b.due_at ? Date.parse(b.due_at) : Infinity)
    || Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0));
}
