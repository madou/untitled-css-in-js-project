import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

import type { State } from '../types';

/**
 * Wrapper to make defining import specifiers easier.
 * If `localName` is defined it will rename the import to it,
 * e.g: `name as localName`.
 *
 * @param name import name
 * @param localName local name
 */
const importSpecifier = (name: string, localName?: string): t.ImportSpecifier => {
  return t.importSpecifier(t.identifier(name), t.identifier(localName || name));
};

const COMPILED_GUARANTEED_RUNTIME_IMPORTS = ['ix', 'CC', 'CS'];

// Runtime function `ac` is less performant than `ax`, so we only want to import `ac` if classNameCompressionMap is provided.
const AX = 'ax';
const AC = 'ac';

const INJECT_COMPILED_CSS_CALL = 'injectCompiledCss';
const INJECT_GLOBAL_CSS_CALL = 'injectGlobalCss';

const COMPILED_RUNTIME_MODULE = '@compiled/react/runtime';

/**
 * Appends runtime import to code. If it is already present, it will append import specifiers
 * to already imported declaration path else it will create fresh import declaration path
 * with runtime import specifiers.
 *
 * @param path ImportDeclaration node path
 */
export const appendRuntimeImports = (path: NodePath<t.Program>, state: State): void => {
  const COMPILED_RUNTIME_IMPORTS = [
    state.opts.classNameCompressionMap ? AC : AX,
    ...COMPILED_GUARANTEED_RUNTIME_IMPORTS,
    ...(state.compiledImports?.vanillaCss ? [INJECT_COMPILED_CSS_CALL] : []),
    ...(state.compiledImports?.globalCss ? [INJECT_GLOBAL_CSS_CALL] : []),
  ];

  // Check if we have any sibling runtime import
  const previouslyDeclaredRuntimeDeclaration = path
    .get('body')
    .find((childPath): childPath is NodePath<t.ImportDeclaration> => {
      return (
        t.isImportDeclaration(childPath.node) &&
        childPath.node.source.value === COMPILED_RUNTIME_MODULE
      );
    });

  if (previouslyDeclaredRuntimeDeclaration) {
    /**
     * Get local import name instead of imported name to handle scenario when
     * import specifier is imported as named and normal both.
     *
     * eg. import { CC as CompiledRoot, ax, CC, CS } from '@compiled/react/runtime';
     * In above example `CC` is used both as `CompiledRoot` and `CC`.
     */
    const localImportNames = previouslyDeclaredRuntimeDeclaration
      .get('specifiers')
      .map((specifier) => specifier.node.local.name);

    COMPILED_RUNTIME_IMPORTS.forEach((runtimeImportName) => {
      // Avoids duplicate imports from being appended if already present
      if (!localImportNames.includes(runtimeImportName)) {
        previouslyDeclaredRuntimeDeclaration.pushContainer(
          'specifiers',
          importSpecifier(runtimeImportName)
        );
      }
    });
  } else {
    // Add the runtime entrypoint module
    path.unshiftContainer(
      'body',
      t.importDeclaration(
        COMPILED_RUNTIME_IMPORTS.map((runtimeImportName) => importSpecifier(runtimeImportName)),
        t.stringLiteral(COMPILED_RUNTIME_MODULE)
      )
    );
  }
};
