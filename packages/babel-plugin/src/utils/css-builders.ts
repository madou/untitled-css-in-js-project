import generate from '@babel/generator';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { addUnitIfNeeded, cssAffixInterpolation } from '@compiled/css';
import { hash, kebabCase } from '@compiled/utils';

import { visitCssMapPath } from '../css-map';
import type { Metadata } from '../types';

import { buildCodeFrameError } from './ast';
import { CONDITIONAL_PATHS } from './constants';
import { createErrorMessage, ErrorMessages } from './css-map';
import { evaluateExpression } from './evaluate-expression';
import {
  isCompiledCSSCallExpression,
  isCompiledCSSMapCallExpression,
  isCompiledCSSTaggedTemplateExpression,
  isCompiledKeyframesCallExpression,
  isCompiledKeyframesTaggedTemplateExpression,
} from './is-compiled';
import { isEmptyValue } from './is-empty';
import {
  isQuasiMidStatement,
  hasNestedTemplateLiteralsWithConditionalRules,
  optimizeConditionalStatement,
  recomposeTemplateLiteral,
} from './manipulate-template-literal';
import {
  objectPropertyToString,
  expressionToString,
  canBeStaticallyConcatenated,
} from './object-property-to-string';
import { resolveBinding } from './resolve-binding';
import type {
  CSSOutput,
  CssItem,
  LogicalCssItem,
  SheetCssItem,
  CssMapItem,
  PartialBindingWithMeta,
} from './types';

/**
 * Retrieves the leftmost identity from a given expression.
 *
 * For example:
 * Given a member expression "colors.primary.500", the function will return "colors".
 *
 * @param expression The expression to be evaluated.
 * @returns {string} The leftmost identity in the expression.
 */
const findBindingIdentifier = (
  expression: t.Expression | t.V8IntrinsicIdentifier
): t.Identifier | undefined => {
  if (t.isIdentifier(expression)) {
    return expression;
  } else if (t.isCallExpression(expression)) {
    return findBindingIdentifier(expression.callee);
  } else if (t.isMemberExpression(expression)) {
    return findBindingIdentifier(expression.object);
  }

  return undefined;
};

/**
 * Will normalize the value of a `content` CSS property to ensure it has quotations around it,
 * but only when we reasonably think that they were intended. For example, url(...) and counter(...)
 * will NOT have quotes added around them.
 */
