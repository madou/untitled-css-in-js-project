import type { NodePath } from '@babel/core';
import * as t from '@babel/types';

import type { Metadata } from '../types';
import { buildCompiledCloneElement } from '../utils/build-compiled-component';
import { buildCss } from '../utils/css-builders';
import { getRuntimeClassNameLibrary } from '../utils/get-runtime-class-name-library';
import { resolveIdentifierComingFromDestructuring } from '../utils/resolve-binding';
import { transformCssItems } from '../utils/transform-css-items';
import type { CSSOutput } from '../utils/types';

/**
 * Extracts styles from an expression.
 *
 * @param path Expression node
 */
const extractStyles = (path: NodePath<t.Expression>): t.Expression[] | t.Expression | undefined => {
  if (
    t.isCallExpression(path.node) &&
    t.isIdentifier(path.node.callee) &&
    path.node.callee.name === 'css' &&
    t.isExpression(path.node.arguments[0])
  ) {
    // css({}) call
    const styles = path.node.arguments as t.Expression[];
    return styles;
  }

  if (
    t.isCallExpression(path.node) &&
    t.isIdentifier(path.node.callee) &&
    t.isExpression(path.node.arguments[0]) &&
    path.scope.hasOwnBinding(path.node.callee.name)
  ) {
    const binding = path.scope.getBinding(path.node.callee.name)?.path.node;

    if (
      !!resolveIdentifierComingFromDestructuring({ name: 'css', node: binding as t.Expression })
    ) {
      // c({}) rename call
      const styles = path.node.arguments as t.Expression[];
      return styles;
    }
  }

  if (t.isCallExpression(path.node) && t.isMemberExpression(path.node.callee)) {
    if (
      t.isIdentifier(path.node.callee.property) &&
      path.node.callee.property.name === 'css' &&
      t.isExpression(path.node.arguments[0])
    ) {
      // props.css({}) call
      const styles = path.node.arguments as t.Expression[];
      return styles;
    }
  }

  if (t.isTaggedTemplateExpression(path.node)) {
    const styles = path.node.quasi;
    return styles;
  }

  return undefined;
};

/**
 * Takes a React.cloneElement invocation and transforms it into a compiled component.
 * This method will traverse the AST twice,
 * once to replace all calls to `css`,
 * and another to replace `style` usage.
 *
 * `React.cloneElement(<Component />, { css: {} })`
 *
 * @param path {NodePath} The opening JSX element
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const visitCloneElementPath = (path: NodePath<t.CallExpression>, meta: Metadata): void => {
  // if props contains a `css` prop, we need to transform it.
  const props = path.node.arguments[1];

  if (props.type !== 'ObjectExpression') {
    // TODO: handle this case properly
    console.error('cloneElement props are not an ObjectExpression');
    return;
  }

  const collectedVariables: CSSOutput['variables'] = [];
  const collectedSheets: string[] = [];

  // First pass to replace all usages of `css({})`
  path.traverse({
    CallExpression(path) {
      const styles = extractStyles(path);

      if (!styles) {
        // Nothing to do - skip.
        return;
      }

      const builtCss = buildCss(styles, meta);
      const { sheets, classNames } = transformCssItems(builtCss.css, meta);

      collectedVariables.push(...builtCss.variables);
      collectedSheets.push(...sheets);

      path.replaceWith(
        t.callExpression(t.identifier(getRuntimeClassNameLibrary(meta)), [
          t.arrayExpression(classNames),
        ])
      );

      // find ancestor cloneElement callExpression
      const ancestorPath = path.findParent(
        (p) =>
          (p.isCallExpression() &&
            t.isIdentifier(p.node.callee) &&
            p.node.callee.name === meta.state.reactImports?.cloneElement) ||
          (p.isCallExpression() &&
            t.isMemberExpression(p.node.callee) &&
            t.isIdentifier(p.node.callee.property) &&
            p.node.callee.property.name === 'cloneElement')
      ) as NodePath<t.CallExpression>;

      if (!ancestorPath) {
        return;
      }

      ancestorPath.replaceWith(buildCompiledCloneElement(ancestorPath.node, builtCss, meta));
    },
  });
};
