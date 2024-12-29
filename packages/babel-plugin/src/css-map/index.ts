import type { NodePath } from '@babel/core';
import * as t from '@babel/types';

import type { Metadata } from '../types';
import { buildCodeFrameError } from '../utils/ast';
import { buildCss } from '../utils/css-builders';
import { ErrorMessages, createErrorMessage, errorIfNotValidObjectProperty } from '../utils/css-map';
import { transformCssItems } from '../utils/transform-css-items';

import { mergeExtendedSelectorsIntoProperties } from './process-selectors';

/**
 * Takes `cssMap` function expression and then transforms it to a record of class names and sheets.
 *
 * For example:
 * ```
 * const styles = cssMap({
 *    none: { color: 'red' },
 *    solid: { color: 'green' },
 * });
 * ```
 * gets transformed to
 * ```
 * const styles = {
 *    danger: "_syaz5scu",
 *    success: "_syazbf54",
 * };
 * ```
 *
 * @param path {NodePath} The path to be evaluated.
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const visitCssMapPath = (
  path: NodePath<t.CallExpression> | NodePath<t.TaggedTemplateExpression>,
  meta: Metadata
): void => {
  // We don't support tagged template expressions.
  if (t.isTaggedTemplateExpression(path.node)) {
    throw buildCodeFrameError(
      createErrorMessage(ErrorMessages.DEFINE_MAP),
      path.node,
      meta.parentPath
    );
  }

  // We need to ensure CSS Map is declared at the top-most scope of the module.
  if (!t.isVariableDeclarator(path.parent) || !t.isIdentifier(path.parent.id)) {
    throw buildCodeFrameError(
      createErrorMessage(ErrorMessages.DEFINE_MAP),
      path.node,
      meta.parentPath
    );
  }

  // We need to ensure cssMap receives only one argument.
  if (path.node.arguments.length > 2) {
    throw buildCodeFrameError(
      createErrorMessage(ErrorMessages.NUMBER_OF_ARGUMENT),
      path.node,
      meta.parentPath
    );
  }

  let isGlobalCssMap = false;
  if (path.node.arguments.length === 2) {
    const arg = path.node.arguments[1];
    if (
      !t.isObjectExpression(arg) ||
      arg.properties.length > 1 ||
      // @ts-ignore
      !t.isIdentifier(arg.properties[0].key) ||
      // @ts-ignore
      !t.isBooleanLiteral(arg.properties[0].value)
    ) {
      throw buildCodeFrameError(
        createErrorMessage('Invalid argument for cssMap options'),
        path.node,
        meta.parentPath
      );
    }

    // @ts-ignore
    isGlobalCssMap = arg.properties[0].value.value;
  }

  // We need to ensure the argument is an objectExpression.
  if (!t.isObjectExpression(path.node.arguments[0])) {
    throw buildCodeFrameError(
      createErrorMessage(ErrorMessages.ARGUMENT_TYPE),
      path.node,
      meta.parentPath
    );
  }

  const totalSheets: string[] = [];
  path.replaceWith(
    t.objectExpression(
      path.node.arguments[0].properties.map((property) => {
        errorIfNotValidObjectProperty(property, meta);

        if (!t.isObjectExpression(property.value)) {
          throw buildCodeFrameError(
            createErrorMessage(ErrorMessages.STATIC_VARIANT_OBJECT),
            property.value,
            meta.parentPath
          );
        }

        const processedPropertyValue = mergeExtendedSelectorsIntoProperties(property.value, meta);
        const { css, variables } = buildCss(processedPropertyValue, meta);

        if (variables.length) {
          throw buildCodeFrameError(
            createErrorMessage(ErrorMessages.STATIC_VARIANT_OBJECT),
            property.value,
            meta.parentPath
          );
        }

        const { sheets, classNames } = transformCssItems(css, meta, isGlobalCssMap);
        totalSheets.push(...sheets);

        if (classNames.length > 1) {
          throw buildCodeFrameError(
            createErrorMessage(ErrorMessages.STATIC_VARIANT_OBJECT),
            property,
            meta.parentPath
          );
        }

        return t.objectProperty(property.key, classNames[0] || t.stringLiteral(''));
      })
    )
  );

  // We store sheets in the meta state so that we can use it later to generate Compiled component.
  meta.state.cssMap[path.parent.id.name] = totalSheets;
};