const normalizeContentValue = (value: string) => {
  // Adapted from vanilla-extract's handling of the `content` key
  // https://github.com/vanilla-extract-css/vanilla-extract/blob/a623c1c65a543afcedb9feb30a7fe20452b99a95/packages/css/src/transformCss.ts#L266
  const contentValuePattern =
    /^([A-Za-z\-]+\([^]*|[^]*-quote|inherit|initial|none|normal|revert|unset)(\s|$)/;

  if (!value) {
    return `""`;
  }

  if (value.includes('"') || value.includes("'") || contentValuePattern.test(value)) {
    return value;
  }

  return `"${value}"`;
};

/**
 * Will merge all subsequent unconditional CSS expressions together.
 *
 * Input
 *
 * ```
 * [l, u, u, l, u, s, u, u, u, l, u]
 * ```
 *
 * Output
 *
 * ```
 * [s, l, uu, l, uuuu, l, u]
 * ```
 *
 * Where: `l` is a logical item,
 *        `u` is a unconditional item,
 *        `s` is a sheet
 *
 * @param arr
 */
const mergeSubsequentUnconditionalCssItems = (arr: CssItem[]): CssItem[] => {
  const items: Exclude<CssItem, SheetCssItem>[] = [];
  const sheets: SheetCssItem[] = [];

  for (let index = 0; index < arr.length; index++) {
    const item = arr[index];

    if (item.type === 'sheet') {
      sheets.push(item);
      continue;
    }

    if (item.type === 'unconditional') {
      // We found an unconditional. Let's iterate further and merge all subsequent ones.

      for (let subsequentIndex = index + 1; subsequentIndex < arr.length; subsequentIndex++) {
        const subsequentItem = arr[subsequentIndex];
        if (subsequentItem.type === 'unconditional') {
          item.css += subsequentItem.css;
        } else if (subsequentItem.type === 'sheet') {
          sheets.push(subsequentItem);
        } else {
          break;
        }

        // Update index back to the new one which we'll start from again.
        index = subsequentIndex;
      }
    }

    items.push(item);
  }

  return [...sheets, ...items];
};

/**
 * Returns the item css.
 *
 * @param item
 */
export const getItemCss = (item: CssItem): string => {
  return item.type === 'conditional'
    ? [item.consequent, item.alternate].map(getItemCss).join('')
    : item.css;
};

/**
 * Returns the logical item from a conditional expression.
 *
 * @param css
 * @param node
 * @param type
 */
const getLogicalItemFromConditionalExpression = (
  css: CSSOutput['css'],
  node: t.ConditionalExpression,
  type: string
) => {
  const expression = node.test;
  return css.map((item) => {
    if (item.type === 'conditional') {
      return item;
    }

    if (item.type === 'logical') {
      return {
        ...item,
        expression: t.logicalExpression(item.operator, expression, item.expression),
      };
    }

    /**
     * Ensure that the CSS declarations in the alternate mixin are not evaluated as
     * unconditional rules.
     * Eg ${(props) => (props.isPrimary ? primary : secondary)}; where primary is
     * the consequent node and secondary is the alternate node
     * -> primary mixin will be applied only when props.isPrimary
     * -> secondary mixin will be applied only when !props.isPrimary
     *  */
    const alternateExpression = t.unaryExpression('!', expression);

    const logicalItem: LogicalCssItem = {
      type: 'logical',
      css: getItemCss(item),
      expression: type === 'consequent' ? expression : alternateExpression,
      operator: '&&',
    };

    return logicalItem;
  });
};

/**
 * Recursive helper function for toCSSRule to handle conditional CssItems
 *
 * @param selector
 * @param item
 */
const toCSSRuleInternal = (selector: string, item: CssItem): CssItem =>
  item.type === 'conditional'
    ? {
        ...item,
        consequent: toCSSRuleInternal(selector, item.consequent),
        alternate: toCSSRuleInternal(selector, item.alternate),
      }
    : { ...item, css: `${selector} { ${getItemCss(item)} }` };

/**
 * Maps the css in the result to CSS rules.
 *
 * @param selector
 * @param result
 */
const toCSSRule = (selector: string, result: CSSOutput) => ({
  ...result,
  css: result.css.map((item): CssItem => toCSSRuleInternal(selector, item)),
});

/**
 * Recursive helper function for toCSSDeclaration to handle conditional CssItems
 *
 * @param key
 * @param items
 */
const toCSSDeclarationInternal = (key: string, item: CssItem): CssItem => {
  if (item.type === 'sheet') {
    // Leave sheets as is
    return item;
  } else if (item.type === 'conditional') {
    // Handle conditional branches
    return {
      ...item,
      consequent: toCSSDeclarationInternal(key, item.consequent),
      alternate: toCSSDeclarationInternal(key, item.alternate),
    };
  } else {
    return { ...item, css: `${kebabCase(key)}: ${getItemCss(item)};` };
  }
};

/**
 * Maps the css in the result to CSS declarations.
 *
 * @param key
 * @param result
 */
const toCSSDeclaration = (key: string, result: CSSOutput) => ({
  ...result,
  css: result.css.map((item): CssItem => toCSSDeclarationInternal(key, item)),
});

/**
 * Will return the variable declarator value node from meta's own path.
 * It will compare the variable declarator node id's name with passed node name and
 * returns its stringified value along with the node.
 *
 * Eg.
 * 1. If passed node is an Identifier with name `abcd` and somewhere in own path
 * we have any variable declarator `const abcd = obj.value`, it will return
 * stringified `obj.value` along with node `obj.value`.
 * Input: `node: const abcd = obj.value`
 * Output: `{ variableName: 'obj.value', expression: Expression // obj.value Expression  }`

 * 2. If variable declarator's value is undefined `const abcd = undefined`, it will
 * return stringified `abcd` along with undefined.
 * Input: `node: const abcd = undefined`
 * Output: `{ variableName: 'abcd', expression: undefined  }`
 *
 * @param node
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const getVariableDeclaratorValueForOwnPath = (node: t.Expression, meta: Metadata) => {
  // Will give stringified code for the node. If node is a function it will stringified 'function(){}'
  let expression = node;
  let variableName = generate(node).code;

  // Traverse variable declarator. If its value is not undefined/null return it along with
  // its stringified value otherwise return undefined/null along with stringified
  // variable name.
  meta.ownPath?.traverse({
    VariableDeclarator(path) {
      if (t.isIdentifier(node) && t.isIdentifier(path.node.id, { name: node.name })) {
        const { init } = path.node;

        expression = init as t.Expression;

        if (meta.context === 'keyframes') {
          // When in the keyframes context, we want to reuse the generated CSS variables as much as possible.
          // We will do this by using the original node, and namespacing it with the keyframe name.
          variableName = `${meta.keyframe}:${node.name}`;
        } else {
          // Get stringified value or original variable name
          variableName = init ? generate(init).code : node.name;
        }

        path.stop();
      }
    },
  });

  return {
    expression,
    variableName,
  };
};

/**
 * Will callback if the filenames from metadata do not match,
 * meaning the next meta imported from another module and was statically evaluated.
 *
 * @param meta {Metadata} The current metadata to use for the comparison
 * @param next {Metadata} The next metadata to use for the comparison
 */
const callbackIfFileIncluded = (meta: Metadata, next: Metadata) => {
  if (meta.state.filename !== next.state.filename) {
    meta.state.includedFiles.push(next.state.file.loc.filename);
  }
};

/**
 * Check if an imported binding resulted in CSS variables after processing.
 *
 * Currently we throw if the found CSS has any variables found from an import
 * This is because we'd need to ensure all identifiers are added to the owning
 * file - if not done they would just error at runtime. Because this isn't a
 * required feature at the moment we're deprioritizing support for this.
 */
const assertNoImportedCssVariables = (
  referenceNode: t.Node,
  meta: Metadata,
  resolvedBinding: PartialBindingWithMeta,
  buildCssResult: CSSOutput
) => {
  if (resolvedBinding.source === 'import' && buildCssResult.variables.length > 0) {
    throw buildCodeFrameError(
      "Identifier contains values that can't be statically evaluated",
      referenceNode,
      meta.parentPath
    );
  }
};

/**
 * Extracts CSS data from a conditional expression node.
 * Eg. props.isPrimary && props.isBolded ? ({ color: 'blue' }) : ({ color: 'red'})
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const extractConditionalExpression = (node: t.ConditionalExpression, meta: Metadata): CSSOutput => {
  const css: CSSOutput['css'] = [];
  const variables: CSSOutput['variables'] = [];

  const [consequentCss, alternateCss] = CONDITIONAL_PATHS.map((path) => {
    const pathNode = node[path];
    let cssOutput: CSSOutput | undefined;

    if (
      t.isObjectExpression(pathNode) ||
      // Check if string or template resembles CSS `property: value`
      (t.isStringLiteral(pathNode) && pathNode.value.includes(':')) ||
      (t.isTemplateLiteral(pathNode) &&
        pathNode.quasis.some((quasi) => quasi.value.raw.includes(':'))) ||
      // CSS tagged templates are already expected to be valid declarations
      isCompiledCSSTaggedTemplateExpression(pathNode, meta.state) ||
      isCompiledCSSCallExpression(pathNode, meta.state)
    ) {
      cssOutput = buildCssInternal(pathNode, meta);
    } else if (t.isIdentifier(pathNode)) {
      const resolved = resolveBinding(pathNode.name, meta, evaluateExpression);

      if (
        resolved &&
        t.isExpression(resolved.node) &&
        (isCompiledCSSTaggedTemplateExpression(resolved.node, resolved.meta.state) ||
          isCompiledCSSCallExpression(resolved.node, resolved.meta.state))
      ) {
        cssOutput = buildCssInternal(resolved.node, resolved.meta);
        assertNoImportedCssVariables(pathNode, meta, resolved, cssOutput);
      }
    } else if (t.isConditionalExpression(pathNode)) {
      cssOutput = extractConditionalExpression(pathNode, meta);
    } else if (t.isMemberExpression(pathNode)) {
      cssOutput = extractMemberExpression(pathNode, meta, false);
    }

    if (cssOutput) {
      variables.push(...cssOutput.variables);

      const mergedOutput = mergeSubsequentUnconditionalCssItems(cssOutput.css);
      const sheetItems: SheetCssItem[] = [];
      const nonSheetItems: Exclude<CssItem, SheetCssItem>[] = [];

      for (const cssItem of mergedOutput) {
        if (cssItem.type === 'sheet') {
          sheetItems.push(cssItem);
        } else {
          nonSheetItems.push(cssItem);
        }
      }

      if (nonSheetItems.length > 1) {
        // Each branch should evaluate down to a single logical or unconditional CSS Item.
        throw buildCodeFrameError(
          'Conditional branch contains unexpected expression',
          node,
          meta.parentPath
        );
      }

      return { sheetItems, nonSheetItems: nonSheetItems[0] };
    }

    return undefined;
  });

  if (consequentCss?.nonSheetItems && alternateCss?.nonSheetItems) {
    css.push(...consequentCss.sheetItems, ...alternateCss.sheetItems, {
      type: 'conditional',
      test: node.test,
      consequent: consequentCss.nonSheetItems,
      alternate: alternateCss.nonSheetItems,
    });
  } else if (consequentCss) {
    css.push(
      ...consequentCss.sheetItems,
      // convert single-sided conditional into logical statements
      ...getLogicalItemFromConditionalExpression([consequentCss.nonSheetItems], node, 'consequent')
    );
  } else if (alternateCss) {
    css.push(
      ...alternateCss.sheetItems,
      ...getLogicalItemFromConditionalExpression([alternateCss.nonSheetItems], node, 'alternate')
    );
  }

  return { css, variables };
};

/**
 * Extracts CSS data from a logical expression node.
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const extractLogicalExpression = (node: t.ArrowFunctionExpression, meta: Metadata): CSSOutput => {
  const variables: CSSOutput['variables'] = [];
  const css: CSSOutput['css'] = [];

  if (t.isExpression(node.body)) {
    const { value: propValue, meta: updatedMeta } = evaluateExpression(node.body, meta);
    const result = buildCssInternal(propValue, updatedMeta);

    callbackIfFileIncluded(meta, updatedMeta);

    css.push(...result.css);
    variables.push(...result.variables);
  }

  return { css: mergeSubsequentUnconditionalCssItems(css), variables };
};

/*
 * Extracts the keyframes CSS from the `@compiled/react` keyframes usage.
 *
 * @param expression {t.CallExpression | t.TaggedTemplateExpression} The keyframes declaration
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 * @returns {CSSOutput} The keyframes CSS
 */
const extractKeyframes = (
  expression: t.CallExpression | t.TaggedTemplateExpression,
  meta: Metadata & { prefix: string; suffix: string }
): CSSOutput => {
  const { prefix, suffix } = meta;

  // Keyframes cannot start with a number, so let's prefix it with a character
  const name = `k${hash(generate(expression).code)}`;
  const selector = `@keyframes ${name}`;
  const { css, variables } = toCSSRule(
    selector,
    buildCssInternal(
      t.isCallExpression(expression) ? (expression.arguments as t.Expression[]) : expression.quasi,
      { ...meta, context: 'keyframes', keyframe: name }
    )
  );

  const unexpectedCss = css.filter((item) => item.type !== 'unconditional');
  if (unexpectedCss.length) {
    throw buildCodeFrameError('Keyframes contains unexpected CSS', expression, meta.parentPath);
  }

  return {
    css: [
      { type: 'sheet', css: css.map((item) => getItemCss(item)).join('') },
      // Use the name of the keyframe instead of the identifier
      { type: 'unconditional', css: prefix + name + suffix },
    ],
    variables,
  };
};

const isCustomPropertyName = (value: string): boolean => value.startsWith('--');

/**
 * Extracts CSS data from an object expression node.
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const extractObjectExpression = (node: t.ObjectExpression, meta: Metadata): CSSOutput => {
  const css: CSSOutput['css'] = [];
  const variables: CSSOutput['variables'] = [];

  node.properties.forEach((prop) => {
    if (t.isObjectProperty(prop)) {
      const key = objectPropertyToString(prop, meta);
      // Don't use prop.value directly as it extracts constants from identifiers if needed.
      const { value: propValue, meta: updatedMeta } = evaluateExpression(
        prop.value as t.Expression,
        meta
      );

      callbackIfFileIncluded(meta, updatedMeta);

      if (t.isStringLiteral(propValue)) {
        // We've found a string literal like: `color: 'blue'`
        css.push({
          type: 'unconditional',
          css: `${isCustomPropertyName(key) ? key : kebabCase(key)}: ${
            key === 'content' ? normalizeContentValue(propValue.value) : propValue.value
          };`,
        });

        return;
      }

      if (t.isCallExpression(propValue) && canBeStaticallyConcatenated(propValue)) {
        // We're concatenating the string expression on our own, eg.: `color: 'red '.concat('blue')` => `color: 'red blue'`
        const value = expressionToString(propValue, updatedMeta);

        css.push({
          type: 'unconditional',
          css: `${isCustomPropertyName(key) ? key : kebabCase(key)}: ${
            key === 'content' ? normalizeContentValue(value) : value
          };`,
        });

        return;
      }

      if (t.isNumericLiteral(propValue)) {
        // We've found a numeric literal like: `fontSize: 12`
        css.push({
          type: 'unconditional',
          css: `${isCustomPropertyName(key) ? key : kebabCase(key)}: ${addUnitIfNeeded(
            key,
            propValue.value
          )};`,
        });

        return;
      }

      if (isEmptyValue(propValue)) {
        return;
      }

      if (t.isObjectExpression(propValue) || t.isLogicalExpression(propValue)) {
        // We've found either an object like `{}` or a logical expression `isPrimary && {}`.
        // We can handle both the same way as they end up resulting in a CSS rule.
        const result = toCSSRule(key, buildCssInternal(propValue, updatedMeta));
        css.push(...result.css);
        variables.push(...result.variables);

        return;
      }

      if (t.isTemplateLiteral(propValue)) {
        const [firstExpression] = propValue.expressions;
        let result;

        // We've found a template literal like: "fontSize: `${(props) => props.isHeading ? 20 : 14}px`"
        if (
          propValue.expressions.length === 1 &&
          t.isArrowFunctionExpression(firstExpression) &&
          t.isConditionalExpression(firstExpression.body)
        ) {
          recomposeTemplateLiteral(propValue, `${kebabCase(key)}:`, ';');
          result = extractTemplateLiteral(propValue, updatedMeta);
        } else {
          // We've found a template literal like: "fontSize: `${fontSize}px`"
          result = toCSSDeclaration(key, extractTemplateLiteral(propValue, updatedMeta));
        }

        css.push(...result.css);
        variables.push(...result.variables);

        return;
      }

      if (t.isArrowFunctionExpression(propValue)) {
        /*
          Given statments like:
          fontWeight: (props) => props.isBold ? 'bold': 'normal',
          marginTop: (props) => `${props.isLast ? 5 : 10}px`,

          Convert them to:

          `font-weight: ${(props) => props.isBold ? 'bold': 'normal'};`
          `margin-top: ${(props) => props.isLast ? 5 : 10}px;`,
        */
        const { body } = propValue;
        let optimizedStatement: t.TemplateLiteral | undefined;

        if (t.isConditionalExpression(body)) {
          optimizedStatement = t.templateLiteral(
            [
              t.templateElement({ raw: '', cooked: '' }),
              t.templateElement({ raw: '', cooked: '' }, true),
            ],
            [propValue]
          );
        } else if (t.isTemplateLiteral(body)) {
          const [firstExpression] = body.expressions;

          if (body.expressions.length === 1 && t.isConditionalExpression(firstExpression)) {
            optimizedStatement = t.templateLiteral(body.quasis, [propValue]);
            // Make conditional expression the body of the arrow function
            propValue.body = firstExpression;
          }
        }

        if (optimizedStatement) {
          recomposeTemplateLiteral(optimizedStatement, `${kebabCase(key)}:`, ';');
          const result = extractTemplateLiteral(optimizedStatement, updatedMeta);

          css.push(...result.css);
          variables.push(...result.variables);

          return;
        }
      }

      if (
        isCompiledKeyframesCallExpression(propValue, updatedMeta.state) ||
        isCompiledKeyframesTaggedTemplateExpression(propValue, updatedMeta.state)
      ) {
        const result = extractKeyframes(propValue, {
          ...updatedMeta,
          prefix: `${kebabCase(key)}: `,
          suffix: ';',
        });
        css.push(...result.css);
        variables.push(...result.variables);

        return;
      }

      const { expression, variableName } = getVariableDeclaratorValueForOwnPath(
        propValue,
        updatedMeta
      );

      // This is the catch all for any kind of expression.
      // We don't want to explicitly handle each expression node differently if we can avoid it!
      const name = `--_${hash(variableName)}`;
      variables.push({
        name,
        expression,
      });

      css.push({ type: 'unconditional', css: `${kebabCase(key)}: var(${name});` });
    } else if (t.isSpreadElement(prop)) {
      let resolvedBinding = undefined;

      if (t.isIdentifier(prop.argument)) {
        resolvedBinding = resolveBinding(prop.argument.name, meta, evaluateExpression);

        if (!resolvedBinding) {
          throw buildCodeFrameError('Variable could not be found', prop.argument, meta.parentPath);
        }
      }

      const { value: propValue, meta: updatedMeta } = evaluateExpression(prop.argument, meta);
      const result = buildCssInternal(propValue, updatedMeta);

      callbackIfFileIncluded(meta, updatedMeta);

      resolvedBinding && assertNoImportedCssVariables(prop.argument, meta, resolvedBinding, result);

      css.push(...result.css);
      variables.push(...result.variables);
    }
  });

  return { css: mergeSubsequentUnconditionalCssItems(css), variables };
};

