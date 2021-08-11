import { ImportDeclaration, JSCodeshift, ASTNode } from 'jscodeshift';

// We want to ensure the config contract is correct so devs can get type safety
type ValidateConfig<T, Struct> = T extends Struct
  ? Exclude<keyof T, keyof Struct> extends never
    ? T
    : never
  : never;

export interface PluginMetadata {
  name: string;
}

type BaseConfig = { processedPlugins: Array<PluginMetadata>; j: JSCodeshift };

/**
 * Interface for codemods that handle migration from CSS-in-JS libraries to Compiled
 */
export interface MigrationTransformer {
  /**
   * Build the compiled import replacing the existing import
   *
   * @param config The configuration object
   * @param config.j The JSCodeshift object
   * @param config.currentNode The existing import node that will be replaced
   * @param config.defaultSpecifierName The import name
   * @param config.namedImport The export from Compiled to be imported
   * @param config.compiledImportPath The import path for Compiled
   *
   * @returns The import to replace config.currentNode
   */
  buildImport?<T>(
    config: ValidateConfig<
      T,
      BaseConfig & {
        originalNode: ImportDeclaration;
        currentNode: ImportDeclaration;
        defaultSpecifierName: string;
        namedImport: string;
        compiledImportPath: string;
      }
    >
  ): ImportDeclaration;

  /**
   * Insert AST nodes before the compiled import
   *
   * @param config The configuration object
   * @param config.j The JSCodeshift object
   * @param config.newImport The new import node replaced in `buildImport`
   *
   * @returns Nodes to insert before the import
   */
  insertBeforeImport?<T>(
    config: ValidateConfig<
      T,
      BaseConfig & {
        originalImport: ImportDeclaration;
        newImport: ImportDeclaration;
        currentNodes: Array<ASTNode>;
      }
    >
  ): Array<ASTNode>;

  /**
   * Insert AST nodes after the compiled import
   *
   * @param config The configuration object
   * @param config.j The JSCodeshift object
   * @param config.newImport The new import node replaced in `buildImport`
   *
   * @returns Nodes to insert after the import
   */
  insertAfterImport?<T>(
    config: ValidateConfig<
      T,
      BaseConfig & {
        originalImport: ImportDeclaration;
        newImport: ImportDeclaration;
        currentNodes: Array<ASTNode>;
      }
    >
  ): Array<ASTNode>;
}

export interface CodemodPlugin {
  metadata: PluginMetadata;
  migrationTransform?: MigrationTransformer;
}

export type RequiredCodemodPlugin = Required<
  {
    [K in keyof CodemodPlugin]: Required<CodemodPlugin[K]>;
  }
>;
