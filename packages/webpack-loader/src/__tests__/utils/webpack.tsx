import webpack from 'webpack';
import { createFsFromVolume, Volume } from 'memfs';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { CompiledExtractPlugin } from '../../extract-plugin';

interface Opts {
  extract?: boolean;
  disablePlugins?: boolean;
}

export function bundle(
  entry: string,
  { extract = true, disablePlugins = false }: Opts = {}
): Promise<Record<string, string>> {
  const compiler = webpack({
    entry,
    output: {
      path: '/',
      filename: 'bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.(js|ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                babelrc: false,
                configFile: false,
                presets: [
                  ['@babel/preset-env', { targets: { browsers: 'last 1 version' } }],
                  '@babel/preset-typescript',
                  ['@babel/preset-react', { runtime: 'automatic' }],
                ],
              },
            },
            {
              loader: require.resolve('../../compiled-loader'),
              options: {
                importReact: false,
                extract,
              },
            },
          ],
        },
        {
          test: /\.css$/i,
          sideEffects: true,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
      ],
    },
    plugins: disablePlugins
      ? []
      : [new MiniCssExtractPlugin({ filename: 'static/[name].css' }), new CompiledExtractPlugin()],
  });

  const fs = createFsFromVolume(new Volume());
  // @ts-ignore
  compiler.outputFileSystem = fs;
  // @ts-ignore
  compiler.intermediateFileSystem = fs;

  return new Promise<Record<string, string>>((res, rej) => {
    compiler.run((err, stats) => {
      if (err) {
        rej(err);
        return;
      }

      if (stats?.hasErrors() && stats.compilation.errors.length) {
        rej(stats.compilation.errors);
        return;
      }

      const assets: Record<string, string> = {};

      Object.keys(stats?.compilation.assets || {}).map((name) => {
        const file = fs.readFileSync(`/${name}`, { encoding: 'utf-8' });
        assets[name] = file as string;
      });

      res(assets);
    });
  });
}
