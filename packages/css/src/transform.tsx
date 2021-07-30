import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import nested from 'postcss-nested';
import whitespace from 'postcss-normalize-whitespace';
import { unique, createError } from '@compiled/utils';
import { discardDuplicates } from './plugins/discard-duplicates';
import { parentOrphanedPseudos } from './plugins/parent-orphaned-pseudos';
import { normalizeCSS } from './plugins/normalize-css';
import { extractStyleSheets } from './plugins/extract-stylesheets';
import { atomicifyRules } from './plugins/atomicify-rules';
import { expandShorthands } from './plugins/expand-shorthands';
import { sortAtRulePseudos } from './plugins/sort-at-rule-pseudos';

/**
 * Will transform CSS into multiple CSS sheets.
 *
 * @param css CSS string
 * @param opts Transformation options
 */
export const transformCss = (css: string): { sheets: string[]; classNames: string[] } => {
  const sheets: string[] = [];
  const classNames: string[] = [];

  try {
    const result = postcss([
      discardDuplicates(),
      parentOrphanedPseudos(),
      nested(),
      ...normalizeCSS(),
      expandShorthands(),
      atomicifyRules({ callback: (className) => classNames.push(className) }),
      sortAtRulePseudos(),
      ...(process.env.AUTOPREFIXER === 'off' ? [] : [autoprefixer()]),
      whitespace,
      extractStyleSheets({ callback: (sheet: string) => sheets.push(sheet) }),
    ]).process(css, {
      from: undefined,
    });

    // We need to access something to make the transformation happen.
    result.css;

    return {
      sheets,
      classNames: unique(classNames),
    };
  } catch (e) {
    throw createError(
      'css',
      'Unhandled exception'
    )(
      `An unhandled exception was raised when parsing your CSS, this is probably a bug!
  Raise an issue here: https://github.com/atlassian-labs/compiled/issues/new?assignees=&labels=&template=bug_report.md&title=CSS%20Parsing%20Exception:%20

  Input CSS: {
    ${css}
  }

  Exception: ${e.message}`
    );
  }
};
