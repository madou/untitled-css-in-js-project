import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { parse } from '@babel/parser';
import fs from 'fs';
import path from 'path';
import resolve from 'resolve';
import type { Metadata } from '../types';
import type { PartialBindingWithMeta } from './types';

/**
 * Returns the nodes path including the scope of a parent.
 * @param node
 * @param parentPath
 */
export const getPathOfNode = <TNode extends unknown>(
  node: TNode,
  parentPath: NodePath
): NodePath<TNode> => {
  let foundPath: NodePath | null = null;

  traverse(
    t.expressionStatement(node as any),
    {
      enter(path) {
        foundPath = path;
        path.stop();
      },
    },
    parentPath.scope,
    undefined,
    parentPath
  );

  if (!foundPath) {
    throw parentPath.buildCodeFrameError('No path for a child node was found.');
  }

  return foundPath;
};

/**
 * Returns `true` if the expression is using `css` from `@compiled/react`.
 *
 * @param node {t.Expression} The expression that is being checked
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 * @returns {boolean} Whether the node is a css usage from compiled
 */
export const isCompiledCSSTemplateLiteral = (
  node: t.Expression,
  meta: Metadata
): node is t.TaggedTemplateExpression => {
  return (
    t.isTaggedTemplateExpression(node) &&
    t.isIdentifier(node.tag) &&
    node.tag.name === meta.state.compiledImports?.css
  );
};

/**
 * Returns `true` if the expression is using `keyframes` from `@compiled/react` as a tagged template expression.
 *
 * @param node {t.Node} The expression that is being checked
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 * @returns {boolean} Whether the node is a compiled keyframe
 */
export const isCompiledKeyframesTaggedTemplateExpression = (
  node: t.Node,
  meta: Metadata
): node is t.TaggedTemplateExpression => {
  return (
    t.isTaggedTemplateExpression(node) &&
    t.isIdentifier(node.tag) &&
    node.tag.name === meta.state.compiledImports?.keyframes
  );
};

/**
 * Returns `true` if the expression is using `keyframes` from `@compiled/react` as a call expression.
 *
 * @param node {t.Node} The expression that is being checked
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 * @returns {boolean} Whether the node is a compiled keyframe
 */
export const isCompiledKeyframesCallExpression = (
  node: t.Node,
  meta: Metadata
): node is t.CallExpression => {
  return (
    t.isCallExpression(node) &&
    t.isIdentifier(node.callee) &&
    node.callee.name === meta.state.compiledImports?.keyframes
  );
};

/**
 * Builds a code frame error from a passed in node.
 *
 * @param error
 * @param node
 * @param parentPath
 */
export const buildCodeFrameError = (
  error: string,
  node: t.Node | null,
  parentPath: NodePath<any>
): Error => {
  if (!node) {
    throw parentPath.buildCodeFrameError(error);
  }

  const startLoc = node.loc ? ` (${node.loc.start.line}:${node.loc.start.column})` : '';

  return getPathOfNode(node, parentPath).buildCodeFrameError(`${error}${startLoc}.`);
};

/**
 * Returns the binding identifier for a member expression.
 *
 * For example:
 * 1. Member expression `foo.bar.baz` will return the `foo` identifier along
 * with `originalBindingType` as 'Identifier'.
 * 2. Member expression with function call `foo().bar.baz` will return the
 * `foo` identifier along with `originalBindingType` as 'CallExpression'.
 *
 * @param expression - Member expression node.
 */
export const getMemberExpressionMeta = (
  expression: t.MemberExpression
): {
  accessPath: t.Identifier[];
  bindingIdentifier: t.Identifier | null;
  originalBindingType: t.Expression['type'];
} => {
  const accessPath: t.Identifier[] = [];
  let bindingIdentifier: t.Identifier | null = null;
  let originalBindingType: t.Expression['type'] = 'Identifier';

  if (t.isIdentifier(expression.property)) {
    accessPath.push(expression.property);
  }

  traverse(t.expressionStatement(expression), {
    noScope: true,
    MemberExpression(path) {
      if (t.isIdentifier(path.node.object)) {
        bindingIdentifier = path.node.object;
        originalBindingType = bindingIdentifier.type;
      } else if (t.isCallExpression(path.node.object)) {
        if (t.isIdentifier(path.node.object.callee)) {
          bindingIdentifier = path.node.object.callee;
          originalBindingType = path.node.object.type;
        }
      }

      if (t.isIdentifier(path.node.property)) {
        accessPath.push(path.node.property);
      }
    },
  });

  return {
    accessPath: accessPath.reverse(),
    bindingIdentifier,
    originalBindingType,
  };
};

