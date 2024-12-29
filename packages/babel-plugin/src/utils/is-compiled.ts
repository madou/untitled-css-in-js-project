import * as t from '@babel/types';

import type { State } from '../types';

/**
 * Returns `true` if the node is using `css` from `@compiled/react` as a call expression
 *
 * @param node {t.Expression} The expression node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a css usage from compiled
 */
export const isCompiledCSSCallExpression = (
  node: t.Expression,
  state: State
): node is t.CallExpression =>
  t.isCallExpression(node) &&
  t.isIdentifier(node.callee) &&
  [...(state.compiledImports?.css || []), state.importedCompiledImports?.css].includes(
    node.callee.name
  );

/**
 * Returns `true` if the node is using `css` from `@compiled/react` as a tagged template expression
 *
 * @param node {t.Expression} The expression node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a css usage from compiled
 */
export const isCompiledCSSTaggedTemplateExpression = (
  node: t.Expression,
  state: State
): node is t.TaggedTemplateExpression =>
  t.isTaggedTemplateExpression(node) &&
  t.isIdentifier(node.tag) &&
  !!state.compiledImports?.css?.includes(node.tag.name);

/**
 * Returns `true` if the node is using `keyframes` from `@compiled/react` as a call expression
 *
 * @param node {t.Node} The node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a compiled keyframe
 */
export const isCompiledKeyframesCallExpression = (
  node: t.Node,
  state: State
): node is t.CallExpression =>
  t.isCallExpression(node) &&
  t.isIdentifier(node.callee) &&
  !!state.compiledImports?.keyframes?.includes(node.callee.name);

/**
 * Returns `true` if the node is using `cssMap` from `@compiled/react` as a call expression
 *
 * @param node {t.Node} The node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a compiled cssMap
 */
export const isCompiledCSSMapCallExpression = (
  node: t.Node,
  state: State
): node is t.CallExpression =>
  t.isCallExpression(node) &&
  t.isIdentifier(node.callee) &&
  !!state.compiledImports?.cssMap?.includes(node.callee.name);

/**
 * TODO
 *
 * @param node {t.Node} The node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a compiled vanillaCss
 */
export const isCompiledVanillaCssCallExpression = (
  node: t.Node,
  state: State
): node is t.CallExpression =>
  t.isCallExpression(node) &&
  t.isIdentifier(node.callee) &&
  !!state.compiledImports?.vanillaCss?.includes(node.callee.name);

/**
 * Returns `true` if the node is using `keyframes` from `@compiled/react` as a tagged template expression
 *
 * @param node {t.Node} The node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a compiled keyframe
 */
export const isCompiledKeyframesTaggedTemplateExpression = (
  node: t.Node,
  state: State
): node is t.TaggedTemplateExpression =>
  t.isTaggedTemplateExpression(node) &&
  t.isIdentifier(node.tag) &&
  !!state.compiledImports?.keyframes?.includes(node.tag.name);

/**
 * Returns `true` if the node is using `styled` from `@compiled/react` from a styled.tag usage
 *
 * @param node {t.Node} The node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a styled usage from compiled
 */
const isCompiledStyledMemberExpression = (node: t.Node, state: State): node is t.MemberExpression =>
  t.isMemberExpression(node) &&
  t.isIdentifier(node.object) &&
  !!state.compiledImports?.styled?.includes(node.object.name);

/**
 * Returns `true` if the node is using `styled` from `@compiled/react` from a styled(Component) usage
 *
 * @param node {t.Node} The node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a styled usage from compiled
 */
const isCompiledStyledCompositionCallExpression = (
  node: t.Node,
  state: State
): node is t.CallExpression =>
  t.isCallExpression(node) &&
  t.isIdentifier(node.callee) &&
  !!state.compiledImports?.styled?.includes(node.callee.name);

/**
 * Returns `true` if the node is using `styled` from `@compiled/react` as a call expression
 *
 * @param node {t.Expression} The expression node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a styled usage from compiled
 */
export const isCompiledStyledCallExpression = (
  node: t.Expression,
  state: State
): node is t.CallExpression =>
  t.isCallExpression(node) &&
  (isCompiledStyledMemberExpression(node.callee, state) ||
    isCompiledStyledCompositionCallExpression(node.callee, state));

/**
 * Returns `true` if the node is using `styled` from `@compiled/react` as a tagged template expression
 *
 * @param node {t.Node} The node that is being checked
 * @param state {State} Plugin state
 * @returns {boolean} Whether the node is a styled usage from compiled
 */
export const isCompiledStyledTaggedTemplateExpression = (
  node: t.Node,
  state: State
): node is t.TaggedTemplateExpression =>
  t.isTaggedTemplateExpression(node) &&
  (isCompiledStyledMemberExpression(node.tag, state) ||
    isCompiledStyledCompositionCallExpression(node.tag, state));
