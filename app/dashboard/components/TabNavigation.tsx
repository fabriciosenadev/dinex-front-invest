"use client";

export type DashboardTab = "movements" | "statement" | "corporate-events" | "portfolio" | "income-tax" | "assets";

type TabNavigationProps = {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  primaryTabs: DashboardTab[];
  secondaryTabs?: DashboardTab[];
};

const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: "movements", label: "Movimentacoes" },
  { id: "statement", label: "Extrato" },
  { id: "corporate-events", label: "Eventos" },
  { id: "portfolio", label: "Carteira" },
  { id: "income-tax", label: "Imposto de Renda" },
  { id: "assets", label: "Ativos" }
];

export function TabNavigation({ activeTab, onChange, primaryTabs, secondaryTabs }: TabNavigationProps) {
  const labelById = new Map(tabs.map((tab) => [tab.id, tab.label]));
  const primary = primaryTabs.filter((tabId) => labelById.has(tabId));
  const secondary = (secondaryTabs ?? []).filter((tabId) => labelById.has(tabId));

  function renderButtons(tabIds: DashboardTab[]) {
    return tabIds.map((tabId) => (
      <button
        key={tabId}
        type="button"
        className={activeTab === tabId ? "tab-button active" : "tab-button"}
        onClick={() => onChange(tabId)}
      >
        {labelById.get(tabId)}
      </button>
    ));
  }

  return (
    <section className="card tab-nav">
      <div className="tabs tabs-primary">{renderButtons(primary)}</div>
      {secondary.length > 0 && (
        <div className="tabs tabs-secondary">
          {renderButtons(secondary)}
        </div>
      )}
      <p className="status">Principal: navegação diária. Secundário: configurações e ajustes.</p>
    </section>
  );
}
