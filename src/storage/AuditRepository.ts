import { AuditEvent, AuditFilters, AuditOutcome, AuditEventType } from "../domain/governance/types";
import { sanitizeAuditDetails } from "../governance/SecuritySanitizer";

export interface AuditPersistence {
  loadAuditEvents(): AuditEvent[];
  saveAuditEvents(events: AuditEvent[]): void;
}

export class AuditRepository {
  private inMemoryCache: AuditEvent[] = [];
  private maxEventsLimit = 500; // Retention cap for audit log

  constructor(private persistence?: AuditPersistence) {
    if (this.persistence) {
      try {
        this.inMemoryCache = this.persistence.loadAuditEvents() || [];
      } catch {
        this.inMemoryCache = [];
      }
    }
  }

  /**
   * Logs an audit activity event with automatic secret scrubbing and safe persistence.
   */
  async recordEvent(eventInput: {
    eventType: AuditEventType;
    resourceId: string;
    resourceName: string;
    outcome: AuditOutcome;
    details?: Record<string, unknown>;
    actor?: string;
    severity?: "info" | "warning" | "error" | "critical";
  }): Promise<AuditEvent> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toISOString();

    // Deeply cleanse details of API keys, passwords, bearer tokens, etc.
    const cleanDetails = (sanitizeAuditDetails(eventInput.details || {}) as Record<string, unknown>) || {};

    const event: AuditEvent = {
      id,
      timestamp,
      eventType: eventInput.eventType,
      resourceId: eventInput.resourceId,
      resourceName: eventInput.resourceName,
      outcome: eventInput.outcome,
      severity: eventInput.severity || (eventInput.outcome === "failure" ? "error" : "info"),
      actor: eventInput.actor || "User",
      details: cleanDetails,
    };

    // Prepend latest event
    this.inMemoryCache.unshift(event);

    // Apply retention cap
    if (this.inMemoryCache.length > this.maxEventsLimit) {
      this.inMemoryCache = this.inMemoryCache.slice(0, this.maxEventsLimit);
    }

    if (this.persistence) {
      try {
        this.persistence.saveAuditEvents(this.inMemoryCache);
      } catch (e) {
        // Safe error handling: audit persistence failure must not crash host application
        console.error("Failed to persist audit event:", e);
      }
    }

    return event;
  }

  /**
   * Lists all audit events matching optional search and filter criteria.
   */
  async list(filters?: AuditFilters): Promise<AuditEvent[]> {
    let result = [...this.inMemoryCache];

    if (!filters) return result;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.resourceName.toLowerCase().includes(q) ||
          e.resourceId.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          JSON.stringify(e.details).toLowerCase().includes(q)
      );
    }

    if (filters.eventType && filters.eventType !== "all") {
      result = result.filter((e) => e.eventType.startsWith(filters.eventType!));
    }

    if (filters.outcome && filters.outcome !== "all") {
      result = result.filter((e) => e.outcome === filters.outcome);
    }

    if (filters.resourceId) {
      result = result.filter((e) => e.resourceId === filters.resourceId);
    }

    if (filters.severity && filters.severity !== "all") {
      result = result.filter((e) => e.severity === filters.severity);
    }

    if (filters.startDate) {
      const startMs = new Date(filters.startDate).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() >= startMs);
    }

    if (filters.endDate) {
      const endMs = new Date(filters.endDate).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() <= endMs);
    }

    return result;
  }

  /**
   * Gets an audit event by ID.
   */
  async get(id: string): Promise<AuditEvent | undefined> {
    return this.inMemoryCache.find((e) => e.id === id);
  }

  /**
   * Seeds sample audit activity events for initial demo and visual verification.
   */
  seedEvents(events: AuditEvent[]): void {
    this.inMemoryCache = [...events];
    if (this.persistence) {
      try {
        this.persistence.saveAuditEvents(this.inMemoryCache);
      } catch {
        // Safe fallback
      }
    }
  }

  /**
   * Clears audit log (protected action).
   */
  async clear(): Promise<void> {
    this.inMemoryCache = [];
    if (this.persistence) {
      try {
        this.persistence.saveAuditEvents([]);
      } catch {
        // Safe fallback
      }
    }
  }
}
