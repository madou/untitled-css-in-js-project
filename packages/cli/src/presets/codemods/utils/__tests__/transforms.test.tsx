import { sync as globSync } from 'glob';
import { castToJestMock } from '../../../../__tests__/test-utils';
import { getTransformPath, getTransforms } from '../transforms';

jest.mock('glob', () => ({
  sync: jest.fn(),
}));

describe('transforms', () => {
  describe('#getTransformPath', () => {
    it('should build transform path', () => {
      const parsedPath = {
        base: 'index.tsx',
        dir: 'node_modules/@compiled/codemods/dist/transforms/styled-components-to-compiled',
        ext: '.tsx',
        name: 'index',
        root: '',
      };

      expect(getTransformPath(parsedPath)).toEqual(
        'node_modules/@compiled/codemods/dist/transforms/styled-components-to-compiled/index.tsx'
      );
    });
  });

  describe('#getTransforms', () => {
    it('should get available transforms in alphabetical directory sorted order', () => {
      castToJestMock(globSync).mockImplementationOnce(
        () =>
          [
            'node_modules/@compiled/codemods/dist/transforms/styled-components-to-compiled/index.tsx',
            'node_modules/@compiled/codemods/dist/transforms/emotion-to-compiled/index.tsx',
          ] as any
      );

      expect(getTransforms()).toEqual([
        {
          base: 'index.tsx',
          dir: 'node_modules/@compiled/codemods/dist/transforms/emotion-to-compiled',
          ext: '.tsx',
          name: 'index',
          root: '',
        },
        {
          base: 'index.tsx',
          dir: 'node_modules/@compiled/codemods/dist/transforms/styled-components-to-compiled',
          ext: '.tsx',
          name: 'index',
          root: '',
        },
      ]);
    });
  });
});
