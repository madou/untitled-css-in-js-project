import generate from '@babel/generator';
import template from '@babel/template';
import * as t from '@babel/types';
import traverse, { NodePath, Visitor } from '@babel/traverse';
import { unique } from '@compiled/utils';
import { transformCss } from '@compiled/css';
import isPropValid from '@emotion/is-prop-valid';
import { Tag } from '../types';
import { getItemCss } from './css-builders';
import { pickFunctionBody, resolveIdentifierComingFromDestructuring } from './ast';
import { Metadata } from '../types';
import { CSSOutput, CssItem } from '../utils/types';
import { PROPS_IDENTIFIER_NAME } from '../constants';

export interface StyledTemplateOpts {
  /**
   * Class to be used for the CSS selector.
   */
  classNames: t.Expression[];

  /**
   * Tag for the Styled Component, for example "div" or user defined component.
   */
  tag: Tag;

  /**
   * CSS variables to be passed to the `style` prop.
   */
  variables: CSSOutput['variables'];

  /**
   * CSS sheets to be passed to the `CS` component.
   */
  sheets: string[];
}

/**
 * Hoists a sheet to the top of the module if its not already there.
 * Returns the referencing identifier.
 *
 * @param sheet Stylesheet
 * @param meta Plugin metadata
 */
const hoistSheet = (sheet: string, meta: Metadata): t.Identifier => {
  if (meta.state.sheets[sheet]) {
    return meta.state.sheets[sheet];
  }

  const sheetIdentifier = meta.parentPath.scope.generateUidIdentifier('');
  const parent = meta.parentPath.findParent((path) => path.isProgram());
  const parentBody = parent && (parent.get('body') as NodePath[]);
  const path = parentBody && parentBody.filter((path) => !path.isImportDeclaration())[0];

  if (path) {
    const kind = 'const';
    const newVariable = t.variableDeclarator(sheetIdentifier, t.stringLiteral(sheet));
    path.insertBefore(t.variableDeclaration(kind, [newVariable])).forEach((newVariable) => {
      // Register the binding so it's now available in scope.
      meta.parentPath.scope.registerBinding(kind, newVariable as NodePath<t.Node>);
    });
  }

  meta.state.sheets[sheet] = sheetIdentifier;

  return sheetIdentifier;
};

/**
 * Will build up the CSS variables prop to be placed as inline styles.
 *
 * @param variables CSS variables that will be placed in the AST
 * @param transform Transform function that can be used to change the CSS variable expression
 */
export const buildCssVariablesProp = (
  variables: CSSOutput['variables'],
  transform = (expression: t.Expression) => expression
): (t.ObjectProperty | t.SpreadElement)[] => {
  return unique(
    // Make sure all defined CSS variables are unique
    variables,
    // We consider their uniqueness based on their name
    (item) => item.name
  ).map((variable) => {
    // Map them into object properties.
    return t.objectProperty(
      t.stringLiteral(variable.name),
      t.callExpression(
        t.identifier('ix'),
        [
          // Allow callers to transform the expression if needed,
          // for example the styled API strips away the arrow function.
          transform(variable.expression),
          (variable.suffix && t.stringLiteral(variable.suffix)) as t.Expression,
          (variable.suffix && variable.prefix && t.stringLiteral(variable.prefix)) as t.Expression,
        ].filter(Boolean)
      )
    );
  });
};

/**
 * Builds up the inline style prop value for a Styled Component.
 *
 * @param variables CSS variables that will be placed in the AST
 * @param transform Transform callback function that can be used to change the CSS variable expression
 */
const styledStyleProp = (
  variables: CSSOutput['variables'],
  transform?: (expression: t.Expression) => t.Expression
) => {
  const props: (t.ObjectProperty | t.SpreadElement)[] = [t.spreadElement(t.identifier('style'))];
  return t.objectExpression(props.concat(buildCssVariablesProp(variables, transform)));
};

/**
 * Returns a tag string in the form of an identifier or string literal.
 *
 * A type of InBuiltComponent will return a string literal,
 * otherwise an identifier string will be returned.
 *
 * @param tag Made of name and type.
 */