/**
 * If we don't yet have a `meta.state.cssMap[node.name]` built yet, try to build and cache it, eg. in this scenario:
 * ```tsx
 * const Component = () => <div css={styles.root} />
 * const styles = cssMap({ root: { padding: 0 } });
 * ```
 *
 * If we don't find this is a `cssMap()` call, we put it into `ignoreMemberExpressions` to ignore on future runs.
 *
 * @returns {Boolean} Whether the cache was generated
 */
const generateCacheForCSSMap = (node: t.Identifier, meta: Metadata): void => {
  if (meta.state.cssMap[node.name] || meta.state.ignoreMemberExpressions[node.name]) {
    return;
  }

  const resolved = resolveBinding(node.name, meta, evaluateExpression);
  if (resolved && isCompiledCSSMapCallExpression(resolved.node, meta.state)) {
    let resolvedCallPath = resolved.path.get('init');
    if (Array.isArray(resolvedCallPath)) {
      resolvedCallPath = resolvedCallPath[0];
    }

    if (t.isCallExpression(resolvedCallPath.node)) {
      // This visits the cssMap path and caches the styles
      visitCssMapPath(resolvedCallPath as NodePath<t.CallExpression>, {
        context: 'root',
        state: meta.state,
        parentPath: resolved.path,
      });
    }
  }

  if (!meta.state.cssMap[node.name]) {
    // If this cannot be found, it's likely not a `cssMap` identifier and we shouldn't parse it again on future runs…
    meta.state.ignoreMemberExpressions[node.name] = true;
  }
};

