import { outdent } from 'outdent';
import postcss from 'postcss';

import { sortAtomicStyleSheet } from '../sort-atomic-style-sheet';

const transform = (css: string, enabled = true) => {
  const result = postcss([
    sortAtomicStyleSheet({ sortAtRulesEnabled: true, sortShorthandEnabled: enabled }),
  ]).process(css, {
    from: undefined,
  });

  return result.css;
};

const transformWithoutSorting = (css: string) => transform(css, false);

describe('sort shorthand vs. longhand declarations', () => {
  beforeEach(() => {
    process.env.BROWSERSLIST = 'last 1 version';
  });

  it('leaves untouched when no crossover is present', () => {
    const actual = transform(outdent`
      .a {
        outline-width: 1px;
        font: 16px;
      }
      .b {
        font: 24px;
      }
      .c {
        outline-width: 1px;
      }
    `);

    expect(actual).toMatchInlineSnapshot(`
      ".a {
        font: 16px;
        outline-width: 1px;
      }
      .b {
        font: 24px;
      }
      .c {
        outline-width: 1px;
      }"
    `);
  });

  it('sorts when crossover detected', () => {
    const actual = transform(outdent`
      .a {
        outline-width: 1px;
        outline: none;
        font: 16px normal;
        font-weight: bold;
      }
      .b {
        font-weight: bold;
        font: 24px light;
      }
      .c {
        outline: none;
        outline-width: 1px;
      }
    `);

    expect(actual).toMatchInlineSnapshot(`
      ".a {
        outline: none;
        font: 16px normal;
        outline-width: 1px;
        font-weight: bold;
      }
      .b {
        font: 24px light;
        font-weight: bold;
      }
      .c {
        outline: none;
        outline-width: 1px;
      }"
    `);
  });

  it('sorts inside atrules and rules', () => {
    const actual = transform(outdent`
      @media all {
        .a {
          outline-width: 1px;
          outline: none;
          font: 16px normal;
          font-weight: bold;
        }
        .b {
          font-weight: bold;
          font: 24px light;
        }
        .c {
          outline: none;
          outline-width: 1px;
        }
      }

      .a:focus {
        outline-width: 1px;
        outline: none;
        font: 16px normal;
        font-weight: bold;
      }
      .b:not(.a) {
        font-weight: bold;
        font: 24px light;
      }
      .c[aria-label='test'] {
        outline: none;
        outline-width: 1px;
      }

      .a {
        outline-width: 1px;
        outline: none;
        font: 16px normal;
        font-weight: bold;
      }
      .b {
        font-weight: bold;
        font: 24px light;
      }
      .c {
        outline: none;
        outline-width: 1px;
      }
    `);

    expect(actual).toMatchInlineSnapshot(`
      "
      .b:not(.a) {
        font: 24px light;
        font-weight: bold;
      }
      .c[aria-label='test'] {
        outline: none;
        outline-width: 1px;
      }

      .a {
        outline: none;
        font: 16px normal;
        outline-width: 1px;
        font-weight: bold;
      }
      .b {
        font: 24px light;
        font-weight: bold;
      }
      .c {
        outline: none;
        outline-width: 1px;
      }

      .a:focus {
        outline: none;
        font: 16px normal;
        outline-width: 1px;
        font-weight: bold;
      }@media all {
        .a {
          outline: none;
          font: 16px normal;
          outline-width: 1px;
          font-weight: bold;
        }
        .b {
          font: 24px light;
          font-weight: bold;
        }
        .c {
          outline: none;
          outline-width: 1px;
        }
      }"
    `);
  });

  it('sorts border-related properties', () => {
    const actual = transform(outdent`
      .h { border-inline-start: 8px solid purple; }
      .f { border-left: 7px solid red; }
      .g { border-right: 6px dashed green; }
      .e { border-block: 5px dotted yellow; }
      .b { border-width: 4px; }
      .c { border-style: dashed; }
      .d { border-color: pink; }
      .a { border: 3px solid blue; }
    `);

    expect(actual).toMatchInlineSnapshot(`
      "
      .a { border: 3px solid blue; }
      .b { border-width: 4px; }
      .c { border-style: dashed; }
      .d { border-color: pink; }
      .e { border-block: 5px dotted yellow; }
      .f { border-left: 7px solid red; }
      .g { border-right: 6px dashed green; }.h { border-inline-start: 8px solid purple; }"
    `);
  });

  it('sorts a variety of different shorthand properties used together', () => {
    const actual = transform(outdent`
      @media all {
        .f {
          display: block;
        }
        .e {
          border-block-start-color: transparent;
        }
        .c {
          border-block-start: none;
        }
        .d {
          border-top: none;
        }
        .b {
          border: none;
        }
        .a {
          all: unset;
        }
      }

      .f:focus {
        display: block;
      }
      .e:hover {
        border-block-start-color: transparent;
      }
      .d:active {
        border-block-start: none;
      }
      .c[data-foo='bar'] {
        border-top: none;
      }
      .b[disabled] {
        border: none;
      }
      .a > .external {
        all: unset;
      }

      .j {
        margin-bottom: 6px;
      }
      .i {
        margin-inline: 2px;
      }
      .h {
        margin-block: 5px;
      }
      .g {
        margin: 2px;
      }
      .f {
        display: block;
      }
      .e {
        border-block-start-color: transparent;
      }
      .c {
        border-block-start: none;
      }
      .d {
        border-top: none;
      }
      .b {
        border: none;
      }
      .a {
        all: unset;
      }
    `);

    expect(actual).toMatchInlineSnapshot(`
      "
      .a > .external {
        all: unset;
      }
      .a {
        all: unset;
      }
      .b[disabled] {
        border: none;
      }
      .g {
        margin: 2px;
      }
      .b {
        border: none;
      }
      .i {
        margin-inline: 2px;
      }
      .h {
        margin-block: 5px;
      }
      .c[data-foo='bar'] {
        border-top: none;
      }
      .d {
        border-top: none;
      }
      .c {
        border-block-start: none;
      }
      .d:active {
        border-block-start: none;
      }

      .j {
        margin-bottom: 6px;
      }
      .f {
        display: block;
      }
      .e {
        border-block-start-color: transparent;
      }

      .f:focus {
        display: block;
      }
      .e:hover {
        border-block-start-color: transparent;
      }@media all {
        .a {
          all: unset;
        }
        .b {
          border: none;
        }
        .d {
          border-top: none;
        }
        .c {
          border-block-start: none;
        }
        .f {
          display: block;
        }
        .e {
          border-block-start-color: transparent;
        }
      }"
    `);
  });

  it('sorts non-atomic classes inline, but only singular declaration rules against each other', () => {
    const actual = transform(outdent`
      .e { border-top: none; }
      .a {
        border-block-start: 1px solid;
        border-top: red;
        all: reset;
        border-block-start-color: transparent;
        border: 2px dashed;
      }
      .f { border-block-start-color: transparent; }
      .d { border: none; }
      .c { all: unset; }
      .b { all: unset; }
    `);

    // WARNING: This is technically wrong as `.a { … }` is not sorted as we expect;
    // it _should_ be 'abcdef' not 'eabcdf'.
    //
    // We are ok with this because we expect atomicifyRules to run before this plugin,
    // so each class will never have more than one property.
    expect(actual).toMatchInlineSnapshot(`
      ".e { border-top: none; }
      .a {
        all: reset;
        border: 2px dashed;
        border-top: red;
        border-block-start: 1px solid;
        border-block-start-color: transparent;
      }
      .c { all: unset; }
      .b { all: unset; }
      .d { border: none; }
      .f { border-block-start-color: transparent; }"
    `);
  });

  it('sorts a stylesheet that is mainly longhand properties', () => {
    const actual = transform(outdent`
      ._oqicidpf{padding-top:0}
      ._1rmjidpf{padding-right:0}
      ._cjbtidpf{padding-bottom:0}
      ._pnmbidpf{padding-left:0}
      ._glte7vkz{width:1pc}
      ._165t7vkz{height:1pc}
      ._ue5g1408{margin:0 var(--ds-space-800,4pc)}
      ._1yag1dzv{padding:var(--ds-space-100) var(--ds-space-150)}
      ._dbjg12x7{margin-top:var(--ds-space-075,6px)}

      @media (min-width:1200px){
        ._jvpg11p5{display:grid}
        ._szna1wug{margin-top:auto}
        ._13on1wug{margin-right:auto}
        ._1f3k1wug{margin-bottom:auto}
        ._inid1wug{margin-left:auto}
        ._1oqj1epz{padding:var(--ds-space-1000,5pc)}
        ._12wp9ac1{max-width:1400px}
        ._jvpgglyw{display:none}
      }
    `);

    expect(actual).toMatchInlineSnapshot(`
      "
      ._ue5g1408{margin:0 var(--ds-space-800,4pc)}
      ._1yag1dzv{padding:var(--ds-space-100) var(--ds-space-150)}._oqicidpf{padding-top:0}
      ._1rmjidpf{padding-right:0}
      ._cjbtidpf{padding-bottom:0}
      ._pnmbidpf{padding-left:0}
      ._glte7vkz{width:1pc}
      ._165t7vkz{height:1pc}
      ._dbjg12x7{margin-top:var(--ds-space-075,6px)}

      @media (min-width:1200px){
        ._1oqj1epz{padding:var(--ds-space-1000,5pc)}
        ._jvpg11p5{display:grid}
        ._szna1wug{margin-top:auto}
        ._13on1wug{margin-right:auto}
        ._1f3k1wug{margin-bottom:auto}
        ._inid1wug{margin-left:auto}
        ._12wp9ac1{max-width:1400px}
        ._jvpgglyw{display:none}
      }"
    `);
  });

  it('sorts border, border-top, border-top-color', () => {
    const actual = transform(outdent`

      ._abcd1234 { border-top-color: red }
      ._abcd1234 { border-top: 1px solid }
      ._abcd1234 { border: none }
      ._abcd1234:hover { border-top-color: red }
      ._abcd1234:hover { border-top: 1px solid }
      ._abcd1234:hover { border: none }
      ._abcd1234:active { border-top-color: red }
      ._abcd1234:active { border-top: 1px solid }
      ._abcd1234:active { border: none }
      @supports (border: none) {
        ._abcd1234 { border-top-color: red }
        ._abcd1234 { border-top: 1px solid }
        ._abcd1234 { border: none }
      }
      @media (max-width: 50px) { ._abcd1234 { border-top-color: red } }
      @media (max-width: 100px) { ._abcd1234 { border-top: 1px solid } }
      @media (max-width: 120px) {
        ._abcd1234 { border-top-color: red }
        ._abcd1234 { border-top: 1px solid }
        ._abcd1234 { border: none }
      }
      @media (max-width: 150px) { ._abcd1234 { border: none } }
    `);

    expect(actual).toMatchInlineSnapshot(`
      "
      ._abcd1234 { border: none }
      ._abcd1234:hover { border: none }
      ._abcd1234:active { border: none }
      ._abcd1234 { border-top: 1px solid }
      ._abcd1234:hover { border-top: 1px solid }
      ._abcd1234:active { border-top: 1px solid }
      ._abcd1234 { border-top-color: red }
      ._abcd1234:hover { border-top-color: red }
      ._abcd1234:active { border-top-color: red }
      @media (max-width: 150px) { ._abcd1234 { border: none } }
      @media (max-width: 120px) {
        ._abcd1234 { border: none }
        ._abcd1234 { border-top: 1px solid }
        ._abcd1234 { border-top-color: red }
      }
      @media (max-width: 100px) { ._abcd1234 { border-top: 1px solid } }
      @media (max-width: 50px) { ._abcd1234 { border-top-color: red } }
      @supports (border: none) {
        ._abcd1234 { border: none }
        ._abcd1234 { border-top: 1px solid }
        ._abcd1234 { border-top-color: red }
      }"
    `);
  });

  describe('when disabled', () => {
    it('does nothing when crossover detected', () => {
      const actual = transformWithoutSorting(outdent`
        .a {
          outline-width: 1px;
          outline: none;
          font: 16px normal;
          font-weight: bold;
        }
        .b {
          font-weight: bold;
          font: 24px light;
        }
        .c {
          outline: none;
          outline-width: 1px;
        }
      `);

      expect(actual).toMatchInlineSnapshot(`
        ".a {
          outline-width: 1px;
          outline: none;
          font: 16px normal;
          font-weight: bold;
        }
        .b {
          font-weight: bold;
          font: 24px light;
        }
        .c {
          outline: none;
          outline-width: 1px;
        }"
      `);
    });

    it('does not sort inside atrules and rules', () => {
      const actual = transformWithoutSorting(outdent`
        @media all {
          .a {
            outline-width: 1px;
            outline: none;
            font: 16px normal;
            font-weight: bold;
          }
          .b {
            font-weight: bold;
            font: 24px light;
          }
          .c {
            outline: none;
            outline-width: 1px;
          }
        }

        .a:focus {
          outline-width: 1px;
          outline: none;
          font: 16px normal;
          font-weight: bold;
        }
        .b:not(.a) {
          font-weight: bold;
          font: 24px light;
        }
        .c[aria-label='test'] {
          outline: none;
          outline-width: 1px;
        }

        .a {
          outline-width: 1px;
          outline: none;
          font: 16px normal;
          font-weight: bold;
        }
        .b {
          font-weight: bold;
          font: 24px light;
        }
        .c {
          outline: none;
          outline-width: 1px;
        }
      `);

      // NOTE: There's still some default sorting, but not from this.
      expect(actual).toMatchInlineSnapshot(`
        "
        .b:not(.a) {
          font-weight: bold;
          font: 24px light;
        }
        .c[aria-label='test'] {
          outline: none;
          outline-width: 1px;
        }

        .a {
          outline-width: 1px;
          outline: none;
          font: 16px normal;
          font-weight: bold;
        }
        .b {
          font-weight: bold;
          font: 24px light;
        }
        .c {
          outline: none;
          outline-width: 1px;
        }

        .a:focus {
          outline-width: 1px;
          outline: none;
          font: 16px normal;
          font-weight: bold;
        }@media all {
          .a {
            outline-width: 1px;
            outline: none;
            font: 16px normal;
            font-weight: bold;
          }
          .b {
            font-weight: bold;
            font: 24px light;
          }
          .c {
            outline: none;
            outline-width: 1px;
          }
        }"
      `);
    });
  });
});