const buildComponentTag = ({ name, type }: Tag) => {
  return type === 'InBuiltComponent' ? `"${name}"` : name;
};

/**
 * Traverses an arrow function and then finally return the arrow function body node.
 *
 * @param node Array function node
 * @param nestedVisitor Visitor callback function
 */
const traverseStyledArrowFunctionExpression = (
  node: t.ArrowFunctionExpression,
  nestedVisitor: Visitor
) => {
  traverse(node, nestedVisitor);

  return pickFunctionBody(node);
};

/**
 * Traverses a binary expression looking for any arrow functions,
 * calls back with each arrow function node into the passed in `nestedVisitor`,
 * and then finally replaces each found arrow function node with its body.
 *
 * @param node Binary expression node
 * @param nestedVisitor Visitor callback function
 */
const traverseStyledBinaryExpression = (node: t.BinaryExpression, nestedVisitor: Visitor) => {
  traverse(node, {
    noScope: true,
    ArrowFunctionExpression(path) {
      path.traverse(nestedVisitor);
      path.replaceWith(pickFunctionBody(path.node));
      path.stop();
    },
  });

  return node;
};

/**
 * Handles cases like:
 * 1. `propz.loading` in `border-color: \${(propz) => (propz.loading ? colors.N100 : colors.N200)};`
 * Outcome: It will replace `propz.loading` with `props.loading`.
 *
 * 2. `props.notValidProp` in `border-color: \${(props) => (props.notValidProp ? colors.N100 : colors.N200)};`
 * Outcome: It will move `notValidProp` under `propsToDestructure` and replaces `props.notValidProp` with `notValidProp`.
 *
 * @param path MemberExpression path
 */
const handleMemberExpressionInStyledInterpolation = (path: NodePath<t.MemberExpression>) => {
  const memberExpressionKey = path.node.object;
  const propsToDestructure: string[] = [];

  if (t.isIdentifier(memberExpressionKey)) {
    const traversedUpFunctionPath: NodePath<t.Node> | null = path.find((parentPath) =>
      parentPath.isFunction()
    );
    const memberExpressionKeyName = memberExpressionKey.name;

    const isMemberExpressionNameTheSameAsFunctionFirstParam: boolean | null =
      traversedUpFunctionPath &&
      t.isFunction(traversedUpFunctionPath.node) &&
      t.isIdentifier(traversedUpFunctionPath.node.params[0]) &&
      traversedUpFunctionPath.node.params[0].name === memberExpressionKeyName;

    if (isMemberExpressionNameTheSameAsFunctionFirstParam) {
      const memberExpressionValue = path.node.property;

      if (t.isIdentifier(memberExpressionValue)) {
        const memberExpressionValueName = memberExpressionValue.name;

        // if valid html attribute let it through - else destructure to prevent
        if (isPropValid(memberExpressionValueName)) {
          // Convert cases like propz.color to props.color
          if (memberExpressionKeyName !== PROPS_IDENTIFIER_NAME) {
            path.replaceWith(
              t.memberExpression(
                t.identifier(PROPS_IDENTIFIER_NAME),
                t.identifier(memberExpressionValueName)
              )
            );
          }
        } else {
          propsToDestructure.push(memberExpressionValueName);
          path.replaceWith(memberExpressionValue);
        }
      }
    }
  }

  return propsToDestructure;
};

/**
 * Handles cases like:
 * 1. `isLoading` in `background-color: \${({ isLoading }) => (isLoading ? colors.N20 : colors.N40)};`
 * Outcome: It will move `isLoading` under `propsToDestructure`.
 *
 * 2. `l` in `color: \${({ loading: l }) => (l ? colors.N50 : colors.N10)};`
 * Outcome: It will move `loading` under `propsToDestructure` and replaces `l` with `loading`.
 *
 * @param path Identifier path
 */
