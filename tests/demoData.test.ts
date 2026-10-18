import { describe, it, expect } from "vitest";
import { buildDemoDashboard } from "../webview-ui/src/data/demoData";

describe("demoData", () => {
  it("produces dashboard metrics derived from sample records", () => {
    const d = buildDemoDashboard();
    expect(d.metrics.totalSkills).toBe(5);
    expect(d.metrics.totalAgents).toBe(6);
    expect(d.metrics.totalPipelines).toBe(3);
    expect(d.metrics.pipelineRuns).toBe(5);
    expect(d.metrics.successfulRuns).toBe(2);
    expect(d.metrics.failedRuns).toBe(1);
    expect(d.metrics.installedPackages).toBeGreaterThan(0);
  });

  it("returns recent skills sorted by updatedAt descending", () => {
    const d = buildDemoDashboard();
    const dates = d.recentSkills.map((s) => s.updatedAt);
    const sorted = [...dates].sort((a, b) => (a < b ? 1 : -1));
    expect(dates).toEqual(sorted);
  });

  it("returns at most 5 recent agents", () => {
    const d = buildDemoDashboard();
    expect(d.recentAgents.length).toBeLessThanOrEqual(5);
  });

  it("marks integrations as Not Connected or Mock, never Connected", () => {
    const d = buildDemoDashboard();
    for (const i of d.integrations) {
      expect(["Not Connected", "Mock"]).toContain(i.status);
    }
  });

  it("returns at most 8 recent activity entries", () => {
    const d = buildDemoDashboard();
    expect(d.recentActivity.length).toBeLessThanOrEqual(8);
  });
});
