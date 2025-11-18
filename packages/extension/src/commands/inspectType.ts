import * as vscode from 'vscode';

/**
 * Inspect Type command
 * Shows type information in a webview panel
 */
export class InspectTypeCommand {
  constructor(private context: vscode.ExtensionContext) {}

  async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    const position = editor.selection.active;

    // TODO: Get type information using TypeScript service
    const typeInfo = {
      displayName: 'User',
      typeNode: {
        kind: 'object',
        children: [
          { kind: 'primitive', name: 'id', value: 'string' },
          { kind: 'primitive', name: 'name', value: 'string' },
        ],
      },
    };

    // Create and show webview panel
    const panel = vscode.window.createWebviewPanel(
      'typelensInspector',
      'TypeLens Inspector',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = this.getWebviewContent(typeInfo);
  }

  private getWebviewContent(typeInfo: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TypeLens Inspector</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .type-node {
            margin-left: 20px;
        }
        .type-name {
            color: var(--vscode-symbolIcon-classForeground);
            font-weight: bold;
        }
        .type-primitive {
            color: var(--vscode-symbolIcon-keywordForeground);
        }
    </style>
</head>
<body>
    <h2>Type Inspector</h2>
    <div class="type-display">
        <div class="type-name">${typeInfo.displayName}</div>
        <div class="type-node">
            ${this.renderTypeNode(typeInfo.typeNode)}
        </div>
    </div>
</body>
</html>`;
  }

  private renderTypeNode(node: any): string {
    if (node.kind === 'primitive') {
      return `<span class="type-primitive">${node.value}</span>`;
    }
    if (node.kind === 'object' && node.children) {
      return `<div>${node.children
        .map((child: any) => `<div>${child.name}: ${this.renderTypeNode(child)}</div>`)
        .join('')}</div>`;
    }
    return '<span>unknown</span>';
  }
}