const handleDestructuringInStyledInterpolation = (path: NodePath<t.Identifier>) => {
  const propsToDestructure: string[] = [];

  // We are not interested in parent object property like `({ loading: load }) => load`.
  // Both `: load` and `=> load` are identifiers and function is parent for both.
  // We are not interested in modifying `: load`. We just need to modify `=> load` to `=> loading`.
  // If we don't skip, `=> load` will not be modified because we have modified `: load` earlier and
  // second identifier is nowhere to be found inside function params.
  if (path.parentPath && !t.isObjectProperty(path.parentPath.node)) {
    const traversedUpFunctionPath: NodePath<t.Node> | null = path.find((parentPath) =>
      parentPath.isFunction()
    );

    const firstFunctionParam =
      traversedUpFunctionPath &&
      t.isFunction(traversedUpFunctionPath.node) &&
      traversedUpFunctionPath.node.params[0];

    const resolvedDestructuringIdentifier = resolveIdentifierComingFromDestructuring({
      name: path.node.name,
      node: firstFunctionParam as t.Expression,
      resolveFor: 'value',
    });

    if (resolvedDestructuringIdentifier && t.isIdentifier(resolvedDestructuringIdentifier.key)) {
      const resolvedDestructuringIdentifierKey = resolvedDestructuringIdentifier.key;
      const resolvedDestructuringIdentifierKeyName = resolvedDestructuringIdentifierKey.name;

      propsToDestructure.push(resolvedDestructuringIdentifierKeyName);

      // We are only interested in cases when names are different otherwise this will go in infinite recursion.
      if (resolvedDestructuringIdentifierKeyName !== path.node.name) {
        path.replaceWith(t.identifier(resolvedDestructuringIdentifierKeyName));
      }
    }
  }

  return propsToDestructure;
};

const displayNameTemplate = template(
  `
if (process.env.NODE_ENV !== 'production') {
  %%identifier%%.displayName = %%displayName%%;
}
`,
  { syntacticPlaceholders: true }
);

/**
 * Assigns a display name string to the identifier.
 *
 * @param identifier
 * @param displayName
 * @returns
 */
export const buildDisplayName = (identifier: string, displayName: string = identifier): t.Node => {
  return displayNameTemplate({
    identifier,
    displayName: `'${displayName}'`,
  }) as t.Node;
};

/**
 * Will return a generated AST for a Styled Component.
 *
 * @param opts Template options
 * @param meta Plugin metadata
 */
const styledTemplate = (opts: StyledTemplateOpts, meta: Metadata): t.Node => {
  const nonceAttribute = meta.state.opts.nonce ? `nonce={${meta.state.opts.nonce}}` : '';
  const propsToDestructure: string[] = [];
  const styleProp = opts.variables.length
    ? styledStyleProp(opts.variables, (node) => {
        const nestedArrowFunctionExpressionVisitor = {
          noScope: true,
          MemberExpression(path: NodePath<t.MemberExpression>) {
            const propsToDestructureFromMemberExpression = handleMemberExpressionInStyledInterpolation(
              path
            );

            propsToDestructure.push(...propsToDestructureFromMemberExpression);
          },
          Identifier(path: NodePath<t.Identifier>) {
            const propsToDestructureFromIdentifier = handleDestructuringInStyledInterpolation(path);

            propsToDestructure.push(...propsToDestructureFromIdentifier);
          },
        };

        if (t.isArrowFunctionExpression(node)) {
          return traverseStyledArrowFunctionExpression(node, nestedArrowFunctionExpressionVisitor);
        }

        if (t.isBinaryExpression(node)) {
          return traverseStyledBinaryExpression(node, nestedArrowFunctionExpressionVisitor);
        }

        return node;
      })
    : t.identifier('style');

  let unconditionalClassNames = '',
    logicalClassNames = '';

  opts.classNames.forEach((item) => {
    if (t.isStringLiteral(item)) {
      unconditionalClassNames += `${item.value} `;
    } else if (t.isLogicalExpression(item)) {
      logicalClassNames += `${generate(item).code}, `;
    }
  });

  const classNames = `"${unconditionalClassNames.trim()}", ${logicalClassNames}`;

  return template(
    `
  forwardRef(({
    as: C = ${buildComponentTag(opts.tag)},
    style,
    ${unique(propsToDestructure)
      .map((prop) => prop + ',')
      .join('')}
    ...${PROPS_IDENTIFIER_NAME}
  }, ref) => (
    <CC>
      <CS ${nonceAttribute}>{%%cssNode%%}</CS>
      <C
        {...${PROPS_IDENTIFIER_NAME}}
        style={%%styleProp%%}
        ref={ref}
        className={ax([${classNames} ${PROPS_IDENTIFIER_NAME}.className])}
      />
    </CC>
  ));
`,
    {
      plugins: ['jsx'],
    }
  )({
    styleProp,
    cssNode: t.arrayExpression(unique(opts.sheets).map((sheet) => hoistSheet(sheet, meta))),
  }) as t.Node;
};

