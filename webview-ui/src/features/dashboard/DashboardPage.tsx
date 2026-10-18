import { useMemo } from "react";
import { Sparkles, Bot, Workflow, CirclePlay as PlayCircle, CircleCheck as CheckCircle2, Circle as XCircle, Package, Activity, ArrowRight, Plus, Bot as BotIcon, Workflow as WorkflowIcon, Clock } from "lucide-react";
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

export function DashboardPage({ data, onNavigate }: DashboardPageProps) {
  const metrics = data?.metrics;

  const recentActivity = useMemo(() => data?.recentActivity ?? [], [data]);

  if (!data || !metrics) {
    return (
      <EmptyState
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
          <button className="btn primary" onClick={() => onNavigate("skills-studio")}>
            <Plus size={14} /> Create Skill
          </button>
          <button className="btn secondary" onClick={() => onNavigate("agent-studio")}>
            <BotIcon size={14} /> Create Agent
          </button>
          <button className="btn secondary" onClick={() => onNavigate("harness-pipeline")}>
            <WorkflowIcon size={14} /> Design Pipeline
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
          {recentActivity.length === 0 ? (
            <EmptyState title="No recent activity" text="Updates to skills, agents, and pipelines will appear here." />
          ) : (
            <div className="section-list">
              {recentActivity.map((a) => (
                <div className="list-row" key={a.id} onClick={() => onNavigate(kindToRoute(a.kind))}>
                  <div className="list-row-main">
                    <span className="list-row-title">{a.label}</span>
                    <span className="list-row-sub"><Clock size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />{formatDate(a.timestamp)}</span>
                  </div>
                  {a.status && <StatusBadge status={a.status} />}
                </div>
              ))}
            </div>
          )}
        </section>

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
              <div className="list-row-main"><span className="list-row-title">Open Skills Studio</span></div>
              <ArrowRight size={14} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="list-row" onClick={() => onNavigate("agent-studio")}>
              <div className="list-row-main"><span className="list-row-title">Open Agent Studio</span></div>
              <ArrowRight size={14} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="list-row" onClick={() => onNavigate("harness-pipeline")}>
              <div className="list-row-main"><span className="list-row-title">Design a Pipeline</span></div>
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
