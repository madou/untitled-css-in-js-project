import { join } from 'path';

import Parcel, { createWorkerFarm } from '@parcel/core';
import { MemoryFS, NodeFS } from '@parcel/fs';
// eslint-disable-next-line import/namespace
import type { Asset } from '@parcel/types';
import { format } from 'prettier';
import { SourceMapConsumer } from 'source-map';

const rootPath = join(__dirname, '..', '..', '..', '..');
const fixtureRoot = join(rootPath, 'fixtures/parcel-transformer-test-app');
const babelComponentFixture = join(rootPath, 'fixtures/babel-component');

const workerFarm = createWorkerFarm();

afterAll(() => {
  workerFarm.end();
});

const outputFS = new MemoryFS(workerFarm);
const nodeFS = new NodeFS();

function findTargetSourcePosition(source: string, regex: RegExp): { line: number; column: number } {
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(regex);

    if (match && match.index !== undefined) {
      return {
        line: i + 1,
        column: match.index,
      };
    }
  }

  throw new Error(`Could not find target source\n${source}`);
}

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

it('transforms assets with babel plugin', async () => {
  const parcel = getParcelInstance(fixtureRoot);
  const { changedAssets } = await parcel.run();

  const asset = Array.from(changedAssets.values()).find(
    (asset) => asset.filePath === join(fixtureRoot, 'src/index.jsx')
  );

  const code = await asset?.getCode();
  const appCode = code?.slice(code.indexOf('var _3'));
  expect(appCode).toMatchInlineSnapshot(`
    "var _3 = "._bfhkbf54{background-color:green}";
    var _2 = "._syaz5scu{color:red}";
    var _ = "._1wyb12am{font-size:50px}";
    console.log("File START");
    var styles = null;
    var App = function() {
        return /*#__PURE__*/ (0, _jsxRuntime.jsx)(_jsxRuntime.Fragment, {
            children: /*#__PURE__*/ (0, _jsxRuntime.jsxs)(_runtime.CC, {
                children: [
                    /*#__PURE__*/ (0, _jsxRuntime.jsx)(_runtime.CS, {
                        children: [
                            _,
                            _2,
                            _3
                        ]
                    }),
                    /*#__PURE__*/ (0, _jsxRuntime.jsx)("div", {
                        className: (0, _runtime.ax)([
                            "_1wyb12am _syaz5scu",
                            "_bfhkbf54"
                        ]),
                        children: "hello from parcel"
                    })
                ]
            })
        });
    };
    console.log("File END");
    "
  `);
}, 50000);

it('transforms assets with babel plugin and source map is correct', async () => {
  const parcel = getParcelInstance(fixtureRoot, true);
  const { changedAssets, bundleGraph } = await parcel.run();

  const asset = Array.from(changedAssets.values()).find(
    (asset) => asset.filePath === join(fixtureRoot, 'src/index.jsx')
  );
  expect(asset).toBeDefined();
  const bundle = bundleGraph.getBundlesWithAsset(asset as Asset)[0];

  const mapFile = await outputFS.readFile(`${bundle.filePath}.map`, 'utf8');

  const rawSourceMap = JSON.parse(mapFile);
  const consumer = await new SourceMapConsumer(rawSourceMap);

  const expectedOriginalPosition = findTargetSourcePosition(
    await nodeFS.readFile((asset as Asset).filePath, 'utf8'),
    /File END/
  );
  const expectedGeneratedPosition = findTargetSourcePosition(
    await outputFS.readFile(bundle.filePath, 'utf8'),
    /File END/
  );

  const actualGeneratedPosition = consumer.generatedPositionFor({
    ...expectedOriginalPosition,
    source: 'fixtures/parcel-transformer-test-app/src/index.jsx',
  });
  const actualOriginalPosition = consumer.originalPositionFor(expectedGeneratedPosition);

  expect('fixtures/parcel-transformer-test-app/src/index.jsx').toEqual(
    actualOriginalPosition?.source
  );
  expect(actualGeneratedPosition.line).toBe(expectedGeneratedPosition.line);
  expect(actualGeneratedPosition.column).toBe(expectedGeneratedPosition.column - 1);
}, 50000);

it('transforms assets with custom resolve and statically evaluates imports', async () => {
  const customResolveFixtureRoot = join(
    rootPath,
    'fixtures/parcel-transformer-test-custom-resolve-app'
  );
  const parcel = getParcelInstance(customResolveFixtureRoot);
  const { changedAssets } = await parcel.run();

  const asset = Array.from(changedAssets.values()).find(
    (asset) => asset.filePath === join(customResolveFixtureRoot, 'src/index.jsx')
  );

  const code = await asset?.getCode();

  expect(code).toInclude('color:red');
}, 50000);

