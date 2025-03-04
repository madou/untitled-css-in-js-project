# @compiled/react

## 0.18.3

### Patch Changes

- baa173c: Fix type definition for CSS properties with string values.

## 0.18.2

### Patch Changes

- 162210d8: Improve the types to the `keyframes()` function to handle CSS variables.

## 0.18.1

### Patch Changes

- 1d2054c0: Protect @compiled/react/dist/browser/runtime in environments without a document defined.

## 0.18.0

### Minor Changes

- 9a15e742: Sort shorthand properties so that they come before longhand properties.

  When using Compiled, one of the following will happen:

  Option 1. If stylesheet extraction is turned off ("runtime mode"): shorthand properties will be sorted before longhand properties, as long as they are not in a pseudo-selector like `:hover` or `:active`. This is enabled by default and cannot be turned off.

  Option 2. If stylesheet extraction is turned on and one of the below is true:

  - You are using Webpack
  - You are using Parcel AND you are running in production mode

  ... shorthand properties will only be sorted if `sortShorthand: true` is passed to `CompiledExtractPlugin` (Webpack), or `sortShorthand: true` is passed to your Compiled config file like `.compiledcssrc` (Parcel). When sorting shorthand properties using this method (option 2), shorthand properties will always be sorted before longhand properties, taking precedence over pseudo-selectors like `:hover` or `:active`.

## 0.17.3

### Patch Changes

- 25a4bed4: Fix the `cx()` function's class collection at runtime as it generated class instances rather than strings

## 0.17.2

### Patch Changes

- d75b8286: Add `ElementType` to the global compiled JSX namespace

## 0.17.1

### Patch Changes

- 10c9dcec: added additional type exports to support other ts moduleResolution methods

## 0.17.0

### Minor Changes

- 39d9a02c: The `requiredPseudos` type property in XCSS prop has been removed.
- 5701b914: Types for `createStrictAPI` have been refactored to improve type inference and expectations.

  Previously defining the schema came with a lot of redundant work. For every pseudo that you wanted to type you would have to define it, and then all of the base types again, like so:

  ```ts
  interface Schema {
    background: 'var(--bg)';
    color: 'var(--color)';
    '&:hover': {
      background: 'var(--bg)';
      color: 'var(--color-hovered)';
    };
  }

  createStrictAPI<Schema>();
  ```

  If you missed a value / didn't type every possible pseudo it would fallback to the CSSProperties value from csstype. This was mostly unexpected. So for example right now `&:hover` has been typed, but no other pseudo... meaning no other pseudos would benefit from the schema types!

  With this refactor all CSS properties use the top types unless a more specific one is defined, meaning you only need to type the values you want to explicitly support. In the previous example we're now able to remove the `background` property as it's the same as the top one.

  ```diff
  interface Schema {
    background: 'var(--bg)';
    color: 'var(--color)';
    '&:hover': {
  -    background: 'var(--bg)';
      color: 'var(--color-hovered)';
    };
  }

  createStrictAPI<Schema>();
  ```

### Patch Changes

- 4b2e5eeb: - The CSS map API now allows defining top level media queries. Previously you had to define them inside a `@media` object, this restriction has now been removed bringing it inline with the CSS function API.

  - The XCSS prop and strict API types now allow defining and using media queries.

  **XCSS prop**

  The XCSS prop now takes top level media queries. Nested media queries is not allowed.

  ```jsx
  import { cssMap, css } from '@compiled/react';

  const styles = cssMap({
    valid: { '@media (min-width: 30rem)': { color: 'green' } },
    invalid: { '@media': { '(min-width: 30rem)': { color: 'red' } } },
  });

  <Component xcss={styles.valid} />;
  ```

  **createStrictAPI**

  Now takes an optional second generic to define what media queries are supported:

  ```diff
  createStrictAPI<
    { color: 'var(--text)' }
  +  { media: '(min-width: 30rem)' | '(min-width: 48rem)' }
  >();
  ```

  Which is then flushed to all output APIs.

- 20528e91: Better cssMap types: fix inference of complex types and adds descriptions to the type.

## 0.16.10

### Patch Changes

- a68817a2: Fix css function base types to have CSS property values available in intellisense.

## 0.16.9

### Patch Changes

- 541ab19e: Add `ElementType` to the Compiled JSX namespace. This is needed to ensure types are the same in the Compiled JSX namspace and the default React one, such as returning `undefined`, `string`, and other freshly valid types.

## 0.16.8

### Patch Changes

- 39714ae3: Fix nested types being forcibly required.

## 0.16.7

### Patch Changes

- 5dca5c51: Export `CSSPseudos, CSSProperties, StrictCSSProperties` types for a strict `XCSSProp` implementation.

## 0.16.6

### Patch Changes

- 34674ae1: Fix `cssMap` returned from `createStrictAPI` to return types based on the generic input, fixing usage with the `XCSSProp` API.

## 0.16.5

### Patch Changes

- cd11b421: Block invalid properties on our `cssMap` input objects to avoid invalid css and other mistakes.

