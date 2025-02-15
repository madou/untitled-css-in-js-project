import type { PluginPass } from '@babel/core';
import type { ParserPlugin } from '@babel/parser';
import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';

import type { Cache } from './utils/cache';

export interface Resolver {
  resolveSync(context: string, request: string): string;
}

export interface PluginOptions {
  /**
   * Whether to use the cache or not. Will make subsequent builds faster.
   *
   * - `true` caches for the duration of the node run (useful for single builds)
   * - `"file-pass"` caches per file pass (useful for watch mode)
   * - `false` turns caching off
   */
  cache?: boolean | 'file-pass';

  /**
   * Will import the React namespace if it is missing.
   * When using the `'automatic'` jsx runtime set this to `false`.
   *
   * Defaults to `true`.
   */
  importReact?: boolean;

  /**
   * Security nonce that will be applied to inline style elements if defined.
   */
  nonce?: string;

  /**
   * Custom module origins that Compiled should compile when using APIs from.
   */
  importSources?: string[];

  /**
   * Callback fired at the end of the file pass when files have been included in the transformation.
   */
  onIncludedFiles?: (files: string[]) => void;

  /**
   * Will run additional cssnano plugins to normalize CSS during build.
   *
   * Default to `true`.
   */
  optimizeCss?: boolean;

  /**
   * A custom resolver used to statically evaluate import declarations, specified as either an object or module path
   */
  resolver?: string | Resolver;

  /**
   * List of file extensions to traverse as code
   */
  extensions?: string[];

  /**
   * List of the parse babel plugins to be applied to evaluated files
   *
   * See the [babel docs](https://babeljs.io/docs/en/plugins/#syntax-plugins)
   */
  parserBabelPlugins?: ParserPlugin[];

  /**
   * Add the component name as class name to DOM in non-production environment if styled is used
   *
   * Default to `false`
   */
  addComponentName?: boolean;

  /**
   * A map holds the key-value pairs between full Atomic class names and the compressed ones
   * i.e. { '_aaaabbbb': 'a' }
   *
   * Default to `undefined`
   */
  classNameCompressionMap?: { [index: string]: string };

  /**
   * Whether Compiled should process usages of xcss in the codebase.
   * Disable this if xcss is not implemented in your codebase using Compiled's xcss functionality.
   *
   * Default to `true`
   */
  processXcss?: boolean;

  /**
   * Increases the specificity of all declared Compiled styles.
   * Generally you would only use this for migration purposes when mixing two or more styling
   * solutions.
   *
   * Default to `false`.
   */
  increaseSpecificity?: boolean;

  /**
   * Whether to sort at-rules, including media queries.
   * Defaults to `true`.
   */
  sortAtRules?: boolean;

  /**
   * Adds a defined prefix to the generated classes' hashes.
   * Useful in micro frontend environments to avoid clashing/specificity issues.
   *
   * Avoid mixing this with extraction as this may throw an error if combined with extraction
   * or `extract: true` in Webpack loaders or Parcel tranformers.
   */
  classHashPrefix?: string;
}

export interface State extends PluginPass {
  /**
   * Boolean turned true if the compiled module import is found.
   * If the module is found, the object will be defined.
   * If a particular API is found, the name of the import will be the value.
   *
   * E.g:
   *
   * ```
   * {
   *   styled: 'styledFunction'
   * }
   * ```
   *
   * Means the `styled` api was found as `styledFunction` - as well as CSS prop is enabled in this module.
   */
  compiledImports?: {
    ClassNames?: string[];
    css?: string[];
    keyframes?: string[];
    styled?: string[];
    cssMap?: string[];
  };

  /**
   * Returns the name of the cloneElement import specifier if it is imported.
   * If an alias is used, the alias will be returned.
   *
   * E.g:
   *
   * ```
   * import { cloneElement as myCloneElement } from 'react';
   * ```
   *
   * Returns `myCloneElement`.
   */
  reactImports?: {
    cloneElement?: string;
  };

  usesXcss?: boolean;

  importedCompiledImports?: {
    css?: string;
  };

  /**
   * Modules that expose APIs to be compiled by Compiled.
   */
  importSources: string[];

  /**
   * Details of pragmas that are currently enabled in the pass.
   */
  pragma: {
    jsx?: boolean;
    jsxImportSource?: boolean;
    classicJsxPragmaIsCompiled?: boolean;
    classicJsxPragmaLocalName?: string;
  };

  /**
   * Paths that will be cleaned up on pass exit.
   */
  pathsToCleanup: { action: 'replace' | 'remove'; path: NodePath }[];

  /**
   * Userland options that can be set to change what happens when the Babel Plugin is ran.
   */
  opts: PluginOptions;

  /**
   * Data of the current file being transformed.
   */
  file: any;

  /**
   * Holds a record of currently hoisted sheets in the module.
   */
  sheets: Record<string, t.Identifier>;

  /**
   * For storing cache of any type. For eg. caching deep traversed path value.
   */
  cache: Cache;

  /**
   * Files that have been included in this pass.
   */
  includedFiles: string[];

  /**
   * Holds a record of evaluated `cssMap()` calls with their compiled style sheets in the current pass.
   */
  cssMap: Record<string, string[]>;

  /**
   * Holdings a record of member expression names to ignore
   */
  ignoreMemberExpressions: Record<string, true>;

  /**
   * A custom resolver used to statically evaluate import declarations
   */
  resolver?: Resolver;

  /**
   * Holds paths that have been transformed that we can ignore.
   */
  transformCache: WeakMap<NodePath<any>, true>;
}

interface CommonMetadata {
  /**
   * State of the current plugin run.
   */
  state: State;

  /**
   * Path of a parent node.
   */
  parentPath: NodePath<any>;

  /**
   * We used this to store path of the IIFE node we created around the calling
   * function. We created an IIFE to resolve the parameters to the args in isolation
   * (using isolated scope created around IIFE).
   */
  ownPath?: NodePath<any>;
}

interface KeyframesMetadata extends CommonMetadata {
  context: 'keyframes';
  keyframe: string;
}

// Used for nodes where we don't want the processed CSS to have a semicolon afterwards
interface FragmentMetadata extends CommonMetadata {
  context: 'fragment';
}

interface RootMetadata extends CommonMetadata {
  context: 'root';
}

export type Metadata = RootMetadata | KeyframesMetadata | FragmentMetadata;

export interface Tag {
  /**
   * Name of the component.
   * Could be inbuilt "div" or user defined "MyComponent".
   */
  name: string;

  /**
   * Type of the component - inbuilt e.g. "div" or user defined e.g. "MyComponent".
   */
  type: 'InBuiltComponent' | 'UserDefinedComponent';
}

export interface TransformResult {
  /**
   * Files that have been included in this transformation.
   * Useful for telling bundlers to recompile the owning file if any of the included files change.
   */
  includedFiles: string[];

  /**
   * Transformed code.
   */
  code: string | null | undefined;
}