it('transforms assets with custom resolver and statically evaluates imports', async () => {
  const customResolverFixtureRoot = join(
    rootPath,
    'fixtures/parcel-transformer-test-custom-resolver-app'
  );
  const parcel = getParcelInstance(customResolverFixtureRoot);
  const { changedAssets } = await parcel.run();

  const asset = Array.from(changedAssets.values()).find(
    (asset) => asset.filePath === join(customResolverFixtureRoot, 'src/index.jsx')
  );

  const code = await asset?.getCode();

  expect(code).toInclude('color:red');
}, 50000);

it('transforms assets with compiled and extraction babel plugins', async () => {
  const extractionFixtureRoot = join(rootPath, 'fixtures/parcel-transformer-test-extract-app');
  const parcel = getParcelInstance(extractionFixtureRoot);
  const { changedAssets, bundleGraph } = await parcel.run();
  const assets = Array.from(changedAssets.values());

  const indexJsCode = await assets
    .find((asset) => asset.filePath === join(extractionFixtureRoot, 'src/index.jsx'))
    ?.getCode();
  expect(indexJsCode).toMatchInlineSnapshot(`
    "/* index.jsx generated by @compiled/babel-plugin v0.0.0 */ var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
    var _jsxRuntime = require("react/jsx-runtime");
    var _runtime = require("@compiled/react/runtime");
    var _index = require("@compiled/babel-component-extracted-fixture/dist/index");
    var _indexDefault = parcelHelpers.interopDefault(_index);
    var _babelComponentFixture = require("@compiled/babel-component-fixture");
    var _babelComponentFixtureDefault = parcelHelpers.interopDefault(_babelComponentFixture);
    var App = function() {
        return /*#__PURE__*/ (0, _jsxRuntime.jsxs)((0, _jsxRuntime.Fragment), {
            children: [
                /*#__PURE__*/ (0, _jsxRuntime.jsx)("div", {
                    className: (0, _runtime.ax)([
                        "_1wyb12am _syaz13q2"
                    ]),
                    children: "CSS prop"
                }),
                /*#__PURE__*/ (0, _jsxRuntime.jsx)((0, _babelComponentFixtureDefault.default), {
                    children: "Babel component"
                }),
                /*#__PURE__*/ (0, _jsxRuntime.jsx)((0, _indexDefault.default), {
                    children: "Component from NPM"
                })
            ]
        });
    };
    "
  `);

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

  const babelComponentCode = await assets
    .find((asset) => asset.filePath === join(babelComponentFixture, 'dist/index.js'))
    ?.getCode();

  const extractedComponent = babelComponentCode
    ?.slice(babelComponentCode.indexOf('var Button'))
    .trim();
  expect(extractedComponent).toMatchInlineSnapshot(`
    "var Button = (0, _react.forwardRef)(function(_ref, __cmplr) {
        var _ref$as = _ref.as, C = _ref$as === void 0 ? "button" : _ref$as, __cmpls = _ref.style, __cmplp = _objectWithoutProperties(_ref, _excluded);
        if (__cmplp.innerRef) throw new Error("Please use 'ref' instead of 'innerRef'.");
        return /*#__PURE__*/ (0, _jsxRuntime.jsx)(C, _objectSpread(_objectSpread({}, __cmplp), {}, {
            style: __cmpls,
            ref: __cmplr,
            className: (0, _runtime.ax)([
                "_19itlf8h _ca0q1vi7 _u5f31vi7 _n3td1vi7 _19bv1vi7 _syaz13q2 _1wyb1ul9",
                __cmplp.className
            ])
        }));
    });
    Button.displayName = "Button";
    function BabelComponent(_ref2) {
        var children = _ref2.children;
        return /*#__PURE__*/ (0, _jsxRuntime.jsx)("div", {
            className: (0, _runtime.ax)([
                "_19pk1ul9"
            ]),
            children: /*#__PURE__*/ (0, _jsxRuntime.jsx)(Button, {
                children: children
            })
        });
    }"
  `);
}, 50000);

it('transforms assets with class name compression enabled', async () => {
  const compressingClassNameFixtureRoot = join(
    rootPath,
    'fixtures/parcel-transformer-test-compress-class-name-app'
  );
  const parcel = getParcelInstance(compressingClassNameFixtureRoot);
  const { changedAssets, bundleGraph } = await parcel.run();

  const htmlAsset = Array.from(changedAssets.values()).find(
    (asset) => asset.filePath === join(compressingClassNameFixtureRoot, '/src/index.html')
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
    ".a {
      font-size: 50px;
    }
    .b {
      color: red;
    }
    "
  `);
}, 50000);
