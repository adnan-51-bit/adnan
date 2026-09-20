export const metadata = {
  title: "Werknetz24 Master-Zentrale",
  description: "Übersicht und Steuerung für Werknetz24, E-Commerce und weitere Geschäftsbereiche"
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
