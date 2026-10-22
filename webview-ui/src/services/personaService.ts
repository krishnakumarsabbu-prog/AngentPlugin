import { sendRequest, hasVsCodeApi, subscribeToPushEvent } from "./vscodeApi";
import type {
  EngineeringPersona,
  CrawlOptions,
  CrawlResult,
  CrawlProgressEvent,
  SkillGenerationRequest,
  SkillGenerationResult,
  EvaluationScorecard,
  SkillIntermediateRepresentation,
  RepositoryFingerprint,
} from "../types/persona";
import { BUILTIN_PERSONAS } from "../data/personaData";

export interface WorkspaceFolderInfo {
  name: string;
  path: string;
}

export interface VersionSnapshotSummary {
  version: string;
  timestamp: string;
  note: string;
}

export async function listPersonas(): Promise<EngineeringPersona[]> {
  if (!hasVsCodeApi()) {
    return BUILTIN_PERSONAS;
  }
  try {
    return await sendRequest<EngineeringPersona[]>("persona.list");
  } catch {
    return BUILTIN_PERSONAS;
  }
}

export async function listWorkspaces(): Promise<WorkspaceFolderInfo[]> {
  if (!hasVsCodeApi()) {
    return [{ name: "Current Project", path: "/workspace" }];
  }
  try {
    return await sendRequest<WorkspaceFolderInfo[]>("persona.listWorkspaces");
  } catch {
    return [];
  }
}

export async function startCrawl(
  options: CrawlOptions,
  onProgress?: (event: CrawlProgressEvent) => void
): Promise<CrawlResult> {
  let unsubscribe: (() => void) | undefined;
  if (onProgress) {
    unsubscribe = subscribeToPushEvent<CrawlProgressEvent>("persona.progress", onProgress);
  }

  try {
    const res = await sendRequest<CrawlResult>("persona.crawl", options, 120000);
    return res;
  } finally {
    if (unsubscribe) {
      unsubscribe();
    }
  }
}

export async function cancelCrawl(): Promise<{ ok: boolean; cancelled: boolean }> {
  return sendRequest<{ ok: boolean; cancelled: boolean }>("persona.cancelCrawl");
}

export async function compileSkill(request: SkillGenerationRequest): Promise<SkillGenerationResult> {
  return sendRequest<SkillGenerationResult>("persona.compile", request, 30000);
}

export async function evaluateSkill(
  ir: SkillIntermediateRepresentation,
  crawlResult?: CrawlResult
): Promise<EvaluationScorecard> {
  return sendRequest<EvaluationScorecard>("persona.evaluate", { ir, crawlResult });
}

export async function savePersonaSkill(payload: {
  ir: SkillIntermediateRepresentation;
  installTargets?: ("copilot" | "claude" | "openai" | "neutral")[];
  writeFilesToWorkspace?: boolean;
}): Promise<{ ok: boolean; skillId: string; filesWritten?: number }> {
  return sendRequest<{ ok: boolean; skillId: string; filesWritten?: number }>("persona.save", payload);
}

export async function listPersonaSkillVersions(): Promise<VersionSnapshotSummary[]> {
  if (!hasVsCodeApi()) return [];
  try {
    return await sendRequest<VersionSnapshotSummary[]>("persona.listVersions");
  } catch {
    return [];
  }
}

export async function rollbackPersonaSkillVersion(version: string): Promise<any> {
  return sendRequest("persona.rollbackVersion", { version });
}