## 0.16.4

### Patch Changes

- e9b50b44: Add custom error message to be shown when any output from createStrictAPI() is unexpectedly executed.

## 0.16.3

### Patch Changes

- 9857009f: Introduce new API `createStrictAPI` which returns a strict subset of Compiled APIs augmented by a type definition.
  This API does not change Compileds build time behavior — merely augmenting
  the returned API types which enforce:

  - all APIs use object types
  - property values declared in the type definition must be used (else fallback to defaults)
  - a strict subset of pseudo states/selectors
  - unknown properties to be a type violation

  To set up:

  1. Declare the API in a module (either local or in a package):

  ```tsx
  import { createStrictAPI } from '@compiled/react';

  // ./foo.ts
  const { css, cssMap, XCSSProp, cx } = createStrictAPI<{
    color: 'var(--ds-text)';
    '&:hover': { color: 'var(--ds-text-hover)' };
  }>();

  // Expose APIs you want to support.
  export { css, cssMap, XCSSProp, cx };
  ```

  2. Configure Compiled to pick up this module:

  ```diff
  // .compiledcssrc
  {
  +  "importSources": ["./foo.ts"]
  }
  ```

  3. Use the module in your application code:

  ```tsx
  import { css } from './foo';

  const styles = css({ color: 'var(--ds-text)' });

  <div css={styles} />;
  ```

## 0.16.2

### Patch Changes

- be019f11: Add detectConflictWithOtherLibraries and onlyRunIfImportingCompiled config options to jsx-pragma ESLint rule. Both are set to true by default, hence the breaking change.

  `detectConflictWithOtherLibraries` raises a linting error if `css` or `jsx` is imported from `@emotion/react` (or `@emotion/core`) in the same file
  as a Compiled import. Set to true by default.

  `onlyRunIfImportingCompiled` sets this rule to only suggest adding the JSX pragma if the `css` or `cssMap` functions are imported from `@compiled/react`, as opposed to whenever the `css` attribute is detected at all. Set to false by default.

## 0.16.1

### Patch Changes

