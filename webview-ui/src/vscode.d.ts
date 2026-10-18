declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState<T>(): T;
  setState(state: unknown): void;
};
