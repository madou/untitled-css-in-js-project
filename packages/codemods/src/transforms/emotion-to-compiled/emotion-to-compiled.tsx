import core, {
  FileInfo,
  API,
  Options,
  Collection,
  ASTPath,
  CommentBlock,
  ObjectPattern,
} from 'jscodeshift';

import { COMPILED_IMPORT_PATH } from '../../constants';
import {
  hasImportDeclaration,
  getImportDeclarationCollection,
  findImportSpecifierName,
  addCommentForUnresolvedImportSpecifiers,
  addReactIdentifier,
  convertDefaultImportToNamedImport,
  replaceImportDeclaration,
  mergeImportSpecifiersAlongWithTheirComments,
  addCommentBefore,
  withPlugin,
} from '../../codemods-helpers';
import { CodemodPlugin } from '../../plugins/types';

const imports = {
  compiledStyledImportName: 'styled',
  emotionStyledPackageName: '@emotion/styled',
  emotionCoreJSXPragma: '@jsx jsx',
  emotionCoreImportNames: { jsx: 'jsx', css: 'css', ClassNames: 'ClassNames' },
  emotionCorePackageName: '@emotion/core',
};

const removeEmotionCoreJSXPragma = (j: core.JSCodeshift, collection: Collection) => {
  const commentCollection = collection.find(j.Comment);

  commentCollection.forEach((commentPath) => {
    const commentBlockCollection = j(
      (commentPath as unknown) as ASTPath<CommentBlock>
    ).filter((commentBlockPath) =>
      commentBlockPath.value.value.includes(imports.emotionCoreJSXPragma)
    );

    commentBlockCollection.forEach((commentBlockPath) => {
      j(commentBlockPath).remove();

      addReactIdentifier({ j, collection });
    });
  });
};

const replaceEmotionCoreCSSTaggedTemplateExpression = (
  j: core.JSCodeshift,
  collection: Collection
) => {
  const importDeclarationCollection = getImportDeclarationCollection({
    j,
    collection,
    importPath: imports.emotionCorePackageName,
  });
  const name = findImportSpecifierName({
    j,
    importDeclarationCollection,
    importName: imports.emotionCoreImportNames.css,
  });

  if (name == null) {
    return;
  }

  collection
    .find(j.TaggedTemplateExpression)
    .filter((taggedTemplateExpressionPath) =>
      j(taggedTemplateExpressionPath)
        .find(j.Identifier)
        .some((identifierPath) => identifierPath.node.name === name)
    )
    .forEach((taggedTemplateExpressionPath) => {
      const { quasi } = taggedTemplateExpressionPath.node;

      if (quasi) {
        j(taggedTemplateExpressionPath).replaceWith([quasi]);
      }
    });
};

const handleClassNamesCXBehavior = (j: core.JSCodeshift, objectPattern: ObjectPattern) => {
  const cxIdentifierName = 'cx';
  const axIdentifierName = 'ax';
  const compiledRuntimePackageName = `${COMPILED_IMPORT_PATH}/runtime`;

  const cxObjectPropertyCollection = j(objectPattern)
    .find(j.ObjectProperty)
    .filter(
      (objectPropertyPath) =>
        objectPropertyPath.node.key.type === 'Identifier' &&
        objectPropertyPath.node.key.name === cxIdentifierName
    );

  cxObjectPropertyCollection.forEach((cxObjectPropertyPath) => {
    addCommentBefore({
      j,
      collection: j(cxObjectPropertyPath.node),
      message: `Please replace "${cxIdentifierName}" with "${axIdentifierName}" from "${compiledRuntimePackageName}".
      Usage: import { ${axIdentifierName} } from '${compiledRuntimePackageName}';

      NOTE: Both "${cxIdentifierName}" and "${axIdentifierName}" have some differences, so we have not replaced its usage.
      Please check the docs for "${axIdentifierName}" usage.

      In future, we will expose "${axIdentifierName}" directly from "${imports.emotionCoreImportNames.ClassNames}" props.

      Issue tracked on Github: https://github.com/atlassian-labs/compiled/issues/373`,
    });
  });
};

