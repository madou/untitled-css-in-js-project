import type { TransformOptions } from '../../test-utils';
import { transform as transformCode } from '../../test-utils';
// import { ErrorMessages } from '../../utils/css-map';

describe('css map basic functionality', () => {
  const transform = (code: string, opts: TransformOptions = {}) =>
    transformCode(code, { pretty: true, ...opts });

  const styles = `{
    danger: {
        color: 'red',
        backgroundColor: 'red'
    },
    success: {
      color: 'green',
      backgroundColor: 'green'
    }
  }`;

  it('should transform vanillaCss to ax', () => {
    const actual = transform(`
      import { cssMap, vanillaCss } from '@compiled/react';

      const someStyles = cssMap(${styles});

      function someFunctionCall(_obj) {}

      export const bap = someFunctionCall({
        // node DOM constructor
        toDOM(node) {
          const { localId, state } = node.attrs;
          // injectCompiledCss should be added right before \`attrs\` at build time.
          const attrs = {
            'data-task-local-id': localId || 'local-task',
            'data-task-state': state || 'TODO',
            // vanillaCss function will hint Babel to inject styles on run time, and extract styles on build time
            class: vanillaCss([someStyles.base, state === "DONE" && someStyles.done]),
          };
          // construct a div node
          return ['div', attrs, 0];
        },
      });
    `);

    expect(actual).toMatchInlineSnapshot(`
      "import * as React from "react";
      import { ax, ix, CC, CS, injectCompiledCss } from "@compiled/react/runtime";
      const someStyles = {
        danger: "_syaz5scu _bfhk5scu",
        success: "_syazbf54 _bfhkbf54",
      };
      function someFunctionCall(_obj) {}
      export const bap = someFunctionCall({
        toDOM(node) {
          const { localId, state } = node.attrs;
          injectCompiledCss([
            "._syaz5scu{color:red}",
            "._bfhk5scu{background-color:red}",
            "._syazbf54{color:green}",
            "._bfhkbf54{background-color:green}",
          ]);
          const attrs = {
            "data-task-local-id": localId || "local-task",
            "data-task-state": state || "TODO",
            class: ax([someStyles.base, state === "DONE" && someStyles.done]),
          };
          return ["div", attrs, 0];
        },
      });
      "
    `);
  });

  it('should add injectCompiledCss function call', () => {
    const actual = transform(`
      import { cssMap, vanillaCss } from '@compiled/react';

      const otherStyles = cssMap(${styles});

      function someFunctionCall(_obj) {}

      export const bap = someFunctionCall({
        // node DOM constructor
        toDOM(node) {
          const { localId, state } = node.attrs;
          // injectCompiledCss should be added right before \`attrs\` at build time.
          const attrs = {
            'data-task-local-id': localId || 'local-task',
            'data-task-state': state || 'TODO',
            // vanillaCss function will hint Babel to inject styles on run time, and extract styles on build time
            class: vanillaCss([otherStyles.base, state === 'DONE' && otherStyles.done]),
          };
          // construct a div node
          return ['div', attrs, 0];
        },
      });
    `);

    // TODO: verify output
    expect(actual).toMatchInlineSnapshot(`
      "import * as React from "react";
      import { ax, ix, CC, CS, injectCompiledCss } from "@compiled/react/runtime";
      const otherStyles = {
        danger: "_syaz5scu _bfhk5scu",
        success: "_syazbf54 _bfhkbf54",
      };
      function someFunctionCall(_obj) {}
      export const bap = someFunctionCall({
        toDOM(node) {
          const { localId, state } = node.attrs;
          injectCompiledCss([
            "._syaz5scu{color:red}",
            "._bfhk5scu{background-color:red}",
            "._syazbf54{color:green}",
            "._bfhkbf54{background-color:green}",
          ]);
          const attrs = {
            "data-task-local-id": localId || "local-task",
            "data-task-state": state || "TODO",
            class: ax([otherStyles.base, state === "DONE" && otherStyles.done]),
          };
          return ["div", attrs, 0];
        },
      });
      "
    `);
  });
});

// TODO: what happens if we have two vanillaCss function calls in one file?
//       what about in @compiled/babel-plugin-strip-runtime?
