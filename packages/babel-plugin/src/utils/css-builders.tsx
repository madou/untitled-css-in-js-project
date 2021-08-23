import * as t from '@babel/types';
import generate from '@babel/generator';
import { addUnitIfNeeded, cssAfterInterpolation, cssBeforeInterpolation } from '@compiled/css';
import { kebabCase, hash } from '@compiled/utils';
import { Metadata } from '../types';
import {
  getKey,
  resolveBindingNode,
  buildCodeFrameError,
  isCompiledCSSTemplateLiteral,
  isCompiledKeyframesTaggedTemplateExpression,
  isCompiledKeyframesCallExpression,
} from './ast';
import { evaluateExpression } from './evaluate-expression';
import { CSSOutput, CssItem, LogicalCssItem } from './types';

/**
 * Will normalize the value of a `content` CSS property to ensure it has quotations around it.
 * This is done to replicate both how Styled Components behaves,
 * while not breaking how Emotion handles it.
 */
const normalizeContentValue = (value: string) => {
  if (value.charAt(0) !== '"' && value.charAt(0) !== "'") {
    return `"${value}"`;
  }

  return value;
};

/**
 * Will merge all subsequent unconditional CSS expressions together.
 *
 * Input
 *
 * ```
 * [l, u, u, l, u, u, u, u, l, u]
 * ```
 *
 * Output
 *
 * ```
 * [l, uu, l, uuuu, l, u]
 * ```
 *
 * Where `l` is a logical item,
 * and `u` is a unconditional item.
 *
 * @param arr
 */
const mergeSubsequentUnconditionalCssItems = (arr: Array<CssItem>): Array<CssItem> => {
  const items: CssItem[] = [];

  for (let index = 0; index < arr.length; index++) {
    const item = arr[index];
    if (item.type === 'unconditional') {
      // We found an unconditional. Let's iterate further and merge all subsequent ones.

      for (let subsequentIndex = index + 1; subsequentIndex < arr.length; subsequentIndex++) {
        const subsequentItem = arr[subsequentIndex];
        if (subsequentItem.type === 'unconditional') {
          item.css += subsequentItem.css;
        } else {
          break;
        }

        // Update index back to the new one which we'll start from again.
        index = subsequentIndex;
      }
    }

    items.push(item);
  }

  return items;
};

/**
 * Returns the item css.
 *
 * @param item
 */
export const getItemCss = (item: CssItem): string => {
  return item.css;
};

/**
 * Maps the css in the result to CSS rules.
 *
 * @param selector
 * @param result
 */
const toCSSRule = (selector: string, result: CSSOutput) => ({
  ...result,
  css: result.css.map((x) => ({ ...x, css: `${selector} { ${getItemCss(x)} }` })),
});

/**
 * Maps the css in the result to CSS declarations.
 *
 * @param key
 * @param result
 */
