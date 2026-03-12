"use client";

export type DashboardTab = "movements" | "statement" | "corporate-events" | "portfolio" | "income-tax" | "assets";

type TabNavigationProps = {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  primaryTabs: DashboardTab[];
  secondaryTabs?: DashboardTab[];
};

type TabIcon = "movement" | "statement" | "event" | "portfolio" | "tax" | "asset";

const tabs: Array<{ id: DashboardTab; label: string; mobileLabel: string; icon: TabIcon }> = [
  { id: "movements", label: "Movimentacoes", mobileLabel: "Mov.", icon: "movement" },
  { id: "statement", label: "Extrato", mobileLabel: "Extrato", icon: "statement" },
  { id: "corporate-events", label: "Eventos", mobileLabel: "Eventos", icon: "event" },
  { id: "portfolio", label: "Carteira", mobileLabel: "Carteira", icon: "portfolio" },
  { id: "income-tax", label: "Imposto de Renda", mobileLabel: "IR", icon: "tax" },
  { id: "assets", label: "Ativos", mobileLabel: "Ativos", icon: "asset" }
];

function SolidIcon({ name }: { name: TabIcon }) {
  if (name === "movement") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 3h2v14H3V3zm6 4h2v10H9V7zm6-4h2v14h-2V3z" />
      </svg>
    );
  }

  if (name === "statement") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4 2h12a1 1 0 0 1 1 1v14l-3-2-3 2-3-2-3 2V3a1 1 0 0 1 1-1zm2 4v2h8V6H6zm0 4v2h8v-2H6z" />
      </svg>
    );
  }

  if (name === "event") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M6 2h2v2h4V2h2v2h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2V2zm-1 7v7h10V9H5z" />
      </svg>
    );
  }

  if (name === "portfolio") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 5a2 2 0 0 1 2-2h5l2 2h3a2 2 0 0 1 2 2v1H3V5zm0 3h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
      </svg>
    );
  }

  if (name === "tax") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 2l8 4v2H2V6l8-4zm-6 8h12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7zm4 2v4h2v-4H8zm4 0v4h2v-4h-2z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2l7 4v8l-7 4-7-4V6l7-4zm-1 5H7v2h2V7zm4 0h-2v2h2V7zM7 11h6v2H7v-2z" />
    </svg>
  );
}

export function TabNavigation({ activeTab, onChange, primaryTabs, secondaryTabs }: TabNavigationProps) {
  const tabById = new Map(tabs.map((tab) => [tab.id, tab]));
  const primary = primaryTabs.filter((tabId) => tabById.has(tabId));
  const secondary = (secondaryTabs ?? []).filter((tabId) => tabById.has(tabId));

  function renderButtons(tabIds: DashboardTab[], mobile = false) {
    return tabIds.map((tabId) => (
      <button
        key={tabId}
        type="button"
        className={activeTab === tabId ? "tab-button active" : "tab-button"}
        onClick={() => onChange(tabId)}
      >
        <span className="tab-button-content">
          <span className="tab-icon-solid" aria-hidden="true">
            <SolidIcon name={tabById.get(tabId)?.icon ?? "statement"} />
          </span>
          <span>{mobile ? tabById.get(tabId)?.mobileLabel : tabById.get(tabId)?.label}</span>
        </span>
      </button>
    ));
  }

  return (
    <>
      <aside className="sidebar-nav card">
        <h2>Menu</h2>
        <div className="sidebar-group">
          <p className="sidebar-title">Principal</p>
          <div className="sidebar-items">{renderButtons(primary)}</div>
        </div>
        {secondary.length > 0 && (
          <div className="sidebar-group">
            <p className="sidebar-title">Configurações</p>
            <div className="sidebar-items">{renderButtons(secondary)}</div>
          </div>
        )}
      </aside>
      <nav className="mobile-bottom-nav" aria-label="Navegação principal">
        {renderButtons([...primary, ...secondary], true)}
      </nav>
    </>
  );
}
