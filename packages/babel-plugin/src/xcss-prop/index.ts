import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

import type { Metadata } from '../types';
import { buildCodeFrameError, getPathOfNode } from '../utils/ast';
import { compiledTemplate } from '../utils/build-compiled-component';
import { buildCss } from '../utils/css-builders';
import { errorIfInvalidProperties } from '../utils/error-if-invalid-properties';
import { transformCssItems } from '../utils/transform-css-items';

function getJsxAttributeExpressionContainer(path?: NodePath<t.JSXAttribute>) {
  if (path?.node && t.isJSXExpressionContainer(path.node.value)) {
    return path.node.value;
  }

  return undefined;
}

function staticObjectInvariant(expression: t.ObjectExpression, meta: Metadata) {
  const path = getPathOfNode(expression, meta.parentPath);

  if (path.evaluate().confident) {
    return;
  }

  throw buildCodeFrameError(
    'Object given to the xcss prop must be static',
    expression,
    meta.parentPath
  );
}

function collectPathMemberExpressionIdentifiers(propPath: NodePath<t.JSXAttribute>): string[] {
  const identifiers: string[] = [];

  propPath.traverse({
    MemberExpression(node) {
      if (node.node.object.type === 'Identifier') {
        identifiers.push(node.node.object.name);
      }
    },
  });

  return identifiers;
}

function collectPassStyles(meta: Metadata, identifiers: string[]): string[] {
  const styles: string[] = [];

  for (const key in meta.state.cssMap) {
    if (identifiers.includes(key)) {
      styles.push(...meta.state.cssMap[key]);
    }
  }

  return styles;
}

export const visitXcssPropPath = (path: NodePath<t.JSXOpeningElement>, meta: Metadata): void => {
  if (meta.state.transformCache.has(path)) {
    // This path has been transformed so we skip.
    return;
  }

  meta.state.transformCache.set(path, true);
  const jsxElementNode = path.parentPath.node as t.JSXElement;

  const propPath = path.get('attributes').find((attr): attr is NodePath<t.JSXAttribute> => {
    if (t.isJSXAttribute(attr.node) && `${attr.node.name.name}`.toLowerCase().endsWith('xcss')) {
      return true;
    }

    return false;
  });

  const container = getJsxAttributeExpressionContainer(propPath);
  if (!propPath || !container || container.expression.type === 'JSXEmptyExpression') {
    // Nothing to do — bail out!
    return;
  }

  if (container.expression.type === 'ObjectExpression') {
    // An inline object expression has been passed, throw if it has any identifiers.
    staticObjectInvariant(container.expression, meta);

    const cssOutput = buildCss(container.expression, meta);
    const { sheets, classNames, properties } = transformCssItems(cssOutput.css, meta);

    errorIfInvalidProperties(properties);
    // TODO: test this
    console.log('visitXcssPropPath', properties);

    switch (classNames.length) {
      case 1:
        // Replace xcss prop with class names
        // Remeber: The object has a type constraint to always be a basic object with no values.
        container.expression = classNames[0];
        break;

      case 0:
        // No styles were merged so we replace with an undefined identifier.
        container.expression = t.identifier('undefined');
        break;

      default:
        throw buildCodeFrameError(
          'Unexpected count of class names please raise an issue on Github',
          propPath.node,
          meta.parentPath
        );
    }

    meta.state.usesXcss = true;
    path.parentPath.replaceWith(compiledTemplate(jsxElementNode, sheets, meta));
  } else {
    // We make the assumption that xcss prop only takes member expressions such as:
    // 1. Dot notation, such as "styles.text"
    // 2. Bracket notation, such as "styles[appearance]"
    const identifiers = collectPathMemberExpressionIdentifiers(propPath);
    const sheets = collectPassStyles(meta, identifiers);

    if (sheets.length === 0) {
      // No sheets were extracted — bail out from the transform.
      // This covers the legacy use case of runtime xcss prop.
      return;
    }

    meta.state.usesXcss = true;
    path.parentPath.replaceWith(compiledTemplate(jsxElementNode, sheets, meta));
  }
};
