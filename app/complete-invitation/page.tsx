"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { completeInvitation, readStoredSession, resendActivationCode } from "../../lib/auth";
import { getStoredTheme, THEME_CHANGED_EVENT, ThemeMode } from "../../lib/theme";
import { ThemeToggle } from "../components/ThemeToggle";

type CompleteInvitationForm = {
  email: string;
  activationCode: string;
  password: string;
  confirmPassword: string;
};

const defaultForm: CompleteInvitationForm = {
  email: "",
  activationCode: "",
  password: "",
  confirmPassword: ""
};

export default function CompleteInvitationPage() {
  const router = useRouter();
  const [form, setForm] = useState<CompleteInvitationForm>(defaultForm);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState("Informe e-mail, codigo e nova senha para concluir o primeiro acesso.");

  useEffect(() => {
    const session = readStoredSession();
    if (session) {
      router.replace("/dashboard");
      return;
    }

    const emailFromQuery = new URLSearchParams(window.location.search).get("email");
    if (emailFromQuery) {
      setForm((current) => ({ ...current, email: emailFromQuery }));
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
    setSubmitting(true);
    setStatus("Concluindo primeiro acesso...");

    try {
      await completeInvitation(form.email, form.activationCode, form.password, form.confirmPassword);
      setStatus("Primeiro acesso concluido. Redirecionando para login...");
      window.setTimeout(() => {
        router.replace(`/login?email=${encodeURIComponent(form.email)}`);
      }, 700);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao concluir primeiro acesso.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendCode() {
    if (!form.email.trim()) {
      setStatus("Informe o e-mail para reenviar o codigo de ativacao.");
      return;
    }

    setResending(true);
    setStatus("Reenviando codigo...");
    try {
      await resendActivationCode(form.email.trim());
      setStatus("Codigo reenviado para o e-mail informado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao reenviar codigo.");
    } finally {
      setResending(false);
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
            <p>Concluir convite e definir senha de acesso.</p>
          </div>
          <ThemeToggle compact />
        </div>
      </header>

      <section className="card">
        <h2>Primeiro acesso</h2>
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
              Codigo de ativacao
              <input
                type="text"
                value={form.activationCode}
                onChange={(e) => setForm({ ...form, activationCode: e.target.value })}
                placeholder="Codigo recebido por e-mail"
                required
              />
            </label>

            <label>
              Nova senha
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Nova senha"
                required
              />
            </label>

            <label>
              Confirmar nova senha
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Confirme a senha"
                required
              />
            </label>
          </div>

          <div className="row-actions login-actions">
            <button type="submit" disabled={submitting || resending}>
              {submitting ? "Concluindo..." : "Concluir primeiro acesso"}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={onResendCode}
              disabled={submitting || resending}>
              {resending ? "Reenviando..." : "Reenviar codigo"}
            </button>
          </div>
        </form>

        <p className="status">{status}</p>
        <p className="auth-footer-link">
          Ja concluiu? <Link href="/login">Ir para login</Link>
        </p>
      </section>
    </main>
  );
}
