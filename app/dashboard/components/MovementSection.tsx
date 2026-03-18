"use client";

import { FormEvent } from "react";

type MovementForm = {
  assetSymbol: string;
  type: "1" | "2";
  quantity: string;
  unitPrice: string;
  currency: string;
  occurredAt: string;
};

type MovementSectionProps = {
  form: MovementForm;
  loading: boolean;
  status: string;
  onChange: (next: MovementForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRefresh: () => Promise<void>;
};

export function MovementSection({ form, loading, status, onChange, onSubmit, onRefresh }: MovementSectionProps) {
  return (
    <section className="card">
      <h2>Registrar Movimentacao</h2>
      <form onSubmit={onSubmit}>
        <div className="grid">
          <label>
            Ativo
            <input
              value={form.assetSymbol}
              onChange={(e) => onChange({ ...form, assetSymbol: e.target.value.toUpperCase() })}
              placeholder="Ex.: PETR4"
              required
            />
          </label>

          <label>
            Tipo
            <select value={form.type} onChange={(e) => onChange({ ...form, type: e.target.value as "1" | "2" })}>
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
              onChange={(e) => onChange({ ...form, quantity: e.target.value })}
              placeholder="Ex.: 100"
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
              onChange={(e) => onChange({ ...form, unitPrice: e.target.value })}
              placeholder="Ex.: 32.50"
              required
            />
          </label>

          <label>
            Moeda
            <input
              maxLength={3}
              value={form.currency}
              onChange={(e) => onChange({ ...form, currency: e.target.value.toUpperCase() })}
              placeholder="Ex.: BRL"
              required
            />
          </label>

          <label>
            Data da movimentacao
            <input type="date" value={form.occurredAt} onChange={(e) => onChange({ ...form, occurredAt: e.target.value })} required />
          </label>
        </div>

        <div className="row-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Registrar"}
          </button>
          <button type="button" className="button-secondary" onClick={onRefresh} disabled={loading}>
            Atualizar Carteira
          </button>
        </div>
      </form>
      <p className="status">{status}</p>
    </section>
  );
}
