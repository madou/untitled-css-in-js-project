import { createError, unique } from '@compiled/utils';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import nested from 'postcss-nested';
import whitespace from 'postcss-normalize-whitespace';

import { atomicifyRules } from './plugins/atomicify-rules';
import { discardDuplicates } from './plugins/discard-duplicates';
import { discardEmptyRules } from './plugins/discard-empty-rules';
import { expandShorthands } from './plugins/expand-shorthands';
import { extractStyleSheets } from './plugins/extract-stylesheets';
import { increaseSpecificity } from './plugins/increase-specificity';
import { normalizeCSS } from './plugins/normalize-css';
import { parentOrphanedPseudos } from './plugins/parent-orphaned-pseudos';
import { sortAtomicStyleSheet } from './plugins/sort-atomic-style-sheet';

export interface TransformOpts {
  optimizeCss?: boolean;
  classNameCompressionMap?: Record<string, string>;
  increaseSpecificity?: boolean;
  sortAtRules?: boolean;
  sortShorthand?: boolean;
  classHashPrefix?: string;
}

/**
 * Will transform CSS into multiple CSS sheets.
 *
 * @param css CSS string
 * @param opts Transformation options
 */
export const transformCss = (
  css: string,
  opts: TransformOpts
): { sheets: string[]; classNames: string[]; properties: string[] } => {
  const sheets: string[] = [];
  const classNames: string[] = [];
  const properties: string[] = [];

  try {
    const result = postcss([
      discardDuplicates(),
      discardEmptyRules(),
      parentOrphanedPseudos(),
      nested({
        bubble: [
          'container',
          '-moz-document',
          'layer',
          'else',
          'when',
          // postcss-nested bubbles `starting-style` by default in versions from 6.0.2 onwards:
          // https://github.com/postcss/postcss-nested?tab=readme-ov-file#bubble
          // When we upgrade to a version that includes this change, we can remove this from the list.
          'starting-style',
        ],
        unwrap: ['color-profile', 'counter-style', 'font-palette-values', 'page', 'property'],
      }),
      ...normalizeCSS(opts),
      expandShorthands(),
      atomicifyRules({
        // TODO: double check that class name compression doesn't affect properties array
        classNameCompressionMap: opts.classNameCompressionMap,
        callback: ({ className, property }) => {
          properties.push(property);
          classNames.push(className);
        },
        classHashPrefix: opts.classHashPrefix,
      }),
      ...(opts.increaseSpecificity ? [increaseSpecificity()] : []),
      sortAtomicStyleSheet({
        sortAtRulesEnabled: opts.sortAtRules,
        sortShorthandEnabled: opts.sortShorthand,
      }),
      ...(process.env.AUTOPREFIXER === 'off' ? [] : [autoprefixer()]),
      whitespace(),
      extractStyleSheets({ callback: (sheet: string) => sheets.push(sheet) }),
    ]).process(css, {
      from: undefined,
    });

    // We need to access something to make the transformation happen.
    result.css;

    return {
      sheets,
      classNames: unique(classNames),
      properties,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : e;
    throw createError(
      'css',
      'Unhandled exception'
    )(
      `An unhandled exception was raised when parsing your CSS, this is probably a bug!
  Raise an issue here: https://github.com/atlassian-labs/compiled/issues/new?assignees=&labels=&template=bug_report.md&title=CSS%20Parsing%20Exception:%20

  Input CSS: {
    ${css}
  }

  Exception: ${message}`
    );
  }
};
