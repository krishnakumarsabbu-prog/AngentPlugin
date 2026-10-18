import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface SafeStorageBackend {
  writeAtomic(filePath: string, contents: string): Promise<void>;
}

const diskBackend: SafeStorageBackend = {
  async writeAtomic(filePath, contents) {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
    try {
      await fs.promises.writeFile(tmp, contents, { encoding: "utf8" });
      if (os.platform() === "win32") {
        try {
          await fs.promises.unlink(filePath).catch(() => undefined);
        } catch {
          // best-effort; rename will surface a real error if needed
        }
      }
      await fs.promises.rename(tmp, filePath);
    } catch (err) {
      await fs.promises.unlink(tmp).catch(() => undefined);
      throw err;
    }
  },
};

export function createSafeStorage(backend: SafeStorageBackend = diskBackend): SafeStorageBackend {
  return backend;
}

export const safeStorage = createSafeStorage();

export function serializeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
