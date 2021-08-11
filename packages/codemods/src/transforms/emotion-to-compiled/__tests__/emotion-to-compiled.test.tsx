jest.disableAutomock();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defineInlineTest = require('jscodeshift/dist/testUtils').defineInlineTest;

import { transformer } from '../emotion-to-compiled';

describe('emotion-to-compiled transformer', () => {
  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    "import styled from '@emotion/styled';",
    "import { styled } from '@compiled/react';",
    'it transforms default @emotion/styled imports'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    "import sc from '@emotion/styled';",
    "import { styled as sc } from '@compiled/react';",
    'it transforms default with different name than "styled" @emotion/styled imports'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    import { ClassNames } from '@emotion/core';
    `,
    `
    import { ClassNames } from '@compiled/react';
    `,
    'it transforms ClassNames named @emotion/core import'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css, jsx, ClassNames } from '@emotion/core';
    `,
    `
    import * as React from 'react';
    import { ClassNames } from '@compiled/react';
    `,
    'it transforms all named @emotion/core imports'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css as c, jsx, ClassNames as CN } from '@emotion/core';
    `,
    `
    import * as React from 'react';
    import { ClassNames as CN } from '@compiled/react';
    `,
    'it transforms all named @emotion/core imports with different imported name'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css, jsx, ClassNames } from '@emotion/core';
    import styled from '@emotion/styled';
    `,
    `
    import * as React from 'react';
    import { ClassNames, styled } from '@compiled/react';
    `,
    'it transforms all named @emotion/core and default @emotion/styled imports'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css as c, jsx, ClassNames as CN } from '@emotion/core';
    import sc from '@emotion/styled';
    `,
    `
    import * as React from 'react';
    import { ClassNames as CN, styled as sc } from '@compiled/react';
    `,
    'it transforms all named @emotion/core with different imported name and default with different name than "styled" @emotion/styled imports'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css, jsx } from '@emotion/core';
    `,
    `
    import * as React from 'react';
    import '@compiled/react';
    `,
    'it handles the case when no api is imported from compiled package'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css, jsx } from '@emotion/core';
    import styled from '@emotion/styled';

    const Component = (props) => (
      <>
        <div
          css={css\`
            color: red;
            background-color: #000;
          \`}
        />
        <span css={css\` color: blue; \`} />
      </>
    );
    `,
    `
    import * as React from 'react';
    import { styled } from '@compiled/react';

    const Component = (props) => (
      <>
        <div
          css={\`
            color: red;
            background-color: #000;
          \`}
        />
        <span css={\` color: blue; \`} />
      </>
    );
    `,
    'it transforms and removes named @emotion/core "css" tagged template literal'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css as c, jsx } from '@emotion/core';
    import styled from '@emotion/styled';

    const Component = (props) => (
      <>
        <div
          css={c\`
            color: red;
            background-color: #000;
          \`}
        />
        <span css={c\` color: blue; \`} />
      </>
    );
    `,
    `
    import * as React from 'react';
    import { styled } from '@compiled/react';

    const Component = (props) => (
      <>
        <div
          css={\`
            color: red;
            background-color: #000;
          \`}
        />
        <span css={\` color: blue; \`} />
      </>
    );
    `,
    'it transforms and removes named @emotion/core with different imported name "css" tagged template literal'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { jsx } from '@emotion/core';
    import styled from '@emotion/styled';

    const Component = (props) => (
      <div
        css={{
          color: 'red',
          backgroundColor: props.background,
        }}
      />
    );
    `,
    `
    import * as React from 'react';
    import { styled } from '@compiled/react';

    const Component = (props) => (
      <div
        css={{
          color: 'red',
          backgroundColor: props.background,
        }}
      />
    );
    `,
    'it should not transform when named @emotion/core "css" tagged template literal is not present'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { jsx } from '@emotion/core';
    import styled from '@emotion/styled';

    const Component = (props) => (
      <div
        css={\`
          color: red;
          background-color: #000;
        \`}
      />
    );
    `,
    `
    import * as React from 'react';
    import { styled } from '@compiled/react';

    const Component = (props) => (
      <div
        css={\`
          color: red;
          background-color: #000;
        \`}
      />
    );
    `,
    'it should not transform when tagged template literal is not of type named @emotion/core "css"'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import _ from 'lodash';
    import { css, jsx } from '@emotion/core';
    `,
    `
    import * as React from 'react';
    import _ from 'lodash';
    import '@compiled/react';
    `,
    'it removes jsx pragma when @emotion/core is defined far from it'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import styled from '@emotion/styled';
    import { css, jsx } from '@emotion/core';
    `,
    `
    import * as React from 'react';
    import { styled } from '@compiled/react';
    `,
    'it removes jsx pragma when @emotion/core is defined far from it and @emotion/styled is present'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css, jsx } from '@emotion/core';
    import styled from '@emotion/styled';
    import _ from 'lodash';
    `,
    `
    import * as React from 'react';
    import { styled } from '@compiled/react';
    import _ from 'lodash';
    `,
    'it ignores other imports'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css, jsx } from '@emotion/core';
    import styled from '@emotion/styled';
    import _ from 'lodash';
    import { useState, useEffect } from 'react';
    `,
    `
    import { styled } from '@compiled/react';
    import _ from 'lodash';
    import React, { useState, useEffect } from 'react';
    `,
    'it adds `React` identifier to already imported react package if not present'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css, jsx } from '@emotion/core';
    import styled from '@emotion/styled';
    import _ from 'lodash';
    import React from 'react';
    `,
    `
    import { styled } from '@compiled/react';
    import _ from 'lodash';
    import React from 'react';
    `,
    'it should not add `React` identifier to already imported react package if default is present'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { css, jsx } from '@emotion/core';
    import styled from '@emotion/styled';
    import _ from 'lodash';
    import * as React from 'react';
    `,
    `
    import { styled } from '@compiled/react';
    import _ from 'lodash';
    import * as React from 'react';
    `,
    'it should not add `React` identifier to already imported react package if namespace is present'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { ClassNames, CSSObject, css as c, jsx } from '@emotion/core';

    let cssObject: CSSObject = {};

    const Component = () => (
      <ClassNames>
        {({ css }) => (
          <SomeComponent
            wrapperClassName={css({ color: 'green' })}
            css={c\`background-color: green \`}
            className={css\`
              color: hotpink;
            \`}
          >
            Hello
          </SomeComponent>
        )}
      </ClassNames>
    );
    `,
    `
    /* TODO(@compiled/react codemod): "CSSObject" is not exported from "@compiled/react" at the moment. Please find an alternative for it. */
    import * as React from 'react';
    import { ClassNames } from '@compiled/react';

    let cssObject: CSSObject = {};

    const Component = () => (
      <ClassNames>
        {({
          css,

          /* TODO(@compiled/react codemod): We have exported "style" from "ClassNames" props.
          If you are using dynamic declarations, make sure to set the "style"
          prop otherwise remove it. */
          style: style
        }) => (
          <SomeComponent
            wrapperClassName={css({ color: 'green' })}
            css={\`background-color: green \`}
            className={css\`
              color: hotpink;
            \`}
          >
            Hello
          </SomeComponent>
        )}
      </ClassNames>
    );
    `,
    'it adds TODO comment for imports which are not resolved'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    // @top-level comment

    /** @jsx jsx */
    import { ClassNames, CSSObject, css as c, jsx } from '@emotion/core';
    // comment 1
    import * as React from 'react';
    `,
    `
    /* TODO(@compiled/react codemod): "CSSObject" is not exported from "@compiled/react" at the moment. Please find an alternative for it. */
    // @top-level comment

    import { ClassNames } from '@compiled/react';

    // comment 1
    import * as React from 'react';
    `,
    'it should not remove top level comments when transformed'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    // @top-level comment

    /** @jsx jsx */
    import * as React from 'react';
    // comment 1
    import { ClassNames, CSSObject, css as c, jsx } from '@emotion/core';
    `,
    `
    /* TODO(@compiled/react codemod): "CSSObject" is not exported from "@compiled/react" at the moment. Please find an alternative for it. */
    // @top-level comment

    import * as React from 'react';

    // comment 1
    import { ClassNames } from '@compiled/react';
    `,
    'it should not remove comments before transformed statement when not on top'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    `
    /** @jsx jsx */
    import { ClassNames as CN, css as c, jsx } from '@emotion/core';

    const Component = () => (
      <CN>
        {({ css, cx }) => (
          <SomeComponent
            wrapperClassName={css({ color: 'green' })}
            css={c\`background-color: green \`}
            className={cx()}
          >
            Hello
          </SomeComponent>
        )}
      </CN>
    );
    `,
    `
    import * as React from 'react';
    import { ClassNames as CN } from '@compiled/react';

    const Component = () => (
      <CN>
        {({
          css,

          /* TODO(@compiled/react codemod): Please replace "cx" with "ax" from "@compiled/react/runtime".
          Usage: import { ax } from '@compiled/react/runtime';

          NOTE: Both "cx" and "ax" have some differences, so we have not replaced its usage.
          Please check the docs for "ax" usage.

          In future, we will expose "ax" directly from "ClassNames" props.

          Issue tracked on Github: https://github.com/atlassian-labs/compiled/issues/373 */
          cx,

          /* TODO(@compiled/react codemod): We have exported "style" from "ClassNames" props.
          If you are using dynamic declarations, make sure to set the "style"
          prop otherwise remove it. */
          style: style
        }) => (
          <SomeComponent
            wrapperClassName={css({ color: 'green' })}
            css={\`background-color: green \`}
            className={cx()}
          >
            Hello
          </SomeComponent>
        )}
      </CN>
    );
    `,
    'it should handle "ClassNames" behavior'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    { pluginModules: [] },
    "import * as React from 'react';",
    "import * as React from 'react';",
    'it should not transform when emotion imports are not present'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      pluginModules: [
        {
          migrationTransform: {
            buildImport: ({ j }) =>
              j.expressionStatement(
                j.callExpression(j.memberExpression(j.identifier('console'), j.identifier('log')), [
                  j.literal('Bring back Netscape'),
                ])
              ),
          },
        },
      ],
    },
    "import styled from '@emotion/styled';",
    "console.log('Bring back Netscape');",
    'it should use the buildImport from the plugin'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      pluginModules: [
        {
          migrationTransform: {
            insertBeforeImport: ({ j }) =>
              j.expressionStatement(
                j.callExpression(j.memberExpression(j.identifier('console'), j.identifier('log')), [
                  j.literal('Bring back Netscape'),
                ])
              ),
          },
        },
      ],
    },
    "import styled from '@emotion/styled';",
    "console.log('Bring back Netscape');\nimport { styled } from '@compiled/react';",
    'it should use the insertBeforeImport from the plugin'
  );

  defineInlineTest(
    { default: transformer, parser: 'tsx' },
    {
      pluginModules: [
        {
          migrationTransform: {
            insertAfterImport: ({ j }) =>
              j.expressionStatement(
                j.callExpression(j.memberExpression(j.identifier('console'), j.identifier('log')), [
                  j.literal('Bring back Netscape'),
                ])
              ),
          },
        },
      ],
    },
    "import styled from '@emotion/styled';",
    "import { styled } from '@compiled/react';\nconsole.log('Bring back Netscape');",
    'it should use the insertAfterImport from the plugin'
  );
});
