import { bundle } from './utils/webpack';

describe('CompiledExtractPlugin', () => {
  const getCSSAssets = (assets: Record<string, string>) => {
    return Object.keys(assets)
      .filter((name) => name.endsWith('.css'))
      .reduce(
        (acc, name) =>
          Object.assign(acc, {
            [name]: assets[name],
          }),
        {}
      );
  };

  it('should extract styles from a single file into a style sheet', async () => {
    const actual = await bundle(require.resolve('./fixtures/single.js'));

    expect(getCSSAssets(actual)).toMatchInlineSnapshot(`
      Object {
        "static/main.css": "._1wyb1fwx{font-size:12px}
      ",
      }
    `);
  });

  it('should extract styles from multiple files into a style sheet', async () => {
    const actual = await bundle(require.resolve('./fixtures/multiple.js'));

    expect(getCSSAssets(actual)).toMatchInlineSnapshot(`
      Object {
        "static/main.css": "
      ._syaz5scu{color:red}
      ._syazmu8g{color:blueviolet}
      ._19itgh5a{border:2px solid orange}
      ._syazruxl{color:orange}._f8pjruxl:focus{color:orange}
      ._f8pj1cnh:focus{color:purple}
      ._30l31gy6:hover{color:yellow}
      ._30l313q2:hover{color:blue}
      @media screen{._43475scu{color:red}}
      ",
      }
    `);
  });

  it('should chunk safe style declarations', async () => {
    const actual = await bundle(require.resolve('./fixtures/async.js'));

    // Extract the styles into said bundle
    expect(getCSSAssets(actual)).toMatchInlineSnapshot(`
      Object {
        "static/696.css": "._19itgh5a{border:2px solid orange}
      ._syazruxl{color:orange}
      ",
        "static/main.css": "._syazmu8g{color:blueviolet}
      ",
      }
    `);
  });

  it('should hoist and sort chunked style declaration', async () => {
    const actual = await bundle(require.resolve('./fixtures/async-sort.js'));

    expect(getCSSAssets(actual)).toMatchInlineSnapshot(`
      Object {
        "static/569.css": "._syaz5scu{color:red}
      ._19itgh5a{border:2px solid orange}
      ._syazruxl{color:orange}
      @media screen{._43475scu{color:red}}
      ",
        "static/main.css": "._syazmu8g{color:blueviolet}
      ._f8pjruxl:focus{color:orange}._f8pj1cnh:focus{color:purple}._30l31gy6:hover{color:yellow}._30l313q2:hover{color:blue}",
      }
    `);
  });

  it('should throw when plugin is not configured', async () => {
    const error: Error = await bundle(require.resolve('./fixtures/single.js'), {
      disablePlugins: true,
    }).catch((err) => err);

    expect(error[0].message).toInclude(
      `You forgot to add the 'CompiledExtractPlugin' plugin (i.e \`{ plugins: [new CompiledExtractPlugin()] }\`), please read https://compiledcssinjs.com/docs/css-extraction-webpack`
    );
  });

  it('should extract from a pre-built babel files', async () => {
    const actual = await bundle(require.resolve('./fixtures/babel.js'));

    expect(getCSSAssets(actual)).toMatchInlineSnapshot(`
      Object {
        "static/main.css": "._19pk1ul9{margin-top:30px}
      ._19bvftgi{padding-left:8px}
      ._n3tdftgi{padding-bottom:8px}
      ._u5f3ftgi{padding-right:8px}
      ._ca0qftgi{padding-top:8px}
      ._19itlf8h{border:2px solid blue}
      ._1wyb1ul9{font-size:30px}
      ._syaz13q2{color:blue}
      ",
      }
    `);
  });

  it('should find bindings', async () => {
    const actual = await bundle(require.resolve('./fixtures/binding-not-found.tsx'));

    expect(getCSSAssets(actual)).toMatchInlineSnapshot(`
      Object {
        "static/main.css": "._syaz1r31{color:currentColor}
      ._ajmmnqa1{-webkit-text-decoration-style:solid;text-decoration-style:solid}
      ._1hmsglyw{-webkit-text-decoration-line:none;text-decoration-line:none}
      ._4bfu1r31{-webkit-text-decoration-color:currentColor;text-decoration-color:currentColor}
      ._syaz14aq{color:var(--_1p69eoh)}
      ._n7zl1fc7{border-bottom:1px solid var(--_1gpyhvo)}
      ._p12f1us4{max-width:140rem}
      ._18u01wug{margin-left:auto}
      ._otyridpf{margin-bottom:0}
      ._2hwx1wug{margin-right:auto}
      ._19pkidpf{margin-top:0}
      ._1xi2idpf{right:0}
      ._1ltvidpf{left:0}
      ._154iidpf{top:0}
      ._kqswstnw{position:absolute}
      ._1pbykb7n{z-index:1}
      ._19bv1wto{padding-left:3rem}
      ._n3tdidpf{padding-bottom:0}
      ._u5f31wto{padding-right:3rem}
      ._ca0qidpf{padding-top:0}
      ._4cvr1h6o{align-items:center}
      ._1e0c1txw{display:flex}
      ._4t3i1jdh{height:9rem}
      ",
      }
    `);
  });

  it('should extract important', async () => {
    const actual = await bundle(require.resolve('./fixtures/important-styles.js'));

    expect(getCSSAssets(actual)).toMatchInlineSnapshot(`
      Object {
        "static/main.css": "._syaz13q2{color:blue}
      ._1wybc038{font-size:12!important}
      ",
      }
    `);
  });
});
