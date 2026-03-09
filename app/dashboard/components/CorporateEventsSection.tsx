"use client";

import { FormEvent } from "react";
import { CorporateEventPayload, CorporateEventType } from "../../../lib/types";

type CorporateEventForm = {
  type: CorporateEventType;
  sourceAssetSymbol: string;
  targetAssetSymbol: string;
  factor: string;
  effectiveDate: string;
  notes: string;
};

type CorporateEventsSectionProps = {
  form: CorporateEventForm;
  events: CorporateEventPayload[];
  loading: boolean;
  onChange: (next: CorporateEventForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRefresh: () => Promise<void>;
};

const eventTypeOptions: Array<{ value: CorporateEventType; label: string }> = [
  { value: "TickerChange", label: "Troca de ticker" },
  { value: "Split", label: "Desdobramento" },
  { value: "ReverseSplit", label: "Grupamento" }
];

export function CorporateEventsSection({ form, events, loading, onChange, onSubmit, onRefresh }: CorporateEventsSectionProps) {
  const requiresTarget = form.type === "TickerChange";

  return (
    <section className="card">
      <h2>Eventos Corporativos Manuais</h2>
      <form onSubmit={onSubmit}>
        <div className="grid">
          <label>
            Tipo
            <select value={form.type} onChange={(e) => onChange({ ...form, type: e.target.value as CorporateEventType })}>
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ativo origem
            <input value={form.sourceAssetSymbol} onChange={(e) => onChange({ ...form, sourceAssetSymbol: e.target.value.toUpperCase() })} required />
          </label>

          <label>
            Ativo destino
            <input
              value={form.targetAssetSymbol}
              onChange={(e) => onChange({ ...form, targetAssetSymbol: e.target.value.toUpperCase() })}
              required={requiresTarget}
              placeholder={requiresTarget ? "Obrigatorio para troca de ticker" : "Opcional"}
            />
          </label>

          <label>
            Fator
            <input type="number" min="0.000001" step="0.000001" value={form.factor} onChange={(e) => onChange({ ...form, factor: e.target.value })} required />
          </label>

          <label>
            Data efetiva
            <input type="date" value={form.effectiveDate} onChange={(e) => onChange({ ...form, effectiveDate: e.target.value })} required />
          </label>

          <label>
            Observacoes
            <input value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} />
          </label>
        </div>

        <div className="row-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Aplicando..." : "Cadastrar e Aplicar Evento"}
          </button>
          <button type="button" onClick={onRefresh} disabled={loading}>
            Atualizar Eventos
          </button>
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Origem</th>
            <th>Destino</th>
            <th>Fator</th>
            <th>Obs</th>
          </tr>
        </thead>
        <tbody>
          {events.map((entry) => (
            <tr key={entry.id}>
              <td>{new Date(entry.effectiveAtUtc).toLocaleDateString("pt-BR")}</td>
              <td>{eventTypeOptions.find((x) => x.value === entry.type)?.label ?? entry.type}</td>
              <td>{entry.sourceAssetSymbol}</td>
              <td>{entry.targetAssetSymbol ?? "-"}</td>
              <td>{entry.factor}</td>
              <td>{entry.notes ?? "-"}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={6}>Sem eventos cadastrados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