/**
 * Will return a generated AST for a Compiled Component.
 * This is primarily used for CSS prop and ClassNames apis.
 *
 * @param node Originating node
 * @param sheets Stylesheets
 * @param meta Metadata
 */
export const compiledTemplate = (node: t.Expression, sheets: string[], meta: Metadata): t.Node => {
  const nonceAttribute = meta.state.opts.nonce ? `nonce={${meta.state.opts.nonce}}` : '';

  return template(
    `
  <CC>
    <CS ${nonceAttribute}>{%%cssNode%%}</CS>
    {%%jsxNode%%}
  </CC>
  `,
    {
      plugins: ['jsx'],
    }
  )({
    jsxNode: node,
    cssNode: t.arrayExpression(unique(sheets).map((sheet) => hoistSheet(sheet, meta))),
  }) as t.Node;
};

/**
 * Will join two expressions together,
 * Looks like `left + ' ' + right`.
 *
 * @param left Any node on the left
 * @param right Any node on the right
 * @param spacer Optional spacer node to place between the left and right node. Defaults to a space string.
 */
export const joinExpressions = (
  left: t.Expression,
  right: t.Expression,
  spacer: any = t.stringLiteral(' ')
): t.BinaryExpression => {
  return t.binaryExpression('+', left, spacer ? t.binaryExpression('+', spacer, right) : right);
};

/**
 * Will conditionally join two expressions together depending on the right expression.
 * Looks like: `left + right ? ' ' + right : ''`
 */
export const conditionallyJoinExpressions = (
  left: t.Expression,
  right: t.Expression
): t.BinaryExpression => {
  return t.binaryExpression(
    '+',
    left,
    t.conditionalExpression(
      right,
      t.binaryExpression('+', t.stringLiteral(' '), right),
      t.stringLiteral('')
    )
  );
};

/**
 * Returns a Styled Component AST.
 *
 * @param tag Styled tag either an inbuilt or user define
 * @param cssOutput CSS and variables to place onto the component
 * @param meta Plugin metadata
 */
export const buildStyledComponent = (tag: Tag, cssOutput: CSSOutput, meta: Metadata): t.Node => {
  const unconditionalCss: string[] = [];
  const logicalCss: CssItem[] = [];

  cssOutput.css.forEach((item) => {
    if (item.type === 'unconditional') {
      unconditionalCss.push(getItemCss(item));
    } else if (item.type === 'logical') {
      logicalCss.push(item);
    }
  });

  // Rely on transformCss to remove duplicates and return only the last unconditional CSS for each property
  const uniqueUnconditionalCssOutput = transformCss(unconditionalCss.join(''));

  // Rely on transformItemCss to build logicalExpressions for logical CSS
  const logicalCssOutput = transformItemCss({ css: logicalCss, variables: cssOutput.variables });

  const sheets = [...uniqueUnconditionalCssOutput.sheets, ...logicalCssOutput.sheets];

  const classNames = [
    ...[t.stringLiteral(uniqueUnconditionalCssOutput.classNames.join(' '))],
    ...logicalCssOutput.classNames,
  ];

  return styledTemplate(
    {
      classNames,
      tag,
      sheets,
      variables: cssOutput.variables,
    },
    meta
  );
};

/**
 * Wrapper to make defining import specifiers easier.
 * If `localName` is defined it will rename the import to it,
 * e.g: `name as localName`.
 *
 * @param name import name
 * @param localName local name
 */
export const importSpecifier = (name: string, localName?: string): t.ImportSpecifier => {
  return t.importSpecifier(t.identifier(name), t.identifier(localName || name));
};

