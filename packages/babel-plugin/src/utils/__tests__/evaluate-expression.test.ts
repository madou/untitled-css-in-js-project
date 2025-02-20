import { parse } from '@babel/parser';
import type { NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import type { Identifier, MemberExpression } from '@babel/types';
import { identifier, memberExpression, stringLiteral } from '@babel/types';

import type { Metadata } from '../../types';
import { evaluateExpression } from '../evaluate-expression';

describe('evaluateExpression', () => {
  it('should evaluate a variable reference to its value', () => {
    const file = parse(`
      const color = 'red';
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
    } as any;

    const { value } = evaluateExpression(path!.node, meta);
    expect(value).toEqual(stringLiteral('red'));
  });

  it('should evaluate a member expression', () => {
    const file = parse(`
      const styles = foo.bar;
    `);

    let path: NodePath<MemberExpression> | null = null;
    traverse(file, {
      MemberExpression(nodePath) {
        path = nodePath;
      },
    });

    expect(path).not.toEqual(null);
    const meta: Metadata = {
      parentPath: path!.parentPath,
    } as any;

    const { value } = evaluateExpression(path!.node, meta);
    const expected = memberExpression(identifier('foo'), identifier('bar'));
    delete expected.optional;
    expect(value).toMatchObject(expected);
  });
});
