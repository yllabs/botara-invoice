import "./globals.css";

export const metadata = {
  title: "Rankora | Invoice Generator",
  description: "Create and email professional Rankora invoices."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
