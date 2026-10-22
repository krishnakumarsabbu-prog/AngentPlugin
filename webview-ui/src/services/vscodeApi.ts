import type { RequestMessage, ResponseMessage, MessageType } from "../types";

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState<T>(): T;
  setState(state: unknown): void;
}

function acquireApi(): VsCodeApi | undefined {
  if (typeof (window as unknown as { __vscodeApi?: VsCodeApi }).__vscodeApi !== "undefined") {
    return (window as unknown as { __vscodeApi?: VsCodeApi }).__vscodeApi;
  }
  if (typeof acquireVsCodeApi === "function") {
    const instance = acquireVsCodeApi();
    (window as unknown as { __vscodeApi?: VsCodeApi }).__vscodeApi = instance;
    return instance;
  }
  return undefined;
}

let api: VsCodeApi | undefined;
try {
  api = acquireApi();
} catch {
  api = undefined;
}

const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const pushListeners = new Map<string, Set<(data: any) => void>>();

if (typeof window !== "undefined") {
  window.addEventListener("message", (event: MessageEvent) => {
    const raw = event.data;
    if (!raw || typeof raw !== "object") return;

    if (raw.type === "response" && raw.requestId) {
      const entry = pending.get(raw.requestId);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(raw.requestId);
      if (raw.ok) {
        entry.resolve(raw.data);
      } else {
        entry.reject(new Error(raw.error ?? "Request failed"));
      }
      return;
    }

    if (raw.type && pushListeners.has(raw.type)) {
      const listeners = pushListeners.get(raw.type)!;
      for (const listener of listeners) {
        try {
          listener(raw.data);
        } catch {
          // ignore callback error
        }
      }
    }
  });
}

export function subscribeToPushEvent<T = any>(type: string, handler: (data: T) => void): () => void {
  if (!pushListeners.has(type)) {
    pushListeners.set(type, new Set());
  }
  pushListeners.get(type)!.add(handler as (data: any) => void);

  return () => {
    const set = pushListeners.get(type);
    if (set) {
      set.delete(handler as (data: any) => void);
      if (set.size === 0) pushListeners.delete(type);
    }
  };
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `req-${Date.now()}-${counter}`;
}

export function hasVsCodeApi(): boolean {
  return !!api;
}

export function sendRequest<T = unknown>(type: MessageType, payload?: unknown, timeoutMs = 8000): Promise<T> {
  if (!api) {
    return Promise.reject(new Error("VS Code API unavailable (running in browser preview)."));
  }
  const id = nextId();
  const message: RequestMessage = { type, id, payload };
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Request timed out: ${type}`));
    }, timeoutMs);
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
    api!.postMessage(message);
  });
}

export function postMessage(type: MessageType, payload?: unknown): void {
  if (!api) return;
  const message: RequestMessage = { type, id: nextId(), payload };
  api.postMessage(message);
}

export { api };
