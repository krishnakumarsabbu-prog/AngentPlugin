import { useEffect, useState } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { sendRequest, hasVsCodeApi, postMessage } from "./services/vscodeApi";
import { buildDemoDashboard } from "./data/demoData";
import type { DashboardData, AppState } from "./types";

const DEFAULT_ROUTE = "dashboard";

function loadInitialRoute(): string {
  try {
    const saved = localStorage.getItem("agentforge.route");
    if (saved) return saved;
  } catch {
    // ignore
  }
  return DEFAULT_ROUTE;
}

export default function App() {
  const [route, setRoute] = useState<string>(loadInitialRoute);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inVsCode = hasVsCodeApi();

  useEffect(() => {
    postMessage("app.ready", { version: "0.1.0" });
    let active = true;

    async function load() {
      if (!inVsCode) {
        // Browser preview fallback: use demo data directly
        setDashboard(buildDemoDashboard());
        setAppState({ version: "0.1.0", settings: {
          schemaVersion: 1, theme: "light", defaultPlatform: "neutral",
          telemetry: false, autoSave: true, recentRoute: DEFAULT_ROUTE,
        }});
        setLoading(false);
        return;
      }
      try {
        const [state, data] = await Promise.all([
          sendRequest<AppState>("app.getState"),
          sendRequest<DashboardData>("app.getDashboardData"),
        ]);
        if (!active) return;
        setAppState(state);
        setDashboard(data);
        const initialRoute = state?.settings?.recentRoute || DEFAULT_ROUTE;
        setRoute(initialRoute);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
        setDashboard(buildDemoDashboard());
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [inVsCode]);

  const handleNavigate = (next: string) => {
    setRoute(next);
    try { localStorage.setItem("agentforge.route", next); } catch { /* ignore */ }
    if (inVsCode) {
      sendRequest("app.navigate", { route: next }).catch(() => { /* best effort */ });
      if (appState?.settings) {
        sendRequest("settings.update", { settings: { ...appState.settings, recentRoute: next } }).catch(() => {});
      }
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="main">
          <main className="content">
            <div className="empty-state">
              <div className="empty-state-title">Loading AgentForge…</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppLayout route={route} onNavigate={handleNavigate} dashboardData={dashboard} />
      {error && !inVsCode && (
        <div style={{ position: "fixed", bottom: 8, left: 8, right: 8, padding: "8px 12px", background: "#FEF2F2", color: "var(--error)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}>
          Browser preview is using sample data. {error}
        </div>
      )}
    </>
  );
}
