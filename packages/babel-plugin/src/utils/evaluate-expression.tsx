import * as t from '@babel/types';
import traverse from '@babel/traverse';

import { Metadata } from '../types';

import {
  babelEvaluateExpression,
  getMemberExpressionMeta,
  getPathOfNode,
  getValueFromObjectExpression,
  isCompiledKeyframesCallExpression,
  resolveBindingNode,
  wrapNodeInIIFE,
} from './ast';

const createResultPair = (value: t.Expression, meta: Metadata) => ({
  value,
  meta,
});

/**
 * Will look in an expression and return the actual value along with updated metadata.
 *
 * E.g: If there is an identifier called `color` that is set somewhere as `const color = 'blue'`,
 * passing the `color` identifier to this function would return `'blue'`.
 *
 * @param expression Expression we want to interrogate.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const traverseIdentifier = (expression: t.Identifier, meta: Metadata) => {
  let value: t.Node | undefined | null = undefined;
  let updatedMeta: Metadata = meta;

  const resolvedBinding = resolveBindingNode(expression.name, updatedMeta);

  if (resolvedBinding && resolvedBinding.constant && resolvedBinding.node) {
    // We recursively call get interpolation until it not longer returns an identifier or member expression
    ({ value, meta: updatedMeta } = evaluateExpression(
      resolvedBinding.node as t.Expression,
      resolvedBinding.meta
    ));
  }

  return createResultPair(value as t.Expression, updatedMeta);
};

/**
 * Will evaluate object values recursively and return the actual value along with updated metadata.
 *
 * E.g: If there is an object expression `{ x: () => 10 }`, it will evaluate and
 * return `value` as `10`.
 * @param expression Expression we want to interrogate.
 * @param accessPath An array of nested object keys
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const evaluateObjectExpression = (
  expression: t.Expression,
  accessPath: t.Identifier[],
  meta: Metadata
) => {
  let value: t.Node | undefined | null = expression;
  let updatedMeta: Metadata = meta;

  if (t.isObjectExpression(expression)) {
    const objectValue = getValueFromObjectExpression(expression, accessPath) as t.Expression;

    ({ value, meta: updatedMeta } = evaluateExpression(objectValue, updatedMeta));
  }

  return createResultPair(value, updatedMeta);
};

/**
 * Will look in an expression and return the actual value along with updated metadata.
 *
 * E.g: If there is a member expression called `colors().primary` that has identifier `colors` which
 * is set somewhere as `const colors = () => ({ primary: 'blue' })`,
 * passing the `colors` identifier to this function would return `'blue'`.
 *
 * @param expression Expression we want to interrogate.
 * @param accessPath An array of nested object keys
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const evaluateCallExpressionBindingMemberExpression = (
  expression: t.Expression,
  accessPath: t.Identifier[],
  meta: Metadata
) => {
  let value: t.Node | undefined | null = expression;
  let updatedMeta: Metadata = meta;

  if (t.isFunction(expression)) {
    ({ value, meta: updatedMeta } = evaluateExpression(expression as t.Expression, meta));

    ({ value, meta: updatedMeta } = evaluateObjectExpression(value, accessPath, updatedMeta));
  }

  return createResultPair(value, updatedMeta);
};

/**
 * Will look in an expression and return the actual value along with updated metadata.
 *
 * E.g:
 * 1. If there is a member expression called `colors.primary` that has identifier `colors` which
 * is set somewhere as `const colors = { primary: 'blue' }`,
 * passing the `colors` identifier to this function would return `'blue'`.
 *
 * 2. If there is a member expression called `colors.primary` that has identifier `colors` which
 * is set somewhere as `const colors = colorMixin();` calling another identifier
 * `const colorMixin = () => ({ primary: 'blue' })`, passing the `colors` identifier
 * to this function would return `'blue'`.
 *
 * @param expression Expression we want to interrogate.
 * @param accessPath An array of nested object keys
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const evaluateIdentifierBindingMemberExpression = (
  expression: t.Expression,
  accessPath: t.Identifier[],
  meta: Metadata
) => {
  let value: t.Node | undefined | null = expression;
  let updatedMeta: Metadata = meta;

  if (t.isObjectExpression(expression)) {
    ({ value, meta: updatedMeta } = evaluateObjectExpression(expression, accessPath, meta));
  } else if (t.isCallExpression(expression)) {
    ({ value, meta: updatedMeta } = evaluateExpression(expression, meta));
    ({ value, meta: updatedMeta } = evaluateObjectExpression(value, accessPath, updatedMeta));
  }

  return createResultPair(value, updatedMeta);
};

/**
 * Will look in an expression and return the actual value along with updated metadata.
 *
 * E.g: If there is a member expression called `colors.primary` that has identifier `color` which
 * is set somewhere as `const colors = { primary: 'blue' }`,
 * passing the `colors` identifier to this function would return `'blue'`.
 *
 * @param expression Expression we want to interrogate.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const traverseMemberExpression = (expression: t.MemberExpression, meta: Metadata) => {
  let value: t.Node | undefined | null = undefined;
  let updatedMeta: Metadata = meta;

  const { accessPath, bindingIdentifier, originalBindingType } = getMemberExpressionMeta(
    expression
  );

  if (bindingIdentifier) {
    const resolvedBinding = resolveBindingNode(bindingIdentifier.name, updatedMeta);

    if (resolvedBinding && resolvedBinding.constant && t.isExpression(resolvedBinding.node)) {
      if (originalBindingType === 'Identifier') {
        ({ value, meta: updatedMeta } = evaluateIdentifierBindingMemberExpression(
          resolvedBinding.node,
          accessPath,
          resolvedBinding.meta
        ));
      } else if (originalBindingType === 'CallExpression') {
        ({ value, meta: updatedMeta } = evaluateCallExpressionBindingMemberExpression(
          resolvedBinding.node,
          accessPath,
          resolvedBinding.meta
        ));
      }
    }
  }

  return createResultPair(value as t.Expression, updatedMeta);
};

/**
 * Will look in an expression and return the actual value along with updated metadata.
 *
 * E.g: If there was a function called `size` that is set somewhere as
 * `const size = () => 10` or `const size = function() { return 10; }` or `function size() { return 10; }`,
 * passing the `size` identifier to this function would return `10` (it will recursively evaluate).
 *
 * @param expression Expression we want to interrogate.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const traverseFunction = (expression: t.Function, meta: Metadata) => {
  let value: t.Node | undefined | null = undefined;
  let updatedMeta: Metadata = meta;

  if (t.isBlockStatement(expression.body)) {
    traverse(expression.body, {
      noScope: true,
      ReturnStatement(path) {
        const { argument } = path.node;

        if (argument) {
          ({ value, meta: updatedMeta } = evaluateExpression(argument, meta));
        }

        path.stop();
      },
    });
  } else {
    ({ value, meta: updatedMeta } = evaluateExpression(expression.body, meta));
  }

  return createResultPair(value as t.Expression, updatedMeta);
};

/**
 * Will find the function node for the call expression and wrap an IIFE around it (to avoid name collision)
 * and move all the parameters mapped to passed arguments in the IIFE's scope (own scope in this case).
 * It will also set own scope path so that when we recursively evaluate any node,
 * we will look for its binding in own scope first, then parent scope.
 *
 * @param expression Expression we want to interrogate.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const traverseCallExpression = (expression: t.CallExpression, meta: Metadata) => {
  const callee = expression.callee;
  let value: t.Node | undefined | null = undefined;
  // Make sure updatedMeta is a new object, so that when the ownPath is set, the meta does not get re-used incorrectly in
  // later parts of the AST
  let updatedMeta: Metadata = { ...meta };

  /*
    Basically flow is as follows:
    1. Get the calling function node. It can be either identifier `func('arg')` or a
       member expression `x.func('arg')`;
    2. Save the reference of function node for example `func`.
    3. Pull out its parameters.
    4. Evaluate the args of calling function `func('arg')` by traversing recursively.
    5. Loop through params, and map the args with params.
    6. Pull the params and create an IIFE around the calling function `CallExpression` which creates
       a new scope around calling function and isolates everything (We add bindings at this step by pushing into its scope).
    7. Add that IIFE node path to `ownPath`, and check only for own binding in `resolveBindingNode` function
       so that only isolated params are evaluated.
    8. In `resolveBindingNode`, if `ownPath` is not set (module traversal case or any other case), it will pick things from `parentPath`.
  */
  if (t.isExpression(callee)) {
    let functionNode = null;

    // Get func node either from `Identifier` i.e. `func('arg')` or `MemberExpression` i.e. `x.func('arg')`.
    // Right now we are only supported these 2 flavors. If we have complex case like `func('arg').fn().variable`,
    // it will not get evaluated.
    if (t.isIdentifier(callee)) {
      const resolvedBinding = resolveBindingNode(callee.name, updatedMeta);

      if (resolvedBinding && resolvedBinding.constant) {
        functionNode = resolvedBinding.node;
      }
    } else if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
      const { accessPath, bindingIdentifier } = getMemberExpressionMeta(callee);

      if (bindingIdentifier) {
        const resolvedBinding = resolveBindingNode(bindingIdentifier.name, updatedMeta);

        if (resolvedBinding && resolvedBinding.constant) {
          if (t.isObjectExpression(resolvedBinding.node)) {
            functionNode = getValueFromObjectExpression(resolvedBinding.node, accessPath);
          }
        }
      }
    }

    // Check if it is resolved
    if (functionNode && t.isFunction(functionNode)) {
      // Pull its parameters
      const { params } = functionNode;

      // Evaluate the passed args recursively
      const evaluatedArguments = expression.arguments.map(
        (argument) => evaluateExpression(argument as t.Expression, updatedMeta).value
      );

      // Get path of the call expression `func('arg')` or `x.func('arg')`
      const expressionPath = getPathOfNode(expression, updatedMeta.parentPath);
      // Create an IIFE around it and replace its path. So `func('arg')` will become `(() => func('arg'))()`
      // and `x.func('arg')` will become `(() => x.func('arg'))()`.
      // `wrappingNodePath` is the path above.
      const [wrappingNodePath] = expressionPath.replaceWith(wrapNodeInIIFE(expression));

      // Get arrowFunctionExpressionPath, which was created using the IIFE
      const arrowFunctionExpressionPath = getPathOfNode(
        wrappingNodePath.node.callee,
        wrappingNodePath as any
      );

      // Loop through the parameters. Right now only identifier `param` and object pattern `{ param }` or `{ param: p }`
      // are supported.
      params
        .filter((param) => t.isIdentifier(param) || t.isObjectPattern(param))
        .forEach((param, index) => {
          const evaluatedArgument = evaluatedArguments[index];

          // Push evaluated args and params in the IIFE's scope by created a local variable
          // `const param = 'evaluated arg value'`
          arrowFunctionExpressionPath.scope.push({
            id: param,
            init: evaluatedArgument,
            kind: 'const',
          });
        });

      // Set the `ownPath` which `resolveBindingNode` will use to check own binding for the
      // local variables we created above.
      updatedMeta.ownPath = arrowFunctionExpressionPath;
    }

    ({ value, meta: updatedMeta } = evaluateExpression(callee, updatedMeta));
  }

  return createResultPair(value as t.Expression, updatedMeta);
};