/**
 * Extracts CSS data from a member expression node (eg. `styles.primary`)
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 * @param fallbackToEvaluate {Boolean} Whether to fallback to re-evaluating the expression if it's not a cssMap identifier
 */
function extractMemberExpression(
  node: t.MemberExpression,
  meta: Metadata,
  fallbackToEvaluate?: true
): CSSOutput;
function extractMemberExpression(
  node: t.MemberExpression,
  meta: Metadata,
  fallbackToEvaluate: false
): CSSOutput | undefined;
function extractMemberExpression(
  node: t.MemberExpression,
  meta: Metadata,
  fallbackToEvaluate = true
): CSSOutput | undefined {
  const bindingIdentifier = findBindingIdentifier(node);

  if (bindingIdentifier) {
    // In some cases, the `state.cssMap` is not warmed yet, so run it:
    generateCacheForCSSMap(bindingIdentifier, meta);
    if (meta.state.cssMap[bindingIdentifier.name]) {
      return {
        css: [{ type: 'map', expression: node, name: bindingIdentifier.name, css: '' }],
        variables: [],
      };
    }
  }

  if (fallbackToEvaluate) {
    const { value, meta: updatedMeta } = evaluateExpression(node, meta);
    return buildCssInternal(value, updatedMeta);
  }

  return undefined;
}

