export const longhandCssPropObjectCallExpression = `
  <div css={{
    animationDuration: '2s',
    animationName: fadeOut,
    animationTimingFunction: 'ease-in-out',
  }} />
`;

export const longhandCssPropTaggedTemplateExpression = `
  <div css={css\`
    animation-duration: 2s;
    animation-name: \${fadeOut};
    animation-timing-function: ease-in-out;
  \`} />
`;

export const longhandStyledObjectCallExpression = `
  const StyledComponent = styled.div({
    animationDuration: '2s',
    animationName: fadeOut,
    animationTimingFunction: 'ease-in-out',
  });
`;

export const longhandStyledTaggedTemplateExpression = `
  const StyledComponent = styled.div\`
    animation-duration: 2s;
    animation-name: \${fadeOut};
    animation-timing-function: ease-in-out;
  \`;
`;

export const shorthandCssPropObjectCallExpression = `<div css={{ animation: \`\${fadeOut} 2s ease-in-out\` }} />`;

export const shorthandCssPropTaggedTemplateExpression = `<div css={css\`animation: \${fadeOut} 2s ease-in-out\`} />`;

export const shorthandStyledObjectCallExpression = `
  const StyledComponent = styled.div({
    animation: \`\${fadeOut} 2s ease-in-out\`,
  });
`;

export const shorthandStyledTaggedTemplateExpression = `
  const StyledComponent = styled.div\`
    animation: \${fadeOut} 2s ease-in-out;
  \`;
`;