/**
 * Returns the actual value of a jsx value.
 *
 * @param node
 */
export const getPropValue = (
  node: t.JSXElement | t.JSXFragment | t.StringLiteral | t.JSXExpressionContainer
): t.Expression => {
  const value = t.isJSXExpressionContainer(node) ? node.expression : node;

  if (t.isJSXEmptyExpression(value)) {
    throw new Error('Empty expression not supported.');
  }

  return value;
};

/**
 * Transforms CSS output into `sheets` and `classNames` ASTs.
 *
 * @param cssOutput CSSOutput
 */
const transformItemCss = (cssOutput: CSSOutput) => {
  const sheets: string[] = [];
  const classNames: t.Expression[] = [];

  cssOutput.css.forEach((item) => {
    const css = transformCss(getItemCss(item));
    const className = css.classNames.join(' ');

    sheets.push(...css.sheets);

    switch (item.type) {
      case 'logical':
        classNames.push(
          t.logicalExpression(item.operator, item.expression, t.stringLiteral(className))
        );
        break;

      case 'unconditional':
      default:
        classNames.push(t.stringLiteral(className));
        break;
    }
  });

  return { sheets, classNames };
};

/**
 * Returns a Compiled Component AST.
 *
 * @param node Originating node
 * @param cssOutput CSS and variables to place onto the component
 * @param meta Plugin metadata
 */
export const buildCompiledComponent = (
  node: t.JSXElement,
  cssOutput: CSSOutput,
  meta: Metadata
): t.Node => {
  const { sheets, classNames } = transformItemCss(cssOutput);

  const classNameProp = node.openingElement.attributes.find((prop): prop is t.JSXAttribute => {
    return t.isJSXAttribute(prop) && prop.name.name === 'className';
  });

  if (classNameProp && classNameProp.value) {
    // If there is a class name prop statically defined we want to concatenate it with
    // the class name we're going to put on it.
    const classNameExpression = getPropValue(classNameProp.value);
    const values: t.Expression[] = classNames.concat(classNameExpression);

    classNameProp.value = t.jsxExpressionContainer(
      t.callExpression(t.identifier('ax'), [t.arrayExpression(values)])
    );
  } else {
    // No class name - just push our own one.
    node.openingElement.attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier('className'),
        t.jsxExpressionContainer(
          t.callExpression(t.identifier('ax'), [t.arrayExpression(classNames)])
        )
      )
    );
  }

  if (cssOutput.variables.length) {
    // If there is dynamic CSS in use we have work to do.
    let stylePropIndex = -1;
    // Find the style prop on the opening JSX element.
    const styleProp = node.openingElement.attributes.find((prop, index): prop is t.JSXAttribute => {
      if (t.isJSXAttribute(prop) && prop.name.name === 'style') {
        stylePropIndex = index;
        return true;
      }

      return false;
    });

    const dynamicStyleProperties = buildCssVariablesProp(cssOutput.variables);

    if (styleProp) {
      // Remove the pre-existing style prop - we're going to redefine it soon.
      node.openingElement.attributes.splice(stylePropIndex, 1);

      if (
        styleProp.value &&
        t.isJSXExpressionContainer(styleProp.value) &&
        !t.isJSXEmptyExpression(styleProp.value.expression)
      ) {
        // If it's not an object we just spread the expression into the object
        if (!t.isObjectExpression(styleProp.value.expression)) {
          dynamicStyleProperties.splice(0, 0, t.spreadElement(styleProp.value.expression));
        } else {
          // Else it's an object! So we want to place each property into the object
          styleProp.value.expression.properties.forEach((prop, index) => {
            if (t.isObjectMethod(prop)) {
              return;
            }

            // We want to keep the order that they were defined in.
            // So we're using index here to do just that.
            dynamicStyleProperties.splice(index, 0, prop);
          });
        }
      }
    }

    // Finally add the new style prop back to the opening JSX element.
    node.openingElement.attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier('style'),
        t.jsxExpressionContainer(t.objectExpression(dynamicStyleProperties))
      )
    );
  }

  return compiledTemplate(node, sheets, meta);
};
