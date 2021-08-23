import { styled } from '@compiled/react';

export default {
  title: 'styled/keyframes (inline)',
};

const StyledShorthandObjectCallExpression = styled.div({
  '@keyframes fadeOut-ssoce': {
    from: {
      color: 'blue',
      opacity: 1,
    },
    to: {
      color: 'indigo',
      opacity: 0,
    },
  },
  animation: 'fadeOut-ssoce 2s ease-in-out infinite',
});

export const ShorthandObjectCallExpression = (): JSX.Element => (
  <StyledShorthandObjectCallExpression>hello world</StyledShorthandObjectCallExpression>
);

const StyledShorthandTaggedTemplateExpression = styled.div`
  @keyframes fadeOut-sstte {
    from {
      color: blue;
      opacity: 1;
    }
    to {
      color: indigo;
      opacity: 0;
    }
  }
  animation: fadeOut-sstte 2s ease-in-out infinite;
`;

export const ShorthandTaggedTemplateExpression = (): JSX.Element => (
  <StyledShorthandTaggedTemplateExpression>hello world</StyledShorthandTaggedTemplateExpression>
);

const StyledObjectCallExpression = styled.div({
  '@keyframes fadeOut-soce': {
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
  animationName: 'fadeOut-soce',
  animationTimingFunction: 'ease-in-out',
});

export const ObjectCallExpression = (): JSX.Element => (
  <StyledObjectCallExpression>hello world</StyledObjectCallExpression>
);

const StyledTaggedTemplateExpression = styled.div`
  @keyframes fadeOut-stte {
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
  animation-name: fadeOut-stte;
  animation-timing-function: ease-in-out;
`;

export const TaggedTemplateExpression = (): JSX.Element => (
  <StyledTaggedTemplateExpression>hello world</StyledTaggedTemplateExpression>
);
