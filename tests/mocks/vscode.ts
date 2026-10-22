export class Uri {
  static file(fsPath: string): Uri {
    return new Uri(fsPath);
  }
  constructor(public readonly fsPath: string) {}
  toString() {
    return `file://${this.fsPath}`;
  }
}

export const workspace = {
  workspaceFolders: [] as { uri: Uri; name: string; index: number }[],
};

export const window = {
  createOutputChannel: (name: string) => ({
    name,
    appendLine: () => {},
    append: () => {},
    clear: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
  showInformationMessage: async () => {},
  showWarningMessage: async () => {},
  showErrorMessage: async () => {},
  registerWebviewViewProvider: () => ({ dispose: () => {} }),
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: async () => {},
};

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export class EventEmitter<T = unknown> {
  private listeners: ((e: T) => any)[] = [];
  event = (listener: (e: T) => any) => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        this.listeners = this.listeners.filter((l) => l !== listener);
      },
    };
  };
  fire(data: T): void {
    for (const l of this.listeners) l(data);
  }
  dispose() {}
}
