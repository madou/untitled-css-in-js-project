import { css, keyframes, styled } from '@compiled/react';

import '../keyframes/globals';
import { fadeOut as shadowedFadeOut } from '../keyframes/tagged-template-literal';

// TODO Add css prop using a call expression mixin once supported: https://github.com/atlassian-labs/compiled/issues/789
export default {
  title: 'keyframes/tagged template expression',
};

const generateKeyframes = (fromColor: string, toColor: string) =>
  keyframes`
    from {
      color: ${fromColor};
      opacity: 1;
    }
    to {
      color: ${toColor};
      opacity: 0;
    }
  `;

export const RuntimeKeyframes = (): JSX.Element => (
  <>
    <div
      css={`
        animation: ${generateKeyframes(
            window.runtime.blueToIndigo.from,
            window.runtime.blueToIndigo.to
          )}
          2s ease-in-out infinite;
      `}>
      blue to indigo
    </div>
    <div
      css={`
        animation-duration: 2s;
        animation-iteration-count: infinite;
        animation-name: ${generateKeyframes(
          window.runtime.coralToPink.from,
          window.runtime.coralToPink.to
        )};
        animation-timing-function: ease-in-out;
      `}>
      coral to pink
    </div>
    <div
      css={{
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationName: generateKeyframes(
          window.runtime.purpleToSlateBlue.from,
          window.runtime.purpleToSlateBlue.to
        ),
        animationTimingFunction: 'ease-in-out',
      }}>
      purple to slate blue
    </div>
  </>
);

const fadeOut = keyframes`
  from {
    color: blue;
    opacity: 1;
  }
  to {
    color: indigo;
    opacity: 0;
  }
`;

const shadowedKeyframes = {
  fadeOut: keyframes`
    from {
      color: purple;
      opacity: 1;
    }
    to {
      color: slateblue;
      opacity: 0;
    }
  `,
};

export const ShadowedKeyframes = (): JSX.Element => (
  <>
    <div
      css={`
        animation: ${fadeOut} 2s ease-in-out infinite;
      `}>
      blue to indigo
    </div>
    <div
      css={`
        animation-duration: 2s;
        animation-iteration-count: infinite;
        animation-name: ${shadowedFadeOut};
        animation-timing-function: ease-in-out;
      `}>
      coral to pink
    </div>
    <div
      css={{
        animationDuration: '2s',
        animationIterationCount: 'infinite',
        animationName: shadowedKeyframes.fadeOut,
        animationTimingFunction: 'ease-in-out',
      }}>
      purple to slate blue
    </div>
  </>
);

const shorthandTaggedTemplateExpressionCss = css`
  animation: ${fadeOut} 2s ease-in-out infinite;
`;

export const ShorthandCssPropTaggedTemplateExpression = (): JSX.Element => (
  <div css={shorthandTaggedTemplateExpressionCss}>blue to indigo</div>
);

export const ShorthandInlineCssPropObjectCallExpression = (): JSX.Element => (
  <div css={{ animation: `${fadeOut} 2s ease-in-out infinite` }}>blue to indigo</div>
);

export const ShorthandInlineCssPropTaggedTemplateExpression = (): JSX.Element => (
  <div
    css={css`
      animation: ${fadeOut} 2s ease-in-out infinite;
    `}>
    blue to indigo
  </div>
);

const taggedTemplateExpressionCss = css`
  animation-duration: 2s;
  animation-iteration-count: infinite;
  animation-name: ${fadeOut};
  animation-timing-function: ease-in-out;
`;

export const CssPropTaggedTemplateExpression = (): JSX.Element => (
  <div css={taggedTemplateExpressionCss}>blue to indigo</div>
);

export const InlineCssPropObjectCallExpression = (): JSX.Element => (
  <div
    css={{
      animationDuration: '2s',
      animationIterationCount: 'infinite',
      animationName: fadeOut,
      animationTimingFunction: 'ease-in-out',
    }}>
    blue to indigo
  </div>
);

export const InlineCssPropTaggedTemplateExpression = (): JSX.Element => (
  <div
    css={css`
      animation-duration: 2s;
      animation-iteration-count: infinite;
      animation-name: ${fadeOut};
      animation-timing-function: ease-in-out;
    `}>
    blue to indigo
  </div>
);

const ShorthandObjectCallExpression = styled.div({
  animation: `${fadeOut} 2s ease-in-out infinite`,
});

export const StyledShorthandObjectCallExpression = (): JSX.Element => (
  <ShorthandObjectCallExpression>blue to indigo</ShorthandObjectCallExpression>
);

const ShorthandTaggedTemplateExpression = styled.div`
  animation: ${fadeOut} 2s ease-in-out infinite;
`;

export const StyledShorthandTaggedTemplateExpression = (): JSX.Element => (
  <ShorthandTaggedTemplateExpression>blue to indigo</ShorthandTaggedTemplateExpression>
);

const ObjectCallExpression = styled.div({
  animationDuration: '2s',
  animationIterationCount: 'infinite',
  animationName: fadeOut,
  animationTimingFunction: 'ease-in-out',
});

export const StyledObjectCallExpression = (): JSX.Element => (
  <ObjectCallExpression>blue to indigo</ObjectCallExpression>
);

const TaggedTemplateExpression = styled.div`
  animation-duration: 2s;
  animation-iteration-count: infinite;
  animation-name: ${fadeOut};
  animation-timing-function: ease-in-out;
`;

export const StyledTaggedTemplateExpression = (): JSX.Element => (
  <TaggedTemplateExpression>blue to indigo</TaggedTemplateExpression>
);
