import { useEffect, useRef } from 'react';
import { ExtensionMessage, WebviewMessage, VSCodeAPI } from '../types/messages';

let vscodeApi: VSCodeAPI | null = null;

/**
 * Get VS Code API instance (singleton)
 */
export function getVSCodeAPI(): VSCodeAPI {
  if (!vscodeApi) {
    vscodeApi = window.acquireVsCodeApi();
  }
  return vscodeApi;
}

/**
 * Send message to extension
 */
export function postMessageToExtension(message: WebviewMessage) {
  getVSCodeAPI().postMessage(message);
}

/**
 * Hook to handle messages from extension
 */
export function useVSCodeMessage(handler: (message: ExtensionMessage) => void) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const messageHandler = (event: MessageEvent<ExtensionMessage>) => {
      handlerRef.current(event.data);
    };

    window.addEventListener('message', messageHandler);

    // Notify extension that webview is ready
    postMessageToExtension({ type: 'ready' });

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);
}
