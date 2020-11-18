import { transformSync } from '@babel/core';
import babelPlugin from '../../index';

const transform = (code: string) => {
  return transformSync(code, {
    configFile: false,
    babelrc: false,
    compact: true,
    plugins: [babelPlugin],
  })?.code;
};

describe('class names string literal', () => {
  it('should move suffix of interpolation into inline styles', () => {
    const actual = transform(`
        import { ClassNames } from '@compiled/react';
        import { fontSize } from './nah';

        const ListItem = () => (
          <ClassNames>
            {({ css, style }) => <div style={style} className={css\`font-size: \${fontSize}px;\`}>hello, world!</div>}
          </ClassNames>
        );
      `);

    expect(actual).toIncludeMultiple([
      'font-size:var(--_1j2e0s2)',
      'style={{"--_1j2e0s2":(fontSize||"")+"px"}}',
    ]);
  });

  it('should transform no template string literal', () => {
    const actual = transform(`
        import { ClassNames } from '@compiled/react';

        const ListItem = () => (
          <ClassNames>
            {({ css }) => <div className={css\`font-size: 20px\`}>hello, world!</div>}
          </ClassNames>
        );
      `);

    expect(actual).toMatchInlineSnapshot(`
      "import*as React from'react';import{ax,CC,CS}from\\"@compiled/react/runtime\\";const _=\\"._1wybgktf{font-size:20px}\\";const ListItem=()=><CC>
          <CS>{[_]}</CS>
          {<div className={\\"_1wybgktf\\"}>hello, world!</div>}
        </CC>;"
    `);
  });

  it('should transform template string literal with string variable', () => {
    const actual = transform(`
        import { ClassNames } from '@compiled/react';

        const fontSize = '12px';

        const ListItem = () => (
          <ClassNames>
            {({ css }) => <div className={css\`font-size: \${fontSize};\`}>hello, world!</div>}
          </ClassNames>
        );
      `);

    expect(actual).toInclude(`{font-size:12px}`);
  });

  it('should transform template string literal with numeric variable', () => {
    const actual = transform(`
        import { ClassNames } from '@compiled/react';

        const fontSize = 12;

        const ListItem = () => (
          <ClassNames>
            {({ css }) => <div className={css\`font-size: \${fontSize};\`}>hello, world!</div>}
          </ClassNames>
        );
      `);

    expect(actual).toInclude(`{font-size:12}`);
  });

  it('should transform template string literal with obj variable', () => {
    const actual = transform(`
        import { ClassNames } from '@compiled/react';

        const color = { color: 'blue' };

        const ListItem = () => (
          <ClassNames>
            {({ css }) => <div className={css\`\${color}\`}>hello, world!</div>}
          </ClassNames>
        );
      `);

    expect(actual).toInclude(`{color:blue}`);
  });

  it('should transform template string with no argument arrow function variable', () => {
    const actual = transform(`
        import { ClassNames } from '@compiled/react';

        const color = () => ({ color: 'blue' });

        const ListItem = () => (
          <ClassNames>
            {({ css }) => <div className={css\`\${color()}\`}>hello, world!</div>}
          </ClassNames>
        );
      `);

    expect(actual).toInclude(`{color:blue}`);
  });

  it('should transform template string with no argument function variable', () => {
    const actual = transform(`
        import { ClassNames } from '@compiled/react';

        function color() { return { color: 'blue' }; }

        const ListItem = () => (
          <ClassNames>
            {({ css }) => <div className={css\`\${color()}\`}>hello, world!</div>}
          </ClassNames>
        );
      `);

    expect(actual).toInclude(`{color:blue}`);
  });
});
