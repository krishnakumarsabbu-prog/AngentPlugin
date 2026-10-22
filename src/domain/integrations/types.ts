export type PlatformIntegrationId = "copilot" | "claude" | "openai";

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "mock_active"
  | "error"
  | "unconfigured";

export interface PlatformIntegrationConfig {
  id: PlatformIntegrationId;
  name: string;
  type: PlatformIntegrationId;
  connectionStatus: ConnectionStatus;
  endpointUrl?: string;
  targetModel?: string;
  isMock: boolean;
  hasStoredSecret: boolean; // Never store secret plaintext
  lastValidatedAt?: string;
  lastValidationMessage?: string;
  supportedFeatures: string[];
  limitations: string[];
  documentationUrl: string;
}

export interface IntegrationValidationResult {
  valid: boolean;
  status: ConnectionStatus;
  message: string;
  latencyMs?: number;
  checkedAt: string;
  isMock: boolean;
  modelDetected?: string;
}
