import * as vscode from 'vscode';
import { TypeScriptServiceProvider } from '../services/tsServiceProvider';
import { WebviewManager } from '../webview/webviewManager';

/**
 * Inspect Type command
 * Shows type information in a webview panel
 */
export class InspectTypeCommand {
  private tsServiceProvider: TypeScriptServiceProvider;
  private webviewManager: WebviewManager;

  constructor(private context: vscode.ExtensionContext) {
    this.tsServiceProvider = new TypeScriptServiceProvider();
    this.webviewManager = new WebviewManager(context);
  }

  async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    const position = editor.selection.active;

    // Validate document language
    if (document.languageId !== 'typescript' && document.languageId !== 'typescriptreact') {
      vscode.window.showWarningMessage('TypeLens only works with TypeScript files');
      return;
    }

    // Show progress indicator
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'TypeLens: Getting type information...',
        cancellable: false,
      },
      async () => {
        try {
          // Get type information
          const typeInfo = await this.tsServiceProvider.getTypeAtPosition(document, position);

          if (!typeInfo) {
            vscode.window.showWarningMessage(
              'TypeLens: Could not find type information at cursor position'
            );
            return;
          }

          // Create and show webview panel
          this.webviewManager.showInspector(typeInfo);
        } catch (error) {
          console.error('Error in InspectTypeCommand:', error);
          vscode.window.showErrorMessage(
            `TypeLens: Failed to get type information: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    );
  }


}