/**
 * Extracts CSS data from a template literal node.
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const extractTemplateLiteral = (node: t.TemplateLiteral, meta: Metadata): CSSOutput => {
  const css: CSSOutput['css'] = [];
  const variables: CSSOutput['variables'] = [];

  // Quasis are the string pieces of the template literal - the parts around the interpolations
  const literalResult = node.quasis.reduce<string>((acc, quasi, index): string => {
    const nodeExpression = node.expressions[index] as t.Expression | undefined;

    if (
      !nodeExpression ||
      (t.isArrowFunctionExpression(nodeExpression) && t.isLogicalExpression(nodeExpression.body))
    ) {
      const suffix = meta.context === 'keyframes' || meta.context === 'fragment' ? '' : ';';
      return acc + quasi.value.raw + suffix;
    }

    // If quasi is ending at a point where it's expecting a value from an expression
    // i.e color:
    const isMidStatement = isQuasiMidStatement(quasi);
    const doesExpressionHaveConditionalCss =
      t.isArrowFunctionExpression(nodeExpression) && t.isConditionalExpression(nodeExpression.body);

    if (
      isMidStatement &&
      doesExpressionHaveConditionalCss &&
      !hasNestedTemplateLiteralsWithConditionalRules(node, meta)
    ) {
      optimizeConditionalStatement(
        quasi,
        node.quasis[index + 1],
        nodeExpression as t.ArrowFunctionExpression
      );
    }

    const { value: interpolation, meta: updatedMeta } = evaluateExpression(nodeExpression, meta);

    callbackIfFileIncluded(meta, updatedMeta);

    if (t.isStringLiteral(interpolation) || t.isNumericLiteral(interpolation)) {
      // Simple case - we can immediately inline the value.
      return acc + quasi.value.raw + interpolation.value;
    }

    const doesExpressionContainCssBlock =
      t.isObjectExpression(interpolation) ||
      isCompiledCSSTaggedTemplateExpression(interpolation, meta.state) ||
      isCompiledCSSCallExpression(interpolation, meta.state);

    // isTemplateLiteral(nodeExpression) allows handling of expressions
    // inside template literals inside another template literals
    // e.g. the output of token function calls by @atlaskit/tokens babel plugin
    const canBuildExpressionAsCss =
      (!isMidStatement && doesExpressionContainCssBlock) ||
      doesExpressionHaveConditionalCss ||
      t.isTemplateLiteral(nodeExpression);

    if (canBuildExpressionAsCss) {
      // We found something that looks like CSS.

      const nestedTemplateLiteralMeta: Metadata = {
        context: 'fragment',
        state: updatedMeta.state,
        parentPath: updatedMeta.parentPath,
      };

      const buildCssMeta = t.isTemplateLiteral(nodeExpression)
        ? nestedTemplateLiteralMeta
        : updatedMeta;

      const result = buildCssInternal(interpolation, buildCssMeta);

      if (result.css.length) {
        // Add previous accumulative CSS first before CSS from expressions
        css.push({ type: 'unconditional', css: acc + quasi.value.raw }, ...result.css);
        variables.push(...result.variables);
        // Reset acc as we just added them
        return '';
      }
    }

    if (
      isCompiledKeyframesCallExpression(interpolation, updatedMeta.state) ||
      isCompiledKeyframesTaggedTemplateExpression(interpolation, updatedMeta.state)
    ) {
      const {
        css: [keyframesSheet, unconditionalKeyframesItem],
        variables: keyframeVariables,
      } = extractKeyframes(interpolation, {
        ...updatedMeta,
        prefix: quasi.value.raw,
        suffix: '',
      });

      css.push(keyframesSheet);
      variables.push(...keyframeVariables);
      return acc + getItemCss(unconditionalKeyframesItem);
    }

    const { expression, variableName } = getVariableDeclaratorValueForOwnPath(nodeExpression, meta);

    // Everything else is considered a catch all expression.
    // The only difficulty here is what we do around prefixes and suffixes.
    // CSS variables can't have them! So we need to move them to the inline style.
    // E.g. `font-size: ${fontSize}px` will end up needing to look like:
    // `font-size: var(--_font-size)`, with the suffix moved to inline styles
    // style={{ '--_font-size': fontSize + 'px' }}
    const nextQuasis = node.quasis[index + 1];
    const [before, after] = cssAffixInterpolation(quasi.value.raw, nextQuasis.value.raw);
    // Create a different CSS var name for negative value version
    const name = `--_${hash(variableName)}${
      before.variablePrefix === '-' ? before.variablePrefix : ''
    }`;

    // Removes any suffixes from the next quasis.
    nextQuasis.value.raw = after.css;

    variables.push({
      name,
      expression,
      prefix: before.variablePrefix,
      suffix: after.variableSuffix,
    });

    return acc + before.css + `var(${name})`;
  }, '');

  css.push({ type: 'unconditional', css: literalResult });

  // Deals with Conditional CSS Rules from Logical Expressions
  node.expressions.forEach((prop) => {
    if (t.isArrowFunctionExpression(prop)) {
      if (t.isLogicalExpression(prop.body)) {
        const { value: propValue, meta: updatedMeta } = evaluateExpression(prop.body, meta);
        const result = buildCssInternal(propValue, updatedMeta);

        callbackIfFileIncluded(meta, updatedMeta);

        css.push(...result.css);
        variables.push(...result.variables);
      }
    }
  });

  return {
    css: mergeSubsequentUnconditionalCssItems(css),
    variables,
  };
};

/**
 * Extracts CSS data from an array of expressions or arrayExpression
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const extractArray = (node: t.ArrayExpression | t.Expression[], meta: Metadata) => {
  const css: CSSOutput['css'] = [];
  const variables: CSSOutput['variables'] = [];
  const elements = Array.isArray(node) ? node : node.elements;

  elements.forEach((element) => {
    if (!t.isExpression(element)) {
      throw buildCodeFrameError(
        `${element && element.type} isn't a supported CSS type - try using an object or string`,
        Array.isArray(node) ? element : node,
        meta.parentPath
      );
    }

    const result = t.isConditionalExpression(element)
      ? extractConditionalExpression(element, meta)
      : buildCssInternal(element, meta);

    css.push(...result.css);
    variables.push(...result.variables);
  });

  return {
    css,
    variables,
  };
};

/**
 * Internal functionality to return a CSS string and CSS variables array from an input node.
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const buildCssInternal = (
  node: t.Expression | t.Expression[],
  meta: Metadata
): CSSOutput => {
  if (Array.isArray(node)) {
    return extractArray(node, meta);
  }

  if (t.isStringLiteral(node)) {
    return { css: [{ type: 'unconditional', css: node.value }], variables: [] };
  }

  if (t.isTSAsExpression(node)) {
    return buildCssInternal(node.expression, meta);
  }

  if (t.isTemplateLiteral(node)) {
    return extractTemplateLiteral(node, meta);
  }

  if (t.isObjectExpression(node)) {
    return extractObjectExpression(node, meta);
  }

  if (t.isMemberExpression(node)) {
    return extractMemberExpression(node, meta);
  }

  if (t.isArrowFunctionExpression(node)) {
    if (t.isObjectExpression(node.body)) {
      return extractObjectExpression(node.body, meta);
    }

    if (t.isLogicalExpression(node.body)) {
      return extractLogicalExpression(node, meta);
    }

    if (t.isConditionalExpression(node.body)) {
      return extractConditionalExpression(node.body, meta);
    }

    if (t.isMemberExpression(node.body)) {
      return extractMemberExpression(node.body, meta);
    }
  }

  if (t.isIdentifier(node)) {
    const resolvedBinding = resolveBinding(node.name, meta, evaluateExpression);

    if (!resolvedBinding) {
      throw buildCodeFrameError('Variable could not be found', node, meta.parentPath);
    }

    if (!t.isExpression(resolvedBinding.node)) {
      throw buildCodeFrameError(
        `${resolvedBinding.node.type} isn't a supported CSS type - try using an object or string`,
        node,
        meta.parentPath
      );
    }

    if (meta.state.cssMap[node.name]) {
      // it doesn't cover the case where styles are defined after its consumer.
      // e.g.
      // <div css={styles} />
      // const styles = cssMap({ root: { color: 'red' } });
      throw buildCodeFrameError(
        createErrorMessage(ErrorMessages.USE_VARIANT_OF_CSS_MAP),
        node,
        meta.parentPath
      );
    }

    const result = buildCssInternal(resolvedBinding.node, resolvedBinding.meta);

    assertNoImportedCssVariables(node, meta, resolvedBinding, result);

    return result;
  }

  if (t.isArrayExpression(node)) {
    return extractArray(node, meta);
  }

  if (t.isLogicalExpression(node)) {
    const expression = node.left;
    const result = buildCssInternal(node.right, meta);
    const css = result.css.map((item) => {
      if (item.type === 'logical') {
        return {
          ...item,
          expression: t.logicalExpression(item.operator, expression, item.expression),
        };
      }

      if (item.type === 'map') {
        return {
          ...item,
          expression: t.logicalExpression(node.operator, expression, item.expression),
        } as CssMapItem;
      }

      const logicalItem: LogicalCssItem = {
        type: 'logical',
        css: getItemCss(item),
        expression,
        operator: node.operator,
      };

      return logicalItem;
    });

    return {
      css,
      variables: result.variables,
    };
  }

  if (isCompiledCSSTaggedTemplateExpression(node, meta.state)) {
    return buildCssInternal(node.quasi, meta);
  }

  if (isCompiledCSSCallExpression(node, meta.state)) {
    return buildCssInternal(node.arguments[0] as t.ObjectExpression, meta);
  }

  const areCompiledAPIsEnabled =
    meta.state.compiledImports && Object.keys(meta.state.compiledImports).length > 0;

  const errorMessage = areCompiledAPIsEnabled
    ? 'try to define them statically using Compiled APIs instead'
    : "no Compiled APIs were found in scope, if you're using createStrictAPI make sure to configure importSources";

  throw buildCodeFrameError(
    `This ${node.type} was unable to have its styles extracted — ${errorMessage}`,
    node,
    meta.parentPath
  );
};

/**
 * See "indirect selector" tests in `packages/babel-plugin/src/__tests__/index.test.ts`
 * Basically, I want to select anything that's indirect and has a dynamic variable in it.
 *
 * Think `&>div{color:var(--_color)}` or `&~div{color:var(--_color)}`,
 * but not `&:hover{color:var(--_color)}` or `[data-id~="test"]{color:var(--_color)}` (which also has `~` in it)
 *
 * This isn't perfectly conclusive, but relatively high confidence.
 */
const invalidDynamicIndirectSelectorRegex = /(\+|~|\||\|\|)[^=\{]+\{[^\}]+var\(--_/;
/**
 * Will return a CSS string and CSS variables array from an input node.
 *
 * This includes some top-level error handling for invalid CSS combinations.
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const buildCss = (node: t.Expression | t.Expression[], meta: Metadata): CSSOutput => {
  const output = buildCssInternal(node, meta);

  // Check for invalid dynamic selectors
  if (
    output.css.some(
      (item) =>
        (item.type === 'unconditional' || item.type === 'conditional') &&
        invalidDynamicIndirectSelectorRegex.test(getItemCss(item))
    )
  ) {
    throw buildCodeFrameError(
      'Found a mix of an indirect selector and a dynamic variable which is unsupported with Compiled.  See: https://compiledcssinjs.com/docs/limitations#mixing-dynamic-styles-and-indirect-selectors',
      null,
      meta.parentPath
    );
  }

  return output;
};
