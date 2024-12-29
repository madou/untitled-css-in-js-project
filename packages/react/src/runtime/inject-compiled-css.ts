import injectGlobalCss from './inject-global-css';

export default function injectCompiledCss(sheets: string[]): void {
  return injectGlobalCss(sheets);
}
