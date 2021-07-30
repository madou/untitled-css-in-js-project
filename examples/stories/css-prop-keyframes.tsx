import { css } from '@compiled/react';

export default {
  title: 'css prop/keyframes (inline)',
};

export const ShorthandObjectCallExpression = (): JSX.Element => (
  <div
    css={{
      '@keyframes fadeOut-socec': {
        from: {
          color: 'blue',
          opacity: 1,
        },
        to: {
          color: 'indigo',
          opacity: 0,
        },
      },
      animation: 'fadeOut-socec 2s ease-in-out infinite',
    }}>
    hello world
  </div>
);

export const ShorthandTaggedTemplateExpression = (): JSX.Element => (
  <div
    css={css`
      @keyframes fadeOut-sttec {
        from {
          color: blue;
          opacity: 1;
        }
        to {
          color: indigo;
          opacity: 0;
        }
      }
      animation: fadeOut-sttec 2s ease-in-out infinite;
    `}>
    hello world
  </div>
);

export const ObjectCallExpression = (): JSX.Element => (
  <div
    css={{
      '@keyframes fadeOut-ocec': {
        from: {
          color: 'blue',
          opacity: 1,
        },
        to: {
          color: 'indigo',
          opacity: 0,
        },
      },
      animationDuration: '2s',
      animationIterationCount: 'infinite',
      animationName: 'fadeOut-ocec',
      animationTimingFunction: 'ease-in-out',
    }}>
    hello world
  </div>
);

export const TaggedTemplateExpression = (): JSX.Element => (
  <div
    css={css`
      @keyframes fadeOut-ttec {
        from {
          color: blue;
          opacity: 1;
        }
        to {
          color: indigo;
          opacity: 0;
        }
      }
      animation-duration: 2s;
      animation-iteration-count: infinite;
      animation-name: fadeOut-ttec;
      animation-timing-function: ease-in-out;
    `}>
    hello world
  </div>
);
