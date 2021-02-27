import { Transformer } from '@parcel/plugin';
import compiledBabelPlugin from '@compiled/babel-plugin';
import { parseAsync, transformFromAstAsync } from '@babel/core';
import generate from '@babel/generator';

/**
 * Compiled parcel transformer.
 */
export default new Transformer({
  canReuseAST() {
    // Compiled should run before any other JS transformer.
    return false;
  },

  async parse({ asset }) {
    const code = await asset.getCode();
    if (!asset.isSource || code.indexOf('@compiled/react') === -1) {
      // We only want to parse files that are actually using Compiled.
      // For everything else we bail out.
      return undefined;
    }

    const ast = await parseAsync(code, {
      filename: asset.filePath,
      caller: { name: 'compiled' },
    });

    return ast;
  },

  async transform({ asset, ast }) {
    if (!asset.isSource || !ast) {
      // We will only recieve ASTs for assets we're interested in.
      // Since this is undefined (or in node modules) we aren't interested in it.
      return [asset];
    }

    const includedFiles: string[] = [];
    const code = asset.isASTDirty() ? undefined : await asset.getCode();

    const result = await transformFromAstAsync(ast.program, code, {
      code: false,
      ast: true,
      filename: asset.filePath,
      babelrc: false,
      configFile: false,
      plugins: [
        [
          compiledBabelPlugin,
          { onIncludedFile: (file: string) => includedFiles.push(file), cache: 'single-pass' },
        ],
      ],
      caller: {
        name: 'compiled',
      },
    });

    includedFiles.forEach((file) => {
      asset.addIncludedFile(file);
    });

    if (result?.ast) {
      asset.setAST({
        // TODO: Currently if we set this as `'babel'` the babel transformer blows up.
        // Let's figure out what we can do to reuse it.
        type: 'compiled',
        version: '0.0.0',
        program: result.ast,
      });
    }

    return [asset];
  },

  generate({ ast, asset }) {
    const { code, map } = generate(ast.program, {
      filename: asset.filePath,
    });

    return { content: code, map };
  },
});