const handleClassNamesStyleBehavior = (j: core.JSCodeshift, objectPattern: ObjectPattern) => {
  const styleIdentifierName = 'style';

  const hasStyleObjectProperty = j(objectPattern)
    .find(j.ObjectProperty)
    .some(
      (objectPropertyPath) =>
        objectPropertyPath.node.key.type === 'Identifier' &&
        objectPropertyPath.node.key.name === styleIdentifierName
    );

  if (!hasStyleObjectProperty) {
    const styleObjectProperty = j.objectProperty(
      j.identifier(styleIdentifierName),
      j.identifier(styleIdentifierName)
    );

    objectPattern.properties.push(styleObjectProperty);

    addCommentBefore({
      j,
      collection: j(styleObjectProperty),
      message: `We have exported "${styleIdentifierName}" from "${imports.emotionCoreImportNames.ClassNames}" props.
      If you are using dynamic declarations, make sure to set the "${styleIdentifierName}"
      prop otherwise remove it.`,
    });
  }
};

const handleClassNamesBehavior = (j: core.JSCodeshift, collection: Collection) => {
  const importDeclarationCollection = getImportDeclarationCollection({
    j,
    collection,
    importPath: imports.emotionCorePackageName,
  });
  const name = findImportSpecifierName({
    j,
    importDeclarationCollection,
    importName: imports.emotionCoreImportNames.ClassNames,
  });

  if (name == null) {
    return;
  }

  collection
    .find(j.JSXElement)
    .filter((jsxElementPath) =>
      j(jsxElementPath)
        .find(j.JSXIdentifier)
        .some((jsxIdentifierPath) => jsxIdentifierPath.node.name === name)
    )
    .find(j.JSXExpressionContainer)
    .forEach((jsxExpressionContainer) => {
      const { expression } = jsxExpressionContainer.node;

      if (
        expression.type === 'FunctionExpression' ||
        expression.type === 'ArrowFunctionExpression'
      ) {
        if (expression.params.length && expression.params[0].type === 'ObjectPattern') {
          const objectPattern = expression.params[0];

          handleClassNamesStyleBehavior(j, objectPattern);

          handleClassNamesCXBehavior(j, objectPattern);
        }
      }
    });
};

const mergeCompiledImportSpecifiers = (j: core.JSCodeshift, collection: Collection) => {
  const allowedCompiledNames = [
    imports.compiledStyledImportName,
    ...Object.values(imports.emotionCoreImportNames),
  ].filter(
    (name) =>
      ![imports.emotionCoreImportNames.jsx, imports.emotionCoreImportNames.css].includes(name)
  );

  mergeImportSpecifiersAlongWithTheirComments({
    j,
    collection,
    filter: (name) => !!(name && allowedCompiledNames.includes(name)),
  });
};

export const transformer = (
  fileInfo: FileInfo,
  { jscodeshift: j }: API,
  options: Options
): string => {
  const { source } = fileInfo;
  const collection = j(source);
  const plugins: Array<CodemodPlugin> = options.pluginModules;

  const hasEmotionCoreImportDeclaration = hasImportDeclaration({
    j,
    collection,
    importPath: imports.emotionCorePackageName,
  });
  const hasEmotionStyledImportDeclaration = hasImportDeclaration({
    j,
    collection,
    importPath: imports.emotionStyledPackageName,
  });

  if (!hasEmotionCoreImportDeclaration && !hasEmotionStyledImportDeclaration) {
    return source;
  }

  if (hasEmotionStyledImportDeclaration) {
    convertDefaultImportToNamedImport({
      j,
      plugins,
      collection,
      importPath: imports.emotionStyledPackageName,
      namedImport: imports.compiledStyledImportName,
    });
  }

  if (hasEmotionCoreImportDeclaration) {
    removeEmotionCoreJSXPragma(j, collection);
    addCommentForUnresolvedImportSpecifiers({
      j,
      collection,
      importPath: imports.emotionCorePackageName,
      allowedImportSpecifierNames: Object.values(imports.emotionCoreImportNames),
    });
    replaceEmotionCoreCSSTaggedTemplateExpression(j, collection);
    handleClassNamesBehavior(j, collection);
    replaceImportDeclaration({ j, collection, importPath: imports.emotionCorePackageName });
  }

  mergeCompiledImportSpecifiers(j, collection);

  return collection.toSource(options.printOptions || { quote: 'single' });
};

export default withPlugin(transformer);
