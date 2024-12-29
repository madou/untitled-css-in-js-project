import type { NodePath } from '@babel/core';
import * as t from '@babel/types';
import { unique } from '@compiled/utils';

import type { Metadata } from '../types';
import { buildCodeFrameError } from '../utils/ast';
import { buildCss } from '../utils/css-builders';
import { getRuntimeClassNameLibrary } from '../utils/get-runtime-class-name-library';
import { transformCssItems } from '../utils/transform-css-items';

const getPathToAddInsertCss = (path: NodePath<t.CallExpression>, meta: Metadata): NodePath => {
  const SAFE_PATHS_TO_INSERT_WITHIN: readonly string[] = ['Program', 'BlockStatement'];
  let newPath: NodePath<t.Node> = path;
  while (newPath.parentPath) {
    if (SAFE_PATHS_TO_INSERT_WITHIN.includes(newPath.parentPath.type)) {
      return newPath;
    }

    newPath = newPath.parentPath;
  }

  throw buildCodeFrameError(
    "Couldn't find an appropriate place to insert a Compiled `insertCss` function call.\n\nThis is likely a Compiled bug!",
    path.node,
    meta.parentPath
  );
};

export const visitVanillaCssPath = (path: NodePath<t.CallExpression>, meta: Metadata): void => {
  if (path.node.arguments.length !== 1) {
    throw buildCodeFrameError('Pass one argument to vanillaCss only', path.node, meta.parentPath);
  }

  const argument = path.node.arguments[0];

  if (argument.type !== 'ArrayExpression') {
    throw buildCodeFrameError('Pass an array to vanillaCss only', path.node, meta.parentPath);
  }

  const cssOutput = buildCss(argument, meta);
  // Potentially can also use `hoistSheet` to hoist the `injectCompiledCss` function call
  // to the top, if we decide to do that
  // (see packages/babel-plugin/src/utils/build-compiled-component.ts)
  const { sheets } = transformCssItems(cssOutput.css, meta);
  const injectCompiledCssNode = t.callExpression(t.identifier('injectCompiledCss'), [
    t.arrayExpression(unique(sheets).map((item) => t.stringLiteral(item))),
  ]);

  const pathToAddInsertCss = getPathToAddInsertCss(path, meta);
  pathToAddInsertCss.insertBefore(injectCompiledCssNode);

  const newNode = t.callExpression(
    t.identifier(getRuntimeClassNameLibrary(meta)),
    path.node.arguments
  );
  path.replaceWith(newNode);
};
