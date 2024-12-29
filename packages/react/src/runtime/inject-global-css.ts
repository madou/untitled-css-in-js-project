import insertRule from './sheet';

const cache = new Set();

export default function injectGlobalCss(sheets: string[]): void {
  for (const rule of sheets) {
    if (cache.has(rule)) continue;
    insertRule(rule, {});
    cache.add(rule);
  }
}
