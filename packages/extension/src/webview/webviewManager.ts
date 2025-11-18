import * as vscode from 'vscode';
import * as path from 'path';
import { SerializedType, DiffResult } from '@typelens/shared';

/**
 * Manages webview panels for TypeLens
 */
export class WebviewManager {
  private panels: Map<string, vscode.WebviewPanel> = new Map();

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Create or show inspector panel
   */
  showInspector(typeInfo: SerializedType): vscode.WebviewPanel {
    const panelId = `inspector_${Date.now()}`;

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'typelensInspector',
      `TypeLens: ${typeInfo.displayName}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, '..', 'webview', 'dist')),
        ],
      }
    );

    // Set HTML content
    panel.webview.html = this.getWebviewHtml(panel.webview);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async message => {
        // Send type data once webview is ready
        if (message.type === 'ready') {
          panel.webview.postMessage({
            type: 'showType',
            data: typeInfo,
          });
        }
        // Handle other messages
        await this.handleWebviewMessage(message, panel);
      },
      undefined,
      this.context.subscriptions
    );

    // Clean up when panel is closed
    panel.onDidDispose(() => {
      this.panels.delete(panelId);
    });

    this.panels.set(panelId, panel);
    return panel;
  }

  /**
   * Create or show diff panel
   */
  showDiff(
    expected: SerializedType,
    actual: SerializedType,
    diffResult: DiffResult
  ): vscode.WebviewPanel {
    const panelId = `diff_${Date.now()}`;

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'typelensDiff',
      `TypeLens Diff: ${expected.displayName} vs ${actual.displayName}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, '..', 'webview', 'dist')),
        ],
      }
    );

    // Set HTML content
    panel.webview.html = this.getWebviewHtml(panel.webview);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async message => {
        // Send diff data once webview is ready
        if (message.type === 'ready') {
          // Convert DiffResult to TypeDiff format for webview
          const typeDiff = {
            changes: diffResult.diffs.map(d => ({
              path: d.path.join('.'),
              kind: d.kind,
              message: d.message,
              expected: d.expected,
              actual: d.actual,
            })),
          };

          panel.webview.postMessage({
            type: 'showDiff',
            data: {
              expected,
              actual,
              diff: typeDiff,
            },
          });
        }
        // Handle other messages
        await this.handleWebviewMessage(message, panel);
      },
      undefined,
      this.context.subscriptions
    );

    // Clean up when panel is closed
    panel.onDidDispose(() => {
      this.panels.delete(panelId);
    });

    this.panels.set(panelId, panel);
    return panel;
  }
  private async handleWebviewMessage(message: any, panel: vscode.WebviewPanel): Promise<void> {
    switch (message.type) {
      case 'ready':
        // Webview is ready to receive data
        console.log('Webview ready');
        break;

      case 'copyType':
        await vscode.env.clipboard.writeText(message.data.typeString);
        vscode.window.showInformationMessage('Type copied to clipboard');
        break;

      case 'jumpToDefinition':
        if (message.data.filePath && message.data.position) {
          const uri = vscode.Uri.file(message.data.filePath);
          const position = new vscode.Position(
            message.data.position.line,
            message.data.position.character
          );
          await vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(position, position),
          });
        }
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Get HTML content for webview
   */
  private getWebviewHtml(webview: vscode.Webview): string {
    const webviewDistPath = path.join(this.context.extensionPath, '..', 'webview', 'dist');

    // Get URIs for webview resources
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(webviewDistPath, 'webview.js'))
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(webviewDistPath, 'webview.css'))
    );

    // Get CSP source
    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; script-src ${cspSource};">
  <link href="${styleUri}" rel="stylesheet">
  <title>TypeLens</title>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Dispose all panels
   */
  dispose(): void {
    this.panels.forEach(panel => panel.dispose());
    this.panels.clear();
  }
}
