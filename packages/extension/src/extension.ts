import * as vscode from 'vscode';
import { InspectTypeCommand } from './commands/inspectType';
import { CompareTypesCommand } from './commands/compareTypes';
import { TypeLensCodeLensProvider } from './providers/codeLensProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('TypeLens extension is now active!');

  // Register commands
  const inspectTypeCommand = new InspectTypeCommand(context);
  const compareTypesCommand = new CompareTypesCommand(context);

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
}

export function deactivate() {
  console.log('TypeLens extension is now deactivated!');
}
