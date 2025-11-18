import * as vscode from 'vscode';

/**
 * Code Lens Provider for TypeLens
 * Shows "Inspect Type" lens above type definitions
 */
export class TypeLensCodeLensProvider implements vscode.CodeLensProvider {
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  /**
   * Provide code lenses for type definitions
   */
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (document.languageId !== 'typescript' && document.languageId !== 'typescriptreact') {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Find type/interface definitions (支持缩进)
    const typeDefRegex = /^\s*(export\s+)?(type|interface|class|enum)\s+(\w+)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip comments
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        continue;
      }
      
      const match = typeDefRegex.exec(line);

      if (match) {
        const typeName = match[3];
        const range = new vscode.Range(i, 0, i, line.length);

        // Add "Inspect Type" lens
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: `🔍 Inspect ${typeName}`,
            tooltip: 'Open type in TypeLens Inspector',
            command: 'typelens.inspectType',
            arguments: [],
          })
        );
      }
    }

    return codeLenses;
  }

  /**
   * Refresh code lenses
   */
  refresh(): void {
    this.onDidChangeCodeLensesEmitter.fire();
  }
}
