"use client";

export type DashboardTab = "movements" | "statement" | "corporate-events" | "portfolio" | "income-tax" | "assets";

type TabNavigationProps = {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  primaryTabs: DashboardTab[];
  secondaryTabs?: DashboardTab[];
};

const tabs: Array<{ id: DashboardTab; label: string; icon: string }> = [
  { id: "movements", label: "Movimentacoes", icon: "↔" },
  { id: "statement", label: "Extrato", icon: "🧾" },
  { id: "corporate-events", label: "Eventos", icon: "🔁" },
  { id: "portfolio", label: "Carteira", icon: "💼" },
  { id: "income-tax", label: "Imposto de Renda", icon: "📊" },
  { id: "assets", label: "Ativos", icon: "🏷" }
];

export function TabNavigation({ activeTab, onChange, primaryTabs, secondaryTabs }: TabNavigationProps) {
  const tabById = new Map(tabs.map((tab) => [tab.id, tab]));
  const primary = primaryTabs.filter((tabId) => tabById.has(tabId));
  const secondary = (secondaryTabs ?? []).filter((tabId) => tabById.has(tabId));

  function renderButtons(tabIds: DashboardTab[]) {
    return tabIds.map((tabId) => (
      <button
        key={tabId}
        type="button"
        className={activeTab === tabId ? "tab-button active" : "tab-button"}
        onClick={() => onChange(tabId)}
      >
        <span className="tab-button-content">
          <span className="tab-icon" aria-hidden="true">
            {tabById.get(tabId)?.icon}
          </span>
          <span>{tabById.get(tabId)?.label}</span>
        </span>
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
