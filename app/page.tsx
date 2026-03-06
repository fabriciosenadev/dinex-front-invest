"use client";

import { FormEvent, useEffect, useState } from "react";
import { OperationResult, PortfolioPosition, RegisterMovementPayload } from "../lib/types";

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

export default function HomePage() {
  const [form, setForm] = useState<MovementForm>(defaultForm);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Pronto.");

  async function loadPortfolio() {
    const response = await fetch("/api/movements/portfolio", { method: "GET" });

    if (!response.ok) {
      throw new Error("Falha ao carregar carteira.");
    }

    const result = (await response.json()) as OperationResult<PortfolioPosition[]>;
    if (!result.succeeded) {
      throw new Error(result.errors?.join(", ") || "Falha ao carregar carteira.");
    }

    setPositions(result.data ?? []);
  }

  useEffect(() => {
    loadPortfolio().catch(() => {
      setStatus("Nao foi possivel buscar carteira. Verifique se a API .NET esta rodando.");
    });
  }, []);

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

      const result = (await response.json()) as OperationResult<string>;

      if (!response.ok || !result.succeeded) {
        throw new Error("Falha ao registrar movimentacao.");
      }

      await loadPortfolio();
      setStatus("Movimentacao registrada com sucesso.");
    } catch {
      setStatus("Erro ao registrar movimentacao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>DinEx Frontend</h1>
      <p>Exemplo de chamadas para os endpoints da API que criamos.</p>

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
    </main>
  );
}
