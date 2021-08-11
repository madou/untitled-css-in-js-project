import { ImportDeclaration, JSCodeshift, ASTNode } from 'jscodeshift';
import { MigrationTransformer, RequiredCodemodPlugin } from './types';

const buildImport = ({
  j,
  currentNode,
  defaultSpecifierName,
  namedImport,
  compiledImportPath,
}: {
  j: JSCodeshift;
  originalNode: ImportDeclaration;
  currentNode: ImportDeclaration;
  defaultSpecifierName: string;
  namedImport: string;
  compiledImportPath: string;
}): ImportDeclaration => {
  const newImport = j.importDeclaration(
    [j.importSpecifier(j.identifier(namedImport), j.identifier(defaultSpecifierName))],
    j.literal(compiledImportPath)
  );

  // Copy the comments from the previous import to the new one
  newImport.comments = currentNode.comments;

  return newImport;
};

const insertBeforeImport = ({
  currentNodes,
}: {
  j: JSCodeshift;
  originalImport: ImportDeclaration;
  newImport: ImportDeclaration;
  currentNodes: Array<ASTNode>;
}): Array<ASTNode> => currentNodes;

const insertAfterImport = ({
  currentNodes,
}: {
  j: JSCodeshift;
  originalImport: ImportDeclaration;
  newImport: ImportDeclaration;
  currentNodes: Array<ASTNode>;
}): Array<ASTNode> => currentNodes;

export const migrationTransform: Required<MigrationTransformer> = {
  buildImport,
  insertBeforeImport,
  insertAfterImport,
};

const DefaultCodemodPlugin: RequiredCodemodPlugin = {
  metadata: { name: 'default' },
  migrationTransform,
};

export default DefaultCodemodPlugin;
