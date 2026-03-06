"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AuthenticateUserPayload,
  CurrentUserPayload,
  ErrorResponse,
  PortfolioPosition,
  RegisterMovementPayload,
  StoredSession
} from "../lib/types";

type MovementForm = {
  assetSymbol: string;
  type: "1" | "2";
  quantity: string;
  unitPrice: string;
  currency: string;
};

const defaultForm: MovementForm = {
  assetSymbol: "PETR4",
  type: "1",
  quantity: "10",
  unitPrice: "32.50",
  currency: "BRL"
};

type LoginForm = {
  email: string;
  password: string;
};

const defaultLoginForm: LoginForm = {
  email: "fabricio@email.com",
  password: "Senha@123"
};

const sessionStorageKey = "dinex_session";

export default function HomePage() {
  const [loginForm, setLoginForm] = useState<LoginForm>(defaultLoginForm);
  const [form, setForm] = useState<MovementForm>(defaultForm);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserPayload | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Aguardando autenticacao.");

  function readStoredSession(): StoredSession | null {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = localStorage.getItem(sessionStorageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      localStorage.removeItem(sessionStorageKey);
      return null;
    }
  }

  function persistSession(nextSession: StoredSession) {
    localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  function clearSession() {
    localStorage.removeItem(sessionStorageKey);
    setSession(null);
    setCurrentUser(null);
    setPositions([]);
  }

  async function getErrorMessage(response: Response, fallback: string) {
    try {
      const body = (await response.json()) as ErrorResponse;
      if (Array.isArray(body.errors) && body.errors.length > 0) {
        return body.errors.join(", ");
      }
    } catch {
      // Ignora erro de parse para manter fallback.
    }

    return fallback;
  }

  async function refreshSession(currentSession: StoredSession): Promise<StoredSession | null> {
    const response = await fetch("/api/users/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentSession.refreshToken })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as AuthenticateUserPayload;
    const nextSession: StoredSession = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      accessTokenExpiresAtUtc: payload.expiresAtUtc,
      refreshTokenExpiresAtUtc: payload.refreshTokenExpiresAtUtc
    };

    persistSession(nextSession);
    return nextSession;
  }

  async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    if (!session) {
      throw new Error("Sessao nao encontrada. Faca login.");
    }

    const firstHeaders = new Headers(init.headers);
    firstHeaders.set("Authorization", `Bearer ${session.accessToken}`);

    const firstTry = await fetch(path, {
      ...init,
      headers: firstHeaders
    });

    if (firstTry.status !== 401) {
      return firstTry;
    }

    const refreshed = await refreshSession(session);
    if (!refreshed) {
      clearSession();
      throw new Error("Sessao expirada. Faca login novamente.");
    }

    const retryHeaders = new Headers(init.headers);
    retryHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`);

    return fetch(path, {
      ...init,
      headers: retryHeaders
    });
  }

  async function loadCurrentUser() {
    const response = await authorizedFetch("/api/users/me", { method: "GET" });
    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Falha ao carregar usuario atual."));
    }

    const payload = (await response.json()) as CurrentUserPayload;
    setCurrentUser(payload);
  }

  async function loadPortfolio() {
    const response = await fetch("/api/movements/portfolio", { method: "GET" });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Falha ao carregar carteira."));
    }

    const result = (await response.json()) as PortfolioPosition[];
    setPositions(result ?? []);
  }

  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      setAuthLoading(false);
      setStatus("Faca login para acessar o painel.");
      return;
    }

    setSession(stored);

    loadCurrentUser()
      .then(() => loadPortfolio())
      .then(() => setStatus("Sessao carregada."))
      .catch((error) => setStatus(error instanceof Error ? error.message : "Nao foi possivel validar sessao."))
      .finally(() => setAuthLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setStatus("Autenticando...");

    try {
      const response = await fetch("/api/users/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Falha na autenticacao."));
      }

      const payload = (await response.json()) as AuthenticateUserPayload;
      const nextSession: StoredSession = {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        accessTokenExpiresAtUtc: payload.expiresAtUtc,
        refreshTokenExpiresAtUtc: payload.refreshTokenExpiresAtUtc
      };

      persistSession(nextSession);
      await loadCurrentUser();
      await loadPortfolio();
      setStatus("Autenticado com sucesso.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha na autenticacao.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function onLogout() {
    if (session) {
      try {
        await authorizedFetch("/api/users/logout", { method: "POST" });
      } catch {
        // Mesmo em caso de erro remoto, encerra sessao local.
      }
    }

    clearSession();
    setStatus("Sessao encerrada.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("Enviando movimentacao...");

    const payload: RegisterMovementPayload = {
      assetSymbol: form.assetSymbol,
      type: Number(form.type),
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
      currency: form.currency
    };

    try {
      const response = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Falha ao registrar movimentacao."));
      }

      await loadPortfolio();
      setStatus("Movimentacao registrada com sucesso.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao registrar movimentacao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>DinEx Frontend</h1>
      <p>Painel com sessao autenticada para testar os endpoints da API.</p>

      {!session && (
        <section className="card">
          <h2>Login</h2>
          <form onSubmit={onLogin}>
            <div className="grid">
              <label>
                E-mail
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </label>

              <label>
                Senha
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="row-actions">
              <button type="submit" disabled={authLoading}>
                {authLoading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </form>
          <p className="status">{status}</p>
        </section>
      )}

      {session && (
        <section className="card">
          <div className="toolbar">
            <div>
              <h2>Usuario autenticado</h2>
              <p className="status">
                {currentUser?.fullName} ({currentUser?.email})
              </p>
            </div>
            <button type="button" onClick={onLogout} disabled={authLoading}>
              Sair
            </button>
          </div>
        </section>
      )}

      {session && (
        <>
          <section className="card">
            <h2>Registrar Movimentacao</h2>
            <form onSubmit={onSubmit}>
              <div className="grid">
                <label>
                  Ativo
                  <input
                    value={form.assetSymbol}
                    onChange={(e) => setForm({ ...form, assetSymbol: e.target.value.toUpperCase() })}
                    required
                  />
                </label>

                <label>
                  Tipo
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "1" | "2" })}>
                    <option value="1">Compra (1)</option>
                    <option value="2">Venda (2)</option>
                  </select>
                </label>

                <label>
                  Quantidade
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Preco Unitario
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Moeda
                  <input
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    required
                  />
                </label>
              </div>

              <div className="row-actions">
                <button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Registrar"}
                </button>
                <button
                  type="button"
                  onClick={() => loadPortfolio().catch(() => setStatus("Falha ao atualizar carteira."))}
                  disabled={loading}
                >
                  Atualizar Carteira
                </button>
              </div>
            </form>
            <p className="status">{status}</p>
          </section>

          <section className="card">
            <h2>Carteira</h2>
            <table>
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Quantidade</th>
                  <th>Preco Medio</th>
                  <th>Moeda</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.assetSymbol}>
                    <td>{position.assetSymbol}</td>
                    <td>{position.quantity}</td>
                    <td>{position.averagePrice.toFixed(2)}</td>
                    <td>{position.currency}</td>
                  </tr>
                ))}
                {positions.length === 0 && (
                  <tr>
                    <td colSpan={4}>Sem posicoes ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
