import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  RepositoryFingerprint,
  FingerprintEntry,
  PersonaId,
  SkillIntermediateRepresentation,
} from "../../domain/persona/types";

export interface DeltaChangeResult {
  hasChanges: boolean;
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  affectedModules: string[];
}

export interface SkillVersionSnapshot {
  version: string;
  timestamp: string;
  personas: PersonaId[];
  fingerprintHash: string;
  ir: SkillIntermediateRepresentation;
  summaryNote: string;
}

export class IncrementalCrawlStore {
  private readonly storageDir: string;

  constructor(workspaceRoot: string) {
    this.storageDir = path.join(workspaceRoot, ".agentforge", "persona");
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch {
      // Best effort
    }
  }

  /**
   * Generates a detailed fingerprint map of the repository files.
   */
  public generateFingerprint(
    workspaceRoot: string,
    eligibleFiles: string[],
    personas: PersonaId[]
  ): RepositoryFingerprint {
    const files: Record<string, FingerprintEntry> = {};
    const aggHash = crypto.createHash("sha256");

    for (const rel of eligibleFiles) {
      try {
        const full = path.join(workspaceRoot, rel);
        const stat = fs.statSync(full);

        // Fast hash using file size + mtime, or content for small manifests
        const entryHash = crypto
          .createHash("sha256")
          .update(`${rel}:${stat.size}:${stat.mtimeMs}`)
          .digest("hex");

        files[rel] = {
          relativePath: rel,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
          hash: entryHash,
        };

        aggHash.update(`${rel}:${entryHash};`);
      } catch {
        // Ignored
      }
    }

    return {
      repositoryRoot: workspaceRoot,
      analyzedAt: new Date().toISOString(),
      aggregateHash: aggHash.digest("hex"),
      files,
      personas,
      version: 1,
    };
  }

  /**
   * Compares the current workspace files against a previous fingerprint to detect modified/added/deleted files.
   */
  public detectDelta(
    workspaceRoot: string,
    currentFiles: string[],
    previousFingerprint?: RepositoryFingerprint
  ): DeltaChangeResult {
    if (!previousFingerprint) {
      return {
        hasChanges: true,
        addedFiles: [...currentFiles],
        modifiedFiles: [],
        deletedFiles: [],
        affectedModules: ["all"],
      };
    }

    const addedFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const prevFileKeys = new Set(Object.keys(previousFingerprint.files));
    const currentFileSet = new Set(currentFiles);

    for (const rel of currentFiles) {
      const prevEntry = previousFingerprint.files[rel];
      if (!prevEntry) {
        addedFiles.push(rel);
      } else {
        try {
          const full = path.join(workspaceRoot, rel);
          const stat = fs.statSync(full);
          if (stat.size !== prevEntry.sizeBytes || stat.mtimeMs !== prevEntry.mtimeMs) {
            modifiedFiles.push(rel);
          }
        } catch {
          modifiedFiles.push(rel);
        }
      }
    }

    const deletedFiles: string[] = [];
    for (const prevRel of prevFileKeys) {
      if (!currentFileSet.has(prevRel)) {
        deletedFiles.push(prevRel);
      }
    }

    const affectedModules = new Set<string>();
    for (const f of [...addedFiles, ...modifiedFiles, ...deletedFiles]) {
      const parts = f.split(/[\\/]/);
      affectedModules.add(parts.length > 1 ? parts[0] : "root");
    }

    const hasChanges = addedFiles.length > 0 || modifiedFiles.length > 0 || deletedFiles.length > 0;

    return {
      hasChanges,
      addedFiles,
      modifiedFiles,
      deletedFiles,
      affectedModules: Array.from(affectedModules),
    };
  }

  /**
   * Persists a skill version snapshot for history and rollback.
   */
  public saveSnapshot(snapshot: SkillVersionSnapshot): void {
    try {
      const file = path.join(this.storageDir, `version-${snapshot.version}.json`);
      fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf8");

      // Update index
      const indexPath = path.join(this.storageDir, "versions.json");
      let index: { version: string; timestamp: string; note: string }[] = [];
      if (fs.existsSync(indexPath)) {
        try {
          index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
        } catch {}
      }

      index.unshift({
        version: snapshot.version,
        timestamp: snapshot.timestamp,
        note: snapshot.summaryNote,
      });

      fs.writeFileSync(indexPath, JSON.stringify(index.slice(0, 20), null, 2), "utf8");
    } catch {
      // Best effort
    }
  }

  /**
   * Lists historical skill version snapshots.
   */
  public listSnapshots(): { version: string; timestamp: string; note: string }[] {
    const indexPath = path.join(this.storageDir, "versions.json");
    if (fs.existsSync(indexPath)) {
      try {
        return JSON.parse(fs.readFileSync(indexPath, "utf8"));
      } catch {}
    }
    return [];
  }

  /**
   * Retrieves a snapshot for rollback.
   */
  public getSnapshot(version: string): SkillVersionSnapshot | undefined {
    const file = path.join(this.storageDir, `version-${version}.json`);
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      } catch {}
    }
    return undefined;
  }
}
