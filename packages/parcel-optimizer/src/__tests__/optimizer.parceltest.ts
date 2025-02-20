/**
 * @jest-environment node
 */

import { join } from 'path';

import Parcel, { createWorkerFarm } from '@parcel/core';
import { MemoryFS } from '@parcel/fs';
import { format } from 'prettier';

const rootPath = join(__dirname, '..', '..', '..', '..');
const fixtureRoot = join(rootPath, 'fixtures/parcel-optimizer-test-app');

const workerFarm = createWorkerFarm();
const outputFS = new MemoryFS(workerFarm);

const parcel = new Parcel({
  config: join(fixtureRoot, '.parcelrc'),
  entries: [join(fixtureRoot, 'src', 'index.html')],
  outputFS,
  targets: {
    default: {
      distDir: join(fixtureRoot, 'dist'),
    },
  },
  workerFarm,
  mode: 'production',
});

afterAll(() => {
  workerFarm.end();
});

describe('optimizer', () => {
  it('sorts css rules', async () => {
    const { changedAssets, bundleGraph } = await parcel.run();

    const asset = Array.from(changedAssets.values()).find(
      (asset) => asset.filePath === join(fixtureRoot, '/src/index.html')
    );

    const outputHtml = await outputFS.readFile(
      bundleGraph.getBundlesWithAsset(asset!)[0].filePath,
      'utf8'
    );

    const css = /<style title="compiled">(.*?)<\/style>/.exec(outputHtml)?.pop();

    if (!css) throw new Error('No CSS is found.');

    expect(
      format(css, {
        parser: 'css',
        singleQuote: true,
      })
    ).toMatchInlineSnapshot(`
      "._syaz5scu {
        color: red;
      }
      ._f8pjruxl:focus {
        color: orange;
      }
      ._30l3bf54:hover {
        color: green;
      }
      @media screen {
        ._43475scu {
          color: red;
        }
      }
      @media (min-width: 500px) {
        ._171dak0l {
          border: 2px solid red;
        }
        ._14yn1439 {
          content: 'large screen';
        }
      }
      "
    `);
  }, 30000);
});
