import * as t from '@babel/types';
import { transformCss } from '@compiled/css';

import type { Metadata } from '../types';

import { compressClassNamesForRuntime } from './compress-class-names-for-runtime';
import { getItemCss } from './css-builders';
import type { CssItem } from './types';

/**
 * Splits a single item's styles into sheets and an expression that handles
 * className logic at runtime.
 *
 * @param item {CssItem}
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const transformCssItem = (
  item: CssItem,
  meta: Metadata
): {
  sheets: string[];
  classExpression?: t.Expression;
  properties: string[];
} => {
  switch (item.type) {
    case 'conditional':
      const consequent = transformCssItem(item.consequent, meta);
      const alternate = transformCssItem(item.alternate, meta);
      const defaultExpression = t.identifier('undefined');
      const hasConsequentSheets = Boolean(consequent.sheets.length);
      const hasAlternateSheets = Boolean(alternate.sheets.length);

      if (!hasConsequentSheets && !hasAlternateSheets) {
        return { sheets: [], classExpression: undefined, properties: [] };
      }

      if (!hasConsequentSheets || !hasAlternateSheets) {
        const classExpression = hasConsequentSheets
          ? consequent.classExpression
          : alternate.classExpression;

        return {
          sheets: hasConsequentSheets ? consequent.sheets : alternate.sheets,
          classExpression: t.logicalExpression(
            '&&',
            hasConsequentSheets ? item.test : t.unaryExpression('!', item.test),
            classExpression || defaultExpression
          ),
          // TODO: verify whether this is correct
          properties: [...consequent.properties, ...alternate.properties],
        };
      }

      return {
        sheets: [...consequent.sheets, ...alternate.sheets],
        classExpression: t.conditionalExpression(
          item.test,
          consequent.classExpression || defaultExpression,
          alternate.classExpression || defaultExpression
        ),
        properties: [...consequent.properties, ...alternate.properties],
      };

    case 'logical':
      const logicalCss = transformCss(getItemCss(item), meta.state.opts);

      return {
        sheets: logicalCss.sheets,
        classExpression: t.logicalExpression(
          item.operator,
          item.expression,
          t.stringLiteral(
            compressClassNamesForRuntime(
              logicalCss.classNames,
              meta.state.opts.classNameCompressionMap
            ).join(' ')
          )
        ),
        properties: logicalCss.properties,
      };

    case 'map':
      return {
        sheets: meta.state.cssMap[item.name],
        classExpression: item.expression,
        // TODO: determine what the value of this should be
        properties: [],
      };

    default:
      const css = transformCss(getItemCss(item), meta.state.opts);
      const className = compressClassNamesForRuntime(
        css.classNames,
        meta.state.opts.classNameCompressionMap
      ).join(' ');

      return {
        sheets: css.sheets,
        classExpression: className.trim() ? t.stringLiteral(className) : undefined,
        properties: css.properties,
      };
  }
};

/**
 * Transforms CSS output into `sheets` and a list of expressions for determining
 * the classNames for a component at runtime.
 *
 * @param cssItems {CssItem[]}
 */
export const transformCssItems = (
  cssItems: CssItem[],
  meta: Metadata
): { sheets: string[]; classNames: t.Expression[]; properties: string[] } => {
  const sheets: string[] = [];
  const classNames: t.Expression[] = [];
  const properties: string[] = [];

  cssItems.forEach((item) => {
    const result = transformCssItem(item, meta);

    sheets.push(...result.sheets);
    if (result.classExpression) {
      classNames.push(result.classExpression);
    }

    properties.push(...result.properties);
  });

  return { sheets, classNames, properties };
};

/**
 * Wraps CSS within a CssItem around selector closures. Each subsequent selector
 * in the selectors array represents a nested selector.
 *
 * @param item {CssItem}
 * @param selectors {string[]}
 */
export const applySelectors = (item: CssItem, selectors: string[]): void => {
  if (item.type === 'conditional') {
    applySelectors(item.consequent, selectors);
    applySelectors(item.alternate, selectors);
  } else {
    item.css = `${selectors.join('')}${item.css}${''.padEnd(selectors.length, '}')}`;
  }
};
