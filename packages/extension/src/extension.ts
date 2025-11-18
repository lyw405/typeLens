import * as vscode from 'vscode';
import { InspectTypeCommand } from './commands/inspectType';
import { CompareTypesCommand } from './commands/compareTypes';
import { TypeLensCodeLensProvider } from './providers/codeLensProvider';
import { TypeScriptServiceProvider } from './services/tsServiceProvider';
import { WebviewManager } from './webview/webviewManager';

export function activate(context: vscode.ExtensionContext) {
  console.log('TypeLens extension is now active!');

  // Initialize shared services
  const tsService = new TypeScriptServiceProvider();
  const webviewManager = new WebviewManager(context);

  // Register commands
  const inspectTypeCommand = new InspectTypeCommand(context);
  const compareTypesCommand = new CompareTypesCommand(context, tsService, webviewManager);

  context.subscriptions.push(
    vscode.commands.registerCommand('typelens.inspectType', () => inspectTypeCommand.execute()),
    vscode.commands.registerCommand('typelens.compareTypes', () => compareTypesCommand.execute())
  );

  // Register Code Lens provider
  const codeLensProvider = new TypeLensCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { language: 'typescript', scheme: 'file' },
        { language: 'typescriptreact', scheme: 'file' },
      ],
      codeLensProvider
    )
  );

  // Clean up webview manager on deactivation
  context.subscriptions.push(webviewManager);
}

export function deactivate() {
  console.log('TypeLens extension is now deactivated!');
}
