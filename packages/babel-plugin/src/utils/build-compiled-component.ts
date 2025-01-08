import generate from '@babel/generator';
import template from '@babel/template';
import * as t from '@babel/types';
import { unique } from '@compiled/utils';

import type { Metadata } from '../types';

import { buildCssVariables } from './build-css-variables';
import { errorIfInvalidProperties } from './error-if-invalid-properties';
import { getJSXAttribute } from './get-jsx-attribute';
import { getRuntimeClassNameLibrary } from './get-runtime-class-name-library';
import { hoistSheet } from './hoist-sheet';
import { transformCssItems } from './transform-css-items';
import type { CSSOutput } from './types';

/**
 * Will return a generated AST for a Compiled Component.
 * This is primarily used for CSS prop and ClassNames apis.
 *
 * @param node Originating node
 * @param sheets {string[]} Stylesheets
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const compiledTemplate = (node: t.Expression, sheets: string[], meta: Metadata): t.Node => {
  const nonceAttribute = meta.state.opts.nonce ? `nonce={${meta.state.opts.nonce}}` : '';

  const [keyAttribute] = getJSXAttribute(node, 'key');

  return template(
    `
  <CC ${keyAttribute ? generate(keyAttribute).code : ''}>
    <CS ${nonceAttribute}>{%%cssNode%%}</CS>
    {%%jsxNode%%}
  </CC>
  `,
    {
      plugins: ['jsx'],
    }
  )({
    jsxNode: node,
    cssNode: t.arrayExpression(unique(sheets).map((sheet: string) => hoistSheet(sheet, meta))),
  }) as t.Node;
};

/**
 * Returns the actual value of a jsx value.
 *
 * @param node
 */
const getExpression = (
  node: t.JSXElement | t.JSXFragment | t.StringLiteral | t.JSXExpressionContainer
): t.Expression => {
  const value = t.isJSXExpressionContainer(node) ? node.expression : node;

  if (t.isJSXEmptyExpression(value)) {
    throw new Error('Empty expression not supported.');
  }

  return value;
};

/**
 * Returns a Compiled Component AST.
 *
 * @param node Originating node
 * @param cssOutput CSS and variables to place onto the component
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const buildCompiledComponent = (
  node: t.JSXElement,
  cssOutput: CSSOutput,
  meta: Metadata
): t.Node => {
  const { sheets, classNames, properties } = transformCssItems(cssOutput.css, meta);

  errorIfInvalidProperties(properties);
  // TODO: write tests for this now that we know that it works
  console.log('buildCompiledComponent', properties);

  const [classNameAttribute] = getJSXAttribute(node, 'className');

  if (classNameAttribute && classNameAttribute.value) {
    // If there is a class name prop statically defined we want to concatenate it with
    // the class name we're going to put on it.
    const classNameExpression = getExpression(classNameAttribute.value);
    const values: t.Expression[] = classNames.concat(classNameExpression);

    classNameAttribute.value = t.jsxExpressionContainer(
      t.callExpression(t.identifier(getRuntimeClassNameLibrary(meta)), [t.arrayExpression(values)])
    );
  } else {
    // No class name - just push our own one.
    node.openingElement.attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier('className'),
        t.jsxExpressionContainer(
          t.callExpression(t.identifier(getRuntimeClassNameLibrary(meta)), [
            t.arrayExpression(classNames),
          ])
        )
      )
    );
  }

  if (cssOutput.variables.length) {
    const [styleAttribute, styleAttributeIndex] = getJSXAttribute(node, 'style');

    const dynamicStyleProperties: (t.ObjectProperty | t.SpreadElement)[] = buildCssVariables(
      cssOutput.variables
    );

    if (styleAttribute) {
      // Remove the pre-existing style prop - we're going to redefine it soon.
      node.openingElement.attributes.splice(styleAttributeIndex, 1);

      if (
        styleAttribute.value &&
        t.isJSXExpressionContainer(styleAttribute.value) &&
        !t.isJSXEmptyExpression(styleAttribute.value.expression)
      ) {
        // If it's not an object we just spread the expression into the object
        if (!t.isObjectExpression(styleAttribute.value.expression)) {
          dynamicStyleProperties.splice(0, 0, t.spreadElement(styleAttribute.value.expression));
        } else {
          // Else it's an object! So we want to place each property into the object
          styleAttribute.value.expression.properties.forEach((prop, index) => {
            if (t.isObjectMethod(prop)) {
              return;
            }

            // We want to keep the order that they were defined in.
            // So we're using index here to do just that.
            dynamicStyleProperties.splice(index, 0, prop);
          });
        }
      }
    }

    // Finally add the new style prop back to the opening JSX element.
    node.openingElement.attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier('style'),
        t.jsxExpressionContainer(t.objectExpression(dynamicStyleProperties))
      )
    );
  }

  return compiledTemplate(node, sheets, meta);
};
