import path, { ParsedPath } from 'path';
import glob from 'glob';
import appRoot from 'app-root-path';

/**
 * Local run is defined as running in ts-node.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const isLocalRun = typeof process[Symbol.for('ts-node.register.instance')] === 'object';

const basePath = path.join(
  isLocalRun ? appRoot.path : process.cwd(),
  'node_modules',
  '@compiled',
  'codemods',
  'dist',
  'transforms'
);

const parseTransformPath = (transformPath: string) => path.parse(transformPath);

export const getTransformPath = ({ dir, base }: ParsedPath): string => `${dir}/${base}`;

export const getTransforms = (): ParsedPath[] =>
  [path.join(basePath, '*', 'index.@(ts|tsx|js)')]
    .flatMap((transform) => glob.sync(transform))
    .map((transform) => parseTransformPath(transform))
    .sort((prevParsedPath, nextParsedPath) => prevParsedPath.dir.localeCompare(nextParsedPath.dir));
