import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DinEx Frontend",
  description: "Frontend de exemplo consumindo endpoints da DinEx API"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
