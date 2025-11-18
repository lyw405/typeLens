import { SerializedType, TypeDiff } from '@typelens/shared';

/**
 * Messages sent from Extension to Webview
 */
export type ExtensionMessage =
  | { type: 'showType'; data: SerializedType }
  | { type: 'showDiff'; data: { expected: SerializedType; actual: SerializedType; diff: TypeDiff } }
  | { type: 'updateTheme'; data: { theme: 'light' | 'dark' } }
  | { type: 'error'; data: { message: string } };

/**
 * Messages sent from Webview to Extension
 */
export type WebviewMessage =
  | { type: 'ready' }
  | {
      type: 'jumpToDefinition';
      data: { filePath?: string; position?: { line: number; character: number } };
    }
  | { type: 'copyType'; data: { typeString: string } }
  | { type: 'requestTypeAtPosition'; data: { filePath: string; line: number; character: number } };

/**
 * VS Code API interface for webview
 */
export interface VSCodeAPI {
  postMessage(message: WebviewMessage): void;
  getState(): any;
  setState(state: any): void;
}

declare global {
  interface Window {
    acquireVsCodeApi(): VSCodeAPI;
  }
}
