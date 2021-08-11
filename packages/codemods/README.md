# codemods

> Codemods for easy migration from [styled components](https://styled-components.com/) and [emotion](https://emotion.sh/docs/introduction).

## Available codemods

1. [styled-components-to-compiled](./src/transforms/styled-components-to-compiled)
2. [emotion-to-compiled](./src/transforms/emotion-to-compiled)

## Plugins

Codemods support a simple plugin system where supported implementations can be overridden. The `CodemodPlugin` interface
lists all the supported methods to be re-implemented. See the following example:

```javascript
import { JSCodeshift, Collection, ImportDeclaration } from 'jscodeshift';
import { CodemodPlugin } from '@compiled/codemods';

const insertBeforeImport = ({
  j,
}: {
  j: JSCodeshift,
  newImport: Collection<ImportDeclaration>,
}): ImportDeclaration =>
  j.importDeclaration(
    [j.importSpecifier(j.identifier('getFeatureFlag'))],
    j.literal('./feature-flag')
  );

const ExampleCodemodPlugin: CodemodPlugin = {
  migrationTransform: { insertBeforeImport },
};

export default ExampleCodemodPlugin;
```
