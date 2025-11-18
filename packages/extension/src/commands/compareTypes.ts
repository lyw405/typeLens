import * as vscode from 'vscode';

/**
 * Compare Types command
 * Shows type diff in a webview panel
 */
export class CompareTypesCommand {
  constructor(private context: vscode.ExtensionContext) {}

  async execute(): Promise<void> {
    vscode.window.showInformationMessage('Compare Types command (coming soon!)');
  }
}
