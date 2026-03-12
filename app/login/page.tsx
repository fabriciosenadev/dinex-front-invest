"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { authenticate, persistSession, readStoredSession } from "../../lib/auth";
import { getStoredTheme, THEME_CHANGED_EVENT, ThemeMode } from "../../lib/theme";
import { ThemeToggle } from "../components/ThemeToggle";

type LoginForm = {
  email: string;
  password: string;
};

const defaultLoginForm: LoginForm = {
  email: "",
  password: ""
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>(defaultLoginForm);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Use suas credenciais para entrar.");

  useEffect(() => {
    const session = readStoredSession();
    if (session) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    const initialTheme = getStoredTheme();
    if (initialTheme) {
      setTheme(initialTheme);
    } else {
      const currentTheme = document.documentElement.dataset.theme;
      if (currentTheme === "light" || currentTheme === "dark") {
        setTheme(currentTheme);
      }
    }

    function handleThemeChange(event: Event) {
      const customEvent = event as CustomEvent<ThemeMode>;
      if (customEvent.detail === "light" || customEvent.detail === "dark") {
        setTheme(customEvent.detail);
      }
    }

    window.addEventListener(THEME_CHANGED_EVENT, handleThemeChange as EventListener);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, handleThemeChange as EventListener);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("Autenticando...");

    try {
      const session = await authenticate(form.email, form.password);
      persistSession(session);
      setStatus("Autenticado com sucesso.");
      router.replace("/dashboard");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha na autenticacao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <header className="page-header">
        <div className="auth-header-row">
          <div>
            <Image
              src={theme === "dark" ? "/branding/logo-dinheiro-exato-dark.svg" : "/branding/logo-dinheiro-exato-light.svg"}
              alt="Dinheiro Exato"
              width={320}
              height={90}
              priority
              className="auth-brand-logo"
            />
            <p>Acesso ao painel autenticado.</p>
          </div>
          <ThemeToggle compact />
        </div>
      </header>

      <section className="card">
        <h2>Login</h2>
        <form onSubmit={onSubmit}>
          <div className="grid login-grid">
            <label>
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="exemplo@email.com"
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Sua senha"
                required
              />
            </label>
          </div>

          <div className="row-actions login-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
        <p className="status">{status}</p>
      </section>
    </main>
  );
}
