import type { RequestMessage, ResponseMessage, MessageType } from "../types";

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState<T>(): T;
  setState(state: unknown): void;
}

function acquireApi(): VsCodeApi | undefined {
  if (typeof acquireVsCodeApi === "function") {
    return acquireVsCodeApi();
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

if (api) {
  window.addEventListener("message", (event: MessageEvent) => {
    const msg = event.data as ResponseMessage;
    if (!msg || msg.type !== "response" || !msg.requestId) return;
    const entry = pending.get(msg.requestId);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(msg.requestId);
    if (msg.ok) {
      entry.resolve(msg.data);
    } else {
      entry.reject(new Error(msg.error ?? "Request failed"));
    }
  });
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
