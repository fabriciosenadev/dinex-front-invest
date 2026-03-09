"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authorizedFetch, clearStoredSession, getErrorMessage, persistSession, readStoredSession } from "../../lib/auth";
import {
  CorporateEventPayload,
  CorporateEventType,
  CurrentUserPayload,
  ImportInvestmentsSpreadsheetPayload,
  PortfolioPosition,
  ReconcilePortfolioPayload,
  RegisterCorporateEventPayload,
  RegisterCorporateEventResult,
  RegisterMovementPayload,
  StatementEntryPayload,
  StatementEntryType,
  StoredSession
} from "../../lib/types";
import { UserSessionCard } from "./components/UserSessionCard";
import { TabNavigation, DashboardTab } from "./components/TabNavigation";
import { MovementSection } from "./components/MovementSection";
import { StatementSection } from "./components/StatementSection";
import { CorporateEventsSection } from "./components/CorporateEventsSection";
import { PortfolioSection } from "./components/PortfolioSection";

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
  description: "",
  assetSymbol: "PETR4",
  quantity: "",
  unitPriceAmount: "",
  grossAmount: "25.00",
  netAmount: "25.00",
  currency: "BRL",
  source: "manual"
};

type CorporateEventForm = {
  type: CorporateEventType;
  sourceAssetSymbol: string;
  targetAssetSymbol: string;
  factor: string;
  effectiveDate: string;
  notes: string;
};

