import generate from '@babel/generator';
import { parse } from '@babel/parser';
import type { NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import type { Identifier, MemberExpression } from '@babel/types';

import type { Metadata } from '../../types';
import { buildCss } from '../css-builders';

describe('buildCss', () => {
  it('returns a css string and variables array for an identifier node', () => {
    const file = parse(`
      const color = { background: 'red' };
      const styles = color;

      run(styles);
    `);

    let path: NodePath<Identifier> | null = null;
    traverse(file, {
      CallExpression(nodePath) {
        nodePath.traverse({
          Identifier(innerPath) {
            if (innerPath.node.name === 'styles') {
              path = innerPath;
            }
          },
        });
      },
    });

    expect(path).not.toEqual(null);
    const meta: Metadata = {
      parentPath: path!.parentPath,
      state: {
        filename: '',
      },
    } as any;

    const { css, variables } = buildCss(path!.node, meta);
    expect(css).toEqual([{ css: 'background: red;', type: 'unconditional' }]);
    expect(variables).toEqual([]);
  });

  it('returns a css string and variables array for a member expression node', () => {
    const file = parse(`
      const styles = { option1: { background: 'red' } };

      run(styles.option1);
    `);

    let path: NodePath<MemberExpression> | null = null;
    traverse(file, {
      CallExpression(nodePath) {
        nodePath.traverse({
          MemberExpression(innerPath) {
            path = innerPath;
          },
        });
      },
    });

    expect(path).not.toEqual(null);

    const meta: Metadata = {
      parentPath: path!.parentPath,
      state: {
        cssMap: {},
        filename: '',
      },
    } as any;

    const { css, variables } = buildCss(path!.node, meta);
    expect(css).toEqual([{ css: 'background: red;', type: 'unconditional' }]);
    expect(variables).toEqual([]);
  });
});
