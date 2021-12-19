import { transformSync } from '@babel/core';

import babelPlugin from '../babel-plugin-dom';

const transform = (code: TemplateStringsArray) => {
  return transformSync(code[0], {
    configFile: false,
    babelrc: false,
    plugins: [babelPlugin],
  })?.code;
};

describe('babel plugin dom', () => {
  it('should transform css call', () => {
    const actual = transform`
      import { Style } from '@compiled/dom__experimental';

      const styles = Style.create({
        red: { color: 'red', fontWeight: 500 },
        blue: { color: 'blue', fontWeight: 400 },
      });

      Style([styles.red, styles.blue]);
    `;

    expect(actual).toMatchInlineSnapshot(`
      "import { insertStyles, Style } from '@compiled/dom__experimental';
      const styles = {
        \\"red\\": \\"_syaz5scu _k48pbfng\\",
        \\"blue\\": \\"_syaz13q2 _k48p1nn1\\"
      };
      Style([styles.red, styles.blue]);
      insertStyles([\\"._syaz5scu{color:red}\\", \\"._k48pbfng{font-weight:500}\\", \\"._syaz13q2{color:blue}\\", \\"._k48p1nn1{font-weight:400}\\"])"
    `);
  });

  it('should throw when styles are not static', () => {
    expect(() => {
      transform`
        import gridSize from './theme';
        import { Style } from '@compiled/dom__experimental';

        const styles = Style.create({
          red: { color: gridSize },
          blue: { color: 'blue' },
        });
      `;
    }).toThrow('Styles must be statically defined in the module');
  });
});
