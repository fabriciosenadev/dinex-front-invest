"use client";

import { FormEvent } from "react";
import { StatementEntryPayload, StatementEntryType } from "../../../lib/types";

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

type ImportFormState = {
  importLoading: boolean;
  statementLoading: boolean;
  onImport: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onStatementSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRefresh: () => Promise<void>;
  onImportFileChange: (file: File | null) => void;
};

type StatementSectionProps = {
  form: StatementForm;
  entries: StatementEntryPayload[];
  entryTypeOptions: Array<{ value: StatementEntryType; label: string }>;
  onChange: (next: StatementForm) => void;
  importState: ImportFormState;
};

export function StatementSection({ form, entries, entryTypeOptions, onChange, importState }: StatementSectionProps) {
  function getEntryTypeLabel(type: StatementEntryType) {
    const option = entryTypeOptions.find((x) => x.value === type);
    return option?.label ?? type;
  }

  return (
    <section className="card">
      <h2>Extrato de Investimentos</h2>
      <form onSubmit={importState.onImport}>
        <div className="grid">
          <label>
            Importar planilhas B3 (.xlsx)
            <input type="file" accept=".xlsx" onChange={(event) => importState.onImportFileChange(event.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div className="row-actions">
          <button type="submit" disabled={importState.importLoading}>
            {importState.importLoading ? "Importando..." : "Importar Arquivos"}
          </button>
        </div>
      </form>

      <form onSubmit={importState.onStatementSubmit}>
        <div className="grid">
          <label>
            Tipo de lancamento
            <select value={form.type} onChange={(e) => onChange({ ...form, type: e.target.value as StatementEntryType })}>
              {entryTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Descricao
            <input value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} placeholder="Opcional" />
          </label>

          <label>
            Ativo (opcional)
            <input value={form.assetSymbol} onChange={(e) => onChange({ ...form, assetSymbol: e.target.value.toUpperCase() })} />
          </label>

          <label>
            Quantidade (opcional)
            <input type="number" min="0.0001" step="0.0001" value={form.quantity} onChange={(e) => onChange({ ...form, quantity: e.target.value })} />
          </label>

          <label>
            Preco unitario (opcional)
            <input type="number" min="0.0001" step="0.0001" value={form.unitPriceAmount} onChange={(e) => onChange({ ...form, unitPriceAmount: e.target.value })} />
          </label>

          <label>
            Valor bruto
            <input type="number" min="0" step="0.0001" value={form.grossAmount} onChange={(e) => onChange({ ...form, grossAmount: e.target.value })} required />
          </label>

          <label>
            Valor liquido
            <input type="number" min="0" step="0.0001" value={form.netAmount} onChange={(e) => onChange({ ...form, netAmount: e.target.value })} required />
          </label>

          <label>
            Moeda
            <input maxLength={3} value={form.currency} onChange={(e) => onChange({ ...form, currency: e.target.value.toUpperCase() })} required />
          </label>
        </div>

        <div className="row-actions">
          <button type="submit" disabled={importState.statementLoading}>
            {importState.statementLoading ? "Salvando..." : "Adicionar no Extrato"}
          </button>
          <button type="button" onClick={importState.onRefresh} disabled={importState.statementLoading}>
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
          {entries.map((entry) => (
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
          {entries.length === 0 && (
            <tr>
              <td colSpan={7}>Sem lancamentos no extrato ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