- 4caa6784: The xcss prop is now available.
  Declare styles your component takes with all other styles marked as violations
  by the TypeScript compiler. There are two primary use cases for xcss prop:

  - safe style overrides
  - inverting style declarations

  Interverting style declarations is interesting for platform teams as
  it means products only pay for styles they use as they're now the ones who declare
  the styles!

  The `XCSSProp` type has generics which must be defined — of which should be what you
  explicitly want to maintain as API. Use `XCSSAllProperties` and `XCSSAllPseudos` types
  to enable all properties and pseudos.

  ```tsx
  import { type XCSSProp } from '@compiled/react';

  interface MyComponentProps {
    // Color is accepted, all other properties / pseudos are considered violations.
    xcss?: XCSSProp<'color', never>;

    // Only backgrond color and hover pseudo is accepted.
    xcss?: XCSSProp<'backgroundColor', '&:hover'>;

    // All properties are accepted, all pseudos are considered violations.
    xcss?: XCSSProp<XCSSAllProperties, never>;

    // All properties are accepted, only the hover pseudo is accepted.
    xcss?: XCSSProp<XCSSAllProperties, '&:hover'>;
  }

  function MyComponent({ xcss }: MyComponentProps) {
    return <div css={{ color: 'var(--ds-text-danger)' }} className={xcss} />;
  }
  ```

  The xcss prop works with static inline objects and the [cssMap](https://compiledcssinjs.com/docs/api-cssmap) API.

  ```tsx
  // Declared as an inline object
  <Component xcss={{ color: 'var(--ds-text)' }} />;

  // Declared with the cssMap API
  const styles = cssMap({ text: { color: 'var(--ds-text)' } });
  <Component xcss={styles.text} />;
  ```

  To concatenate and conditonally apply styles use the `cssMap` and `cx` functions.

- dccb71e0: Adds third generic for XCSSProp type for declaring what properties and pseudos should be required.

## 0.16.0

### Minor Changes

- f8d01fa2: Remove Flow types as they are increasingly difficult to maintain

## 0.15.0

### Minor Changes

- b6f3e41e: Change `cssMap` types to use stricter type checking and only allowing a limited subset of whitelisted selectors (e.g. `&:hover`); implement syntax for at-rules (e.g. `@media`); implement `selectors` key for non-whitelisted selectors.

## 0.14.0

### Minor Changes

- 4a2174c5: Implement the `cssMap` API to enable library users to dynamically choose a varied set of CSS rules.

### Patch Changes

- c5377cdb: Ensure that the return types of `css` and `cssMap` are readonly.

## 0.13.1

### Patch Changes

- cd977654: Remove `@compiled/react` runtime side-effect to ensure no error if the module is reloaded.

## 0.13.0

### Minor Changes

- c4e6b7c0: Introduce a new runtime class name library, which resolves the `ax` chaining issue. The new library is used only if class name compression is enabled.
- c4e6b7c0: Change TypeScript compiler target from es5 to es6.

## 0.12.0

### Minor Changes

- a41e41e6: Update monorepo node version to v18, and drop support for node v12
- f9c957ef: Add an option to compress class names based on "classNameCompressionMap", which is provided by library consumers.
  Add a script to generate compressed class names.

## 0.11.4

### Patch Changes

- 6df1976c: Update isServerEnvironment to support different SSR environment

## 0.11.3

### Patch Changes

- acd89969: Fix react runtime ax function returning incorrect result for selectors

## 0.11.2

### Patch Changes

- 08a963fc: Bump flowgen types

## 0.11.1

### Patch Changes

- 13b71dfb: - Give a name to CSS var used for empty values
  - Update loki to 0.30.3

## 0.11.0

### Minor Changes

- 1cab89a: check node environment based on `process` instead of `window`

### Patch Changes

- ad4d257: Update TypeScript and Flow types to support function calls and resolve incorrect typing

## 0.10.4

### Patch Changes

- 356b120: Apply react/jsx-filename-extension rule as needed

## 0.10.3

### Patch Changes

- 47050f4: Add client CS benchmark

## 0.10.2

### Patch Changes

- 254a6f6: Added ESLint rule to prevent use of extraneous packages, and added these usages of these packages as dependencies. Added new namespace `@compiled-private` to prevent name clashes with existing npm packages.
- c757259: Update type definition dependencies
- 6649528: Changed the SSR check to be based on the presence of `document` instead of looking for Node processes.

## 0.10.1

### Patch Changes

- d3e257c: Fixes `css` function types to allow nested styles
- 8c9ab8c: Update `homepage` and other `package.json` properties
- 8c9ab8c: JSDoc descriptions for all exports have been updated, let us know what you think!
- 8c9ab8c: `ClassNames` component now has its style prop typed as `CSSProperties` instead of a string map

## 0.10.0

### Minor Changes

- 427cead: **Breaking change:** When using the `css` prop with [TypeScript](https://www.typescriptlang.org) you now need to declare a JSX pragma enabling types for that module. Previously when importing the `@compiled/react` package the global JSX namespace would be polluted as a side effect potentially causing collisions with other CSS-in-JS libraries. Now thanks to the use of [locally scoped JSX namespaces](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#locally-scoped-jsx-namespaces) the global JSX namespace will no longer be polluted.

  As an added bonus the `css` prop will only be available on JSX elements that have also defined a `className` prop with the potential for more type safe features later on.

  Make sure to update all Compiled dependencies to latest when adopting this change.

  **Automatic runtime**

  ```diff
  -import '@compiled/react';
  +/** @jsxImportSource @compiled/react */

  <div css={{ display: 'block' }} />;
  ```

  **Classic runtime**

  ```diff
  -import '@compiled/react';
  +/** @jsx jsx */
  +import { jsx } from '@compiled/react';

  <div css={{ display: 'block' }} />;
  ```

  To aid consumers in adopting this change easily, a new ESLint rule `jsx-pragma` has been created which will automatically migrate you to use a JSX pragma if missing when running with `--fix`. The rule takes an option to configure the runtime (either classic or automatic) and defaults to automatic.

  ```sh
  npm i @compiled/eslint-plugin
  ```

  ```json
  {
    "rules": {
      "@compiled/jsx-pragma": ["error", { "runtime": "classic" }]
    }
  }
  ```

### Patch Changes

- 79cfb08: Internal refactor changing how the TypeScript compiler picks up source files.

## 0.9.1

### Patch Changes

- 4309aaa: Patch inexact flow type on styled

## 0.9.0

### Minor Changes

- 2092839: Allow inline strings and inline css mixins in conditional expressions. Fix ordering of styles in template literals.

## 0.8.0

### Minor Changes

- 4210ff6: Add flow types support
- 53935b3: Add `ObjectExpression` support to `css`

## 0.7.0

### Minor Changes

- bcb2a68: Add support for `keyframes`
- a7ab8e1: Add support for conditional rules for `Styled`

## 0.6.13

### Patch Changes

- 13c3a60: add support of additional parameters to css function

## 0.6.12

### Patch Changes

- b5b4e8a: Catch unhandled exception on inserting rules with prefixed selectors.

## 0.6.11

### Patch Changes

- ee3363e: Fix HTML characters escapes in style tags on SSR.

## 0.6.10

### Patch Changes

- 40bc0d9: Package descriptions have been updated.
- 1b1c964: The `css` mixin API is now available,
  functioning similarly to the [emotion equivalent](https://emotion.sh/docs/composition).

  ```jsx
  import { css } from '@compiled/react';

  <div
    css={css`
      display: flex;
      font-size: 50px;
      color: blue;
    `}>
    blue text
  </div>;
  ```

  For more help, read the docs: https://compiledcssinjs.com/docs/css.

## 0.6.9

### Patch Changes

- 4032cd4: Memo has been removed from the style component which was breaking re-renders at times.

## 0.6.8

### Patch Changes

- aea3504: Packages now released with [changesets](https://github.com/atlassian/changesets).
