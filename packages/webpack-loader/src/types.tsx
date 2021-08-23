import type { RuleSetCondition } from 'webpack';
import { pluginName } from './extract-plugin';

export interface CompiledLoaderOptions {
  /**
   * Converts your source code into a Compiled component.
   * Defaults to `true`.
   */
  bake?: boolean;

  /**
   * Extracts to CSS when `true`.
   * Defaults to `false`.
   */
  extract?: boolean;

  /**
   * Will import React into the module if it is not found.
   * When using @babel/preset-react with the automatic runtime this is not needed and can be set to false.
   */
  importReact?: boolean;

  /**
   * Enables CSP support,
   * read [Security](https://compiledcssinjs.com/docs/security) for more information.
   */
  nonce?: string;
}

export interface LoaderOpts {
  /**
   * When set confirms that the extract plugin has been configured.
   */
  [pluginName]?: true;
}

export interface LoaderThis<TOptions = unknown> extends LoaderOpts {
  /**
   * Query param passed to the loader.
   *
   * ```
   * import '!loader-module?query=params';
   * ```
   */
  resourceQuery: string;

  /**
   * Absolute path of this file.
   */
  resourcePath: string;

  /**
   * Returns the passed in options from a user.
   * Optionally validated with a `schema` object.
   */
  getOptions?: (schema?: {
    type: string;
    properties: Required<
      { [P in keyof TOptions]: { type: string } | { anyOf: Array<{ type: string }> } }
    >;
  }) => TOptions;

  /**
   * Notifies webpack that this loader run included another file.
   * When the other file changes this file will be recompiled.
   */
  addDependency(path: string): void;

  /**
   * Marks the loader async.
   * Call the return value when the loader has completed.
   */
  async(): (err: any, result?: string, map?: any) => void;

  /**
   * Internal access to the current webpack compiler.
   */
  _compiler: any;

  /**
   * Internal access to the loaders for this run.
   */
  loaders: any[];

  /**
   * Emits an error during the loader run.
   *
   * @param error
   */
  emitError(error: Error): void;
}

export interface CompiledExtractPluginOptions {
  /**
   * When set will include all matching conditions.
   * See: https://webpack.js.org/configuration/module/#condition
   */
  nodeModulesTest?: RuleSetCondition;

  /**
   * When set will include all conditions passed through.
   * See: https://webpack.js.org/configuration/module/#condition
   */
  nodeModulesInclude?: RuleSetCondition;

  /**
   * When set will exclude all conditions passed through.
   * See: https://webpack.js.org/configuration/module/#condition
   */
  nodeModulesExclude?: RuleSetCondition;
}
