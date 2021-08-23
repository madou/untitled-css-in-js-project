import postcss from 'postcss';
import { toBoolean } from '@compiled/utils';
import { sortAtomicStyleSheet } from './plugins/sort-atomic-style-sheet';
import { mergeDuplicateAtRules } from './plugins/merge-duplicate-at-rules';
import { removeUnstableRules } from './plugins/remove-unstable-rules';

interface SortOpts {
  removeUnstableRules?: boolean;
}

/**
 * Sorts an atomic style sheet.
 *
 * @param stylesheet
 * @returns
 */
export function sort(
  stylesheet: string,
  opts: SortOpts = { removeUnstableRules: false }
): { css: string; unstableRules: string[] } {
  const unstableRules: string[] = [];
  const result = postcss(
    [
      opts.removeUnstableRules &&
        removeUnstableRules({ callback: (sheet) => unstableRules.push(sheet) }),
      mergeDuplicateAtRules(),
      sortAtomicStyleSheet(),
    ].filter(toBoolean)
  ).process(stylesheet, {
    from: undefined,
  });

  return { css: result.css, unstableRules };
}
