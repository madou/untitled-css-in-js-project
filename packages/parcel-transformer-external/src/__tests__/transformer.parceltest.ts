import { join } from 'path';

import Parcel, { createWorkerFarm } from '@parcel/core';
import { MemoryFS } from '@parcel/fs';
import { format } from 'prettier';

const rootPath = join(__dirname, '..', '..', '..', '..');

const workerFarm = createWorkerFarm();

afterAll(() => {
  workerFarm.end();
});

const outputFS = new MemoryFS(workerFarm);

const getParcelInstance = (workingDir: string, sourceMap = false) => {
  return new Parcel({
    config: join(workingDir, '.parcelrc'),
    entries: [join(workingDir, 'src', 'index.html')],
    outputFS,
    targets: {
      default: {
        distDir: join(workingDir, 'dist'),
        sourceMap: sourceMap,
      },
    },
    workerFarm,
    mode: 'production',
  });
};

it('transforms assets with compiled and extraction babel plugins', async () => {
  const extractionFixtureRoot = join(rootPath, 'fixtures/parcel-transformer-test-extract-app');
  const parcel = getParcelInstance(extractionFixtureRoot);
  const { changedAssets, bundleGraph } = await parcel.run();

  const htmlAsset = Array.from(changedAssets.values()).find(
    (asset) => asset.filePath === join(extractionFixtureRoot, '/src/index.html')
  );

  const outputHtml = await outputFS.readFile(
    bundleGraph.getBundlesWithAsset(htmlAsset!)[0].filePath,
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
    "._19itlf8h {
      border: 2px solid blue;
    }
    ._1wyb12am {
      font-size: 50px;
    }
    ._syaz13q2 {
      color: blue;
    }
    ._19pk1ul9 {
      margin-top: 30px;
    }
    ._1wyb1ul9 {
      font-size: 30px;
    }
    ._bfhk1gy6 {
      background-color: yellow;
    }
    ._ca0q1vi7 {
      padding-top: 32px;
    }
    ._n3td1vi7 {
      padding-bottom: 32px;
    }
    ._u5f31vi7 {
      padding-right: 32px;
    }
    ._19bv1vi7 {
      padding-left: 32px;
    }
    "
  `);
}, 50000);
