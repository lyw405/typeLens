import * as vscode from 'vscode';
import { TypeDiffer } from '@typelens/core';
import { SerializedType, DiffResult } from '@typelens/shared';
import { TypeScriptServiceProvider } from '../services/tsServiceProvider';
import { WebviewManager } from '../webview/webviewManager';

/**
 * Compare Types command
 * Shows type diff in a webview panel
 */
export class CompareTypesCommand {
  private differ = new TypeDiffer();

  constructor(
    private context: vscode.ExtensionContext,
    private tsService: TypeScriptServiceProvider,
    private webviewManager: WebviewManager
  ) {}

  /**
   * Execute command: compare types at two cursor positions
   */
  async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    try {
      // Check if user has selected two positions
      const selections = editor.selections;

      if (selections.length === 2) {
        // User has selected two positions, compare types at these positions
        await this.compareTwoPositions(editor.document, selections[0].active, selections[1].active);
      } else {
        // Ask user to select second position
        await this.compareInteractive(editor);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to compare types: ${error}`);
    }
  }

  /**
   * Compare types at two positions
   */
  private async compareTwoPositions(
    document: vscode.TextDocument,
    position1: vscode.Position,
    position2: vscode.Position
  ): Promise<void> {
    // Get types at both positions
    const [type1, type2] = await Promise.all([
      this.tsService.getTypeAtPosition(document, position1),
      this.tsService.getTypeAtPosition(document, position2),
    ]);

    if (!type1 || !type2) {
      vscode.window.showErrorMessage('Could not get type information at selected positions');
      return;
    }

    // Compare types
    await this.showTypeDiff(type1, type2);
  }

  /**
   * Interactive mode: ask user to select second position
   */
  private async compareInteractive(editor: vscode.TextEditor): Promise<void> {
    // Get type at current position
    const currentPosition = editor.selection.active;
    const type1 = await this.tsService.getTypeAtPosition(editor.document, currentPosition);

    if (!type1) {
      vscode.window.showErrorMessage('Could not get type at current position');
      return;
    }

    // Show message to select second position
    const secondPosition = await vscode.window.showInputBox({
      prompt: 'Move cursor to second type and press Enter (or type line:character)',
      placeHolder: 'e.g., 42:10',
    });

    if (!secondPosition) {
      return;
    }

    // Parse position
    let position2: vscode.Position;
    if (secondPosition.includes(':')) {
      const [line, char] = secondPosition.split(':').map(s => parseInt(s.trim()));
      position2 = new vscode.Position(line - 1, char); // Convert to 0-based
    } else {
      // Use current cursor position
      position2 = editor.selection.active;
    }

    const type2 = await this.tsService.getTypeAtPosition(editor.document, position2);
    if (!type2) {
      vscode.window.showErrorMessage('Could not get type at second position');
      return;
    }

    await this.showTypeDiff(type1, type2);
  }

  /**
   * Compare types and show diff in webview
   */
  private async showTypeDiff(expected: SerializedType, actual: SerializedType): Promise<void> {
    // Perform diff
    const diffResult = this.differ.compare(expected.typeNode, actual.typeNode);

    // Show in webview
    await this.webviewManager.showDiff(expected, actual, diffResult);
  }

  /**
   * Compare types from error diagnostic
   * Extract expected and actual types from TypeScript error
   */
  async compareFromError(diagnostic: vscode.Diagnostic): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    // Try to extract type information from error message
    const errorMessage = diagnostic.message;
    const typeInfo = this.parseTypesFromError(errorMessage);

    if (!typeInfo) {
      vscode.window.showWarningMessage('Could not extract type information from error');
      return;
    }

    // Get actual type at error position
    const actualType = await this.tsService.getTypeAtPosition(
      editor.document,
      diagnostic.range.start
    );

    if (!actualType) {
      vscode.window.showErrorMessage('Could not get actual type at error position');
      return;
    }

    // Create expected type from error message
    const expectedType: SerializedType = {
      id: `error_expected_${Date.now()}`,
      displayName: typeInfo.expected,
      typeNode: {
        kind: 'unknown',
        name: typeInfo.expected,
      },
      filePath: editor.document.uri.fsPath,
      position: {
        line: diagnostic.range.start.line,
        character: diagnostic.range.start.character,
      },
    };

    await this.showTypeDiff(expectedType, actualType);
  }

  /**
   * Parse expected and actual types from error message
   */
  private parseTypesFromError(message: string): { expected: string; actual: string } | null {
    // Common TypeScript error patterns
    const patterns = [
      /Type '(.+?)' is not assignable to type '(.+?)'/,
      /Expected type '(.+?)' but got '(.+?)'/,
      /Argument of type '(.+?)' is not assignable to parameter of type '(.+?)'/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          actual: match[1],
          expected: match[2],
        };
      }
    }

    return null;
  }
}
