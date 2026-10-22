import { describe, it, expect } from "vitest";
import { buildDemoDashboard } from "../webview-ui/src/data/demoData";

describe("demoData", () => {
  it("produces clean empty dashboard metrics for production portal", () => {
    const d = buildDemoDashboard();
    expect(d.metrics.totalSkills).toBe(0);
    expect(d.metrics.totalAgents).toBe(0);
    expect(d.metrics.totalPipelines).toBe(0);
    expect(d.metrics.pipelineRuns).toBe(0);
    expect(d.metrics.successfulRuns).toBe(0);
    expect(d.metrics.failedRuns).toBe(0);
    expect(d.metrics.installedPackages).toBe(0);
  });

  it("returns empty recent skills", () => {
    const d = buildDemoDashboard();
    expect(d.recentSkills).toEqual([]);
  });

  it("returns empty recent agents", () => {
    const d = buildDemoDashboard();
    expect(d.recentAgents).toEqual([]);
  });

  it("marks integrations as Not Connected", () => {
    const d = buildDemoDashboard();
    for (const i of d.integrations) {
      expect(["Not Connected"]).toContain(i.status);
    }
  });

  it("returns empty recent activity entries", () => {
    const d = buildDemoDashboard();
    expect(d.recentActivity).toEqual([]);
  });
});
