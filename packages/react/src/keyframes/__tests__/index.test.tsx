import { keyframes, styled } from '@compiled/react';
import { render } from '@testing-library/react';

import defaultFadeOut, { fadeOut as shadowedFadeOut, namedFadeOut } from '../__fixtures__';

const getOpacity = (str: string | number) => str;

const getKeyframe = (name: string) => {
  const styles = Array.from(
    document.body.querySelectorAll('style'),
    (style) => style.innerHTML
  ).join('\n');

  return styles.substring(styles.indexOf(`@keyframes ${name}`));
};

describe('keyframes', () => {
  describe('referenced through a css prop', () => {
    describe('render an animation', () => {
      it('given an object call expression argument', () => {
        const fadeOut = keyframes({
          from: {
            opacity: 1,
          },
          to: {
            opacity: 0,
          },
        });

        const { getByText } = render(<div css={{ animationName: fadeOut }}>hello world</div>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1m8j3od');
        expect(getKeyframe('k1m8j3od')).toMatchInlineSnapshot(
          `"@keyframes k1m8j3od{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('given a template literal call expression argument', () => {
        const fadeOut = keyframes(`from { opacity: 1; } to { opacity: 0; }`);
        const { getByText } = render(<div css={{ animationName: fadeOut }}>hello world</div>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'klmf72q');
        expect(getKeyframe('klmf72q')).toMatchInlineSnapshot(
          `"@keyframes klmf72q{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('given a string call expression argument', () => {
        const fadeOut = keyframes('from { opacity: 1; } to { opacity: 0; }');
        const { getByText } = render(<div css={{ animationName: fadeOut }}>hello world</div>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1b0zjii');
        expect(getKeyframe('k1b0zjii')).toMatchInlineSnapshot(
          `"@keyframes k1b0zjii{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('given a tagged template expression', () => {
        const fadeOut = keyframes`
          from { opacity: 1; }
          to   { opacity: 0; }
        `;

        const { getByText } = render(<div css={{ animationName: fadeOut }}>hello world</div>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1vk0ha6');
        expect(getKeyframe('k1vk0ha6')).toMatchInlineSnapshot(
          `"@keyframes k1vk0ha6{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('defined in a default import', () => {
        const { getByText } = render(
          <div css={{ animationName: defaultFadeOut }}>hello world</div>
        );

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1m8j3od');
        expect(getKeyframe('k1m8j3od')).toMatchInlineSnapshot(
          `"@keyframes k1m8j3od{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('defined in an imported named import', () => {
        const { getByText } = render(<div css={{ animationName: namedFadeOut }}>hello world</div>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1m8j3od');
        expect(getKeyframe('k1m8j3od')).toMatchInlineSnapshot(
          `"@keyframes k1m8j3od{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('defined in a local named import', () => {
        const { getByText } = render(
          <div css={{ animationName: shadowedFadeOut }}>hello world</div>
        );

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1m8j3od');
        expect(getKeyframe('k1m8j3od')).toMatchInlineSnapshot(
          `"@keyframes k1m8j3od{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('containing a call expression', () => {
        const from = 1;
        const to = 0;

        const fadeOut = keyframes({
          from: {
            opacity: getOpacity(from),
          },
          to: {
            opacity: getOpacity(to),
          },
        });

        const { getByText } = render(<div css={{ animationName: fadeOut }}>hello world</div>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'kbrsk95');
        expect(getKeyframe('kbrsk95')).toMatchInlineSnapshot(
          `"@keyframes kbrsk95{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('containing an identifier referencing a constant numeric literal', () => {
        const fromOpacity = 1;
        const toOpacity = 0;

        const fadeOut = keyframes({
          from: {
            opacity: fromOpacity,
          },
          to: {
            opacity: toOpacity,
          },
        });

        const { getByText } = render(<div css={{ animationName: fadeOut }}>hello world</div>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'korwhog');
        expect(getKeyframe('korwhog')).toMatchInlineSnapshot(
          `"@keyframes korwhog{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('containing an identifier referencing a call expression', () => {
        const fromOpacity = getOpacity(1);
        const toOpacity = getOpacity(0);

        const fadeOut = keyframes({
          from: {
            opacity: fromOpacity,
          },
          to: {
            opacity: toOpacity,
          },
        });

        const { getByText } = render(<div css={{ animationName: fadeOut }}>hello world</div>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'korwhog');
        expect(getKeyframe('korwhog')).toMatchInlineSnapshot(
          `"@keyframes korwhog{0%{opacity:1}to{opacity:0}}"`
        );
      });
    });
  });

  describe('referenced through a styled component', () => {
    describe('render an animation', () => {
      it('given an object call expression argument', () => {
        const fadeOut = keyframes({
          from: {
            opacity: 1,
          },
          to: {
            opacity: 0,
          },
        });

        const Component = styled.div({ animationName: fadeOut });

        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1m8j3od');
        expect(getKeyframe('k1m8j3od')).toMatchInlineSnapshot(
          `"@keyframes k1m8j3od{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('given a template literal call expression argument', () => {
        const fadeOut = keyframes(`from { opacity: 1; } to { opacity: 0; }`);
        const Component = styled.div({ animationName: fadeOut });
        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'klmf72q');
        expect(getKeyframe('klmf72q')).toMatchInlineSnapshot(
          `"@keyframes klmf72q{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('given a string call expression argument', () => {
        const fadeOut = keyframes('from { opacity: 1; } to { opacity: 0; }');
        const Component = styled.div({ animationName: fadeOut });
        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1b0zjii');
        expect(getKeyframe('k1b0zjii')).toMatchInlineSnapshot(
          `"@keyframes k1b0zjii{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('given a tagged template expression', () => {
        const fadeOut = keyframes`
          from { opacity: 1; }
          to   { opacity: 0; }
        `;

        const Component = styled.div({ animationName: fadeOut });
        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1vk0ha6');
        expect(getKeyframe('k1vk0ha6')).toMatchInlineSnapshot(
          `"@keyframes k1vk0ha6{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('defined in a default export', () => {
        const Component = styled.div({ animationName: defaultFadeOut });
        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1m8j3od');
        expect(getKeyframe('k1m8j3od')).toMatchInlineSnapshot(
          `"@keyframes k1m8j3od{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('defined in an imported named import', () => {
        const Component = styled.div({ animationName: namedFadeOut });
        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1m8j3od');
        expect(getKeyframe('k1m8j3od')).toMatchInlineSnapshot(
          `"@keyframes k1m8j3od{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('defined in a local named import', () => {
        const Component = styled.div({ animationName: shadowedFadeOut });
        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'k1m8j3od');
        expect(getKeyframe('k1m8j3od')).toMatchInlineSnapshot(
          `"@keyframes k1m8j3od{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('containing a call expression', () => {
        const from = 1;
        const to = 0;

        const fadeOut = keyframes({
          from: {
            opacity: getOpacity(from),
          },
          to: {
            opacity: getOpacity(to),
          },
        });

        const Component = styled.div({ animationName: fadeOut });
        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'kbrsk95');
        expect(getKeyframe('kbrsk95')).toMatchInlineSnapshot(
          `"@keyframes kbrsk95{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('containing an identifier referencing a constant numeric literal', () => {
        const fromOpacity = 1;
        const toOpacity = 0;

        const fadeOut = keyframes({
          from: {
            opacity: fromOpacity,
          },
          to: {
            opacity: toOpacity,
          },
        });

        const Component = styled.div({ animationName: fadeOut });
        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'korwhog');
        expect(getKeyframe('korwhog')).toMatchInlineSnapshot(
          `"@keyframes korwhog{0%{opacity:1}to{opacity:0}}"`
        );
      });

      it('containing an identifier referencing a call expression', () => {
        const fromOpacity = getOpacity(1);
        const toOpacity = getOpacity(0);

        const fadeOut = keyframes({
          from: {
            opacity: fromOpacity,
          },
          to: {
            opacity: toOpacity,
          },
        });

        const Component = styled.div({ animationName: fadeOut });
        const { getByText } = render(<Component>hello world</Component>);

        expect(getByText('hello world')).toHaveCompiledCss('animation-name', 'korwhog');
        expect(getKeyframe('korwhog')).toMatchInlineSnapshot(
          `"@keyframes korwhog{0%{opacity:1}to{opacity:0}}"`
        );
      });
    });
  });
});
