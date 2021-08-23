import * as t from '@babel/types';
import { NodePath } from '@babel/core';
import { buildCompiledComponent } from '../utils/ast-builders';
import { buildCss } from '../utils/css-builders';
import { Metadata } from '../types';

const getJsxAttributeExpression = (node: t.JSXAttribute) => {
  if (t.isStringLiteral(node.value)) {
    return node.value;
  }

  if (t.isJSXExpressionContainer(node.value)) {
    return node.value.expression as t.Expression;
  }

  throw new Error('Value of JSX attribute was unexpected.');
};

/**
 * Takes a JSX opening element and then transforms any usage of `css` prop to a compiled component.
 *
 * `<div css={{}}>`
 *
 * @param path {NodePath} The opening JSX element
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const visitCssPropPath = (path: NodePath<t.JSXOpeningElement>, meta: Metadata): void => {
  let cssPropIndex = -1;
  const cssProp = path.node.attributes.find((attr, index): attr is t.JSXAttribute => {
    if (t.isJSXAttribute(attr) && attr.name.name === 'css') {
      cssPropIndex = index;
      return true;
    }

    return false;
  });

  if (!cssProp || !cssProp.value) {
    return;
  }

  const cssOutput = buildCss(getJsxAttributeExpression(cssProp), meta);

  // Remove css prop
  path.node.attributes.splice(cssPropIndex, 1);

  if (!cssOutput.css.length) {
    // No css was generated - return early!
    return;
  }

  path.parentPath.replaceWith(
    buildCompiledComponent(path.parentPath.node as t.JSXElement, cssOutput, meta)
  );
};