const defaultCorporateEventForm: CorporateEventForm = {
  type: "TickerChange",
  sourceAssetSymbol: "PETR4",
  targetAssetSymbol: "",
  factor: "1",
  effectiveDate: new Date().toISOString().slice(0, 10),
  notes: ""
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
  const [activeTab, setActiveTab] = useState<DashboardTab>("movements");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserPayload | null>(null);
  const [form, setForm] = useState<MovementForm>(defaultForm);
  const [statementForm, setStatementForm] = useState<StatementForm>(defaultStatementForm);
  const [corporateEventForm, setCorporateEventForm] = useState<CorporateEventForm>(defaultCorporateEventForm);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [reconcileResult, setReconcileResult] = useState<ReconcilePortfolioPayload | null>(null);
  const [reconcileFile, setReconcileFile] = useState<File | null>(null);
  const [statementEntries, setStatementEntries] = useState<StatementEntryPayload[]>([]);
  const [corporateEvents, setCorporateEvents] = useState<CorporateEventPayload[]>([]);
  const [editingCorporateEventId, setEditingCorporateEventId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [corporateEventLoading, setCorporateEventLoading] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);
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
    setReconcileResult(null);
    setStatementEntries([]);
    setCorporateEvents([]);
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

  async function loadPortfolio(activeSession: StoredSession) {
    const { response, nextSession } = await authorizedFetch(activeSession, "/api/movements/portfolio", { method: "GET" });
    applyRefreshedSession(nextSession);

    if (response.status === 401) {
      clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
      return;
    }

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

  async function loadCorporateEvents(activeSession: StoredSession) {
    const { response, nextSession } = await authorizedFetch(activeSession, "/api/corporate-events", { method: "GET" });
    applyRefreshedSession(nextSession);

    if (response.status === 401) {
      clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
      return;
    }

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Falha ao carregar eventos corporativos."));
    }

    const payload = (await response.json()) as CorporateEventPayload[];
    setCorporateEvents(payload ?? []);
  }

  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      router.replace("/login");
      return;
    }

    setSession(stored);
    loadCurrentUser(stored)
      .then(() => loadPortfolio(stored))
      .then(() => loadStatement(stored))
      .then(() => loadCorporateEvents(stored))
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

  async function onImportSpreadsheets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setStatus("Sessao nao encontrada. Faca login.");
      return;
    }

    if (!importFile) {
      setStatus("Selecione um arquivo .xlsx para importar.");
      return;
    }

    setImportLoading(true);
    setStatus("Importando planilhas...");

    try {
      const formData = new FormData();
      formData.append("files", importFile, importFile.name);

      const { response, nextSession } = await authorizedFetch(session, "/api/statement/import", {
        method: "POST",
        body: formData
      });
      applyRefreshedSession(nextSession);

      if (response.status === 401) {
        clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Falha ao importar planilhas."));
      }

      const payload = (await response.json()) as ImportInvestmentsSpreadsheetPayload;
      await loadPortfolio(nextSession ?? session);
      await loadStatement(nextSession ?? session);
      setImportFile(null);
      setStatus(
        `Importacao concluida. Arquivo: ${payload.processedFiles}, linhas: ${payload.totalRowsRead}, ` +
          `movimentos: ${payload.importedMovements}, extrato: ${payload.importedStatementEntries}, ignoradas: ${payload.skippedRows}.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao importar planilhas.");
    } finally {
      setImportLoading(false);
    }
  }

  async function onSubmitCorporateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setStatus("Sessao nao encontrada. Faca login.");
      return;
    }

    setCorporateEventLoading(true);
    setStatus(editingCorporateEventId ? "Atualizando evento corporativo..." : "Aplicando evento corporativo...");

    const payload: RegisterCorporateEventPayload = {
      type: corporateEventForm.type,
      sourceAssetSymbol: corporateEventForm.sourceAssetSymbol,
      targetAssetSymbol: corporateEventForm.targetAssetSymbol || null,
      factor: Number(corporateEventForm.factor),
      effectiveAtUtc: new Date(`${corporateEventForm.effectiveDate}T00:00:00Z`).toISOString(),
      notes: corporateEventForm.notes || null
    };

    try {
      const target = editingCorporateEventId ? `/api/corporate-events/${editingCorporateEventId}` : "/api/corporate-events";
      const { response, nextSession } = await authorizedFetch(session, target, {
        method: editingCorporateEventId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      applyRefreshedSession(nextSession);

      if (response.status === 401) {
        clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Falha ao cadastrar evento corporativo."));
      }

      const result = (await response.json()) as RegisterCorporateEventResult;
      await loadCorporateEvents(nextSession ?? session);
      await loadPortfolio(nextSession ?? session);
      setEditingCorporateEventId(null);
      setCorporateEventForm(defaultCorporateEventForm);
      setStatus(
        `${editingCorporateEventId ? "Evento atualizado" : "Evento aplicado"} com sucesso. Operacoes ajustadas: ${result.affectedOperations}.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao cadastrar evento corporativo.");
    } finally {
      setCorporateEventLoading(false);
    }
  }

  function onEditCorporateEvent(corporateEvent: CorporateEventPayload) {
    setEditingCorporateEventId(corporateEvent.id);
    setCorporateEventForm({
      type: corporateEvent.type,
      sourceAssetSymbol: corporateEvent.sourceAssetSymbol,
      targetAssetSymbol: corporateEvent.targetAssetSymbol ?? "",
      factor: String(corporateEvent.factor),
      effectiveDate: corporateEvent.effectiveAtUtc.slice(0, 10),
      notes: corporateEvent.notes ?? ""
    });
  }

  function onCancelCorporateEventEdit() {
    setEditingCorporateEventId(null);
    setCorporateEventForm(defaultCorporateEventForm);
  }

  async function onDeleteCorporateEvent(eventId: string) {
    if (!session) {
      setStatus("Sessao nao encontrada. Faca login.");
      return;
    }

    const confirmed = window.confirm("Deseja excluir esse evento corporativo?");
    if (!confirmed) {
      return;
    }

    setCorporateEventLoading(true);
    setStatus("Excluindo evento corporativo...");

    try {
      const { response, nextSession } = await authorizedFetch(session, `/api/corporate-events/${eventId}`, {
        method: "DELETE"
      });
      applyRefreshedSession(nextSession);

      if (response.status === 401) {
        clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Falha ao excluir evento corporativo."));
      }

      await loadCorporateEvents(nextSession ?? session);
      await loadPortfolio(nextSession ?? session);
      if (editingCorporateEventId === eventId) {
        onCancelCorporateEventEdit();
      }

      setStatus("Evento corporativo excluido com sucesso.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao excluir evento corporativo.");
    } finally {
      setCorporateEventLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setStatus("Sessao nao encontrada. Faca login.");
      return;
    }

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
      const { response, nextSession } = await authorizedFetch(session, "/api/movements", {
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
        throw new Error(await getErrorMessage(response, "Falha ao registrar movimentacao."));
      }

      await loadPortfolio(nextSession ?? session);
      await loadStatement(nextSession ?? session);
      setStatus("Movimentacao registrada com sucesso.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao registrar movimentacao.");
    } finally {
      setLoading(false);
    }
  }

  async function onReconcilePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setStatus("Sessao nao encontrada. Faca login.");
      return;
    }

    if (!reconcileFile) {
      setStatus("Selecione um arquivo .xlsx de posição para reconciliar.");
      return;
    }

    setReconcileLoading(true);
    setStatus("Reconciliando carteira...");

    try {
      const formData = new FormData();
      formData.append("file", reconcileFile, reconcileFile.name);

      const { response, nextSession } = await authorizedFetch(session, "/api/movements/portfolio/reconcile", {
        method: "POST",
        body: formData
      });
      applyRefreshedSession(nextSession);

      if (response.status === 401) {
        clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Falha ao reconciliar carteira."));
      }

      const payload = (await response.json()) as ReconcilePortfolioPayload;
      setReconcileResult(payload);
      setStatus(`Reconciliação concluida. OK: ${payload.matchedAssets}, divergentes: ${payload.divergentAssets}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao reconciliar carteira.");
    } finally {
      setReconcileLoading(false);
    }
  }

  async function onClearInvestmentData() {
    if (!session) {
      setStatus("Sessao nao encontrada. Faca login.");
      return;
    }

    const confirmed = window.confirm("Tem certeza que deseja apagar carteira e extrato?");
    if (!confirmed) {
      return;
    }

    setStatus("Limpando carteira e extrato...");

    try {
      const { response, nextSession } = await authorizedFetch(session, "/api/statement", {
        method: "DELETE"
      });
      applyRefreshedSession(nextSession);

      if (response.status === 401) {
        clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Falha ao apagar carteira e extrato."));
      }

      await loadPortfolio(nextSession ?? session);
      await loadStatement(nextSession ?? session);
      await loadCorporateEvents(nextSession ?? session);
      setReconcileResult(null);
      setReconcileFile(null);
      setStatus("Carteira e extrato foram apagados.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao apagar carteira e extrato.");
    }
  }

  async function onClearCorporateEvents() {
    if (!session) {
      setStatus("Sessao nao encontrada. Faca login.");
      return;
    }

    const confirmed = window.confirm("Tem certeza que deseja apagar todos os eventos corporativos?");
    if (!confirmed) {
      return;
    }

    setStatus("Limpando eventos corporativos...");

    try {
      const { response, nextSession } = await authorizedFetch(session, "/api/corporate-events", {
        method: "DELETE"
      });
      applyRefreshedSession(nextSession);

      if (response.status === 401) {
        clearSessionAndGoLogin("Sessao expirada. Faca login novamente.");
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Falha ao apagar eventos corporativos."));
      }

      await loadCorporateEvents(nextSession ?? session);
      await loadPortfolio(nextSession ?? session);
      setStatus("Eventos corporativos foram apagados.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao apagar eventos corporativos.");
    }
  }

  return (
    <main>
      <h1>DinEx Frontend</h1>
      <p>Painel autenticado.</p>

      <UserSessionCard currentUser={currentUser} onLogout={onLogout} />
      <section className="card">
        <div className="toolbar">
          <div>
            <h2>Zerar dados de investimento</h2>
            <p className="status">Use os botoes separados para limpar eventos ou carteira/extrato.</p>
          </div>
          <div className="row-actions">
            <button type="button" onClick={onClearCorporateEvents} disabled={statementLoading || importLoading || corporateEventLoading}>
              Zerar Eventos
            </button>
            <button type="button" onClick={onClearInvestmentData} disabled={statementLoading || importLoading || corporateEventLoading}>
              Zerar Carteira/Extrato
            </button>
          </div>
        </div>
      </section>
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "movements" && (
        <MovementSection
          form={form}
          loading={loading}
          status={status}
          onChange={setForm}
          onSubmit={onSubmit}
          onRefresh={async () => {
            if (!session) {
              setStatus("Sessao nao encontrada. Faca login.");
              return;
            }

            await loadPortfolio(session);
            setStatus("Carteira atualizada.");
          }}
        />
      )}

      {activeTab === "statement" && (
        <StatementSection
          form={statementForm}
          entries={statementEntries}
          entryTypeOptions={entryTypeOptions}
          onChange={setStatementForm}
          importState={{
            importLoading,
            statementLoading,
            onImport: onImportSpreadsheets,
            onStatementSubmit: onSubmitStatement,
            onRefresh: async () => {
              if (!session) {
                setStatus("Sessao nao encontrada. Faca login.");
                return;
              }

              await loadStatement(session);
              setStatus("Extrato atualizado.");
            },
            onImportFileChange: setImportFile
          }}
        />
      )}

      {activeTab === "corporate-events" && (
        <CorporateEventsSection
          form={corporateEventForm}
          events={corporateEvents}
          loading={corporateEventLoading}
          editingEventId={editingCorporateEventId}
          onChange={setCorporateEventForm}
          onSubmit={onSubmitCorporateEvent}
          onRefresh={async () => {
            if (!session) {
              setStatus("Sessao nao encontrada. Faca login.");
              return;
            }

            await loadCorporateEvents(session);
            setStatus("Eventos corporativos atualizados.");
          }}
          onEdit={onEditCorporateEvent}
          onDelete={onDeleteCorporateEvent}
          onCancelEdit={onCancelCorporateEventEdit}
        />
      )}

      {activeTab === "portfolio" && (
        <PortfolioSection
          positions={positions}
          reconcileResult={reconcileResult}
          reconcileLoading={reconcileLoading}
          onReconcile={onReconcilePortfolio}
          onReconcileFileChange={setReconcileFile}
        />
      )}

      <p className="status">{status}</p>
    </main>
  );
}