const toCSSDeclaration = (key: string, result: CSSOutput) => ({
  ...result,
  // Leave sheets as is
  css: result.css.map((x) =>
    x.type === 'sheet' ? x : { ...x, css: `${kebabCase(key)}: ${getItemCss(x)};` }
  ),
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
 * @param prev
 * @param next
 */
const callbackIfFileIncluded = (meta: Metadata, next: Metadata) => {
  if (meta.state.filename !== next.state.filename) {
    meta.state.includedFiles.push(next.state.file.loc.filename);
  }
};

/**
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
    buildCss(
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
      { type: 'sheet', css: css.map((item) => item.css).join('') },
      // Use the name of the keyframe instead of the identifier
      { type: 'unconditional', css: prefix + name + suffix },
    ],
    variables: variables,
  };
};

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
      // Don't use prop.value directly as it extracts constants from identifiers if needed.
      const { value: propValue, meta: updatedMeta } = evaluateExpression(
        prop.value as t.Expression,
        meta
      );

      callbackIfFileIncluded(meta, updatedMeta);

      const key = getKey(prop.computed ? evaluateExpression(prop.key, meta).value : prop.key);
      let value = '';

      if (t.isStringLiteral(propValue)) {
        // We've found a string literal like: `color: 'blue'`
        value = key === 'content' ? normalizeContentValue(propValue.value) : propValue.value;
      } else if (t.isNumericLiteral(propValue)) {
        // We've found a numeric literal like: `fontSize: 12`
        value = addUnitIfNeeded(key, propValue.value);
      } else if (t.isObjectExpression(propValue) || t.isLogicalExpression(propValue)) {
        // We've found either an object like `{}` or a logical expression `isPrimary && {}`.
        // We can handle both the same way as they end up resulting in a CSS rule.
        const result = toCSSRule(key, buildCss(propValue, updatedMeta));
        css.push(...result.css);
        variables.push(...result.variables);
        return;
      } else if (t.isTemplateLiteral(propValue)) {
        // We've found a template literal like: "fontSize: `${fontSize}px`"
        const result = toCSSDeclaration(key, extractTemplateLiteral(propValue, updatedMeta));
        css.push(...result.css);
        variables.push(...result.variables);
        return;
      } else if (
        isCompiledKeyframesCallExpression(propValue, updatedMeta) ||
        isCompiledKeyframesTaggedTemplateExpression(propValue, updatedMeta)
      ) {
        const result = extractKeyframes(propValue, {
          ...updatedMeta,
          prefix: `${kebabCase(key)}: `,
          suffix: ';',
        });
        css.push(...result.css);
        variables.push(...result.variables);

        return;
      } else {
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

        value = `var(${name})`;
      }

      // Time to add this key+value to the CSS string we're building up.
      css.push({ type: 'unconditional', css: `${kebabCase(key)}: ${value};` });
    } else if (t.isSpreadElement(prop)) {
      let resolvedBinding = undefined;

      if (t.isIdentifier(prop.argument)) {
        resolvedBinding = resolveBindingNode(prop.argument.name, meta);

        if (!resolvedBinding) {
          throw buildCodeFrameError('Variable could not be found', prop.argument, meta.parentPath);
        }
      }

      const { value: propValue, meta: updatedMeta } = evaluateExpression(prop.argument, meta);
      const result = buildCss(propValue, updatedMeta);

      callbackIfFileIncluded(meta, updatedMeta);

      if (resolvedBinding?.source === 'import' && result.variables.length > 0) {
        // NOTE: Currently we throw if the found CSS has any variables found from an
        // import. This is because we'd need to ensure all identifiers are added to
        // the owning file - if not done they would just error at runtime. Because
        // this isn't a required feature at the moment we're deprioritizing support
        // for this.
        throw buildCodeFrameError(
          "Identifier contains values that can't be statically evaluated",
          prop.argument,
          meta.parentPath
        );
      }

      css.push(...result.css);
      variables.push(...result.variables);
    }
  });

  return { css: mergeSubsequentUnconditionalCssItems(css), variables };
};

/**
 * Extracts CSS data from a template literal node.
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const extractTemplateLiteral = (node: t.TemplateLiteral, meta: Metadata): CSSOutput => {
  const css: CSSOutput['css'] = [];
  const variables: CSSOutput['variables'] = [];

  // quasis are the string pieces of the template literal - the parts around the interpolations.
  const literalResult = node.quasis.reduce<string>((acc, quasi, index): string => {
    const nodeExpression = node.expressions[index] as t.Expression | undefined;
    if (!nodeExpression) {
      const suffix = meta.context === 'keyframes' ? '' : ';';
      return acc + quasi.value.raw + suffix;
    }

    const { value: interpolation, meta: updatedMeta } = evaluateExpression(nodeExpression, meta);

    callbackIfFileIncluded(meta, updatedMeta);

    if (t.isStringLiteral(interpolation) || t.isNumericLiteral(interpolation)) {
      // Simple case - we can immediately inline the value.
      return acc + quasi.value.raw + interpolation.value;
    }

    if (t.isObjectExpression(interpolation) || isCompiledCSSTemplateLiteral(interpolation, meta)) {
      // We found something that looks like CSS.
      const result = buildCss(interpolation, updatedMeta);
      css.push(...result.css);
      variables.push(...result.variables);
      return acc;
    }

    if (
      isCompiledKeyframesCallExpression(interpolation, updatedMeta) ||
      isCompiledKeyframesTaggedTemplateExpression(interpolation, updatedMeta)
    ) {
      const result = extractKeyframes(interpolation, {
        ...updatedMeta,
        prefix: quasi.value.raw,
        suffix: '',
      });
      css.push(...result.css);
      variables.push(...result.variables);
      return acc;
    }

    const { expression, variableName } = getVariableDeclaratorValueForOwnPath(nodeExpression, meta);

    // Everything else is considered a catch all expression.
    // The only difficulty here is what we do around prefixes and suffixes.
    // CSS variables can't have them! So we need to move them to the inline style.
    // E.g. `font-size: ${fontSize}px` will end up needing to look like:
    // `font-size: var(--_font-size)`, with the suffix moved to inline styles
    // style={{ '--_font-size': fontSize + 'px' }}
    const name = `--_${hash(variableName)}`;
    const nextQuasis = node.quasis[index + 1];
    const before = cssBeforeInterpolation(quasi.value.raw);
    const after = cssAfterInterpolation(nextQuasis.value.raw);

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

  return {
    css: mergeSubsequentUnconditionalCssItems(css),
    variables,
  };
};

/**
 * Will return a CSS string and CSS variables array from an input node.
 *
 * @param node Node we're interested in extracting CSS from.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const buildCss = (node: t.Expression | t.Expression[], meta: Metadata): CSSOutput => {
  if (t.isStringLiteral(node)) {
    return { css: [{ type: 'unconditional', css: node.value }], variables: [] };
  }

  if (t.isTemplateLiteral(node)) {
    return extractTemplateLiteral(node, meta);
  }

  if (t.isObjectExpression(node)) {
    return extractObjectExpression(node, meta);
  }

  if (t.isIdentifier(node)) {
    const resolvedBinding = resolveBindingNode(node.name, meta);

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

    const result = buildCss(resolvedBinding.node, resolvedBinding.meta);

    if (resolvedBinding.source === 'import' && result.variables.length > 0) {
      // NOTE: Currently we throw if the found CSS has any variables found from an
      // import. This is because we'd need to ensure all identifiers are added to
      // the owning file - if not done they would just error at runtime. Because
      // this isn't a required feature at the moment we're deprioritizing support
      // for this.
      throw buildCodeFrameError(
        "Identifier contains values that can't be statically evaluated",
        node,
        meta.parentPath
      );
    }

    return result;
  }

  if (t.isArrayExpression(node) || Array.isArray(node)) {
    const css: CSSOutput['css'] = [];
    const variables: CSSOutput['variables'] = [];
    const elements = t.isArrayExpression(node) ? node.elements : node;

    elements.forEach((element) => {
      if (!t.isExpression(element)) {
        throw buildCodeFrameError(
          `${element && element.type} isn't a supported CSS type - try using an object or string`,
          t.isArrayExpression(node) ? node : element,
          meta.parentPath
        );
      }

      const result = buildCss(element, meta);
      css.push(...result.css);
      variables.push(...result.variables);
    });

    return {
      css,
      variables,
    };
  }

  if (t.isLogicalExpression(node)) {
    const expression = node.left;
    const result = buildCss(node.right, meta);
    const css = result.css.map((item) => {
      if (item.type === 'logical') {
        return {
          ...item,
          expression: t.logicalExpression(item.operator, expression, item.expression),
        };
      }

      const logicalItem: LogicalCssItem = {
        type: 'logical',
        css: item.css,
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

  if (isCompiledCSSTemplateLiteral(node, meta)) {
    return buildCss(node.quasi, meta);
  }

  throw buildCodeFrameError(
    `${node.type} isn't a supported CSS type - try using an object or string`,
    node,
    meta.parentPath
  );
};
