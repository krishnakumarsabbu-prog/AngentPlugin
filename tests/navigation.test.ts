import { describe, it, expect } from "vitest";
import { ALL_NAV_ITEMS, NAV_GROUPS, findNavItem } from "../webview-ui/src/navigation/registry";

describe("navigation registry", () => {
  it("includes dashboard as first item", () => {
    expect(ALL_NAV_ITEMS[0].id).toBe("dashboard");
  });

  it("contains all required groups", () => {
    const labels = NAV_GROUPS.map((g) => g.label);
    expect(labels).toEqual([
      "Overview",
      "Engineering Studio",
      "Operations",
      "Platform",
      "Governance",
      "Administration",
    ]);
  });

  it("finds an item by id", () => {
    const item = findNavItem("harness-pipeline");
    expect(item?.label).toBe("Harness Pipeline");
  });

  it("every non-dashboard item has planned features", () => {
    for (const item of ALL_NAV_ITEMS) {
      if (item.id === "dashboard") continue;
      expect(item.future.length).toBeGreaterThan(0);
    }
  });

  it("returns undefined for unknown id", () => {
    expect(findNavItem("does-not-exist")).toBeUndefined();
  });
});
