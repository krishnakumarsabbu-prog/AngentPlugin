import { useMemo, useState } from "react";
import {
  Sparkles,
  Bot,
  Workflow,
  CirclePlay as PlayCircle,
  CircleCheck as CheckCircle2,
  Circle as XCircle,
  Package,
  Activity,
  ArrowRight,
  Plus,
  Bot as BotIcon,
  Workflow as WorkflowIcon,
  Clock,
  Search,
  X,
  PackagePlus,
} from "lucide-react";
import type { DashboardData } from "../../types";
import { MetricCard } from "../../components/MetricCard";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";

interface DashboardPageProps {
  data: DashboardData | null;
  onNavigate: (route: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ActivityFilter = "all" | "skill" | "agent" | "execution";

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "skill", label: "Skills" },
  { id: "agent", label: "Agents" },
  { id: "execution", label: "Runs" },
];

export function DashboardPage({ data, onNavigate }: DashboardPageProps) {
  const metrics = data?.metrics;
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [search, setSearch] = useState("");

  const filteredActivity = useMemo(() => {
    const list = data?.recentActivity ?? [];
    return activityFilter === "all" ? list : list.filter((a) => a.kind === activityFilter);
  }, [data, activityFilter]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !data) return null;
    return {
      skills: data.recentSkills.filter((s) => s.name.toLowerCase().includes(q)),
      agents: data.recentAgents.filter(
        (a) => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q),
      ),
    };
  }, [search, data]);

  if (!data || !metrics) {
    return (
      <EmptyState
        variant="glass"
        title="No dashboard data available"
        text="Run the extension inside VS Code to load dashboard data, or reset demo data."
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">AgentForge</h1>
        <p className="page-subtitle">Universal Agent &amp; Skills Engineering Platform</p>
        <p className="page-description">
          Design reusable skills, configure specialized agents, and orchestrate multi-agent workflows
          through a visual engineering workspace.
        </p>
        <div className="page-actions">
          <button className="btn primary glow-cta" onClick={() => onNavigate("skills-studio")}>
            <Plus size={14} /> Create Skill
          </button>
          <button className="btn secondary" onClick={() => onNavigate("agent-studio")}>
            <BotIcon size={14} /> Create Agent
          </button>
          <button className="btn secondary" onClick={() => onNavigate("harness-pipeline")}>
            <WorkflowIcon size={14} /> Design Pipeline
          </button>
          <button className="btn secondary" onClick={() => onNavigate("package-manager")}>
            <PackagePlus size={14} /> Import Package
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Total Skills" value={metrics.totalSkills} icon={Sparkles} onClick={() => onNavigate("skills-studio")} />
        <MetricCard label="Total Agents" value={metrics.totalAgents} icon={Bot} onClick={() => onNavigate("agent-studio")} />
        <MetricCard label="Total Pipelines" value={metrics.totalPipelines} icon={Workflow} onClick={() => onNavigate("harness-pipeline")} />
        <MetricCard label="Pipeline Runs" value={metrics.pipelineRuns} icon={PlayCircle} onClick={() => onNavigate("execution-history")} />
        <MetricCard label="Successful Runs" value={metrics.successfulRuns} icon={CheckCircle2} tone="success" onClick={() => onNavigate("execution-history")} />
        <MetricCard label="Failed Runs" value={metrics.failedRuns} icon={XCircle} tone="error" onClick={() => onNavigate("execution-history")} />
        <MetricCard label="Installed Packages" value={metrics.installedPackages} icon={Package} onClick={() => onNavigate("package-manager")} />
      </div>

      <div className="section-grid">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Activity</h2>
            <Activity size={14} style={{ color: "var(--text-secondary)" }} />
          </div>

          <div className="activity-toolbar">
            <div className="chip-row" role="group" aria-label="Filter activity by type">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`chip${activityFilter === f.id ? " active" : ""}`}
                  onClick={() => setActivityFilter(f.id)}
                  aria-pressed={activityFilter === f.id}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="search-inline">
              <Search size={13} />
              <input
                className="search-input"
                placeholder="Search skills and agents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search skills and agents"
              />
              {search && (
                <button className="toast-close" aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {filteredActivity.length === 0 ? (
            <EmptyState
              title="No matching activity"
              text={activityFilter === "all"
                ? "Updates to skills, agents, and pipelines will appear here."
                : "Try a different filter."}
            />
          ) : (
            <div className="section-list">
              {filteredActivity.map((a) => (
                <div className="list-row" key={a.id} onClick={() => onNavigate(kindToRoute(a.kind))}>
                  <div className="list-row-main">
                    <span className="list-row-title">{a.label}</span>
                    <span className="list-row-sub">
                      <Clock size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      {formatDate(a.timestamp)}
                    </span>
                  </div>
                  {a.status && <StatusBadge status={a.status} />}
                </div>
              ))}
            </div>
          )}
        </section>

        {searchResults && (
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Search Results</h2>
              <span className="list-row-sub">
                {searchResults.skills.length + searchResults.agents.length} matches
              </span>
            </div>
            {searchResults.skills.length + searchResults.agents.length === 0 ? (
              <EmptyState title="No matches" text={`Nothing found for "${search}".`} />
            ) : (
              <div className="section-list">
                {searchResults.skills.map((s) => (
                  <div className="list-row" key={s.id} onClick={() => onNavigate("skills-studio")}>
                    <div className="list-row-main">
                      <span className="list-row-title">{s.name}</span>
                      <span className="list-row-sub">Skill · v{s.version}</span>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
                {searchResults.agents.map((a) => (
                  <div className="list-row" key={a.id} onClick={() => onNavigate("agent-studio")}>
                    <div className="list-row-main">
                      <span className="list-row-title">{a.name}</span>
                      <span className="list-row-sub">Agent · {a.role}</span>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Recently Updated Skills</h2>
            <button className="btn ghost" onClick={() => onNavigate("skills-studio")}>View all <ArrowRight size={12} /></button>
          </div>
          {data.recentSkills.length === 0 ? (
            <EmptyState title="No skills yet" text="Create a skill in the Skills Studio." />
          ) : (
            <div className="section-list">
              {data.recentSkills.map((s) => (
                <div className="list-row" key={s.id} onClick={() => onNavigate("skills-studio")}>
                  <div className="list-row-main">
                    <span className="list-row-title">{s.name}</span>
                    <span className="list-row-sub">v{s.version} · {s.category} · {formatDate(s.updatedAt)}</span>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Recently Updated Agents</h2>
            <button className="btn ghost" onClick={() => onNavigate("agent-studio")}>View all <ArrowRight size={12} /></button>
          </div>
          {data.recentAgents.length === 0 ? (
            <EmptyState title="No agents yet" text="Create an agent in the Agent Studio." />
          ) : (
            <div className="section-list">
              {data.recentAgents.map((a) => (
                <div className="list-row" key={a.id} onClick={() => onNavigate("agent-studio")}>
                  <div className="list-row-main">
                    <span className="list-row-title">{a.name}</span>
                    <span className="list-row-sub">{a.role} · v{a.version} · {formatDate(a.updatedAt)}</span>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Pipeline Executions</h2>
            <button className="btn ghost" onClick={() => onNavigate("execution-history")}>View all <ArrowRight size={12} /></button>
          </div>
          {data.recentExecutions.length === 0 ? (
            <EmptyState title="No executions yet" text="Run a pipeline to see execution history." />
          ) : (
            <div className="section-list">
              {data.recentExecutions.map((e) => (
                <div className="list-row" key={e.id} onClick={() => onNavigate("harness-pipeline")}>
                  <div className="list-row-main">
                    <span className="list-row-title">{e.id}</span>
                    <span className="list-row-sub">v{e.workflowVersion} · {formatDate(e.startedAt)}</span>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Platform Integration Status</h2>
            <button className="btn ghost" onClick={() => onNavigate("platform-integrations")}>Manage <ArrowRight size={12} /></button>
          </div>
          <div className="section-list">
            {data.integrations.map((i) => (
              <div className="integration-row" key={i.id}>
                <div className="integration-row-title">
                  <span className="integration-row-name">{i.name}</span>
                  <StatusBadge status={i.status} />
                </div>
                <span className="integration-row-desc">{i.description}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
          </div>
          <div className="section-list">
            <div className="list-row" onClick={() => onNavigate("skills-studio")}>
              <div className="list-row-main"><span className="list-row-title">Create Skill</span></div>
              <ArrowRight size={14} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="list-row" onClick={() => onNavigate("agent-studio")}>
              <div className="list-row-main"><span className="list-row-title">Create Agent</span></div>
              <ArrowRight size={14} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="list-row" onClick={() => onNavigate("harness-pipeline")}>
              <div className="list-row-main"><span className="list-row-title">Design Pipeline</span></div>
              <ArrowRight size={14} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="list-row" onClick={() => onNavigate("package-manager")}>
              <div className="list-row-main"><span className="list-row-title">Import Package</span></div>
              <ArrowRight size={14} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="list-row" onClick={() => onNavigate("settings")}>
              <div className="list-row-main"><span className="list-row-title">Open Settings</span></div>
              <ArrowRight size={14} style={{ color: "var(--text-secondary)" }} />
            </div>
          </div>
        </section>
      </div>

      <div className="footer-note">
        Sample data is shown for demonstration. Integrations marked "Not Connected" or "Mock" are not
        actively connected to external services.
      </div>
    </div>
  );
}

function kindToRoute(kind: "skill" | "agent" | "workflow" | "execution" | "system"): string {
  switch (kind) {
    case "skill": return "skills-studio";
    case "agent": return "agent-studio";
    case "workflow": return "harness-pipeline";
    case "execution": return "execution-history";
    default: return "dashboard";
  }
}