import type { Rule, Scope } from 'eslint';
import type { Node } from 'estree';
import type { JSXExpressionContainer, JSXOpeningElement } from 'estree-jsx';

import { findCompiledImportDeclarations } from '../../utils/ast';
import { addImportToDeclaration, buildImportDeclaration } from '../../utils/ast-to-string';

type Q<T> = T extends Scope.Definition ? (T['type'] extends 'Variable' ? T : never) : never;
type VariableDefinition = Q<Scope.Definition>;

const findStyleNodes = (node: Node, references: Scope.Reference[], context: Rule.RuleContext) => {
  if (node.type === 'ArrayExpression') {
    node.elements.forEach((arrayElement) => {
      if (arrayElement) {
        findStyleNodes(arrayElement, references, context);
      }
    });
  } else if (node.type === 'LogicalExpression') {
    // Traverse both values in the logical expression
    findStyleNodes(node.left, references, context);
    findStyleNodes(node.right, references, context);
  } else if (node.type === 'ConditionalExpression') {
    // Traverse both return values in the conditional expression
    findStyleNodes(node.consequent, references, context);
    findStyleNodes(node.alternate, references, context);
  } else if (node.type === 'Identifier') {
    // Resolve the variable for the reference
    const reference = references.find((reference) => reference.identifier === node);
    const definition = reference?.resolved?.defs.find(
      (def): def is VariableDefinition => def.type === 'Variable'
    );

    // Traverse to the variable value
    if (definition && definition.node.init) {
      findStyleNodes(definition.node.init, references, context);
    } else {
      const isImported = reference?.resolved?.defs.find((def) => def.type === 'ImportBinding');

      const isFunctionParameter = reference?.resolved?.defs.find((def) => def.type === 'Parameter');

      const isDOMElement = (elementName: string) =>
        elementName.charAt(0) !== elementName.charAt(0).toUpperCase() &&
        elementName.charAt(0) === elementName.charAt(0).toLowerCase();

      const traverseUpToJSXOpeningElement = (node: Node): JSXOpeningElement => {
        // @ts-ignore Property 'parent' does not exist on type 'Node'.
        //
        // parent property is added by eslint, so estree's Node type
        // will not have this defined.
        while (node.parent && node.type !== 'JSXOpeningElement') {
          // @ts-ignore Property 'parent' does not exist on type 'Node'.
          return traverseUpToJSXOpeningElement(node.parent);
        }

        if (node.type === 'JSXOpeningElement') {
          return node as JSXOpeningElement;
        }

        throw new Error('Could not find JSXOpeningElement');
      };

      const jsxElement = traverseUpToJSXOpeningElement(node);

      // css property on DOM elements are always fine, e.g.
      // <div css={...}> instead of <MyComponent css={...}>
      if (jsxElement.name.type === 'JSXIdentifier' && isDOMElement(jsxElement.name.name)) {
        return;
      }

      if (isImported) {
        context.report({
          messageId: 'importedInvalidCssUsage',
          node,
        });
      } else if (isFunctionParameter) {
        context.report({
          messageId: 'functionParameterInvalidCssUsage',
          node,
        });
      } else {
        context.report({
          messageId: 'otherInvalidCssUsage',
          node,
        });
      }
    }
  } else if (node.type === 'MemberExpression') {
    // Since we don't support MemberExpression yet, we don't have a contract for what it should look like
    // We can skip this for now, until we implement the CSS map API
  } else if (node.type === 'ObjectExpression' || node.type === 'TemplateLiteral') {
    // We found an object expression that was not wrapped, report
    context.report({
      messageId: 'noCssFunction',
      node,
      *fix(fixer) {
        const compiledImports = findCompiledImportDeclarations(context);
        if (compiledImports.length > 0) {
          // Import found, add the specifier to it
          const [firstCompiledImport] = compiledImports;
          const specifiersString = addImportToDeclaration(firstCompiledImport, ['css']);

          yield fixer.replaceText(firstCompiledImport, specifiersString);
        } else {
          // Import not found, add a new one
          const source = context.getSourceCode();
          yield fixer.insertTextAfter(
            source.ast.body[0],
            `\n${buildImportDeclaration('css', '@compiled/react')}`
          );
        }

        if (node.type === 'ObjectExpression') {
          yield fixer.insertTextBefore(node, 'css(');
          yield fixer.insertTextAfter(node, ')');
        } else {
          yield fixer.insertTextBefore(node, 'css');
        }
      },
    });
  }
};

const createNoCssPropWithoutCssFunctionRule = (): Rule.RuleModule['create'] => (context) => ({
  'JSXAttribute[name.name="css"] JSXExpressionContainer': (node: Rule.Node): void => {
    const { references } = context.getScope();

    findStyleNodes((node as JSXExpressionContainer).expression, references, context);
  },
});

export const noCssPropWithoutCssFunctionRule: Rule.RuleModule = {
  meta: {
    docs: {
      url: 'https://github.com/atlassian-labs/compiled/tree/master/packages/eslint-plugin/src/rules/no-css-prop-without-css-function',
    },
    messages: {
      noCssFunction: 'css prop values are required to use the css import from @compiled/react',
      valueIsProp:
        'Compiled cannot determine the value of function props in the css attribute at build time. Consider moving the value into the same file.',
      importedInvalidCssUsage:
        'Compiled: imported invalid CSS usage. TODO write a complete message',
      functionParameterInvalidCssUsage:
        'Compiled: function parameter invalid CSS usage. TODO write a complete message',
      otherInvalidCssUsage: 'Compiled: other invalid CSS usage. TODO write a complete message',
    },
    type: 'problem',
    fixable: 'code',
  },
  create: createNoCssPropWithoutCssFunctionRule(),
};
