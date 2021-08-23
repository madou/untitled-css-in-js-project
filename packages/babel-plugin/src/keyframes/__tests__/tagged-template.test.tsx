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

describe('keyframes transforms a tagged template expression', () => {
  beforeAll(() => {
    process.env.AUTOPREFIXER = 'off';
  });

  afterAll(() => {
    delete process.env.AUTOPREFIXRER;
  });

  const createSmokeTest = (usage: string) => `
    import { css, keyframes, styled } from '@compiled/react';

    const fadeOut = keyframes\`
      from, 25% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
      to {
        opacity: 0;
      }
    \`;

    ${usage}
  `;

  describe('referenced through a css prop object call expression', () => {
    describe('by inlining static values', () => {
      it('used with the longhand syntax', () => {
        const actual = transform(createSmokeTest(longhandCssPropObjectCallExpression));

        expect(actual).toMatchInlineSnapshot(`
          "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
          const _3 = \\"._j7hqfz77{animation-name:k18au4lx}\\";
          const _2 =
            \\"@keyframes k18au4lx{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
          const _ = \\"._5sagymdr{animation-duration:2s}\\";
          const fadeOut = null;
          <CC>
            <CS>{[_, _2, _3, _4]}</CS>
            {<div className={ax([\\"_5sagymdr\\", \\"_j7hqfz77 _1pgl1ytf\\"])} />}
          </CC>;
          "
        `);
      });

      it('used with the shorthand syntax', () => {
        const actual = transform(createSmokeTest(shorthandCssPropObjectCallExpression));

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._y44v18hb{animation:k18au4lx 2s ease-in-out}\\";
          const _ = \\"@keyframes k18au4lx{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_y44v18hb\\"])} />}
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
          const _3 = \\"._j7hqfz77{animation-name:k18au4lx}\\";
          const _2 = \\"._5sagymdr{animation-duration:2s}\\";
          const _ = \\"@keyframes k18au4lx{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
          const fadeOut = null;
          <CC>
            <CS>{[_, _2, _3, _4]}</CS>
            {<div className={ax([\\"_5sagymdr _j7hqfz77 _1pgl1ytf\\"])} />}
          </CC>;
          "
        `);
      });

      it('used with the shorthand syntax', () => {
        const actual = transform(createSmokeTest(shorthandCssPropTaggedTemplateExpression));

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._y44v18hb{animation:k18au4lx 2s ease-in-out}\\";
          const _ = \\"@keyframes k18au4lx{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_y44v18hb\\"])} />}
          </CC>;
          "
        `);
      });
    });

    it('by inlining identifiers that reference constant literals', () => {
      const actual = transform(`
        import { css, keyframes } from '@compiled/react';

        const fromColor = 'blue';
        const fromOpacity = 1;

        const toColor = 'indigo';
        const toOpacity = 0;

        const fadeOut = keyframes\`
          from {
            color: \${fromColor};
            opacity: \${fromOpacity};
          }
          to {
            color: \${toColor};
            opacity: \${toOpacity};
          }
        \`;

        <div css={css\`animation-name: \${fadeOut}\`} />
      `);

      expect(actual).toMatchInlineSnapshot(`
        "const _2 = \\"._j7hqkl5x{animation-name:k1nhciry}\\";
        const _ =
          \\"@keyframes k1nhciry{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";
        const fromColor = \\"blue\\";
        const fromOpacity = 1;
        const toColor = \\"indigo\\";
        const toOpacity = 0;
        const fadeOut = null;
        <CC>
          <CS>{[_, _2]}</CS>
          {<div className={ax([\\"_j7hqkl5x\\"])} />}
        </CC>;
        "
      `);
    });

    it('by inlining member expressions that reference identifiers with simple values', () => {
      const actual = transform(`
        import { css, keyframes } from '@compiled/react';

        const from = { color: 'blue', opacity: 1 };
        const to = { color: 'indigo', opacity: 0 };

        const fadeOut = keyframes\`
          from {
            color: \${from.color};
            opacity: \${from.opacity};
          }
          to {
            color: \${to.color};
            opacity: \${to.opacity};
          }
        \`;

        <div css={css\`animation-name: \${fadeOut}\`} />
      `);

      expect(actual).toMatchInlineSnapshot(`
        "const _2 = \\"._j7hq6mn5{animation-name:k1qntra6}\\";
        const _ =
          \\"@keyframes k1qntra6{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";
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
          {<div className={ax([\\"_j7hq6mn5\\"])} />}
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

          const fadeOut = keyframes\`
            from {
              color: \${animation.colors.light.from};
              opacity: \${animation.opacities.from};
            }
            to {
              color: \${animation.colors.light.to};
              opacity: \${animation.opacities.to};
            }
          \`;

          <div css={css\`animation-name: \${fadeOut}\`} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hqzznm{animation-name:k1m6gmtw}\\";
          const _ =
            \\"@keyframes k1m6gmtw{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";
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
            {<div className={ax([\\"_j7hqzznm\\"])} />}
          </CC>;
          "
        `);
      });

      it('identifiers with simple values', () => {
        const actual = transform(`
          import { css, keyframes } from '@compiled/react';

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

          const fadeOut = keyframes\`
            from {
              color: \${animation.colors.light.from};
              opacity: \${animation.opacities.from};
            }
            to {
              color: \${animation.colors.light.to};
              opacity: \${animation.opacities.to};
            }
          \`;

          <div css={css\`animation-name: \${fadeOut}\`} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hqzznm{animation-name:k1m6gmtw}\\";
          const _ =
            \\"@keyframes k1m6gmtw{0%{color:blue;opacity:1}to{color:indigo;opacity:1}}\\";
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
            {<div className={ax([\\"_j7hqzznm\\"])} />}
          </CC>;
          "
        `);
      });
    });

    it('by inlining call expressions that return simple values', () => {
      const actual = transform(`
        import { css, keyframes } from '@compiled/react';

        const identity = (x) => x;

        const fadeOut = keyframes\`
          from {
            color: \${identity('blue')};
            opacity: \${identity(1)};
          }
          to {
            color: \${identity('indigo')};
            opacity: \${identity(0)};
          }
        \`;

        <div css={css\`animation-name: \${fadeOut}\`} />
      `);

      expect(actual).toMatchInlineSnapshot(`
        "const _2 = \\"._j7hqi8pm{animation-name:krmwxos}\\";
        const _ =
          \\"@keyframes krmwxos{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

        const identity = (x) => x;

        const fadeOut = null;
        <CC>
          <CS>{[_, _2]}</CS>
          {<div className={ax([\\"_j7hqi8pm\\"])} />}
        </CC>;
        "
      `);
    });

    it('by inlining identifiers that reference simple call expressions', () => {
      const actual = transform(`
        import { css, keyframes } from '@compiled/react';

        const identity = (x) => x;

        const fromColor = identity('blue');
        const fromOpacity = identity(1);

        const toColor = identity('indigo');
        const toOpacity = identity(0);

        const fadeOut = keyframes\`
          from {
            color: \${fromColor};
            opacity: \${fromOpacity};
          }
          to {
            color: \${toColor};
            opacity: \${toOpacity};
          }
        \`;

        <div css={css\`animation-name: \${fadeOut}\`} />
      `);

      expect(actual).toMatchInlineSnapshot(`
        "const _2 = \\"._j7hqkl5x{animation-name:k1nhciry}\\";
        const _ =
          \\"@keyframes k1nhciry{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

        const identity = (x) => x;

        const fromColor = identity(\\"blue\\");
        const fromOpacity = identity(1);
        const toColor = identity(\\"indigo\\");
        const toOpacity = identity(0);
        const fadeOut = null;
        <CC>
          <CS>{[_, _2]}</CS>
          {<div className={ax([\\"_j7hqkl5x\\"])} />}
        </CC>;
        "
      `);
    });

    describe('by inlining member expressions that return object expressions', () => {
      it('through an arrow function call expression', () => {
        const actual = transform(`
          import { css, keyframes } from '@compiled/react';

          const from = () => ({ color: 'blue', opacity: 1 });
          const to = () => ({ color: 'indigo', opacity: 0 });

          const fadeOut = keyframes\`
            from {
              color: \${from().color};
              opacity: \${from().opacity};
            }
            to {
              color: \${to().color};
              opacity: \${to().opacity};
            }
          \`;

          <div css={css\`animation-name: \${fadeOut}\`} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hqy222{animation-name:ks8zti8}\\";
          const _ =
            \\"@keyframes ks8zti8{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

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
            {<div className={ax([\\"_j7hqy222\\"])} />}
          </CC>;
          "
        `);
      });

      it('through an identifier that references an arrow function call expression', () => {
        const actual = transform(`
          import { css, keyframes } from '@compiled/react';

          const getFrom = () => ({ color: 'blue', opacity: 1 });
          const getTo = () => ({ color: 'indigo', opacity: 0 });

          const from = getFrom();
          const to = getTo();

          const fadeOut = keyframes\`
            from {
              color: \${from.color};
              opacity: \${from.opacity};
            }
            to {
              color: \${to.color};
              opacity: \${to.opacity};
            }
          \`;

          <div css={css\`animation-name: \${fadeOut}\`} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hqdjmv{animation-name:k1o01d59}\\";
          const _ =
            \\"@keyframes k1o01d59{0%{color:blue;opacity:1}to{color:indigo;opacity:0}}\\";

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
            {<div className={ax([\\"_j7hqdjmv\\"])} />}
          </CC>;
          "
        `);
      });
    });

    describe('by inlining suffixes prefixed by an', () => {
      it('identifier that references a number literal', () => {
        const actual = transform(`
          import { css, keyframes } from '@compiled/react';

          const fromFontSize = 14;
          const toFontSize = 18;

          const enlargeFont = keyframes\`
            from {
              fontSize: \${fromFontSize}px;
            }
            to {
              fontSize: \${toFontSize}px;
            }
          \`;

          <div css={css\`animation-name: \${enlargeFont}\`} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hqrsut{animation-name:k1e6gzsx}\\";
          const _ = \\"@keyframes k1e6gzsx{0%{fontSize:14px}to{fontSize:18px}}\\";
          const fromFontSize = 14;
          const toFontSize = 18;
          const enlargeFont = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_j7hqrsut\\"])} />}
          </CC>;
          "
        `);
      });

      it('arrow function expression call that returns a number literal', () => {
        const actual = transform(`
          import { css, keyframes } from '@compiled/react';

          const fromFontSize = () => 14;
          const toFontSize = () => 18;

          const enlargeFont = keyframes\`
            from {
              fontSize: \${fromFontSize()}px;
            }
            to {
              fontSize: \${toFontSize()}px;
            }
          \`;

          <div css={css\`animation-name: \${enlargeFont}\`} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hq1emf{animation-name:k14ysykh}\\";
          const _ = \\"@keyframes k14ysykh{0%{fontSize:14px}to{fontSize:18px}}\\";

          const fromFontSize = () => 14;

          const toFontSize = () => 18;

          const enlargeFont = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {<div className={ax([\\"_j7hq1emf\\"])} />}
          </CC>;
          "
        `);
      });
    });

    describe('by preserving runtime values', () => {
      it('for a static keyframe', () => {
        const actual = transform(`
          import { css, keyframes } from '@compiled/react';

          const getOpacity = (x) => runtime.enabled ? x : 1;

          const fadeOut = keyframes\`
            from {
              color: \${runtime.colors.blue};
              opacity: \${getOpacity(0)};
            }
            to {
              color: \${runtime.colors.indigo};
              opacity: \${getOpacity(1)};
            }
          \`;

          <div css={css\`animation-name: \${fadeOut}\`} />
        `);

        expect(actual).toMatchInlineSnapshot(`
          "const _2 = \\"._j7hq17yp{animation-name:kuadg5o}\\";
          const _ =
            \\"@keyframes kuadg5o{0%{color:var(--_1b1u9h2);opacity:var(--_19i50d6)}to{color:var(--_1q3t0o);opacity:var(--_1mdpi68)}}\\";

          const getOpacity = (x) => (runtime.enabled ? x : 1);

          const fadeOut = null;
          <CC>
            <CS>{[_, _2]}</CS>
            {
              <div
                className={ax([\\"_j7hq17yp\\"])}
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
          import { css, keyframes } from '@compiled/react';

          const generateKeyframes = (fromColor, toColor) =>
            keyframes\`
              from {
                color: \${fromColor};
                opacity: 1;
              }
              to {
                color: \${toColor};
                opacity: 0;
              }
            \`;

          ${length > 1 ? '<>' : ''}
          ${Array.from(
            { length },
            (_, i) => `
            <div css={css\`
              animation-name: \${generateKeyframes(runtime[${i}].from, runtime[${i}].to)};
              \${/* Shadowed value 1: fromColor defined here and in generateKeyframes */ ''}
              background-color: \${fromColor};
              \${/* Shadowed value 2: Same fromColor as in the animationName */ ''}
              color: \${runtime[${i}].from};
            \`} />
          `
          )}
          ${length > 1 ? '</>' : ''}
        `;

        it('applied to a single element', () => {
          const actual = transform(createDynamicAnimations(1));

          expect(actual).toMatchInlineSnapshot(`
            "const _4 = \\"._syaz115e{color:var(--_nfiion)}\\";
            const _3 = \\"._bfhk1220{background-color:var(--_1ud0qzp)}\\";
            const _2 = \\"._j7hq1vlm{animation-name:kr3p4uw}\\";
            const _ =
              \\"@keyframes kr3p4uw{0%{color:var(--_1tdwvvr);opacity:1}to{color:var(--_151ky4);opacity:0}}\\";

            const generateKeyframes = (fromColor, toColor) => null;

            <CC>
              <CS>{[_, _2, _3, _4]}</CS>
              {
                <div
                  className={ax([\\"_j7hq1vlm _bfhk1220 _syaz115e\\"])}
                  style={{
                    \\"--_1tdwvvr\\": ix(runtime[0].from),
                    \\"--_151ky4\\": ix(runtime[0].to),
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
            const _2 = \\"._j7hq1vlm{animation-name:kr3p4uw}\\";
            const _ =
              \\"@keyframes kr3p4uw{0%{color:var(--_1tdwvvr);opacity:1}to{color:var(--_151ky4);opacity:0}}\\";

            const generateKeyframes = (fromColor, toColor) => null;

            <>
              <CC>
                <CS>{[_, _2, _3, _4]}</CS>
                {
                  <div
                    className={ax([\\"_j7hq1vlm _bfhk1220 _syaz115e\\"])}
                    style={{
                      \\"--_1tdwvvr\\": ix(runtime[0].from),
                      \\"--_151ky4\\": ix(runtime[0].to),
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
                    className={ax([\\"_j7hq1vlm _bfhk1220 _syazjq9z\\"])}
                    style={{
                      \\"--_1tdwvvr\\": ix(runtime[1].from),
                      \\"--_151ky4\\": ix(runtime[1].to),
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

  describe('referenced through a styled component object call expression', () => {
    describe('by inlining static values', () => {
      it('used with the longhand syntax', () => {
        const actual = transform(createSmokeTest(longhandStyledObjectCallExpression));

        expect(actual).toMatchInlineSnapshot(`
          "const _4 = \\"._1pgl1ytf{animation-timing-function:ease-in-out}\\";
          const _3 = \\"._j7hqfz77{animation-name:k18au4lx}\\";
          const _2 =
            \\"@keyframes k18au4lx{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
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
                  className={ax([\\"_5sagymdr _j7hqfz77 _1pgl1ytf\\", props.className])}
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
          "const _2 = \\"._y44v18hb{animation:k18au4lx 2s ease-in-out}\\";
          const _ = \\"@keyframes k18au4lx{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
          const fadeOut = null;
          const StyledComponent = forwardRef(
            ({ as: C = \\"div\\", style, ...props }, ref) => (
              <CC>
                <CS>{[_, _2]}</CS>
                <C
                  {...props}
                  style={style}
                  ref={ref}
                  className={ax([\\"_y44v18hb\\", props.className])}
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
          const _3 = \\"._j7hqfz77{animation-name:k18au4lx}\\";
          const _2 = \\"._5sagymdr{animation-duration:2s}\\";
          const _ = \\"@keyframes k18au4lx{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
          const fadeOut = null;
          const StyledComponent = forwardRef(
            ({ as: C = \\"div\\", style, ...props }, ref) => (
              <CC>
                <CS>{[_, _2, _3, _4]}</CS>
                <C
                  {...props}
                  style={style}
                  ref={ref}
                  className={ax([\\"_5sagymdr _j7hqfz77 _1pgl1ytf\\", props.className])}
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
          "const _2 = \\"._y44v18hb{animation:k18au4lx 2s ease-in-out}\\";
          const _ = \\"@keyframes k18au4lx{25%,0%{opacity:1}50%{opacity:0.5}to{opacity:0}}\\";
          const fadeOut = null;
          const StyledComponent = forwardRef(
            ({ as: C = \\"div\\", style, ...props }, ref) => (
              <CC>
                <CS>{[_, _2]}</CS>
                <C
                  {...props}
                  style={style}
                  ref={ref}
                  className={ax([\\"_y44v18hb\\", props.className])}
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
