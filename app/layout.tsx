import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "./components/ThemeToggle";

export const metadata: Metadata = {
  title: "DinEx Frontend",
  description: "Frontend de exemplo consumindo endpoints da DinEx API"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var key='dinex-theme';var value=localStorage.getItem(key);if(value==='dark'||value==='light'){document.documentElement.dataset.theme=value;}}catch(e){}})();"
          }}
        />
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