/**
 * Will look in an expression and return the actual value along with updated metadata.
 * If the expression is an identifier node (a variable) and a constant,
 * it will return the variable reference.
 *
 * E.g: If there was a identifier called `color` that is set somewhere as `const color = 'blue'`,
 * passing the `color` identifier to this function would return `'blue'`.
 *
 * This behaviour is the same for const string & numeric literals,
 * and object expressions.
 *
 * @param expression Expression we want to interrogate.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const evaluateExpression = (
  expression: t.Expression,
  meta: Metadata
): { value: t.Expression; meta: Metadata } => {
  let value: t.Node | undefined | null = undefined;
  let updatedMeta: Metadata = meta;

  // --------------
  // NOTE: We are recursively calling evaluateExpression() which is then going to try and evaluate it
  // multiple times. This may or may not be a performance problem - when looking for quick wins perhaps
  // there is something we could do better here.
  // --------------

  if (t.isIdentifier(expression)) {
    ({ value, meta: updatedMeta } = traverseIdentifier(expression, updatedMeta));
  } else if (t.isMemberExpression(expression)) {
    ({ value, meta: updatedMeta } = traverseMemberExpression(expression, updatedMeta));
  } else if (t.isFunction(expression)) {
    ({ value, meta: updatedMeta } = traverseFunction(expression, updatedMeta));
  } else if (t.isCallExpression(expression)) {
    ({ value, meta: updatedMeta } = traverseCallExpression(expression, updatedMeta));
  }

  if (
    t.isStringLiteral(value) ||
    t.isNumericLiteral(value) ||
    t.isObjectExpression(value) ||
    t.isTaggedTemplateExpression(value) ||
    // TODO this should be more generic
    (value && isCompiledKeyframesCallExpression(value, updatedMeta))
  ) {
    return createResultPair(value, updatedMeta);
  }

  if (value) {
    // If we fail to statically evaluate `value` we will return `expression` instead.
    // It's preferable to use the identifier than its result if it can't be statically evaluated.
    // E.g. say we got the result of an identifier `foo` as `bar()` -- its more preferable to return
    // `foo` instead of `bar()` for a single source of truth.
    const babelEvaluatedNode = babelEvaluateExpression(value, updatedMeta, expression);
    return createResultPair(babelEvaluatedNode, updatedMeta);
  }

  const babelEvaluatedNode = babelEvaluateExpression(expression, updatedMeta);
  return createResultPair(babelEvaluatedNode, updatedMeta);
};
