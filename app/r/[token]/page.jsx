// Oeffentliche Antwortseite zum Brief (27.09.2026): /r/<Link-Code>. Nicht in Suchmaschinen.
import Antwort from "./antwort.jsx";

export const metadata = { title: "Ihr kostenloser Profil-Check", robots: { index: false, follow: false } };

export default async function Seite({ params }) {
  const { token } = await params;
  return <Antwort token={token} />;
}
