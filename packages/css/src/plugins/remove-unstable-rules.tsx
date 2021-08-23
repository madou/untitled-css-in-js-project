import { plugin } from 'postcss';

/**
 * Removes unstable atomic rules from the style sheet.
 */
export const removeUnstableRules = plugin<{ callback: (sheet: string) => void }>(
  'remove-unstable-rules',
  (opts) => {
    return (root) => {
      root.each((node) => {
        switch (node.type) {
          case 'rule':
            if (node.selector.includes(':')) {
              opts?.callback(node.toString());
              node.remove();
            }

          default:
            break;
        }
      });
    };
  }
);
