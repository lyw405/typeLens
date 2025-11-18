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

    try {
      // Try to extract type information from error message
      const errorMessage = diagnostic.message;
      console.log('[TypeLens] Error message:', errorMessage);

      const typeInfo = this.parseTypesFromError(errorMessage);
      console.log('[TypeLens] Parsed type info:', typeInfo);

      if (!typeInfo) {
        // Fallback: Just show the actual type at error position
        const actualType = await this.tsService.getTypeAtPosition(
          editor.document,
          diagnostic.range.start
        );

        if (actualType) {
          console.log('[TypeLens] Fallback - actual type:', actualType.displayName);
          vscode.window.showInformationMessage(
            `Type at error: ${actualType.displayName}. Try inspecting this type for more details.`
          );
        } else {
          vscode.window.showWarningMessage('Could not extract type information from error');
        }
        return;
      }

      // Get actual type at error position with full type tree
      // Note: diagnostic.range.start might point to the variable name or type annotation
      // We need to find the actual value being assigned
      let actualType = await this.tsService.getTypeAtPosition(
        editor.document,
        diagnostic.range.start
      );

      if (!actualType) {
        vscode.window.showErrorMessage('Could not get actual type at error position');
        return;
      }

      // If the actual type looks like it matches the expected type name,
      // try to get the type from the value side (right side of assignment)
      if (actualType.displayName === typeInfo.expected) {
        console.log('[TypeLens] Actual type matches expected, trying to find value type');
        const actualValueType = await this.findActualValueType(
          editor.document,
          diagnostic.range.start
        );
        if (actualValueType) {
          console.log('[TypeLens] Found actual value type:', actualValueType.displayName);
          actualType = actualValueType;
        }
      }

      // For expected type, we'll try to get it from the context
      // This could be the declared type, parameter type, or return type
      let expectedType: SerializedType;

      // Try to find the expected type by looking at the declaration
      const expectedTypeAtPosition = await this.findExpectedType(
        editor.document,
        diagnostic,
        typeInfo.expected
      );

      if (expectedTypeAtPosition) {
        expectedType = expectedTypeAtPosition;
      } else {
        // Fallback: Create a simple type node from the error message
        expectedType = {
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
      }

      await this.showTypeDiff(expectedType, actualType);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to compare types from error: ${error}`);
    }
  }

  /**
   * Parse expected and actual types from error message
   */
  private parseTypesFromError(message: string): { expected: string; actual: string } | null {
    // Common TypeScript error patterns (English and Chinese)
    const patterns = [
      // English patterns
      /Type '(.+?)' is not assignable to type '(.+?)'/,
      /Expected type '(.+?)' but got '(.+?)'/,
      /Argument of type '(.+?)' is not assignable to parameter of type '(.+?)'/,
      // Chinese patterns - 使用更宽松的匹配
      /不能将类型(.+?)分配给类型(.+?)。/,
      /类型(.+?)的参数不能赋给类型(.+?)的参数/,
      /类型(.+?)缺少类型(.+?)/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        // 清理引号（移除所有类型的引号）
        const cleanType = (str: string) => {
          let cleaned = str.trim();
          // 反复移除首尾引号，直到没有引号为止
          const quotePattern = /^[""''"“”‘’]+|[""''"“”‘’]+$/g;
          let prev = '';
          while (prev !== cleaned) {
            prev = cleaned;
            cleaned = cleaned.replace(quotePattern, '');
          }
          return cleaned.trim();
        };

        console.log('[TypeLens] Before clean:', { actual: match[1], expected: match[2] });
        const result = {
          actual: cleanType(match[1]),
          expected: cleanType(match[2]),
        };
        console.log('[TypeLens] After clean:', result);
        return result;
      }
    }

    return null;
  }

  /**
   * Try to find the expected type from the context
   * For example, if the error is on a variable assignment, find the variable's declared type
   */
  private async findExpectedType(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    expectedTypeName: string
  ): Promise<SerializedType | null> {
    try {
      // 尝试在文件中查找类型定义
      const text = document.getText();

      // 查找类型别名定义：type Status = ...
      const typeAliasPattern = new RegExp(`type\\s+${expectedTypeName}\\s*=`, 'g');
      const typeAliasMatch = typeAliasPattern.exec(text);

      if (typeAliasMatch) {
        // 找到类型定义的位置
        const position = document.positionAt(
          typeAliasMatch.index + typeAliasMatch[0].indexOf(expectedTypeName)
        );

        // 使用 TypeScript Service 获取该位置的类型
        const typeAtDefinition = await this.tsService.getTypeAtPosition(document, position);

        if (typeAtDefinition) {
          console.log(
            '[TypeLens] Found expected type from definition:',
            typeAtDefinition.displayName
          );
          return typeAtDefinition;
        }
      }

      // 查找接口定义：interface Status { ... }
      const interfacePattern = new RegExp(`interface\\s+${expectedTypeName}\\s*{`, 'g');
      const interfaceMatch = interfacePattern.exec(text);

      if (interfaceMatch) {
        const position = document.positionAt(
          interfaceMatch.index + interfaceMatch[0].indexOf(expectedTypeName)
        );
        const typeAtDefinition = await this.tsService.getTypeAtPosition(document, position);

        if (typeAtDefinition) {
          console.log(
            '[TypeLens] Found expected type from interface:',
            typeAtDefinition.displayName
          );
          return typeAtDefinition;
        }
      }

      return null;
    } catch (error) {
      console.error('[TypeLens] Error finding expected type:', error);
      return null;
    }
  }

  /**
   * Find the actual value type from the assignment expression
   * For example: const x: Type = value -> get type of 'value'
   */
  private async findActualValueType(
    document: vscode.TextDocument,
    errorPosition: vscode.Position
  ): Promise<SerializedType | null> {
    try {
      const line = document.lineAt(errorPosition.line);
      const lineText = line.text;

      // 查找等号后面的值
      const equalIndex = lineText.indexOf('=');
      if (equalIndex === -1) {
        return null;
      }

      // 获取等号后面的内容
      const afterEqual = lineText.substring(equalIndex + 1);

      // 提取值（去掉分号和注释）
      const valueMatch = afterEqual.match(/^\s*(['"]\w+['"]|\w+|\d+|true|false|null|undefined)/);
      if (!valueMatch) {
        return null;
      }

      const value = valueMatch[1].trim();
      console.log('[TypeLens] Found value in code:', value);

      // 计算值的精确位置（跳过空格）
      const valueStartInLine = lineText.indexOf(value, equalIndex);
      if (valueStartInLine === -1) {
        return null;
      }

      // 如果是字符串字面量，获取引号内的内容位置
      let valuePosition: vscode.Position;
      if (value.startsWith("'") || value.startsWith('"')) {
        // 字符串字面量：定位到引号内的第一个字符
        valuePosition = new vscode.Position(errorPosition.line, valueStartInLine + 1);
      } else {
        // 其他类型：定位到值的开始
        valuePosition = new vscode.Position(errorPosition.line, valueStartInLine);
      }

      console.log(
        '[TypeLens] Getting type at position:',
        valuePosition.line,
        valuePosition.character
      );

      // 获取该位置的类型
      const valueType = await this.tsService.getTypeAtPosition(document, valuePosition);

      if (valueType) {
        console.log('[TypeLens] Got value type:', valueType.displayName);
      }

      return valueType;
    } catch (error) {
      console.error('[TypeLens] Error finding actual value type:', error);
      return null;
    }
  }
}
