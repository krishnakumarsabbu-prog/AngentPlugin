import { sanitizeAuditDetails } from "../governance/SecuritySanitizer";

export interface SecretStorageProvider {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory secret storage implementation for testing, headless environments,
 * and environments without a native VS Code SecretStorage vault.
 */
export class InMemorySecretStorage implements SecretStorageProvider {
  private secrets = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.secrets.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this.secrets.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.secrets.delete(key);
  }

  clear(): void {
    this.secrets.clear();
  }
}

/**
 * Secure Credential Store for AgentForge live platform adapters.
 * Manages encrypted storage and retrieval of sensitive API tokens, bearer keys,
 * and endpoint secrets without ever persisting them into workspace JSON files.
 */
export class SecureCredentialStore {
  private static readonly KEY_PREFIX = "agentforge.credential.";

  constructor(private readonly storage: SecretStorageProvider) {}

  /**
   * Generates a namespaced key for the platform or service.
   */
  private makeKey(platformId: string): string {
    const cleanId = platformId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    return `${SecureCredentialStore.KEY_PREFIX}${cleanId}`;
  }

  /**
   * Stores a credential securely.
   * Rejects empty or invalid secrets.
   */
  public async setCredential(platformId: string, secretValue: string): Promise<void> {
    if (!platformId || typeof platformId !== "string") {
      throw new Error("Invalid platformId: must be a non-empty string.");
    }
    if (!secretValue || typeof secretValue !== "string" || secretValue.trim().length === 0) {
      throw new Error("Invalid credential: secret value must be a non-empty string.");
    }

    const key = this.makeKey(platformId);
    await this.storage.store(key, secretValue.trim());
  }

  /**
   * Retrieves a credential for live execution.
   * Access to raw secrets should only occur at the network dispatch boundary.
   */
  public async getCredential(platformId: string): Promise<string | undefined> {
    if (!platformId) return undefined;
    const key = this.makeKey(platformId);
    return this.storage.get(key);
  }

  /**
   * Checks whether a credential is stored for a platform without exposing its value.
   */
  public async hasCredential(platformId: string): Promise<boolean> {
    const secret = await this.getCredential(platformId);
    return typeof secret === "string" && secret.length > 0;
  }

  /**
   * Deletes a credential from the secure vault.
   */
  public async deleteCredential(platformId: string): Promise<void> {
    if (!platformId) return;
    const key = this.makeKey(platformId);
    await this.storage.delete(key);
  }

  /**
   * Returns a sanitized diagnostic summary of stored credentials
   * (e.g. key name, masked suffix, presence), strictly preventing secret exposure.
   */
  public async getCredentialStatus(platformId: string): Promise<{
    configured: boolean;
    maskedPreview?: string;
  }> {
    const secret = await this.getCredential(platformId);
    if (!secret) {
      return { configured: false };
    }

    const visibleLength = Math.min(4, Math.floor(secret.length / 4));
    const suffix = secret.slice(-visibleLength);
    const maskedPreview = `***...${suffix}`;

    return {
      configured: true,
      maskedPreview,
    };
  }

  /**
   * Redacts any credentials found in strings or object graphs.
   */
  public sanitizePayload<T>(payload: T): T {
    return sanitizeAuditDetails(payload) as T;
  }
}
