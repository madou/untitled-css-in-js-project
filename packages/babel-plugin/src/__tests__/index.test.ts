import type { TransformOptions } from '../test-utils';
import { transform as transformCode } from '../test-utils';

describe('babel plugin', () => {
  const transform = (code: string, opts: TransformOptions = {}) =>
    transformCode(code, { comments: true, ...opts });

  it('should not change code where there is no compiled components', () => {
    const actual = transform(`const one = 1;`);

    expect(actual.trim()).toEqual('const one = 1;');
  });

  it('should not comment file if no transformation occurred', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react/runtime';
    `);

    expect(actual).toMatchInlineSnapshot(`
      "import { ClassNames } from "@compiled/react/runtime";
      "
    `);
  });

  it('should generate fallback file comment when filename is not defined', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `);

    expect(actual).toInclude('File generated by @compiled/babel-plugin v0.0.0');
  });

  it('should generate fallback file comment when filename is defined', () => {
    const code = `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `;

    const actual = transform(code, { filename: 'test.tsx' });

    expect(actual).toInclude('test.tsx generated by @compiled/babel-plugin v0.0.0');
  });

  it('should transform basic styled component', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import { forwardRef } from "react";
      import * as React from "react";
      import { ax, ix, CC, CS } from "@compiled/react/runtime";
      const _ = "._1wyb1fwx{font-size:12px}";
      const MyDiv = forwardRef(
        ({ as: C = "div", style: __cmpls, ...__cmplp }, __cmplr) => {
          if (__cmplp.innerRef) {
            throw new Error("Please use 'ref' instead of 'innerRef'.");
          }
          return (
            <CC>
              <CS>{[_]}</CS>
              <C
                {...__cmplp}
                style={__cmpls}
                ref={__cmplr}
                className={ax(["_1wyb1fwx", __cmplp.className])}
              />
            </CC>
          );
        }
      );
      if (process.env.NODE_ENV !== "production") {
        MyDiv.displayName = "MyDiv";
      }
      "
    `);
  });

  it('should transform basic css prop', () => {
    const actual = transform(`
      import '@compiled/react';

      const MyDiv = () => {
        return <div css="font-size:12px;">hello</div>
      };
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from "react";
      import { ax, ix, CC, CS } from "@compiled/react/runtime";
      const _ = "._1wyb1fwx{font-size:12px}";
      const MyDiv = () => {
        return (
          <CC>
            <CS>{[_]}</CS>
            {<div className={ax(["_1wyb1fwx"])}>hello</div>}
          </CC>
        );
      };
      "
    `);
  });

  // TODO Removing import React from 'react' breaks this test
  it('should preserve comments at the top of the processed file before inserting runtime imports', () => {
    const actual = transform(`
      // @flow strict-local
      import '@compiled/react';
      import React from 'react';

      const MyDiv = () => {
        return <div css="font-size:12px;">hello</div>
      };
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      // @flow strict-local
      import { ax, ix, CC, CS } from "@compiled/react/runtime";
      import React from "react";
      const _ = "._1wyb1fwx{font-size:12px}";
      const MyDiv = () => {
        return (
          <CC>
            <CS>{[_]}</CS>
            {<div className={ax(["_1wyb1fwx"])}>hello</div>}
          </CC>
        );
      };
      "
    `);
  });

  it('should not remove manual runtime import if no transformation occurs', () => {
    const actual = transform(`
      import { CC } from '@compiled/react/runtime';

      <CC>
        <div />
      </CC>
    `);

    expect(actual).toMatchInlineSnapshot(`
      "import { CC } from "@compiled/react/runtime";
      <CC>
        <div />
      </CC>;
      "
    `);
  });

  it('should append to manual runtime import if already present and transformation occurs', () => {
    const actual = transform(`
      import { CC as CompiledRoot, ax } from '@compiled/react/runtime';
      import '@compiled/react';

      const classes = ax(['1', '2']);

      <CompiledRoot>
        <div css={{ display: 'block' }}  />
      </CompiledRoot>
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from "react";
      import { CC as CompiledRoot, ax, ix, CC, CS } from "@compiled/react/runtime";
      const _ = "._1e0c1ule{display:block}";
      const classes = ax(["1", "2"]);
      <CompiledRoot>
        <CC>
          <CS>{[_]}</CS>
          {<div className={ax(["_1e0c1ule"])} />}
        </CC>
      </CompiledRoot>;
      "
    `);
  });

  it('should add component name if addComponentName is true', () => {
    const actual = transform(
      `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `,
      { addComponentName: true }
    );

    expect(actual).toInclude('c_MyDiv');
  });

  it('should add a prefix to style hash classHashPrefix is present', () => {
    // changes to css/src/plugins/atomicify-rules can break this due to how the class name is hashed
    const hashedClassName = '_1lv61fwx';
    const actual = transform(
      `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `,
      { classHashPrefix: 'myprefix' }
    );

    expect(actual).toInclude(hashedClassName);
  });

  it('should throw if a given classHashPrefix is not a valid css identifier', () => {
    expect(() => {
      transform(
        `
        import { styled } from '@compiled/react';

        const MyDiv = styled.div\`
          font-size: 12px;
        \`;
        `,
        { classHashPrefix: '$invalid%' }
      );
    }).toThrow();
  });

  it('should compress class name for styled component', () => {
    const actual = transform(
      `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `,
      {
        classNameCompressionMap: {
          '1wyb1fwx': 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple(['.a{font-size:12px}', 'ac(["_1wyb_a", __cmplp.className])']);
  });

  it('should compress class name for css props', () => {
    const actual = transform(
      `
      import '@compiled/react';

      <div css={{ fontSize: 12 }} />
    `,
      {
        classNameCompressionMap: {
          '1wyb1fwx': 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple(['.a{font-size:12px}', 'ac(["_1wyb_a"])']);
  });

  it('should compress class name for ClassNames', () => {
    const actual = transform(
      `
      import { ClassNames } from '@compiled/react';

      <ClassNames>
        {({ css }) => (
          <div className={css({ fontSize: 12 })} />
        )}
      </ClassNames>
    `,
      {
        classNameCompressionMap: {
          '1wyb1fwx': 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple(['.a{font-size:12px}', 'className={ac(["_1wyb_a"])']);
  });

  it('should compress class names with atrules', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={{ "@media (max-width: 1250px) ": { fontSize: 12 } }} />
    `,
      {
        classNameCompressionMap: {
          pz521fwx: 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '@media (max-width:1250px){.a{font-size:12px}}',
      'ac(["_pz52_a"])',
    ]);
  });

  it('should compress pseudo classes', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={{ "&:hover": { fontSize: 12 }, "&:active": { color: 'red' } }} />
    `,
      {
        classNameCompressionMap: {
          '9h8h5scu': 'a',
          e9151fwx: 'b',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '.a:active{color:red}',
      '.b:hover{font-size:12px}',
      'ac(["_e915_b _9h8h_a"])',
    ]);
  });

  it('should compress nested selector', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={{ '>div': { 'div div:hover': { fontSize: 12 } } }} />
    `,
      {
        classNameCompressionMap: {
          '1jkf1fwx': 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple(['.a >div div div:hover{font-size:12px}', 'ac(["_1jkf_a"]']);
  });

  it('should compress conditional class names', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={[{ fontSize: ({ bar }) => bar ? 14 : 16 }, () => foo ? { fontSize: 12 } : {}, baz && { fontSize: 20 }]} />
    `,
      {
        classNameCompressionMap: {
          '1wyb19ub': 'a',
          '1wyb1fwx': 'b',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '.a{font-size:16}',
      '.b{font-size:12px}',
      'bar ? "_1wyb1o8a" : "_1wyb_a"',
      'foo && "_1wyb_b"',
    ]);
  });

  it('should compress class names according to the map', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={{ fontSize: 12, color: 'red', marginTop: 10 }} />
    `,
      {
        classNameCompressionMap: {
          syaz5scu: 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '._19pk19bv{margin-top:10px}',
      '.a{color:red}',
      '._1wyb1fwx{font-size:12px}',
      'ac(["_1wyb1fwx _syaz_a _19pk19bv"]',
    ]);
  });

  it('should import ac if compression map is provided', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={{ fontSize: 12 }} />
    `,
      {
        classNameCompressionMap: {},
      }
    );

    expect(actual).toInclude('import { ac, ix, CC, CS } from "@compiled/react/runtime"');
  });

  it('should not generate dynamic styles with a static concat call', () => {
    const code = `
      import { css } from '@compiled/react';

      const styles = css({
        border: "1px solid ".concat('var(--ds-red)'),
        margin: "8px ".concat(0),
        padding: "8px ".concat('var(--ds-space-050)', ' ', 0),
      });

      export default () => <div css={styles}><label /></div>;
    `;

    const actual = transform(code);

    // Does not have any `props.style` or CSS variables generated and instead has static values, as expected:
    expect(actual).not.toMatch(/:\s*var\(--_/);
    expect(actual).not.toMatch(/style=\{\{/);
    expect(actual).toIncludeMultiple([
      '._1yt4ogpx{padding:8px var(--ds-space-050) 0}',
      '._18u0idpf{margin-left:0}',
      '._otyrftgi{margin-bottom:8px}',
      '._19it6gvt{border:1px solid var(--ds-red)}',
    ]);
  });

  describe('indirect selectors with dynamic styles', () => {
    it.each([
      '"div + button":{color:"var(--_abcd1234)"}',
      '"div~label":{color:"var(--_abcd1234)"}',
      '"[data-id~=test]~span":{color:"var(--_abcd1234)"}',
      '"colgroup||td":{color:"var(--_abcd1234)"}',
      '"namespace|a":{color:"var(--_abcd1234)"}',
    ])('should throw an error for scenario=%p', (scenario) => {
      const code = `
      import { css } from '@compiled/react';

      export default (props) => {
        const styles = css({
          ${scenario}
        });

        return <div css={styles}><label /></div>
      };
    `;

      expect(() => transform(code)).toThrow(
        'unknown file: Found a mix of an indirect selector and a dynamic variable which is unsupported with Compiled.  See: https://compiledcssinjs.com/docs/limitations#mixing-dynamic-styles-and-indirect-selectors'
      );
    });

    it('should throw an error with a more complex scenario', () => {
      const code = `
      import { css } from '@compiled/react';
      import { padding, background } from '../utils';

      export default (props) => {
        const styles = css({
          '& + label': {
            padding: "8px ".concat(padding),
            background,
          },
          '& div': {
            padding: \`8px \${padding}\`,
          },
          padding: "8px",
        });

        return <div css={styles}><label /></div>
      };
    `;

      expect(() => transform(code)).toThrow(
        'unknown file: Found a mix of an indirect selector and a dynamic variable which is unsupported with Compiled.  See: https://compiledcssinjs.com/docs/limitations#mixing-dynamic-styles-and-indirect-selectors'
      );
    });

    it.each([
      '"& > label":{color:"var(--_abcd1234)"}',
      '"& > label":{color:"red"}',
      '"div + button":{color:"red"}',
      '"div~label":{color:"red"}',
      '"[data-id~=test]~span":{color:"red"}',
      '"colgroup||td":{color:"red"}',
      '"namespace|a":{color:"red"}',
      '"& label":{color:"red"}',
      '"& label":{color:"var(--_abcd1234)"}',
      '"div [data-id~=test]":{color:"red"}',
      '"div [data-id~=test]":{color:"var(--_abcd1234)"}',
      '"& + label": { padding: "8px", background: "blue" }, "& div": { padding: "8px var(--_1xumd0e)" }, padding: "8px"',
    ])('should not error for safe scenario=%p', (scenario) => {
      const code = `
      import { css } from '@compiled/react';

      export default (props) => {
        const styles = css({${scenario}});

        return <div css={styles}><label /></div>
      };
    `;

      expect(() => transform(code)).not.toThrow();
    });
  });
});
