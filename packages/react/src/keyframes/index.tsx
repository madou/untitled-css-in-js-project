import type { BasicTemplateInterpolations, CSSProps } from '../types';
import { createSetupError } from '../utils/error';

export type KeyframeSteps = string | Record<string, CSSProps>;

/**
 * Create keyframes using a tagged template expression:
 *
 * ```
 * const fadeOut = keyframes`
 *   from { opacity: 1; }
 *   to   { opacity: 0; }
 * `;
 * ```
 *
 * @param _strings The input string values
 * @param _interpolations The arguments used in the expression
 */
export function keyframes(
  _strings: TemplateStringsArray,
  ..._interpolations: BasicTemplateInterpolations[]
): string;

/**
 * Create keyframes using:
 *
 * 1. An object expression
 *
 * ```
 * const fadeOut = keyframes({
 *   from: {
 *     opacity: 1,
 *   },
 *   to: {
 *     opacity: 0,
 *   },
 * });
 * ```
 *
 * 2. A string
 *
 * ```
 * const fadeOut = keyframes('from { opacity: 1; } to { opacity: 0; }');
 * ```
 *
 * 3. A template literal
 *
 * ```
 * const fadeOut = keyframes(`from { opacity: 1; } to { opacity: 0; }`);
 * ```
 *
 * @param _steps The waypoints along the animation sequence
 */
export function keyframes(_steps: KeyframeSteps): string;

export function keyframes(
  _stringsOrSteps: TemplateStringsArray | KeyframeSteps,
  ..._interpolations: BasicTemplateInterpolations[]
): string {
  throw createSetupError();
}