/**
 * Will return the value of a path from an object expression.
 *
 * For example if  we take an object expression that looks like:
 * ```
 * { colors: { primary: 'red' } }
 * ```
 *
 * And a path of identifiers that looks like:
 * ```
 * [colors, primary]
 * ```
 *
 * Would result in returning the `red` string literal node.
 * If the value is not found `undefined` will be returned.
 *
 * @param expression - Member expression node.
 * @param accessPath - Access path identifiers.
 */
export const getValueFromObjectExpression = (
  expression: t.ObjectExpression,
  accessPath: t.Identifier[]
): t.Node | undefined => {
  let value: t.Node | undefined = undefined;

  traverse(expression, {
    noScope: true,
    ObjectProperty(path) {
      if (t.isIdentifier(path.node.key, { name: accessPath[0].name })) {
        if (t.isObjectExpression(path.node.value)) {
          value = getValueFromObjectExpression(path.node.value, accessPath.slice(1));
        } else {
          value = path.node.value;
        }

        path.stop();
      }
    },
  });

  return value;
};

/**
 * Will return either the name of an identifier or the value of a string literal.
 *
 * E.g:
 * - `foo` identifier node will return `"foo"`,
 * - `"bar"` string literal node will return `"bar"`.
 *
 * @param node
 */
export const getKey = (node: t.Expression): string => {
  if (t.isIdentifier(node)) {
    return node.name;
  }

  if (t.isStringLiteral(node)) {
    return node.value;
  }

  throw new Error(`${node.type} has no name.'`);
};

/**
 * Returns `true` if an identifier or any paths that reference the identifier are mutated.
 * @param path
 */
const isIdentifierReferencesMutated = (path: NodePath<t.Identifier>): boolean => {
  const binding = path.scope.getBinding(path.node.name);
  if (!binding) {
    return false;
  }

  if (!t.isVariableDeclarator(binding.path.node) || !binding.constant) {
    return true;
  }

  for (let i = 0; i < binding.referencePaths.length; i++) {
    const refPath = binding.referencePaths[i];
    const innerBinding = refPath.scope.getBinding(path.node.name);
    if (!innerBinding) {
      continue;
    }

    if (!t.isVariableDeclarator(innerBinding.path.node) || !innerBinding.constant) {
      return true;
    }
  }

  return false;
};

/**
 * Will traverse a path and its identifiers to find all bindings.
 * If any of those bindings are mutated `true` will be returned.
 *
 * @param path
 */
export const isPathReferencingAnyMutatedIdentifiers = (path: NodePath<any>): boolean => {
  if (path.isIdentifier()) {
    return isIdentifierReferencesMutated(path);
  }

  let mutated = false;
  path.traverse({
    Identifier(innerPath) {
      const result = isIdentifierReferencesMutated(path);
      if (result) {
        mutated = true;
        // No need to keep traversing - let's stop!
        innerPath.stop();
      }
    },
  });

  return mutated;
};

/**
 * Will try to statically evaluate the node.
 * If successful it will return a literal node,
 * else it will return the fallback node.
 *
 * @param node Node to evaluate
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 * @param fallbackNode Optional node to return if evaluation is not successful. Defaults to `node`.
 */
export const babelEvaluateExpression = (
  node: t.Expression,
  meta: Metadata,
  fallbackNode: t.Expression = node
): t.Expression => {
  const path = getPathOfNode(node, meta.parentPath);
  if (isPathReferencingAnyMutatedIdentifiers(path)) {
    return fallbackNode;
  }

  const result = path.evaluate();
  if (result.value) {
    switch (typeof result.value) {
      case 'string':
        return t.stringLiteral(result.value);

      case 'number':
        return t.numericLiteral(result.value);
    }
  }

  return fallbackNode;
};

const findDefaultExportModuleNode = (
  ast: t.File
): {
  foundNode: t.Node | undefined;
  foundParentPath: NodePath | undefined;
} => {
  let foundNode: t.Node | undefined = undefined;
  let foundParentPath: NodePath | undefined = undefined;

  traverse(ast, {
    ExportDefaultDeclaration(path) {
      foundParentPath = path as NodePath;
      foundNode = path.node.declaration as t.Node;
    },
  });

  return {
    foundNode,
    foundParentPath,
  };
};

const findNamedExportModuleNode = (
  ast: t.File,
  exportName: string
): {
  foundNode: t.Node | undefined;
  foundParentPath: NodePath | undefined;
} => {
  let foundNode: t.Node | undefined = undefined;
  let foundParentPath: NodePath | undefined = undefined;

  traverse(ast, {
    ExportNamedDeclaration(path) {
      if (!path.node.declaration || !t.isVariableDeclaration(path.node.declaration)) {
        return;
      }

      for (let i = 0; i < path.node.declaration.declarations.length; i++) {
        const named = path.node.declaration.declarations[i];
        if (t.isIdentifier(named.id) && named.id.name === exportName) {
          foundNode = named.init as t.Node;
          foundParentPath = path as NodePath;
          path.stop();
          break;
        }
      }
    },
  });

  return {
    foundNode,
    foundParentPath,
  };
};

