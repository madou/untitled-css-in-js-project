import { transform } from '../../__tests__/test-utils';
import {
  longhandCssPropObjectCallExpression,
  longhandCssPropTaggedTemplateExpression,
  longhandStyledObjectCallExpression,
  longhandStyledTaggedTemplateExpression,
  shorthandCssPropObjectCallExpression,
  shorthandCssPropTaggedTemplateExpression,
  shorthandStyledObjectCallExpression,
  shorthandStyledTaggedTemplateExpression,
} from '../__fixtures__';

describe('keyframes', () => {
  beforeAll(() => {
    process.env.AUTOPREFIXER = 'off';
  });

  afterAll(() => {
    delete process.env.AUTOPREFIXRER;
  });

  describe('transforms an object call expression', () => {
    const createSmokeTest = (usage: string) => `
      import { css, keyframes, styled } from '@compiled/react';

      const fadeOut = keyframes({
        'from, 25%': {
          opacity: 1,
        },
        '50%': {
          opacity: 0.5,
        },
        to: {
          opacity: 0,
        },
      });

      ${usage}
    `;

    describe('referenced through a css prop object call expression', () => {
      describe('by inlining static values', () => {
        it('used with the longhand syntax', () => {
          const actual = transform(createSmokeTest(longhandCssPropObjectCallExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
            const _3 = \\"._j7hq18s7{animation-name:k6qtb99}\\";
            const _2 = \\"@keyframes k6qtb99{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const _ = \\"._5sagymdr{animation-duration:2s}\\";
            const fadeOut = null;
            <CC>
              <CS>{[_, _2, _3, _4]}</CS>
              {<div className={ax([\\"_5sagymdr\\", \\"_j7hq18s7 _1pgl1ytf\\"])} />}
            </CC>;
            "
          `);
        });

        it('used with the shorthand syntax', () => {
          const actual = transform(createSmokeTest(shorthandCssPropObjectCallExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._y44vqxwj{animation:k6qtb99 2s ease-in-out}\\";
            const _ = \\"@keyframes k6qtb99{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_y44vqxwj\\"])} />}
            </CC>;
            "
          `);
        });
      });

      it('by inlining identifiers that reference constant literals', () => {
        const actual = transform(`
          import { keyframes } from '@compiled/react';

          const fromColor = 'blue';
          const fromOpacity = 1;

          const toColor = 'indigo';
          const toOpacity = 0;

          const fadeOut = keyframes({
            from: {
              color: fromColor,
              opacity: fromOpacity,
            },
            to: {
              color: toColor,
              opacity: toOpacity,
            },
          });

          <div css={{ animationName: fadeOut }} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hq1bo5{animation-name:kej80vs}\\";
          const _ =
            \\"@keyframes kej80vs{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";
          const fromColor = \\"blue\\";
          const fromOpacity = 1;
          const toColor = \\"indigo\\";
          const toOpacity = 0;
          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_j7hq1bo5\\"])} />}
          </CC>;
          "
        `);
      });

      it('by inlining identifiers that reference an object expression', () => {
        const actual = transform(`
          import { keyframes } from '@compiled/react';

          const from = { opacity: 1 };
          const to = { opacity: 0 };

          const fadeOut = keyframes({ from, to });

          <div css={{ animationName: fadeOut }} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hqocb1{animation-name:k1mv9s16}\\";
          const _ = \\"@keyframes k1mv9s16{0%{opacity:1}to{opacity:0}}\\";
          const from = {
            opacity: 1,
          };
          const to = {
            opacity: 0,
          };
          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_j7hqocb1\\"])} />}
          </CC>;
          "
        `);
      });

      it('by inlining member expressions that reference identifiers with simple values', () => {
        const actual = transform(`
          import { keyframes } from '@compiled/react';

          const from = { color: 'blue', opacity: 1 };
          const to = { color: 'indigo', opacity: 0 };

          const fadeOut = keyframes({
            from: {
              color: from.color,
              opacity: from.opacity,
            },
            to: {
              color: to.color,
              opacity: to.opacity,
            }
          });

          <div css={{ animationName: fadeOut }} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hqgafb{animation-name:k1qk0qiq}\\";
          const _ =
            \\"@keyframes k1qk0qiq{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";
          const from = {
            color: \\"blue\\",
            opacity: 1,
          };
          const to = {
            color: \\"indigo\\",
            opacity: 0,
          };
          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_j7hqgafb\\"])} />}
          </CC>;
          "
        `);
      });

      describe('by inlining nested member expressions that reference', () => {
        it('simple values', () => {
          const actual = transform(`
            import { css, keyframes } from '@compiled/react';

            const animation = {
              colors: {
                light: {
                  from: 'blue',
                  to: 'indigo',
                },
              },
              opacities: {
                from: 1,
                to: 0,
              },
            };

            const fadeOut = keyframes({
              from: {
                color: animation.colors.light.from,
                opacity: animation.opacities.from,
              },
              to: {
                color: animation.colors.light.to,
                opacity: animation.opacities.to,
              },
            });

            <div css={{ animationName: fadeOut }} />
          `);

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._j7hq1kkh{animation-name:k1tvirpx}\\";
            const _ =
              \\"@keyframes k1tvirpx{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";
            const animation = {
              colors: {
                light: {
                  from: \\"blue\\",
                  to: \\"indigo\\",
                },
              },
              opacities: {
                from: 1,
                to: 0,
              },
            };
            const fadeOut = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_j7hq1kkh\\"])} />}
            </CC>;
            "
          `);
        });

        it('identifiers with simple values', () => {
          const actual = transform(`
            import { keyframes } from '@compiled/react';

            const fromOpacity = 1;
            const toOpacity = 1;

            const primary = 'blue';
            const secondary = 'indigo';

            const animation = {
              colors: {
                light: {
                  from: primary,
                  to: secondary,
                },
              },
              opacities: {
                from: fromOpacity,
                to: toOpacity,
              },
            };

            const fadeOut = keyframes({
              from: {
                color: animation.colors.light.from,
                opacity: animation.opacities.from,
              },
              to: {
                color: animation.colors.light.to,
                opacity: animation.opacities.to,
              },
            });

            <div css={{ animationName: fadeOut }} />
          `);

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._j7hq1kkh{animation-name:k1tvirpx}\\";
            const _ =
              \\"@keyframes k1tvirpx{0%{color:blue;opacity:1}to{color:indigo;opacity:1}}\\";
            const fromOpacity = 1;
            const toOpacity = 1;
            const primary = \\"blue\\";
            const secondary = \\"indigo\\";
            const animation = {
              colors: {
                light: {
                  from: primary,
                  to: secondary,
                },
              },
              opacities: {
                from: fromOpacity,
                to: toOpacity,
              },
            };
            const fadeOut = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_j7hq1kkh\\"])} />}
            </CC>;
            "
          `);
        });
      });

      it('by inlining call expressions that return simple values', () => {
        const actual = transform(`
          import { keyframes } from '@compiled/react';

          const identity = (x) => x;

          const fadeOut = keyframes({
            from: {
              color: identity('blue'),
              opacity: identity(1),
            },
            to: {
              color: identity('indigo'),
              opacity: identity(0),
            },
          });

          <div css={{ animationName: fadeOut }} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hq1rje{animation-name:kykophz}\\";
          const _ =
            \\"@keyframes kykophz{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

          const identity = (x) => x;

          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_j7hq1rje\\"])} />}
          </CC>;
          "
        `);
      });

      it('by inlining identifiers that reference simple call expressions', () => {
        const actual = transform(`
          import { keyframes } from '@compiled/react';

          const identity = (x) => x;

          const fromColor = identity('blue');
          const fromOpacity = identity(1);

          const toColor = identity('indigo');
          const toOpacity = identity(0);

          const fadeOut = keyframes({
            from: {
              color: fromColor,
              opacity: fromOpacity,
            },
            to: {
              color: toColor,
              opacity: toOpacity,
            },
          });

          <div css={{ animationName: fadeOut }} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hq1bo5{animation-name:kej80vs}\\";
          const _ =
            \\"@keyframes kej80vs{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

          const identity = (x) => x;

          const fromColor = identity(\\"blue\\");
          const fromOpacity = identity(1);
          const toColor = identity(\\"indigo\\");
          const toOpacity = identity(0);
          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_j7hq1bo5\\"])} />}
          </CC>;
          "
        `);
      });

      it('by inlining an arrow function call expression that returns an object expression', () => {
        const actual = transform(`
          import { keyframes } from '@compiled/react';

          const from = () => ({ color: 'blue', opacity: 1 });
          const to = () => ({ color: 'indigo', opacity: 0 });

          const fadeOut = keyframes({
            from: from(),
            to: to(),
          });

          <div css={{ animationName: fadeOut }} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hqjcah{animation-name:k1e4zivv}\\";
          const _ =
            \\"@keyframes k1e4zivv{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

          const from = () => ({
            color: \\"blue\\",
            opacity: 1,
          });

          const to = () => ({
            color: \\"indigo\\",
            opacity: 0,
          });

          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_j7hqjcah\\"])} />}
          </CC>;
          "
        `);
      });

      it('by inlining a function declaration call expression that returns an object expression', () => {
        const actual = transform(`
          import { keyframes } from '@compiled/react';

          function from() {
            return { color: 'blue', opacity: 1 };
          }

          function to() {
            return { color: 'indigo', opacity: 0 };
          }

          const fadeOut = keyframes({
            from: from(),
            to: to(),
          });

          <div css={{ animationName: fadeOut }} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hqjcah{animation-name:k1e4zivv}\\";
          const _ =
            \\"@keyframes k1e4zivv{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

          function from() {
            return {
              color: \\"blue\\",
              opacity: 1,
            };
          }

          function to() {
            return {
              color: \\"indigo\\",
              opacity: 0,
            };
          }

          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_j7hqjcah\\"])} />}
          </CC>;
          "
        `);
      });

      describe('by inlining member expressions that return object expressions', () => {
        it('through an arrow function call expression', () => {
          const actual = transform(`
            import { keyframes } from '@compiled/react';

            const from = () => ({ color: 'blue', opacity: 1 });
            const to = () => ({ color: 'indigo', opacity: 0 });

            const fadeOut = keyframes({
              from: {
                color: from().color,
                opacity: from().opacity,
              },
              to: {
                color: to().color,
                opacity: to().opacity,
              },
            });

            <div css={{ animationName: fadeOut }} />
          `);

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._j7hqwahf{animation-name:k1fh39u1}\\";
            const _ =
              \\"@keyframes k1fh39u1{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

            const from = () => ({
              color: \\"blue\\",
              opacity: 1,
            });

            const to = () => ({
              color: \\"indigo\\",
              opacity: 0,
            });

            const fadeOut = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_j7hqwahf\\"])} />}
            </CC>;
            "
          `);
        });

        it('through an identifier that references an arrow function call expression', () => {
          const actual = transform(`
            import { keyframes } from '@compiled/react';

            const getFrom = () => ({ color: 'blue', opacity: 1 });
            const getTo = () => ({ color: 'indigo', opacity: 0 });

            const from = getFrom();
            const to = getTo();

            const fadeOut = keyframes({
              from: {
                color: from.color,
                opacity: from.opacity,
              },
              to: {
                color: to.color,
                opacity: to.opacity,
              },
            });

            <div css={{ animationName: fadeOut }} />
          `);

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._j7hqgafb{animation-name:k1qk0qiq}\\";
            const _ =
              \\"@keyframes k1qk0qiq{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

            const getFrom = () => ({
              color: \\"blue\\",
              opacity: 1,
            });

            const getTo = () => ({
              color: \\"indigo\\",
              opacity: 0,
            });

            const from = getFrom();
            const to = getTo();
            const fadeOut = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_j7hqgafb\\"])} />}
            </CC>;
            "
          `);
        });
      });

      describe('by inlining suffixes prefixed by an', () => {
        it('identifier that references a number literal', () => {
          const actual = transform(`
            import { keyframes } from '@compiled/react';

            const fromFontSize = 14;
            const toFontSize = 18;

            const enlargeFont = keyframes({
              from: {
                fontSize: \`\${fromFontSize}px\`,
              },
              to: {
                fontSize: \`\${toFontSize}px\`,
              },
            });

            <div css={{ animationName: enlargeFont }} />
          `);

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._j7hq1mki{animation-name:k1o8zrgy}\\";
            const _ = \\"@keyframes k1o8zrgy{0%{font-size:14px}to{font-size:18px}}\\";
            const fromFontSize = 14;
            const toFontSize = 18;
            const enlargeFont = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_j7hq1mki\\"])} />}
            </CC>;
            "
          `);
        });

        it('arrow function expression call that returns a number literal', () => {
          const actual = transform(`
            import { keyframes } from '@compiled/react';

            const fromFontSize = () => 14;
            const toFontSize = () => 18;

            const enlargeFont = keyframes({
              from: {
                fontSize: \`\${fromFontSize()}px\`,
              },
              to: {
                fontSize: \`\${toFontSize()}px\`,
              },
            });

            <div css={{ animationName: enlargeFont }} />
          `);

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._j7hq67nm{animation-name:k1m0lkgc}\\";
            const _ = \\"@keyframes k1m0lkgc{0%{font-size:14px}to{font-size:18px}}\\";

            const fromFontSize = () => 14;

            const toFontSize = () => 18;

            const enlargeFont = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_j7hq67nm\\"])} />}
            </CC>;
            "
          `);
        });
      });

      describe('by preserving runtime values', () => {
        it('for a static keyframe', () => {
          const actual = transform(`
            import { keyframes } from '@compiled/react';

            const getOpacity = (x) => runtime.enabled ? x : 1;

            const fadeOut = keyframes({
              from: {
                color: runtime.colors.blue,
                opacity: getOpacity(0),
              },
              to: {
                color: runtime.colors.indigo,
                opacity: getOpacity(1),
              }
            });

            <div css={{ animationName: fadeOut }} />
          `);

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._j7hq1vu4{animation-name:ka6olon}\\";
            const _ =
              \\"@keyframes ka6olon{0%{color:var(--_1b1u9h2);opacity:var(--_19i50d6)}to{color:var(--_1q3t0o);opacity:var(--_1mdpi68)}}\\";

            const getOpacity = (x) => (runtime.enabled ? x : 1);

            const fadeOut = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {
                <div
                  className={ax([\\"_j7hq1vu4\\"])}
                  style={{
                    \\"--_1b1u9h2\\": ix(runtime.colors.blue),
                    \\"--_19i50d6\\": ix(getOpacity(0)),
                    \\"--_1q3t0o\\": ix(runtime.colors.indigo),
                    \\"--_1mdpi68\\": ix(getOpacity(1)),
                  }}
                />
              }
            </CC>;
            "
          `);
        });

        describe('for a dynamic keyframe with shadowed values', () => {
          const createDynamicAnimations = (length: number) => `
            import { keyframes } from '@compiled/react';

            const generateKeyframes = (fromColor, toColor) =>
              keyframes({
                from: {
                  color: fromColor,
                  opacity: 1,
                },
                to: {
                  color: toColor,
                  opacity: 0,
                },
              });

            ${length > 1 ? '<>' : ''}
            ${Array.from(
              { length },
              (_, i) => `
              <div css={{
                animationName: generateKeyframes(runtime[${i}].from, runtime[${i}].to),
                // Shadowed value 1: fromColor defined here and in generateKeyframes
                backgroundColor: fromColor,
                // Shadowed value 2: Same fromColor as in the animationName
                color: runtime[${i}].from,
              }} />
            `
            )}
            ${length > 1 ? '</>' : ''}
          `;

          it('applied to a single element', () => {
            const actual = transform(createDynamicAnimations(1));

            expect(actual).toMatchInlineSnapshot(`
              "const _4 = \\"._syaz115e{color:var(--_nfiion)}\\";
              const _3 = \\"._bfhk1220{background-color:var(--_1ud0qzp)}\\";
              const _2 = \\"._j7hq1lmr{animation-name:kt18xj8}\\";
              const _ =
                \\"@keyframes kt18xj8{0%{color:var(--_113bsv7);opacity:1}to{color:var(--_k85g0d);opacity:0}}\\";

              const generateKeyframes = (fromColor, toColor) => null;

              <CC>
                <CS>{[_, _2, _3, _4]}</CS>
                {
                  <div
                    className={ax([\\"_j7hq1lmr _bfhk1220 _syaz115e\\"])}
                    style={{
                      \\"--_113bsv7\\": ix(runtime[0].from),
                      \\"--_k85g0d\\": ix(runtime[0].to),
                      \\"--_1ud0qzp\\": ix(fromColor),
                      \\"--_nfiion\\": ix(runtime[0].from),
                    }}
                  />
                }
              </CC>;
              "
            `);
          });

          it('applied to multiple elements', () => {
            const actual = transform(createDynamicAnimations(2));

            // Ensure only one @keyframes is generated
            expect(actual.match(/@keyframes/g)).toHaveLength(1);

            expect(actual).toMatchInlineSnapshot(`
              "const _5 = \\"._syazjq9z{color:var(--_we82k3)}\\";
              const _4 = \\"._syaz115e{color:var(--_nfiion)}\\";
              const _3 = \\"._bfhk1220{background-color:var(--_1ud0qzp)}\\";
              const _2 = \\"._j7hq1lmr{animation-name:kt18xj8}\\";
              const _ =
                \\"@keyframes kt18xj8{0%{color:var(--_113bsv7);opacity:1}to{color:var(--_k85g0d);opacity:0}}\\";

              const generateKeyframes = (fromColor, toColor) => null;

              <>
                <CC>
                  <CS>{[_, _2, _3, _4]}</CS>
                  {
                    <div
                      className={ax([\\"_j7hq1lmr _bfhk1220 _syaz115e\\"])}
                      style={{
                        \\"--_113bsv7\\": ix(runtime[0].from),
                        \\"--_k85g0d\\": ix(runtime[0].to),
                        \\"--_1ud0qzp\\": ix(fromColor),
                        \\"--_nfiion\\": ix(runtime[0].from),
                      }}
                    />
                  }
                </CC>
                ,
                <CC>
                  <CS>{[_, _2, _3, _5]}</CS>
                  {
                    <div
                      className={ax([\\"_j7hq1lmr _bfhk1220 _syazjq9z\\"])}
                      style={{
                        \\"--_113bsv7\\": ix(runtime[1].from),
                        \\"--_k85g0d\\": ix(runtime[1].to),
                        \\"--_1ud0qzp\\": ix(fromColor),
                        \\"--_we82k3\\": ix(runtime[1].from),
                      }}
                    />
                  }
                </CC>
              </>;
              "
            `);
          });
        });
      });
    });

    describe('referenced through a css prop tagged template expression', () => {
      describe('by inlining static values', () => {
        it('used with the longhand syntax', () => {
          const actual = transform(createSmokeTest(longhandCssPropTaggedTemplateExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
            const _3 = \\"._j7hq18s7{animation-name:k6qtb99}\\";
            const _2 = \\"._5sagymdr{animation-duration:2s}\\";
            const _ = \\"@keyframes k6qtb99{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            <CC>
              <CS>{[_, _2, _3, _4]}</CS>
              {<div className={ax([\\"_5sagymdr _j7hq18s7 _1pgl1ytf\\"])} />}
            </CC>;
            "
          `);
        });

        it('used with the shorthand syntax', () => {
          const actual = transform(createSmokeTest(shorthandCssPropTaggedTemplateExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._y44vqxwj{animation:k6qtb99 2s ease-in-out}\\";
            const _ = \\"@keyframes k6qtb99{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_y44vqxwj\\"])} />}
            </CC>;
            "
          `);
        });
      });
    });

    describe('referenced through a styled component object call expression', () => {
      describe('by inlining static values', () => {
        it('used with the longhand syntax', () => {
          const actual = transform(createSmokeTest(longhandStyledObjectCallExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
            const _3 = \\"._j7hq18s7{animation-name:k6qtb99}\\";
            const _2 = \\"@keyframes k6qtb99{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const _ = \\"._5sagymdr{animation-duration:2s}\\";
            const fadeOut = null;
            const StyledComponent = forwardRef(
              ({ as: C = \\"div\\", style, ...props }, ref) => (
                <CC>
                  <CS>{[_, _2, _3, _4]}</CS>
                  <C
                    {...props}
                    style={style}
                    ref={ref}
                    className={ax([\\"_5sagymdr _j7hq18s7 _1pgl1ytf\\", props.className])}
                  />
                </CC>
              )
            );
            "
          `);
        });

        it('used with the shorthand syntax', () => {
          const actual = transform(createSmokeTest(shorthandStyledObjectCallExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._y44vqxwj{animation:k6qtb99 2s ease-in-out}\\";
            const _ = \\"@keyframes k6qtb99{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            const StyledComponent = forwardRef(
              ({ as: C = \\"div\\", style, ...props }, ref) => (
                <CC>
                  <CS>{[_, _2]}</CS>
                  <C
                    {...props}
                    style={style}
                    ref={ref}
                    className={ax([\\"_y44vqxwj\\", props.className])}
                  />
                </CC>
              )
            );
            "
          `);
        });
      });
    });

    describe('referenced through a styled component tagged template expression', () => {
      describe('by inlining static values', () => {
        it('used with the longhand syntax', () => {
          const actual = transform(createSmokeTest(longhandStyledTaggedTemplateExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
            const _3 = \\"._j7hq18s7{animation-name:k6qtb99}\\";
            const _2 = \\"._5sagymdr{animation-duration:2s}\\";
            const _ = \\"@keyframes k6qtb99{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            const StyledComponent = forwardRef(
              ({ as: C = \\"div\\", style, ...props }, ref) => (
                <CC>
                  <CS>{[_, _2, _3, _4]}</CS>
                  <C
                    {...props}
                    style={style}
                    ref={ref}
                    className={ax([\\"_5sagymdr _j7hq18s7 _1pgl1ytf\\", props.className])}
                  />
                </CC>
              )
            );
            "
          `);
        });

        it('used with the shorthand syntax', () => {
          const actual = transform(createSmokeTest(shorthandStyledTaggedTemplateExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._y44vqxwj{animation:k6qtb99 2s ease-in-out}\\";
            const _ = \\"@keyframes k6qtb99{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            const StyledComponent = forwardRef(
              ({ as: C = \\"div\\", style, ...props }, ref) => (
                <CC>
                  <CS>{[_, _2]}</CS>
                  <C
                    {...props}
                    style={style}
                    ref={ref}
                    className={ax([\\"_y44vqxwj\\", props.className])}
                  />
                </CC>
              )
            );
            "
          `);
        });
      });
    });
  });

  describe('transforms a template literal call expression', () => {
    const createSmokeTest = (usage: string) => `
      import { css, keyframes, styled } from '@compiled/react';

      const fadeOut = keyframes(\`
        from {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
        to {
          opacity: 0;
        }
      \`);

      ${usage}
    `;

    describe('referenced through a css prop object call expression', () => {
      describe('by inlining static values', () => {
        it('used with the longhand syntax', () => {
          const actual = transform(createSmokeTest(longhandCssPropObjectCallExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
            const _3 = \\"._j7hq1ikk{animation-name:k6nhd4u}\\";
            const _2 = \\"@keyframes k6nhd4u{0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const _ = \\"._5sagymdr{animation-duration:2s}\\";
            const fadeOut = null;
            <CC>
              <CS>{[_, _2, _3, _4]}</CS>
              {<div className={ax([\\"_5sagymdr\\", \\"_j7hq1ikk _1pgl1ytf\\"])} />}
            </CC>;
            "
          `);
        });

        it('used with the shorthand syntax', () => {
          const actual = transform(createSmokeTest(shorthandCssPropObjectCallExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._y44v1e0n{animation:k6nhd4u 2s ease-in-out}\\";
            const _ = \\"@keyframes k6nhd4u{0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_y44v1e0n\\"])} />}
            </CC>;
            "
          `);
        });
      });
    });

    describe('referenced through a css prop tagged template expression', () => {
      describe('by inlining static values', () => {
        it('used with the longhand syntax', () => {
          const actual = transform(createSmokeTest(longhandCssPropTaggedTemplateExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
            const _3 = \\"._j7hq1ikk{animation-name:k6nhd4u}\\";
            const _2 = \\"._5sagymdr{animation-duration:2s}\\";
            const _ = \\"@keyframes k6nhd4u{0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            <CC>
              <CS>{[_, _2, _3, _4]}</CS>
              {<div className={ax([\\"_5sagymdr _j7hq1ikk _1pgl1ytf\\"])} />}
            </CC>;
            "
          `);
        });

        it('used with the shorthand syntax', () => {
          const actual = transform(createSmokeTest(shorthandCssPropTaggedTemplateExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._y44v1e0n{animation:k6nhd4u 2s ease-in-out}\\";
            const _ = \\"@keyframes k6nhd4u{0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            <CC>
              <CS>{[_, _2]}</CS>
              {<div className={ax([\\"_y44v1e0n\\"])} />}
            </CC>;
            "
          `);
        });
      });
    });

    describe('referenced through a styled component object call expression', () => {
      describe('by inlining static values', () => {
        it('used with the longhand syntax', () => {
          const actual = transform(createSmokeTest(longhandStyledObjectCallExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
            const _3 = \\"._j7hq1ikk{animation-name:k6nhd4u}\\";
            const _2 = \\"@keyframes k6nhd4u{0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const _ = \\"._5sagymdr{animation-duration:2s}\\";
            const fadeOut = null;
            const StyledComponent = forwardRef(
              ({ as: C = \\"div\\", style, ...props }, ref) => (
                <CC>
                  <CS>{[_, _2, _3, _4]}</CS>
                  <C
                    {...props}
                    style={style}
                    ref={ref}
                    className={ax([\\"_5sagymdr _j7hq1ikk _1pgl1ytf\\", props.className])}
                  />
                </CC>
              )
            );
            "
          `);
        });

        it('used with the shorthand syntax', () => {
          const actual = transform(createSmokeTest(shorthandStyledObjectCallExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._y44v1e0n{animation:k6nhd4u 2s ease-in-out}\\";
            const _ = \\"@keyframes k6nhd4u{0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            const StyledComponent = forwardRef(
              ({ as: C = \\"div\\", style, ...props }, ref) => (
                <CC>
                  <CS>{[_, _2]}</CS>
                  <C
                    {...props}
                    style={style}
                    ref={ref}
                    className={ax([\\"_y44v1e0n\\", props.className])}
                  />
                </CC>
              )
            );
            "
          `);
        });
      });
    });

    describe('referenced through a styled component tagged template expression', () => {
      describe('by inlining static values', () => {
        it('used with the longhand syntax', () => {
          const actual = transform(createSmokeTest(longhandStyledTaggedTemplateExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
            const _3 = \\"._j7hq1ikk{animation-name:k6nhd4u}\\";
            const _2 = \\"._5sagymdr{animation-duration:2s}\\";
            const _ = \\"@keyframes k6nhd4u{0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            const StyledComponent = forwardRef(
              ({ as: C = \\"div\\", style, ...props }, ref) => (
                <CC>
                  <CS>{[_, _2, _3, _4]}</CS>
                  <C
                    {...props}
                    style={style}
                    ref={ref}
                    className={ax([\\"_5sagymdr _j7hq1ikk _1pgl1ytf\\", props.className])}
                  />
                </CC>
              )
            );
            "
          `);
        });

        it('used with the shorthand syntax', () => {
          const actual = transform(createSmokeTest(shorthandStyledTaggedTemplateExpression));

          expect(actual).toMatchInlineSnapshot(`
            "const _2 = \\"._y44v1e0n{animation:k6nhd4u 2s ease-in-out}\\";
            const _ = \\"@keyframes k6nhd4u{0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
            const fadeOut = null;
            const StyledComponent = forwardRef(
              ({ as: C = \\"div\\", style, ...props }, ref) => (
                <CC>
                  <CS>{[_, _2]}</CS>
                  <C
                    {...props}
                    style={style}
                    ref={ref}
                    className={ax([\\"_y44v1e0n\\", props.className])}
                  />
                </CC>
              )
            );
            "
          `);
        });
      });
    });
  });
});
