# emotion-to-compiled

> Codemod for easy migration from emotion.

## Usage

```bash
npx @compiled/cli --preset codemods
# and follow the instructions
```

**Will modify files in place, so make sure you can recover if it goes wrong!**

## Examples

```javascript
/** @jsx jsx */
import styled from '@emotion/styled';
import { css, jsx } from '@emotion/core';

const Component = (props) => (
  <>
    <div
      css={css`
        color: red;
        background-color: #000;
      `}
    />
    <span
      css={css`
        color: blue;
      `}
    />
  </>
);
```

Is transformed to:

```javascript
import { styled } from '@compiled/react';

const Component = (props) => (
  <>
    <div
      css={`
        color: red;
        background-color: #000;
      `}
    />
    <span
      css={`
        color: blue;
      `}
    />
  </>
);
```

## Updating Instructions

When wanting to update to a later version make sure `@compiled/cli` is being ran with the same version.

> Watch out for it being cached!

For example when upgrading `@compiled/react` to `v0.6.0` where you've already used the CLI,
on your next run explicitly set the version number:

```bash
npx @compiled/cli@0.6.0 --preset codemods
```
