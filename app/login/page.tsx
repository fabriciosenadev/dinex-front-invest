"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticate, persistSession, readStoredSession } from "../../lib/auth";
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
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Use suas credenciais para entrar.");

  useEffect(() => {
    const session = readStoredSession();
    if (session) {
      router.replace("/dashboard");
    }
  }, [router]);

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
            <h1>DinEx Frontend</h1>
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
