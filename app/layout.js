import "./globals.css";

export const metadata = {
  title: "DropFits | GTA V Marketplace",
  description:
    "Premium GTA V PS5 car drops, modded accounts, and digital products."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
