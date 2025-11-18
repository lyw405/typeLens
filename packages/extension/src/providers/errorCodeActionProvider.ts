import * as vscode from 'vscode';

/**
 * Code Action Provider for TypeScript errors
 * Provides quick actions to compare types when there's a type mismatch
 */
export class TypeLensErrorCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  /**
   * TypeScript error codes that we can provide actions for
   */
  private static readonly SUPPORTED_ERROR_CODES = [
    2322, // Type 'X' is not assignable to type 'Y'
    2345, // Argument of type 'X' is not assignable to parameter of type 'Y'
    2352, // Conversion of type 'X' to type 'Y' may be a mistake
    2741, // Property 'X' is missing in type 'Y' but required in type 'Z'
    2769, // No overload matches this call
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    // Filter diagnostics to only TypeScript errors
    const diagnostics = context.diagnostics.filter(
      diagnostic => diagnostic.source === 'ts' && this.isSupportedError(diagnostic)
    );

    if (diagnostics.length === 0) {
      return undefined;
    }

    const codeActions: vscode.CodeAction[] = [];

    for (const diagnostic of diagnostics) {
      // Create code action for each error
      const action = this.createCompareTypesAction(document, diagnostic);
      if (action) {
        codeActions.push(action);
      }
    }

    return codeActions;
  }

  /**
   * Check if the diagnostic is a supported error type
   */
  private isSupportedError(diagnostic: vscode.Diagnostic): boolean {
    if (typeof diagnostic.code === 'number') {
      return TypeLensErrorCodeActionProvider.SUPPORTED_ERROR_CODES.includes(diagnostic.code);
    }

    if (
      typeof diagnostic.code === 'object' &&
      diagnostic.code !== null &&
      'value' in diagnostic.code
    ) {
      const code = (diagnostic.code as { value: number }).value;
      return TypeLensErrorCodeActionProvider.SUPPORTED_ERROR_CODES.includes(code);
    }

    return false;
  }

  /**
   * Create a code action to compare types
   */
  private createCompareTypesAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction | undefined {
    const action = new vscode.CodeAction(
      '🔍 Compare Types in TypeLens',
      vscode.CodeActionKind.QuickFix
    );

    action.diagnostics = [diagnostic];
    action.isPreferred = true;

    // Execute compareFromError command with the diagnostic
    action.command = {
      command: 'typelens.compareFromError',
      title: 'Compare Types in TypeLens',
      arguments: [diagnostic],
    };

    return action;
  }
}
