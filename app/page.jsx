import { redirect } from "next/navigation";

// 20.09.2026 (Phase 1, Audit-Fund): "/master" ist das vollstaendige,
// API-gestuetzte Dashboard (Betriebe/Aufgaben/Systeme/Finanzen/Automation/
// Audit-Log/Einstellungen, s. docs/STATUS.md). "/zentral" war die aeltere,
// rein statische Vorversion - beide bleiben erreichbar und sind gegenseitig
// verlinkt ("Master Dashboard" / "Alte Zentrale"), aber der Einstiegspunkt
// zeigt jetzt auf die vollstaendige Version statt auf die veraltete.
export default function Home() {
  redirect("/master");
}