/**
 * Will recursively checks if identifier name is coming from destructuring. If yes,
 * then will return the resolved identifer. We can look for identifier name
 * either in destructuring key or its value.
 *
 * @param name Identifier name to resolve
 * @param node Any Expression node
 * @param resolveFor Either resolve destructuring key or its value
 */
export const resolveIdentifierComingFromDestructuring = ({
  name,
  node,
  resolveFor = 'key',
}: {
  name: string;
  node: t.Expression | undefined;
  resolveFor?: 'key' | 'value';
}): t.ObjectProperty | undefined => {
  let resolvedDestructuringIdentifier: t.ObjectProperty | undefined;

  if (t.isObjectPattern(node)) {
    const pattern = node as t.ObjectPattern;

    return pattern.properties.find((property) => {
      if (t.isObjectProperty(property)) {
        if (resolveFor === 'key') {
          return t.isIdentifier(property.key) && property.key.name === name;
        } else if (resolveFor === 'value') {
          return t.isIdentifier(property.value) && property.value.name === name;
        }
      }

      return false;
    }) as t.ObjectProperty | undefined;
  } else if (t.isVariableDeclarator(node)) {
    const declarator = node as t.VariableDeclarator;

    resolvedDestructuringIdentifier = resolveIdentifierComingFromDestructuring({
      name,
      node: declarator.id as t.Expression,
      resolveFor,
    });
  }

  return resolvedDestructuringIdentifier;
};

/**
 * Will resolve the value `node` for identifier present inside destructuring
 * If value `node` resolves to an identifier, it will recursively search for its
 * value `node`.
 *
 * For eg.
 * 1. If there is an identifier `foo`, coming from destructuring `{ bar: foo }`
 * having value node as `{ bar: 10 }`, it will resolve to `NumericalLiteral` node `10`.
 * 2. If there is an identifier `foo`, coming from destructuring `{ baz: foo }`
 * referencing an identifier `bar` which in turn having value node as `{ baz: 10 }`,
 * it will search recursively and resolve to `NumericalLiteral` node `10`.
 *
 * @param expression Node inside which we have to resolve the value
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 * @param referenceName {string} Reference name for which `binding` to be resolved
 */
const resolveObjectPatternValueNode = (
  expression: t.Expression,
  meta: Metadata,
  referenceName: string
): t.Node | undefined => {
  let objectPatternValueNode: t.Node | undefined = undefined;

  if (t.isObjectExpression(expression)) {
    traverse(expression, {
      noScope: true,
      ObjectProperty: {
        exit(path) {
          if (t.isIdentifier(path.node.key, { name: referenceName })) {
            objectPatternValueNode = path.node.value;

            path.stop();
          }
        },
      },
    });
  } else if (t.isIdentifier(expression)) {
    const resolvedBinding = resolveBindingNode(expression.name, meta);

    if (resolvedBinding) {
      const isResolvedToSameNode = resolvedBinding.path.node === expression;

      if (
        !isResolvedToSameNode &&
        resolvedBinding.constant &&
        t.isExpression(resolvedBinding.node)
      ) {
        objectPatternValueNode = resolveObjectPatternValueNode(
          resolvedBinding.node,
          meta,
          referenceName
        );
      }
    }
  }

  return objectPatternValueNode;
};

/**
 * Will return property key if it is different from its value and its value is
 * equal to reference name for which we have to resolve binding.
 *
 * Eg. If we have something like `const { key: value } = { key: 'something' }`, and
 * reference name is `value`, it will return `key` so that it can be resolved to
 * 'something' otherwise it won't get resolved.
 * Input: `node: const { key: value } = { key: 'something' }, referenceName: 'value'`
 * Output: `'key'`
 *
 * Input: `node: const { key } = { key: 'something' }, referenceName: 'value'`
 * Output: `'value'`
 *
 * Input: `node: const { key } = { key: 'something' }, referenceName: 'key'`
 * Output: `'key'`

 * @param node Object pattern node which we have to investigate
 * @param referenceName Reference name for which `binding` to be resolved
 */
const getDestructuredObjectPatternKey = (node: t.ObjectPattern, referenceName: string): string => {
  let result = referenceName;

  for (const property of node.properties) {
    if (t.isObjectProperty(property)) {
      const keyName = t.isIdentifier(property.key) ? property.key.name : '';
      const keyValue = t.isIdentifier(property.value) ? property.value.name : '';

      if (keyName !== keyValue && keyValue === referenceName) {
        result = keyName;

        break;
      }
    }
  }

  return result;
};

