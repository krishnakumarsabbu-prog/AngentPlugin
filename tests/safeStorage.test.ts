import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { safeStorage, serializeJson } from "../src/storage/safeStorage";

let tmpDir = "";

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-safe-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("safeStorage.writeAtomic", () => {
  it("writes a file with the expected contents", async () => {
    const target = path.join(tmpDir, "out.json");
    await safeStorage.writeAtomic(target, serializeJson({ hello: "world" }));
    const contents = fs.readFileSync(target, "utf8");
    expect(JSON.parse(contents)).toEqual({ hello: "world" });
  });

  it("overwrites an existing file atomically", async () => {
    const target = path.join(tmpDir, "out.json");
    fs.writeFileSync(target, "OLD", "utf8");
    await safeStorage.writeAtomic(target, "NEW");
    expect(fs.readFileSync(target, "utf8")).toBe("NEW");
  });

  it("creates nested directories", async () => {
    const target = path.join(tmpDir, "nested", "deep", "out.json");
    await safeStorage.writeAtomic(target, "{}");
    expect(fs.existsSync(target)).toBe(true);
  });

  it("does not leave temp files on success", async () => {
    const target = path.join(tmpDir, "out.json");
    await safeStorage.writeAtomic(target, "{}");
    const entries = fs.readdirSync(tmpDir);
    expect(entries).toEqual(["out.json"]);
  });
});
