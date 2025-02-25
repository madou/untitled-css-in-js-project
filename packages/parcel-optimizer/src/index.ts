import assert from 'assert';
import { join, basename } from 'path';

import { sort } from '@compiled/css';
import { hash } from '@compiled/utils';
import { Optimizer } from '@parcel/plugin';
import posthtml from 'posthtml';
import { insertAt } from 'posthtml-insert-at';

import type { ParcelOptimizerOpts } from './types';

const configFiles = [
  '.compiledcssrc',
  '.compiledcssrc.json',
  'compiledcss.js',
  'compiledcss.config.js',
];

export default new Optimizer<ParcelOptimizerOpts, unknown>({
  async loadConfig({ config, options }) {
    const conf = await config.getConfigFrom(join(options.projectRoot, 'index'), configFiles, {
      packageKey: '@compiled/parcel-optimizer',
    });

    const contents = {
      inlineCss: false,
      sortAtRules: true,
    };

    if (conf) {
      if (conf.filePath.endsWith('.js')) {
        config.invalidateOnStartup();
      }

      Object.assign(contents, conf.contents);
    }

    return contents;
  },

  async optimize({ contents, map, bundle, bundleGraph, options, config }) {
    const { outputFS } = options;

    const styleRules = new Set<string>();

    // Traverse the descendants of HTML bundle
    // Extract the stylesRules from assets
    bundleGraph.traverseBundles((childBundle) => {
      childBundle.traverseAssets((asset) => {
        const rules = asset.meta.styleRules;
        if (rules == null) {
          return;
        }

        assert(rules instanceof Array);

        for (const rule of rules) {
          styleRules.add(rule as string);
        }
      });
    }, bundle);

    if (styleRules.size === 0) return { contents, map };

    const sortConfig = {
      sortAtRulesEnabled: config.sortAtRules,
      sortShorthandEnabled: config.sortShorthand,
    };
    const stylesheet = sort(Array.from(styleRules).join(''), sortConfig);

    let newContents = '';

    if (config.inlineCss) {
      newContents = (
        await posthtml()
          .use(
            insertAt({
              selector: 'head',
              append: '<style title="compiled">' + stylesheet + '</style>',
              behavior: 'inside',
            })
          )
          .process(contents.toString())
      ).html;
    } else {
      const { distDir } = bundle.target;

      if (!outputFS.existsSync(distDir)) {
        await outputFS.mkdirp(distDir);
      }

      const cssFileName = basename(bundle.displayName, '.html') + '.' + hash(stylesheet) + '.css';

      await outputFS.writeFile(
        join(distDir, cssFileName),
        stylesheet,
        undefined // for TypeScript
      );

      newContents = (
        await posthtml()
          .use(
            insertAt({
              selector: 'head',
              append:
                '<link href="' + bundle.target.publicUrl + cssFileName + '" rel="stylesheet" />',
              behavior: 'inside',
            })
          )
          .process(contents.toString())
      ).html;
    }

    return { contents: newContents, map };
  },
});
