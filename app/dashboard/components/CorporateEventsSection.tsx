"use client";

import { FormEvent, useMemo } from "react";
import { CorporateEventPayload, CorporateEventType } from "../../../lib/types";
import { PaginationControls } from "./PaginationControls";

type CorporateEventForm = {
  type: CorporateEventType;
  sourceAssetSymbol: string;
  targetAssetSymbol: string;
  ratioFrom: string;
  ratioTo: string;
  manualFactor: string;
  cashPerSourceUnit: string;
  effectiveDate: string;
  notes: string;
};

type CorporateEventsSectionProps = {
  form: CorporateEventForm;
  events: CorporateEventPayload[];
  loading: boolean;
  editingEventId: string | null;
  onChange: (next: CorporateEventForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRefresh: () => Promise<void>;
  onEdit: (event: CorporateEventPayload) => void;
  onDelete: (id: string) => Promise<void>;
  onCancelEdit: () => void;
  pagination: {
    page: number;
    pageSize: number;
    onPageChange: (nextPage: number) => void;
    onPageSizeChange: (nextPageSize: number) => void;
  };
};

const eventTypeOptions: Array<{ value: CorporateEventType; label: string }> = [
  { value: "TickerChange", label: "Troca de ticker" },
  { value: "Split", label: "Desdobramento" },
  { value: "ReverseSplit", label: "Grupamento" },
  { value: "IncorporationWithCash", label: "Incorporacao com caixa" }
];

export function CorporateEventsSection({
  form,
  events,
  loading,
  editingEventId,
  onChange,
  onSubmit,
  onRefresh,
  onEdit,
  onDelete,
  onCancelEdit,
  pagination
}: CorporateEventsSectionProps) {
  const requiresTarget = form.type === "TickerChange" || form.type === "IncorporationWithCash";
  const usesRatio = form.type === "Split" || form.type === "ReverseSplit" || form.type === "IncorporationWithCash";
  const showsCash = form.type === "IncorporationWithCash";
  const ratioFromNumber = Number(form.ratioFrom);
  const ratioToNumber = Number(form.ratioTo);
  const calculatedFactor = usesRatio && ratioFromNumber > 0 && ratioToNumber > 0 ? ratioToNumber / ratioFromNumber : null;

  const preview = useMemo(() => {
    if (!usesRatio || !calculatedFactor || calculatedFactor <= 0) {
      return null;
    }

    const sampleQuantity = 100;
    const sampleUnitPrice = 10;
    return {
      quantityAfter: sampleQuantity * calculatedFactor,
      unitPriceAfter: sampleUnitPrice / calculatedFactor
    };
  }, [usesRatio, calculatedFactor]);

  return (
    <section className="card">
      <h2>Eventos Corporativos Manuais</h2>
      <form onSubmit={onSubmit}>
        <div className="grid form-grid-three">
          <label>
            Tipo
            <select
              value={form.type}
              onChange={(e) => {
                const nextType = e.target.value as CorporateEventType;
                onChange({
                  ...form,
                  type: nextType,
                  ratioFrom: nextType === "Split" || nextType === "ReverseSplit" || nextType === "IncorporationWithCash" ? "1" : form.ratioFrom,
                  ratioTo:
                    nextType === "Split"
                      ? "2"
                      : nextType === "ReverseSplit"
                        ? "1"
                        : nextType === "IncorporationWithCash"
                          ? "1"
                          : form.ratioTo,
                  manualFactor: nextType === "TickerChange" ? form.manualFactor : "1",
                  cashPerSourceUnit: nextType === "IncorporationWithCash" ? form.cashPerSourceUnit : ""
                });
              }}
            >
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
              placeholder={requiresTarget ? "Obrigatorio para este evento" : "Opcional"}
            />
          </label>

          {usesRatio ? (
            <>
              <label>
                Proporcao de
                <input type="number" min="0.000001" step="0.000001" value={form.ratioFrom} onChange={(e) => onChange({ ...form, ratioFrom: e.target.value })} required />
              </label>

              <label>
                Proporcao para
                <input type="number" min="0.000001" step="0.000001" value={form.ratioTo} onChange={(e) => onChange({ ...form, ratioTo: e.target.value })} required />
              </label>

              <label>
                Fator aplicado
                <input value={calculatedFactor ? calculatedFactor.toFixed(6).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1") : "-"} readOnly />
              </label>
            </>
          ) : (
            <label>
              Fator
              <input
                type="number"
                min="0.000001"
                step="0.000001"
                value={form.manualFactor}
                onChange={(e) => onChange({ ...form, manualFactor: e.target.value })}
                required
              />
            </label>
          )}

          {showsCash && (
            <label>
              Caixa por ativo origem
              <input
                type="number"
                min="0"
                step="0.000001"
                value={form.cashPerSourceUnit}
                onChange={(e) => onChange({ ...form, cashPerSourceUnit: e.target.value })}
                placeholder="Opcional"
              />
            </label>
          )}

          <label>
            Data efetiva
            <input type="date" value={form.effectiveDate} onChange={(e) => onChange({ ...form, effectiveDate: e.target.value })} required />
          </label>

          <label>
            Observacoes
            <input value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} />
          </label>
        </div>

        {usesRatio && (
          <>
            <p className="status">
              {form.type === "Split"
                ? "Desdobramento: use no formato 1 para N (ex.: 1 para 8)."
                : form.type === "ReverseSplit"
                  ? "Grupamento: use no formato N para 1 (ex.: 8 para 1)."
                  : "Incorporacao: use a proporcao de conversao (ex.: 1 para 0,98)."}
            </p>
            {preview && (
              <p className="status">
                Prévia (exemplo): Quantidade 100 -&gt; {preview.quantityAfter.toFixed(2)} | Preço médio R$ 10,00 -&gt; R$ {preview.unitPriceAfter.toFixed(2)}
              </p>
            )}
            {showsCash && (
              <p className="status">Se houver parcela em dinheiro, informe "Caixa por ativo origem". Esse valor fica registrado no evento para conferência.</p>
            )}
          </>
        )}

        <div className="row-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Aplicando..." : editingEventId ? "Salvar Alteracao" : "Cadastrar e Aplicar Evento"}
          </button>
          {editingEventId && (
            <button type="button" className="button-secondary" onClick={onCancelEdit} disabled={loading}>
              Cancelar Edicao
            </button>
          )}
          <button type="button" className="button-secondary" onClick={onRefresh} disabled={loading}>
            Atualizar Eventos
          </button>
        </div>
      </form>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Fator</th>
              <th>Caixa/ativo</th>
              <th>Obs</th>
              <th>Acoes</th>
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
                <td>{entry.cashPerSourceUnit ?? "-"}</td>
                <td>{entry.notes ?? "-"}</td>
                <td>
                  <div className="inline-actions">
                    <button type="button" className="button-small" onClick={() => onEdit(entry)} disabled={loading}>
                      Editar
                    </button>
                    <button type="button" className="button-small button-danger" onClick={() => onDelete(entry.id)} disabled={loading}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={8}>Sem eventos cadastrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={pagination.page}
        pageSize={pagination.pageSize}
        itemCount={events.length}
        loading={loading}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
      />
    </section>
  );
}
