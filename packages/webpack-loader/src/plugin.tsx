import { sources } from 'webpack';
import type { Compiler, RuleSetRule, RuleSetUseItem } from 'webpack';
import { createStore } from './utils/sheet-store';
import type { SheetStore } from './types';
import { loaderName, pluginName } from './utils/constants';
import { createSetupError } from './utils/create-error';

/**
 * This will iterate through the webpack userland rules,
 * find all compiled loaders,
 * and then return them in an arary.
 *
 * @param rules
 */
const findCompiledLoaders = (rules: RuleSetRule[]) => {
  const loaders: RuleSetUseItem[] = [];

  rules.forEach((rule) => {
    if (Array.isArray(rule.use)) {
      rule.use.forEach((use) => {
        if (typeof use === 'object' && use.loader === loaderName) {
          loaders.push(use);
        }
      });
    } else if (typeof rule.use === 'object') {
      if (rule.use.loader === loaderName) {
        loaders.push(rule.use);
      }
    }
  });

  return loaders;
};

/**
 * The will add an extra `sheetStore` option to the passed in loader.
 *
 * @param loader
 * @param __sheetStore
 */
const injectStore = (loader: RuleSetUseItem, __sheetStore: SheetStore) => {
  if (typeof loader === 'string' || typeof loader === 'function') {
    return;
  }

  if (!loader.options || typeof loader.options === 'string') {
    loader.options = {};
  }

  loader.options.__sheetStore = __sheetStore;
};

export class CompiledExtractPlugin {
  /**
   * Sheet store is used to collect stylesheet data from the loader runs.
   * It is not considered thread safe.
   */
  __sheetStore: SheetStore;

  constructor() {
    this.__sheetStore = createStore();
  }

  apply(compiler: Compiler): void {
    const loaders = findCompiledLoaders(compiler.options.module.rules as RuleSetRule[]);
    if (loaders.length === 0) {
      throw createSetupError(
        `The loader has not been configured, add the loader to rules in your webpack config.

  module.exports = {
    module: {
      rules: [
        {
          test: /\.(js|ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            { loader: 'babel-loader' },
            {
              loader: '@compiled/webpack-loader',
              options: {
                importReact: false,
                extract: true,
              },
            },
          ],
        },
      ],
    },
  };`
      );
    }

    // Inject the sheet store to all compiled loaders so we can pass data from loaders to plugin.
    loaders.forEach((loader) => injectStore(loader, this.__sheetStore));

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.renderManifest.tap(pluginName, (result, { chunk }) => {
        const stylesheet = this.__sheetStore.get().join('');
        if (!stylesheet) {
          // No styles? Nothing to do! Bail out early.
          return result;
        }

        const name = 'atomic.css';

        // We hook into the "renderManifest" so we can add new entrypoints (from webpacks perspective).
        // Here we are adding a new "CSS" entrypoint which allows it to be automatically picked up by the
        // HtmlWebpackPlugin - simplifying consumptions quite a bit, which is nice.
        result.push({
          render: () => new sources.OriginalSource(stylesheet, name),
          filenameTemplate: name,
          pathOptions: {
            chunk,
            contentHashType: 'css/compiled',
          },
          identifier: `${pluginName}.${chunk.id}`,
        });

        return result;
      });
    });
  }
}
