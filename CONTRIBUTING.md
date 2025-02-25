# Contributing to Compiled

Thank you for considering a contribution to Compiled! Pull requests, issues and comments are welcome.

However, please note that we do not officially support using Compiled outside of Atlassian products and the Atlassian ecosystem. As such, support will likely be limited if you use Compiled for products unrelated to Atlassian.

## Contribution Standards

- Add tests for new features and bug fixes
- Follow the existing style
- Separate unrelated changes into multiple pull requests
- Add a changeset for packages requiring a version bump by calling `yarn changeset`
  - Select `minor` when introducing new features, and `patch` for bug fixes
  - Ensure the changeset message is informative.
- Please name your feature/bug branches descriptively.

See the [existing issues](https://github.com/atlassian-labs/compiled/issues) for things to start contributing.

For bigger changes, please make sure you start a discussion first by creating an issue and explaining the intended change.

### If you are an Atlassian employee

You do not need to sign a Contributor License Agreement (CLA).

Instead, you should link your GitHub account to your `@atlassian.com` Atlassian account, so that your GitHub account is recognised as belonging to an Atlassian employee.

Please search for the "Link your Github & Atlassian accounts" page on the internal wiki for instructions on how to do this.

### If you don't work for Atlassian

Atlassian requires contributors to sign a Contributor License Agreement (CLA).
This serves as a record stating that the contributor is entitled to contribute the code/documentation/translation
to the project and is willing to have it used in distributions and derivative works (or is willing to transfer ownership).

Prior to accepting your contributions we ask that you please follow the appropriate link below to digitally sign the CLA.
The Corporate CLA is for those who are contributing as a member of an organization and the individual CLA is for those contributing as an individual.

- [CLA for individuals](https://opensource.atlassian.com/individual)
- [CLA for corporate contributors](https://opensource.atlassian.com/corporate)

## Key Concepts

### CSS-in-JS

Compiled is a CSS-in-JS library that lets developers write CSS within their React code. Other libraries in this space include styled-components and Emotion. Below are some code examples.

How people usually write in Compiled (we do want to change this long-term). This is similar to the styled function from [styled-components](https://styled-components.com/).

```javascript
import { styled } from '@compiled/react';

const MyComponent = styled.div({
  margin: 0,
  color: 'blue',
  padding: '250px',
  backgroundColor: 'pink',
});

export const App = () => <MyComponent>Hello!</MyComponent>;
```

However, long term we want developers to write more like below. This is more similar to [emotion](https://emotion.sh/docs/css-prop).

```javascript
/** @jsx jsx */
import { css, jsx } from '@compiled/react';

const myStyles = css({
  margin: 0,
  color: 'blue',
  padding: '250px',
  backgroundColor: 'pink',
});

export const App = () => <div css={myStyles}>Hello!</div>;
```

### Abstract Syntax Trees (AST)

An AST is an abstract representation of the syntax that makes up the programming language. ASTs are used to manipulate JavaScript code at build time, or to automatically refactor code. This concept is important for understanding automation, which is key to maintaining any moderate to large codebase.

The `@compiled/babel-plugin` is backed by ASTs and forms the core implementation of Compiled. We recommend using [AST Explorer](https://astexplorer.net/) to gain a working understanding of ASTs, and the codebase.

## Getting started with local development

### Prerequisites

- NodeJS: https://nodejs.org/en/download
- NVM: https://github.com/nvm-sh/nvm
- Yarn: https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable

### Installation

- Use the recommended nvm version by calling `nvm use`
- Install all necessary dependencies with `yarn` or `yarn install`
- You will know things are working when calling `nvm use && yarn build` shows no error output
- You can call `yarn start` to start the storybook instance. If you have all the right dependencies and set up the repository properly, it should output no errors.

### Unit tests

Run tests locally where `<filter>` can be omitted,
a file path,
or a partial file name.

```bash
yarn test <filter> --watch
```

Looking at tests first is generally the best way to get started.

- Run a specific test file: `yarn test <filename> --watch` OR `yarn test:parcel <filename>` if the test file name ends with `parceltest.{ts,tsx}`
- Run tests related to a package `yarn test:packageName --watch`
- Update snapshot tests after implementing a code change: `yarn test <filter> --watch --updateSnapshot`

### Storybook

Run [storybook](https://storybook.js.org/) locally.

```bash
yarn start
```

### Visual regression tests

We use [Loki](https://github.com/oblador/loki) for visual regression tests.

Start a [storybook](https://storybook.js.org/) in another terminal (`yarn start`)

```bash
yarn test:vr
```

If there are expected changes, you can accept them with the command in the test or use the approve command.

```bash
yarn test:vr update --storiesFilter="^...\$"
yarn test:vr approve
```

### Testing with Webpack 4

We want to support both Webpack 4 and 5.
`yarn start:webpack` will use Webpack 5 but to test Webpack 4 you just need to make
a few small changes to the examples/webpack folder.

1. In examples/webpack/webpack.config.js, remove the `'...'` in the `optimization.minimizer` property.
   So

   ```
   optimization: {
     minimizer: ['...', new CssMinimizerPlugin()],
     usedExports: false,
   }
   ```

   becomes

   ```
   optimization: {
     minimizer: [new CssMinimizerPlugin()],
     usedExports: false,
   }
   ```

2. Update the examples/webpack/package.json dependency versions for the following packages:

- `"webpack": "^4"`
- `"html-webpack-plugin": "^4"`

---

### Helpful links

- [astexplorer.net](astexplorer.net) — When working on the Babel Plugin make sure to utilise this,
  it's a super useful tool that can visualize the abstract syntax tree (AST).
- [Babel Handbook](https://github.com/jamiebuilds/babel-handbook) — For getting started with Babel Plugins have a read of this first.
