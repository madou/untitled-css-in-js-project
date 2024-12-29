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
  meta: Metadata,
  isGlobal = false
): {
  sheets: string[];
  classExpression?: t.Expression;
} => {
  switch (item.type) {
    case 'conditional':
      const consequent = transformCssItem(item.consequent, meta, isGlobal);
      const alternate = transformCssItem(item.alternate, meta, isGlobal);
      const defaultExpression = t.identifier('undefined');
      const hasConsequentSheets = Boolean(consequent.sheets.length);
      const hasAlternateSheets = Boolean(alternate.sheets.length);

      if (!hasConsequentSheets && !hasAlternateSheets) {
        return { sheets: [], classExpression: undefined };
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
        };
      }

      return {
        sheets: [...consequent.sheets, ...alternate.sheets],
        classExpression: t.conditionalExpression(
          item.test,
          consequent.classExpression || defaultExpression,
          alternate.classExpression || defaultExpression
        ),
      };

    case 'logical':
      const logicalCss = transformCss(getItemCss(item), meta.state.opts, isGlobal);

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
      };

    case 'map':
      return {
        sheets: meta.state.cssMap[item.name],
        classExpression: item.expression,
      };

    default:
      const css = transformCss(getItemCss(item), meta.state.opts, isGlobal);
      const className = compressClassNamesForRuntime(
        css.classNames,
        meta.state.opts.classNameCompressionMap
      ).join(' ');

      return {
        sheets: css.sheets,
        classExpression: className.trim() ? t.stringLiteral(className) : undefined,
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
  meta: Metadata,
  isGlobal = false
): { sheets: string[]; classNames: t.Expression[] } => {
  const sheets: string[] = [];
  const classNames: t.Expression[] = [];

  cssItems.forEach((item) => {
    const result = transformCssItem(item, meta, isGlobal);

    sheets.push(...result.sheets);
    if (result.classExpression) {
      classNames.push(result.classExpression);
    }
  });

  return { sheets, classNames };
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
