import * as vscode from 'vscode';
import * as ts from 'typescript';
import { TypeSerializer } from '@typelens/core';
import { SerializedType } from '@typelens/shared';

/**
 * TypeScript Service Provider
 * Integrates with VS Code's TypeScript language service
 */
export class TypeScriptServiceProvider {
  private static readonly TS_EXTENSION_ID = 'vscode.typescript-language-features';
  private programCache: Map<string, { program: ts.Program; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds cache TTL

  /**
   * Get type information at current cursor position
   */
  async getTypeAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<SerializedType | null> {
    try {
      // Always use our own TypeScript service for complete type information
      // VS Code API returns string representation, not structured type tree
      return await this.getTypeFromOwnService(document, position);
    } catch (error) {
      console.error('Error getting type at position:', error);
      return null;
    }
  }

  /**
   * Get type using VS Code's TypeScript extension API
   * Note: Currently not used as it returns string representation only
   * Kept for potential future use or fallback scenarios
   * @deprecated Use getTypeFromOwnService for complete type information
   */
  private async getTypeFromVSCode(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<SerializedType | null> {
    try {
      // Get hover information from TypeScript extension
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        document.uri,
        position
      );

      if (!hovers || hovers.length === 0) {
        return null;
      }

      // Extract type information from hover
      const hover = hovers[0];
      const content = hover.contents[0];
      
      if (!content || typeof content === 'string') {
        return null;
      }

      const markdown = content as vscode.MarkdownString;
      const typeInfo = this.parseTypeFromMarkdown(markdown.value);

      if (!typeInfo) {
        return null;
      }

      return {
        id: this.generateId(),
        displayName: typeInfo,
        typeNode: {
          kind: 'unknown',
          name: typeInfo,
        },
        filePath: document.uri.fsPath,
        position: {
          line: position.line,
          character: position.character,
        },
      };
    } catch (error) {
      console.warn('Failed to get type from VS Code API:', error);
      return null;
    }
  }

  /**
   * Get type using our own TypeScript service
   */
  private async getTypeFromOwnService(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<SerializedType | null> {
    try {
      const fileName = document.uri.fsPath;
      const offset = document.offsetAt(position);

      // Create or get cached TypeScript program
      const program = this.getOrCreateProgram(fileName, document.getText());
      if (!program) {
        return null;
      }

      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) {
        return null;
      }

      // Find node at position
      const node = this.findNodeAtPosition(sourceFile, offset);
      if (!node) {
        return null;
      }

      // Get type from node
      const checker = program.getTypeChecker();
      const type = checker.getTypeAtLocation(node);

      // Serialize type
      const serializer = new TypeSerializer(checker);
      const lineAndChar = sourceFile.getLineAndCharacterOfPosition(offset);
      
      return serializer.serialize(type, sourceFile, lineAndChar, {
        maxDepth: 10,
        includeSignatures: true,
        expandAliases: false,
      });
    } catch (error) {
      console.error('Failed to get type from own service:', error);
      return null;
    }
  }

  /**
   * Get or create cached TypeScript program
   */
  private getOrCreateProgram(fileName: string, content: string): ts.Program | null {
    const now = Date.now();
    const cached = this.programCache.get(fileName);

    // Return cached program if still valid
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.program;
    }

    // Create new program
    const program = this.createProgram(fileName, content);
    if (program) {
      this.programCache.set(fileName, { program, timestamp: now });
      
      // Clean up old cache entries
      this.cleanupCache(now);
    }

    return program;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(now: number): void {
    for (const [key, value] of this.programCache.entries()) {
      if (now - value.timestamp >= this.CACHE_TTL) {
        this.programCache.delete(key);
      }
    }
  }

  /**
   * Create TypeScript program for a single file
   */
  private createProgram(fileName: string, content: string): ts.Program | null {
    try {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      };

      // Create virtual file system
      const host: ts.CompilerHost = {
        getSourceFile: (name) => {
          if (name === fileName) {
            return ts.createSourceFile(name, content, ts.ScriptTarget.ES2022, true);
          }
          // Try to read from disk for imports
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const fs = require('fs');
            if (fs.existsSync(name)) {
              const fileContent = fs.readFileSync(name, 'utf-8');
              return ts.createSourceFile(name, fileContent, ts.ScriptTarget.ES2022, true);
            }
          } catch {
            // Ignore file read errors
          }
          return undefined;
        },
        getDefaultLibFileName: () => ts.getDefaultLibFilePath(options),
        writeFile: () => {},
        getCurrentDirectory: () => process.cwd(),
        getDirectories: () => [],
        fileExists: () => true,
        readFile: () => '',
        getCanonicalFileName: (name) => name,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n',
      };

      return ts.createProgram([fileName], options, host);
    } catch (error) {
      console.error('Failed to create TypeScript program:', error);
      return null;
    }
  }

  /**
   * Find AST node at position
   */
  private findNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
    function find(node: ts.Node): ts.Node | undefined {
      if (position >= node.getStart() && position < node.getEnd()) {
        return ts.forEachChild(node, find) || node;
      }
      return undefined;
    }
    return find(sourceFile);
  }

  /**
   * Parse type information from markdown hover content
   */
  private parseTypeFromMarkdown(markdown: string): string | null {
    // Try to extract type from code blocks
    const codeBlockMatch = markdown.match(/```typescript\s*\n(.*?)\n```/s);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to extract from inline code
    const inlineCodeMatch = markdown.match(/`([^`]+)`/);
    if (inlineCodeMatch) {
      return inlineCodeMatch[1].trim();
    }

    return null;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `type_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if TypeScript extension is available
   */
  async isTypeScriptExtensionAvailable(): Promise<boolean> {
    const extension = vscode.extensions.getExtension(TypeScriptServiceProvider.TS_EXTENSION_ID);
    return extension !== undefined;
  }
}
