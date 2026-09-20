export const metadata = {
  title: "Anfragen-Zentrale",
  description: "MVP für Online-Anfragen-Automation"
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
