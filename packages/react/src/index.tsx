export { keyframes } from './keyframes';
export { styled } from './styled';
export { ClassNames } from './class-names';
export { default as css } from './css';

import { CssFunction } from './types';

declare module 'react' {
  // We must match the same type signature so the generic needs to stay.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface DOMAttributes<T> {
    css?: CssFunction | CssFunction[];
  }
}

declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      /**
       * Tie styles to an element.
       * It is available when the `@compiled/react` module is in scope.
       *
       * ```
       * css={{ fontSize: 12 }} // Object CSS
       * css={`font-size: 12px;`} // Template literal CSS
       * css={[{ fontSize: 12 }, `font-size: 12px;`]} // Array CSS
       * ```
       *
       * For more help, read the docs:
       * https://compiledcssinjs.com/docs/api-css-prop
       */
      css?: CssFunction | CssFunction[];
    }
  }
}
