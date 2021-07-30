import { transformSync } from '@babel/core';
import { format } from 'prettier';

import babelPlugin from '../babel-plugin';

export const transform = (code: string): string => {
  const fileResult = transformSync(code, {
    babelrc: false,
    comments: false,
    configFile: false,
    plugins: [babelPlugin],
  });

  if (!fileResult || !fileResult.code) {
    return '';
  }

  const { code: babelCode } = fileResult;
  const ifIndex = babelCode.indexOf('if (process.env.NODE_ENV');
  // Remove the imports from the code, and the styled components display name
  const snippet = babelCode
    .substring(babelCode.indexOf('const'), ifIndex === -1 ? babelCode.length : ifIndex)
    .trim();

  return format(snippet, {
    parser: 'babel',
  });
};
