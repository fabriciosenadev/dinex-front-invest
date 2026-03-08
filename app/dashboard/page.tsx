"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authorizedFetch, clearStoredSession, getErrorMessage, persistSession, readStoredSession } from "../../lib/auth";
import {
  CurrentUserPayload,
  PortfolioPosition,
  RegisterMovementPayload,
  StatementEntryPayload,
  StatementEntryType,
  StoredSession
} from "../../lib/types";

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

type StatementForm = {
  type: StatementEntryType;
  description: string;
  assetSymbol: string;
  quantity: string;
  unitPriceAmount: string;
  grossAmount: string;
  netAmount: string;
  currency: string;
  source: string;
};

const defaultStatementForm: StatementForm = {
  type: "Income",
  description: "Dividendo recebido",
  assetSymbol: "PETR4",
  quantity: "",
  unitPriceAmount: "",
  grossAmount: "25.00",
  netAmount: "25.00",
  currency: "BRL",
  source: "manual"
};

const entryTypeOptions: Array<{ value: StatementEntryType; label: string }> = [
  { value: "Buy", label: "Compra" },
  { value: "Sell", label: "Venda" },
  { value: "Income", label: "Provento" },
  { value: "Fee", label: "Taxa" },
  { value: "Tax", label: "Imposto" },
  { value: "Adjustment", label: "Ajuste" },
  { value: "CorporateAction", label: "Evento do ativo" }
];

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserPayload | null>(null);
  const [form, setForm] = useState<MovementForm>(defaultForm);
  const [statementForm, setStatementForm] = useState<StatementForm>(defaultStatementForm);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [statementEntries, setStatementEntries] = useState<StatementEntryPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [status, setStatus] = useState("Carregando sessao...");

  function applyRefreshedSession(nextSession: StoredSession | null) {
    if (nextSession) {
      persistSession(nextSession);
      setSession(nextSession);
    }
  }

  function clearSessionAndGoLogin(message: string) {
    clearStoredSession();
    setSession(null);
    setCurrentUser(null);
    setPositions([]);
    setStatementEntries([]);
    setStatus(message);
    router.replace("/login");
  }

  async function loadCurrentUser(activeSession: StoredSession) {
    const { response, nextSession } = await authorizedFetch(activeSession, "/api/users/me", { method: "GET" });
    applyRefreshedSession(nextSession);

    if (response.status === 401) {
      clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
      return;
    }

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

  async function loadStatement(activeSession: StoredSession) {
    const { response, nextSession } = await authorizedFetch(activeSession, "/api/statement", { method: "GET" });
    applyRefreshedSession(nextSession);

    if (response.status === 401) {
      clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
      return;
    }

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Falha ao carregar extrato."));
    }

    const payload = (await response.json()) as StatementEntryPayload[];
    setStatementEntries(payload ?? []);
  }

  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      router.replace("/login");
      return;
    }

    setSession(stored);
    loadCurrentUser(stored)
      .then(() => loadPortfolio())
      .then(() => loadStatement(stored))
      .then(() => setStatus("Pronto."))
      .catch((error) => setStatus(error instanceof Error ? error.message : "Erro ao carregar painel."));
  }, [router]);

  async function onLogout() {
    if (session) {
      try {
        await authorizedFetch(session, "/api/users/logout", { method: "POST" });
      } catch {
        // Ignora erro remoto no logout.
      }
    }

    clearSessionAndGoLogin("Sessao encerrada.");
  }

  async function onSubmitStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setStatus("Sessao nao encontrada. Faca login.");
      return;
    }

    setStatementLoading(true);
    setStatus("Registrando no extrato...");

    try {
      const payload = {
        type: statementForm.type,
        description: statementForm.description,
        grossAmount: Number(statementForm.grossAmount),
        netAmount: Number(statementForm.netAmount),
        currency: statementForm.currency,
        occurredAtUtc: new Date().toISOString(),
        source: statementForm.source,
        assetSymbol: statementForm.assetSymbol || null,
        quantity: statementForm.quantity ? Number(statementForm.quantity) : null,
        unitPriceAmount: statementForm.unitPriceAmount ? Number(statementForm.unitPriceAmount) : null,
        referenceId: null,
        metadata: null
      };

      const { response, nextSession } = await authorizedFetch(session, "/api/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      applyRefreshedSession(nextSession);

      if (response.status === 401) {
        clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Falha ao registrar item no extrato."));
      }

      await loadStatement(nextSession ?? session);
      setStatus("Extrato atualizado com sucesso.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao registrar item no extrato.");
    } finally {
      setStatementLoading(false);
    }
  }

  function getEntryTypeLabel(type: StatementEntryType) {
    const option = entryTypeOptions.find((x) => x.value === type);
    return option?.label ?? type;
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
      <p>Painel autenticado.</p>

      <section className="card">
        <div className="toolbar">
          <div>
            <h2>Usuario autenticado</h2>
            <p className="status">
              {currentUser?.fullName} ({currentUser?.email})
            </p>
          </div>
          <button type="button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </section>

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

      <section className="card">
        <h2>Extrato de Investimentos</h2>
        <form onSubmit={onSubmitStatement}>
          <div className="grid">
            <label>
              Tipo de lancamento
              <select
                value={statementForm.type}
                onChange={(e) => setStatementForm({ ...statementForm, type: e.target.value as StatementEntryType })}
              >
                {entryTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Descricao
              <input
                value={statementForm.description}
                onChange={(e) => setStatementForm({ ...statementForm, description: e.target.value })}
                required
              />
            </label>

            <label>
              Ativo (opcional)
              <input
                value={statementForm.assetSymbol}
                onChange={(e) => setStatementForm({ ...statementForm, assetSymbol: e.target.value.toUpperCase() })}
              />
            </label>

            <label>
              Quantidade (opcional)
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={statementForm.quantity}
                onChange={(e) => setStatementForm({ ...statementForm, quantity: e.target.value })}
              />
            </label>

            <label>
              Preco unitario (opcional)
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={statementForm.unitPriceAmount}
                onChange={(e) => setStatementForm({ ...statementForm, unitPriceAmount: e.target.value })}
              />
            </label>

            <label>
              Valor bruto
              <input
                type="number"
                min="0"
                step="0.0001"
                value={statementForm.grossAmount}
                onChange={(e) => setStatementForm({ ...statementForm, grossAmount: e.target.value })}
                required
              />
            </label>

            <label>
              Valor liquido
              <input
                type="number"
                min="0"
                step="0.0001"
                value={statementForm.netAmount}
                onChange={(e) => setStatementForm({ ...statementForm, netAmount: e.target.value })}
                required
              />
            </label>

            <label>
              Moeda
              <input
                maxLength={3}
                value={statementForm.currency}
                onChange={(e) => setStatementForm({ ...statementForm, currency: e.target.value.toUpperCase() })}
                required
              />
            </label>
          </div>

          <div className="row-actions">
            <button type="submit" disabled={statementLoading}>
              {statementLoading ? "Salvando..." : "Adicionar no Extrato"}
            </button>
            <button
              type="button"
              onClick={() => session && loadStatement(session).catch(() => setStatus("Falha ao atualizar extrato."))}
              disabled={statementLoading}
            >
              Atualizar Extrato
            </button>
          </div>
        </form>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descricao</th>
              <th>Ativo</th>
              <th>Bruto</th>
              <th>Liquido</th>
              <th>Moeda</th>
            </tr>
          </thead>
          <tbody>
            {statementEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.occurredAtUtc).toLocaleDateString("pt-BR")}</td>
                <td>{getEntryTypeLabel(entry.type)}</td>
                <td>{entry.description}</td>
                <td>{entry.assetSymbol ?? "-"}</td>
                <td>{entry.grossAmount.toFixed(2)}</td>
                <td>{entry.netAmount.toFixed(2)}</td>
                <td>{entry.currency}</td>
              </tr>
            ))}
            {statementEntries.length === 0 && (
              <tr>
                <td colSpan={7}>Sem lancamentos no extrato ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
