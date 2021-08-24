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

describe('styled component string literal', () => {
  it('should respect missing units', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';
        const ListItem = styled.div\`
          font-size: 12;
        \`;
      `);

    expect(actual).toInclude('{font-size:12}');
  });

  it('should not pass down invalid html attributes to the node when property has a suffix', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';
        const ListItem = styled.div\`
          font-size: \${props => props.textSize}px;
        \`;
      `);

    expect(actual).toInclude('{font-size:var(--_fb92co)}');
    expect(actual).toInclude('textSize,...props}');
    expect(actual).toInclude('"--_fb92co":ix(textSize,"px")');
  });

  it('should use css mixins', () => {
    const actual = transform(`
      import { styled, css } from '@compiled/react';

      const big = \`font-size: 60px;\`;
      const color = { color: 'red' };
      const border = css\`border-left: 1px solid black\`;

      const ListItem = styled.div\`
        \${big};
        \${color};
        \${border};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '{font-size:60px}',
      '{color:red}',
      '{border-left:1px solid black}',
    ]);
  });

  it('should be able to override properties in a mixin', () => {
    const actual = transform(`
      import { styled, css } from '@compiled/react';

      const primary = css\`
        font-size: 32px;
        font-weight: bold;
        color: purple;
      \`;
    
      const secondary = css\`
        border: 1px solid red;
      \`;

      const Component = styled.button\`
        \${primary};
        font-size: 30px;
        \${secondary};
        color: blue;
        border: 2px solid black;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '{border:2px solid black}',
      '{color:blue}',
      '{font-size:30px}',
      '{font-weight:bold}',
    ]);
  });

  it('should inline constant numeric literal', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const fontSize = 20;

        const ListItem = styled.div\`
          font-size: \${fontSize}px;
        \`;
      `);

    expect(actual).toInclude('{font-size:20px}');
  });

  it('should move suffix to inline styles when referencing a mutable numeric literal', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        let fontSize = 20;
        fontSize = 19;

        const ListItem = styled.div\`
          font-size: \${fontSize}px;
        \`;
      `);

    expect(actual).toInclude('"--_1j2e0s2":ix(fontSize,"px")');
    expect(actual).toInclude('{font-size:var(--_1j2e0s2)}');
  });

  it('should move suffix to inline styles when referencing a mutable numeric literal when missing a semi colon', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        let fontSize = 20;
        fontSize = 19;

        const ListItem = styled.div\`
          font-size: \${fontSize}px
        \`;
      `);

    expect(actual).toInclude('"--_1j2e0s2":ix(fontSize,"px")');
    expect(actual).toInclude('{font-size:var(--_1j2e0s2)}');
  });

  it('should transform a static template literal', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          font-size: 20px;
        \`;
      `);

    expect(actual).toInclude('{font-size:20px}');
  });

  it('should inline constant string literal', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const fontSize = '20px';

        const ListItem = styled.div\`
          font-size: \${fontSize};
        \`;
      `);

    expect(actual).toInclude('{font-size:20px}');
  });

  it('should transform template string literal with prop reference', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          color: \${props => props.color};
        \`;
      `);

    expect(actual).toInclude('{color:var(--_1p69eoh)');
    expect(actual).toInclude('"--_1p69eoh":ix(props.color)');
  });

  it('should transform an arrow function with a body into an IIFE', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          color: \${props => { return props.color; }};
        \`;
      `);

    expect(actual).toInclude('{color:var(--_1poneq5)}');
    expect(actual).toInclude('"--_1poneq5":ix((()=>{return props.color;})())');
  });

  it('should transform an arrow function with a body into an IIFE by preventing passing down invalid html attributes to the node', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          font-size: \${props => { return props.textSize; }};
        \`;
      `);

    expect(actual).toInclude('{font-size:var(--_1j0t240)}');
    expect(actual).toInclude('({as:C="div",style,textSize,...props},ref)');
    expect(actual).toInclude('"--_1j0t240":ix((()=>{return textSize;})())');
  });

  it('should move suffix and prefix of a dynamic arrow function with a body into an IIFE', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          content: "$\{props => { return props.color; }}";
        \`;
      `);

    expect(actual).toInclude('{content:var(--_1poneq5)}');
    expect(actual).toInclude('"--_1poneq5":ix((()=>{return props.color;})(),"\\"","\\"")');
  });

  it('should move suffix and prefix of a dynamic arrow function with a body into an IIFE by preventing passing down invalid html attributes to the node', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          content: "$\{props => { return props.textSize; }}";
        \`;
      `);

    expect(actual).toInclude('{content:var(--_1j0t240)}');
    expect(actual).toInclude('({as:C="div",style,textSize,...props},ref)');
    expect(actual).toInclude('"--_1j0t240":ix((()=>{return textSize;})(),"\\"","\\"")');
  });

  it('should transform template string literal with obj variable', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const h200 = { fontSize: '12px' };

        const ListItem = styled.div\`
          \${h200};
          color: blue;
        \`;
      `);

    expect(actual).toInclude('{font-size:12px}');
    expect(actual).toInclude('{color:blue}');
  });

  it('should resolve identifier pointing to a call expression if it returns simple value', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const em = (str) => str;
        const color = em('blue');

        const ListItem = styled.div\`
          color: \${color};
        \`;
      `);

    expect(actual).toInclude('{color:blue}');
  });

  it('should inline call if it returns simple value', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const em = (str) => str;

        const ListItem = styled.div\`
          color: \${em('blue')};
        \`;
      `);

    expect(actual).toInclude('{color:blue}');
  });

  it('should transform template string with no argument arrow function variable', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const mixin = () => ({ color: 'red' });

        const ListItem = styled.div\`
          font-size: 20px;
          border: 1px solid black;
          \${mixin()};
          background: white;
        \`;
      `);

    expect(actual).toIncludeMultiple([
      '{font-size:20px}',
      '{border:1px solid black}',
      '{color:red}',
      '{background-color:white}',
    ]);
  });

  it('should transform template string with no argument arrow function variable when not called', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const mixin = () => ({ color: 'red' });

        const ListItem = styled.div\`
          border:1px solid black;
          \${mixin};
          background-color: white;
        \`;
      `);

    expect(actual).toIncludeMultiple([
      '{border:1px solid black}',
      '{color:red}',
      'background-color:white',
    ]);
  });

  it('should transform template string with no argument functions', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const color = () => 'blue';
        const fontStyling = {
          style: 'italic',
          family: 'sans-serif',
        };

        const mixin1 = function() { return fontStyling.style; };
        function mixin2() { return fontStyling.family; };

        const ListItem = styled.div\`
          color: blue;
          font-style: \${mixin1()};
          font-family: \${mixin2()};
          :hover { background-color: \${color()} };
        \`;
      `);

    expect(actual).toInclude(`{color:blue}`);
    expect(actual).toInclude(`{font-style:italic}`);
    expect(actual).toInclude(`{font-family:sans-serif}`);
    expect(actual).toInclude(':hover{background-color:blue}');
  });

  it('should transform template string with no argument function properties belonging to a variable', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const color = () => 'blue';
        const fontSize = 12;
        const fontStyling = {
          weight: 500
        };

        const sizes = {
          mixin1: () => '1px solid black',
          mixin2: () => fontSize,
          mixin3: function() {return fontStyling.weight;}
        };

        const ListItem = styled.div\`
          color: blue;
          border: \${sizes.mixin1()};
          font-size: \${sizes.mixin2()}px;
          font-weight: \${sizes.mixin3()};
          :hover { background-color: \${color()} };
        \`;
      `);

    expect(actual).toInclude(`{color:blue}`);
    expect(actual).toInclude(`{border:1px solid black}`);
    expect(actual).toInclude(`{font-size:12px}`);
    expect(actual).toInclude(`{font-weight:500}`);
    expect(actual).toInclude(':hover{background-color:blue}');
  });

  it('should move suffix and prefix of a dynamic arrow func property into the style property', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          content: "$\{props => props.color}";
        \`;
      `);

    expect(actual).toInclude('"--_1p69eoh":ix(props.color,"\\"","\\"")');
  });

  it('should move any prefix of a dynamic arrow func property into the style property', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          content: "$\{props => props.color}";
        \`;
      `);

    expect(actual).toInclude('"--_1p69eoh":ix(props.color,"\\"","\\"")');
  });

  it('should move any suffix of a dynamic arrow func property into the style property', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          font-size: $\{props => props.color}px;
        \`;
      `);

    expect(actual).toInclude('"--_1p69eoh":ix(props.color,"px")');
  });

  it('should move suffix and prefix of a dynamic property into the style property', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        let color = 'red';
        color = 'blue';

        const ListItem = styled.div\`
          content: "$\{color}";
          color: red;
        \`;
      `);

    expect(actual).toInclude('{content:var(--_1ylxx6h)}');
    expect(actual).toInclude('"--_1ylxx6h":ix(color,"\\"","\\"")');
  });

  it('should do nothing with suffix/prefix when referencing constant literal', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const color = 'red';
        const ListItem = styled.div\`
          content: "$\{color}";
          color: red;
        \`;
      `);

    expect(actual).toInclude('{content:\\"red\\"}');
  });

  it('should transform template string with no argument function variable', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        function mixin() {
          return { color: 'red' };
        }

        const ListItem = styled.div\`
          border:1px solid black;
          \${mixin()};
          background: white;
        \`;
      `);

    expect(actual).toIncludeMultiple([
      '{border:1px solid black}',
      '{color:red}',
      '{background-color:white}',
    ]);
  });

  it('should transform template string with argument arrow function variable', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const color1 = 'black';
        const mixin = ({ color1, color2: c }, color3, radius) => ({
          color: color1,
          backgroundColor: c,
          borderColor: color3 ,
          borderRadius: radius,
        });

        const color = { red: 'red' };
        const greenColor = 'green';

        const ListItem = styled.div\`
          font-size: 20px;
          \${mixin({ color1: color.red, color2: 'blue' }, greenColor, 10)};
          font-weight: bold;
        \`;
    `);

    expect(actual).toIncludeMultiple([
      '{font-size:20px}',
      '{color:red}',
      '{background-color:blue}',
      '{border-color:green}',
      '{border-radius:10px}',
      '{font-weight:bold}',
    ]);
  });

  it('should transform template string with unresolved argument arrow function variable', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const radius = 10;
        const mixin = (color1, radius, size, weight) => ({
          color: color1,
          borderRadius: radius,
          fontSize: size,
          fontWeight: weight
        });

        const ListItem = styled.div\`
          background: white;
          \${mixin(props.color1, radius)};
          border: 1px solid black;
        \`;
      `);

    expect(actual).toIncludeMultiple([
      '{background-color:white}',
      '{color:var(--_zo7lop)}',
      '"--_zo7lop":ix(props.color1)',
      '{border-radius:10px}',
      '{font-weight:var(--_u6vle4)}',
      '"--_u6vle4":ix()',
      '{font-size:var(--_kre2x8)}',
      '"--_kre2x8":ix()',
      '{border:1px solid black}',
    ]);
  });

  it('should transform template string with argument arrow function variable inside member expression', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const mixin = {
          value: (color1, r, color2) => ({
            color: color1,
            borderRadius: r,
            borderColor: color2
          })
        }

        const radius = 10;

        const ListItem = styled.div\`
          font-size: 20px;
          \${mixin.value(props.color1, radius, 'red')};
          font-weight: bold;
        \`;
      `);

    expect(actual).toIncludeMultiple([
      '{font-size:20px}',
      '"--_zo7lop":ix(props.color1)',
      '{border-radius:10px}',
      '{border-color:red}',
      '{font-weight:bold}',
    ]);
  });

  it('should only destructure a prop if hasnt been already', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div\`
          > :first-child {
            display: $\{(props) => (props.isShown ? 'none' : 'block')};
          }

          > :last-child {
            opacity: $\{(props) => (props.isShown ? 1 : 0)};
          }
        \`;
      `);

    // `isShown` should be destructured only once.
    expect(actual).toInclude('({as:C="div",style,isShown,...props},ref)');
  });

  it('should transform identifier referencing an expression with suffix', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        let br = 2 + 2;
        br += br;

        const Div = styled.div\`
          border-radius: \${br}px;
          color: red;
        \`;
      `);

    expect(actual).toInclude('{border-radius:var(--_1hwymmh)}');
    expect(actual).toInclude('"--_1hwymmh":ix(br,"px")');
  });

  it('should transform inline arrow function with suffix', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const getBr = () => 4;
        const Div = styled.div\`
          border-radius: \${getBr}px;
          color: red;
        \`;
      `);

    expect(actual).toInclude('{border-radius:4px}');
    expect(actual).toInclude('{color:red}');
  });

  it('should transform arrow function call that returns css like object', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const getBr = () => ({ fontSize: 12 });
        const Div = styled.div\`
          \${getBr()};
          color: red;
        \`;
      `);

    expect(actual).toInclude('{font-size:12px}');
    expect(actual).toInclude('{color:red}');
  });

  it('should transform arrow function call that returns number', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const getBr = () => 12;
        const Div = styled.div\`
          font-size: \${getBr()}px;
          color: red;
        \`;
      `);

    expect(actual).toInclude('{font-size:12px}');
    expect(actual).toInclude('{color:red}');
  });

  it('should transform arrow function call that has a complex body', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';

        const getBr = () => {
          return true ? '1' : '2';
        };
        const Div = styled.div\`
          font-size: \${getBr()}px;
          color: red;
        \`;
      `);

    expect(actual).toInclude('{color:red}');
    expect(actual).toInclude('{font-size:1px}');
  });

  it('should transform function returning an object', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';
        import React from 'react';

        const color = 'red';
        const mixin = () => ({ color });

        const ListItem = styled.div\`
          color: \${mixin().color};
        \`;
      `);

    expect(actual).toInclude('{color:red}');
  });

  it('should transform member expression referencing a function which returns an object', () => {
    const actual = transform(`
        import { styled } from '@compiled/react';
        import React from 'react';

        const color = 'red';
        const mixin = () => ({ color });

        const colors = mixin();

        const ListItem = styled.div\`
          color: \${colors.color};
        \`;
      `);

    expect(actual).toInclude('{color:red}');
  });

  it('should handle destructuring in interpolation functions', () => {
    const actual = transform(
      `
      import { styled } from '@compiled/react';
      import colors from 'colors';

      export const BadgeSkeleton = styled.span\`
        background-color: \${({ isLoading }) => (isLoading ? colors.N20 : colors.N40)};
        color: \${({ loading: l }) => (l ? colors.N50 : colors.N10)};
        border-color: \${(propz) => (propz.loading ? colors.N100 : colors.N200)};
      \`;
    `
    );

    expect(actual).not.toIncludeMultiple([
      'l?colors.N50:colors.N10',
      'propz.loading?colors.N100:colors.N200',
    ]);

    expect(actual).toIncludeMultiple([
      'isLoading?colors.N20:colors.N40',
      'loading?colors.N50:colors.N10',
      'props.loading?colors.N100:colors.N200',
    ]);
  });

  it('should not use the destructured name to prevent naming collisions', () => {
    const actual = transform(
      `
      import { styled } from '@compiled/react';
      import colors from 'colors';

      export const BadgeSkeleton = styled.span\`
        background-color: \${({ isLoading }) => (isLoading ? colors.N20 : colors.N40)};
        color: \${({ loading: l }) => (l ? colors.N50 : colors.N10)};
        border-color: \${(propz) => (propz.loading ? colors.N100 : colors.N200)};
      \`;
    `
    );

    expect(actual).toInclude('{as:C="span",style,isLoading,loading,...props}');
  });
});