/**
 * Will return the `node` of the a binding.
 * This function will follow import specifiers to return the actual `node`.
 *
 * When wanting to do further traversal on the resulting `node` make sure to use the output `meta` as well.
 * The `meta` will be for the resulting file it was found in.
 *
 * @param referenceName {string} Reference name for which `binding` to be resolved
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const resolveBindingNode = (
  referenceName: string,
  meta: Metadata
): PartialBindingWithMeta | undefined => {
  // Check binding in own scope first so that manually created scopes can be
  // evaluated first then parent scopes or scopes coming from different module.
  const binding =
    meta.ownPath?.scope.getOwnBinding(referenceName) ||
    meta.parentPath.scope.getBinding(referenceName);

  if (!binding || binding.path.isObjectPattern()) {
    // Bail early if there is no binding or its a node that we don't want to resolve
    // such as an destructured args from a function.
    return undefined;
  }

  if (t.isVariableDeclarator(binding.path.node)) {
    let node = binding.path.node.init as t.Node;

    if (t.isObjectPattern(binding.path.node.id) && t.isExpression(node)) {
      node = resolveObjectPatternValueNode(
        node,
        meta,
        getDestructuredObjectPatternKey(binding.path.node.id, referenceName)
      ) as t.Node;
    }

    return {
      meta,
      node,
      path: binding.path,
      constant: binding.constant,
      source: 'module',
    };
  }

  if (binding.path.parentPath.isImportDeclaration()) {
    // NOTE: We're skipping traversal when file name is not resolved. Imported identifier
    // will end up as a dynamic variable instead.
    if (!meta.state.filename) {
      return;
    }

    const moduleImportName = binding.path.parentPath.node.source.value;
    const isRelative = moduleImportName.charAt(0) === '.';
    const filename = isRelative
      ? path.join(path.dirname(meta.state.filename), moduleImportName)
      : moduleImportName;
    const modulePath = resolve.sync(filename, {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    });
    const moduleCode = meta.state.cache.load({
      namespace: 'read-file',
      cacheKey: modulePath,
      value: () => fs.readFileSync(modulePath, 'utf-8'),
    });

    const ast = meta.state.cache.load({
      namespace: 'parse-module',
      cacheKey: modulePath,
      value: () => parse(moduleCode, { sourceType: 'module', sourceFilename: modulePath }),
    });

    let foundNode: t.Node | undefined = undefined;
    let foundParentPath: NodePath | undefined = undefined;

    if (binding.path.isImportDefaultSpecifier()) {
      ({ foundNode, foundParentPath } = meta.state.cache.load({
        namespace: 'find-default-export-module-node',
        cacheKey: modulePath,
        value: () => findDefaultExportModuleNode(ast),
      }));
    } else if (binding.path.isImportSpecifier()) {
      const { imported } = binding.path.node;
      const exportName = t.isIdentifier(imported) ? imported.name : imported.value;

      ({ foundNode, foundParentPath } = meta.state.cache.load({
        namespace: 'find-named-export-module-node',
        cacheKey: `modulePath=${modulePath}&exportName=${exportName}`,
        value: () => findNamedExportModuleNode(ast, exportName),
      }));
    }

    if (!foundNode || !foundParentPath) {
      return undefined;
    }

    return {
      constant: binding.constant,
      node: foundNode,
      path: foundParentPath,
      source: 'import',
      meta: {
        ...meta,
        parentPath: foundParentPath,
        state: {
          ...meta.state,
          file: ast,
          filename,
        },
      },
    };
  }

  return {
    node: binding.path.node as t.Node,
    path: binding.path,
    constant: binding.constant,
    source: 'module',
    meta,
  };
};

/**
 * Will wrap BlockStatement or Expression in an IIFE,
 * Looks like (() => { return 10; })().
 *
 * @param node Node of type either BlockStatement or Expression
 */
export const wrapNodeInIIFE = (node: t.BlockStatement | t.Expression): t.CallExpression =>
  t.callExpression(t.arrowFunctionExpression([], node), []);

const tryWrappingBlockStatementInIIFE = (node: t.BlockStatement | t.Expression) =>
  t.isBlockStatement(node) ? wrapNodeInIIFE(node) : node;

/**
 * Will pick `Function` body and tries to wrap it in an IIFE if
 * its a BlockStatement otherwise returns the picked body,
 * E.g.
 * `props => props.color` would end up as `props.color`.
 * `props => { return props.color; }` would end up as `(() => { return props.color })()`
 * `function () { return props.color; }` would end up as `(function () { return props.color })()`
 *
 * @param node Node of type ArrowFunctionExpression
 */
export const pickFunctionBody = (node: t.Function): t.Expression =>
  tryWrappingBlockStatementInIIFE(node.body);
