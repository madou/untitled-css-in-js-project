import generate from '@babel/generator';
import template from '@babel/template';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { transformCss } from '@compiled/css';
import { unique, toBoolean } from '@compiled/utils';
import isPropValid from '@emotion/is-prop-valid';

import {
  DOM_PROPS_IDENTIFIER_NAME,
  PROPS_IDENTIFIER_NAME,
  REF_IDENTIFIER_NAME,
  STYLE_IDENTIFIER_NAME,
} from '../constants';
import type { Metadata, Tag } from '../types';

import { pickFunctionBody } from './ast';
import { buildCssVariables } from './build-css-variables';
import { compressClassNamesForRuntime } from './compress-class-names-for-runtime';
import { getItemCss } from './css-builders';
import { errorIfInvalidProperties } from './error-if-invalid-properties';
import { getRuntimeClassNameLibrary } from './get-runtime-class-name-library';
import { hoistSheet } from './hoist-sheet';
import { applySelectors, transformCssItems } from './transform-css-items';
import type { CSSOutput, CssItem } from './types';

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
 * Builds up the inline style prop value for a Styled Component.
 *
 * @param variables CSS variables that will be placed in the AST
 */
const styledStyleProp = (variables: CSSOutput['variables']) => {
  const props: (t.ObjectProperty | t.SpreadElement)[] = [
    t.spreadElement(t.identifier(STYLE_IDENTIFIER_NAME)),
  ];
  return t.objectExpression(
    props.concat(
      buildCssVariables(variables, (node) =>
        // Allows us to use component's closure scope instead of arrow function
        t.isArrowFunctionExpression(node) ? pickFunctionBody(node) : node
      )
    )
  );
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

const invalidDomPropsVisitor = {
  MemberExpression(this: { invalids: Set<string> }, path: NodePath<t.MemberExpression>) {
    const {
      node: { object, property },
    } = path;

    if (t.isIdentifier(object, { name: PROPS_IDENTIFIER_NAME }) && t.isIdentifier(property)) {
      const { name } = property;

      if (name !== 'children' && !isPropValid(name)) {
        this.invalids.add(name);
      }
    }
  },
};

/**
 * Finds all prop usage in a component and returns a list
 * of props that are not valid HTML attributes
 *
 * @param path Path of the styled component.
 */
const getInvalidDomProps = (path: NodePath<t.Node>): string[] => {
  const state = { invalids: new Set<string>() };

  path.traverse(invalidDomPropsVisitor, state);

  return Array.from(state.invalids);
};

/**
 * Will return a generated AST for a Styled Component.
 *
 * @param opts {StyledTemplateOpts} Template options
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
const styledTemplate = (opts: StyledTemplateOpts, meta: Metadata): t.Node => {
  const nonceAttribute = meta.state.opts.nonce ? `nonce={${meta.state.opts.nonce}}` : '';
  const styleProp = opts.variables.length
    ? styledStyleProp(opts.variables)
    : t.identifier(STYLE_IDENTIFIER_NAME);
  const isInBuiltComponent = opts.tag.type === 'InBuiltComponent';
  // This completely depends on meta.parentPath to be the styled component.
  // If this changes please pass the component in another way
  const invalidDomProps = isInBuiltComponent ? getInvalidDomProps(meta.parentPath) : [];
  const hasInvalidDomProps = Boolean(invalidDomProps.length);

  let unconditionalClassNames = '',
    conditionalClassNames = '';

  opts.classNames.forEach((item) => {
    if (t.isStringLiteral(item)) {
      unconditionalClassNames += `${item.value} `;
    } else if (t.isLogicalExpression(item) || t.isConditionalExpression(item)) {
      conditionalClassNames += `${generate(item).code}, `;
    }
  });

  // Extract the component name from declaration
  // i.e. componentName is `FooBar` given `const FooBar = styled.div(...)`
  const componentName = ((meta.parentPath.parent as t.VariableDeclarator)?.id as t.Identifier)
    ?.name;
  // Add componentClassName if `addComponentName` is enabled and on non-production environment
  const componentClassName =
    toBoolean(meta.state.opts.addComponentName) &&
    process.env.NODE_ENV !== 'production' &&
    componentName
      ? `"c_${componentName}", `
      : '';

  const classNames = `${componentClassName}"${unconditionalClassNames.trim()}", ${conditionalClassNames}`;
  const isDevelopmentEnv =
    (!process.env.BABEL_ENV && !process.env.NODE_ENV) ||
    ['development', 'test'].includes(process.env.BABEL_ENV || '') ||
    ['development', 'test'].includes(process.env.NODE_ENV || '');

  return template(
    `
  forwardRef(({
    as: C = ${buildComponentTag(opts.tag)},
    style: ${STYLE_IDENTIFIER_NAME},
    ...${PROPS_IDENTIFIER_NAME}
  }, ${REF_IDENTIFIER_NAME}) => {
    ${
      isDevelopmentEnv
        ? `if (${PROPS_IDENTIFIER_NAME}.innerRef) {
          throw new Error("Please use 'ref' instead of 'innerRef'.")
        }`
        : ''
    }
    ${
      hasInvalidDomProps
        ? `const {${invalidDomProps.join(
            ', '
          )}, ...${DOM_PROPS_IDENTIFIER_NAME}} = ${PROPS_IDENTIFIER_NAME};`
        : ''
    }

    return (
      <CC>
        <CS ${nonceAttribute}>{%%cssNode%%}</CS>
        <C
          {...${hasInvalidDomProps ? DOM_PROPS_IDENTIFIER_NAME : PROPS_IDENTIFIER_NAME}}
          style={%%styleProp%%}
          ref={${REF_IDENTIFIER_NAME}}
          className={${getRuntimeClassNameLibrary(
            meta
          )}([${classNames} ${PROPS_IDENTIFIER_NAME}.className])}
        />
      </CC>
    );
  });
`,
    {
      plugins: ['jsx'],
    }
  )({
    styleProp,
    cssNode: t.arrayExpression(unique(opts.sheets).map((sheet: string) => hoistSheet(sheet, meta))),
  }) as t.Node;
};

/**
 * Find CSS selectors that are apart of incomplete closures
 * i.e. `:hover {`
 *
 * @param css {string} Template options
 */
const findOpenSelectors = (css: string): string[] | null => {
  // Remove any occurrence of { or } inside quotes to stop them
  // interfering with closure matches
  let searchArea = css.replace(/['|"].*[{|}].*['|"]/g, '');
  // Skip over complete closures
  searchArea = searchArea.substring(searchArea.lastIndexOf('}') + 1);

  // Regex for CSS selector
  //[^;\s] Don't match ; or whitespace
  // .+\n?{ Match anything (the selector itself) followed by any newlines then {
  return searchArea.match(/[^;\s].+\n?{/g);
};

/**
 * Returns a Styled Component AST.
 *
 * @param tag {Tag} Styled tag either an inbuilt or user define
 * @param cssOutput {CSSOutput} CSS and variables to place onto the component
 * @param meta {Metadata} Useful metadata that can be used during the transformation
 */
export const buildStyledComponent = (tag: Tag, cssOutput: CSSOutput, meta: Metadata): t.Node => {
  let unconditionalCss = '';
  const conditionalCssItems: CssItem[] = [];

  cssOutput.css.forEach((item) => {
    if (item.type === 'logical' || item.type === 'conditional') {
      // TODO: Optimize this to only run if there is a
      // potential selector scope change
      const selectors = findOpenSelectors(unconditionalCss);

      if (selectors) {
        applySelectors(item, selectors);
      }

      conditionalCssItems.push(item);
    } else {
      unconditionalCss += getItemCss(item);
    }
  });

  // Rely on transformCss to remove duplicates and return only the last unconditional CSS for each property
  const uniqueUnconditionalCssOutput = transformCss(unconditionalCss, meta.state.opts);

  // Rely on transformItemCss to build expressions for conditional & logical CSS
  const conditionalCssOutput = transformCssItems(conditionalCssItems, meta);

  const sheets = [...uniqueUnconditionalCssOutput.sheets, ...conditionalCssOutput.sheets];
  const classNames = [
    ...[
      t.stringLiteral(
        compressClassNamesForRuntime(
          uniqueUnconditionalCssOutput.classNames,
          meta.state.opts.classNameCompressionMap
        ).join(' ')
      ),
    ],
    ...conditionalCssOutput.classNames,
  ];

  // TODO: verify whether this is actually correct for anything beyond the most basic case
  //
  // NOTE: Limitation - cannot handle styled(OtherComponent)({ ... }) - given that this is processed at runtime, I believe this would require a runtime check in ax()?
  const properties = [
    ...uniqueUnconditionalCssOutput.properties,
    ...conditionalCssOutput.properties,
  ];

  errorIfInvalidProperties(properties);
  // TODO: write tests for this now that we know that the basic case works
  console.log('buildStyledComponent', properties);

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
