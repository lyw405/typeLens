import * as ts from 'typescript';

/**
 * TypeScript Language Service wrapper
 */
export class TypeScriptService {
  private languageService: ts.LanguageService | null = null;
  private program: ts.Program | null = null;

  /**
   * Initialize service with a TypeScript configuration
   */
  initialize(configPath: string): void {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      configPath.replace(/\/[^/]*$/, '')
    );

    const host: ts.LanguageServiceHost = {
      getScriptFileNames: () => parsedConfig.fileNames,
      getScriptVersion: () => '0',
      getScriptSnapshot: fileName => {
        if (!ts.sys.fileExists(fileName)) {
          return undefined;
        }
        return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName)!);
      },
      getCurrentDirectory: () => process.cwd(),
      getCompilationSettings: () => parsedConfig.options,
      getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };

    this.languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
    this.program = this.languageService.getProgram()!;
  }

  /**
   * Get TypeChecker instance
   */
  getTypeChecker(): ts.TypeChecker {
    if (!this.program) {
      throw new Error('TypeScript service not initialized');
    }
    return this.program.getTypeChecker();
  }

  /**
   * Get type at position in a file
   */
  getTypeAtPosition(fileName: string, position: number): ts.Type | undefined {
    if (!this.languageService || !this.program) {
      throw new Error('TypeScript service not initialized');
    }

    const sourceFile = this.program.getSourceFile(fileName);
    if (!sourceFile) {
      return undefined;
    }

    const node = this.findNodeAtPosition(sourceFile, position);
    if (!node) {
      return undefined;
    }

    const checker = this.getTypeChecker();
    return checker.getTypeAtLocation(node);
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
   * Get source file
   */
  getSourceFile(fileName: string): ts.SourceFile | undefined {
    return this.program?.getSourceFile(fileName);
  }

  /**
   * Get all diagnostics for a file
   */
  getDiagnostics(fileName: string): ts.Diagnostic[] {
    if (!this.languageService) {
      throw new Error('TypeScript service not initialized');
    }

    const syntacticDiagnostics = this.languageService.getSyntacticDiagnostics(fileName);
    const semanticDiagnostics = this.languageService.getSemanticDiagnostics(fileName);

    return [...syntacticDiagnostics, ...semanticDiagnostics];
  }
}
