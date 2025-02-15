import { basename, resolve, join, dirname } from 'path';

import { declare } from '@babel/helper-plugin-utils';
import jsxSyntax from '@babel/plugin-syntax-jsx';
import template from '@babel/template';
import type { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import {
  unique,
  preserveLeadingComments,
  JSX_ANNOTATION_REGEX,
  DEFAULT_IMPORT_SOURCES,
  COMPILED_IMPORT,
} from '@compiled/utils';

import { visitClassNamesPath } from './class-names';
import { visitCloneElementPath } from './clone-element';
import { visitCssMapPath } from './css-map';
import { visitCssPropPath } from './css-prop';
import { visitStyledPath } from './styled';
import type { State } from './types';
import { appendRuntimeImports } from './utils/append-runtime-imports';
import { buildCodeFrameError } from './utils/ast';
import { Cache } from './utils/cache';
import {
  isCompiledCSSCallExpression,
  isCompiledCSSTaggedTemplateExpression,
  isCompiledKeyframesCallExpression,
  isCompiledKeyframesTaggedTemplateExpression,
  isCompiledStyledCallExpression,
  isCompiledStyledTaggedTemplateExpression,
  isCompiledCSSMapCallExpression,
} from './utils/is-compiled';
import { isTransformedJsxFunction } from './utils/is-jsx-function';
import { normalizePropsUsage } from './utils/normalize-props-usage';
import { visitXcssPropPath } from './xcss-prop';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');
const JSX_SOURCE_ANNOTATION_REGEX = /\*?\s*@jsxImportSource\s+([^\s]+)/;

let globalCache: Cache | undefined;

const findClassicJsxPragmaImport: Visitor<State> = {
  ImportSpecifier(path, state) {
    const specifier = path.node;

    t.assertImportDeclaration(path.parent);
    // We don't care about other libraries
    if (!this.importSources.includes(path.parent.source.value)) return;

    if (
      (specifier.imported.type === 'StringLiteral' && specifier.imported.value === 'jsx') ||
      (specifier.imported.type === 'Identifier' && specifier.imported.name === 'jsx')
    ) {
      // Hurrah, we know that the jsx function in the JSX pragma refers to the
      // jsx function from Compiled.
      state.pragma.classicJsxPragmaIsCompiled = true;
      state.pragma.classicJsxPragmaLocalName = specifier.local.name;

      // Remove the jsx import; the assumption is that we removed the classic JSX pragma, so
      // Babel shouldn't convert React.createElement to the jsx function anymore.
      path.remove();
      return;
    }
  },
};

const findReactImportSpecifier: Visitor<State> = {
  ImportSpecifier(path, state) {
    const specifier = path.node;

    t.assertImportDeclaration(path.parent);
    if (path.parent.source.value !== 'react') {
      return;
    }

    if (
      (specifier.imported.type === 'StringLiteral' &&
        specifier.imported.value === 'cloneElement') ||
      (specifier.imported.type === 'Identifier' && specifier.imported.name === 'cloneElement')
    ) {
      state.reactImports = state.reactImports || {};
      state.reactImports.cloneElement = specifier.local.name;
    }
  },
};

export default declare<State>((api) => {
  api.assertVersion(7);

  return {
    name: packageJson.name,
    inherits: jsxSyntax,
    pre(state) {
      const rootPath = state.opts.root ?? this.cwd;

      this.sheets = {};
      this.cssMap = {};
      this.ignoreMemberExpressions = {};
      let cache: Cache;

      if (this.opts.cache === true) {
        globalCache = new Cache();
        cache = globalCache;
      } else {
        cache = new Cache();
      }

      cache.initialize({ ...this.opts, cache: !!this.opts.cache });

      this.cache = cache;
      this.includedFiles = [];
      this.pathsToCleanup = [];
      this.pragma = {};
      this.usesXcss = false;
      this.importSources = [
        ...DEFAULT_IMPORT_SOURCES,
        ...(this.opts.importSources
          ? this.opts.importSources.map((origin) => {
              if (origin[0] === '.') {
                // We've found a relative path, transform it to be fully qualified.
                return join(rootPath, origin);
              }

              return origin;
            })
          : []),
      ];

      if (typeof this.opts.resolver === 'object') {
        this.resolver = this.opts.resolver;
      } else if (typeof this.opts.resolver === 'string') {
        this.resolver = require(require.resolve(this.opts.resolver, {
          paths: [rootPath],
        }));
      }

      this.transformCache = new WeakMap();
    },
    visitor: {
      Program: {
        enter(path, state) {
          const { file } = state;
          let jsxComment: t.Comment | undefined;

          // Handle classic JSX pragma, if it exists
          path.traverse<State>(findClassicJsxPragmaImport, this);
          path.traverse<State>(findReactImportSpecifier, this);

          if (!file.ast.comments) {
            return;
          }

          for (const comment of file.ast.comments) {
            const jsxSourceMatches = JSX_SOURCE_ANNOTATION_REGEX.exec(comment.value);
            const jsxMatches = JSX_ANNOTATION_REGEX.exec(comment.value);

            // jsxPragmas currently only run on the top-level compiled module,
            // hence we don't interrogate this.importSources.
            if (jsxSourceMatches && this.importSources.includes(jsxSourceMatches[1])) {
              // jsxImportSource pragma found - turn on CSS prop!
              state.compiledImports = {};
              state.pragma.jsxImportSource = true;
              jsxComment = comment;
            }

            if (
              jsxMatches &&
              state.pragma.classicJsxPragmaIsCompiled &&
              jsxMatches[1] === state.pragma.classicJsxPragmaLocalName
            ) {
              state.compiledImports = {};
              state.pragma.jsx = true;
              jsxComment = comment;
            }
          }

          if (jsxComment) {
            // Delete the JSX pragma from the file, so that JSX
            // elements don't get converted to jsx functions when using Compiled.
            // This is to avoid having an import from a library that isn't
            // `@compiled/react/runtime` in the final output:
            //
            //     import { jsx } from '@compiled/react'
            //     import { jsx as _jsx } from '@compiled/react/jsx-runtime';
            //     import { jsxs as _jsxs } from '@compiled/react/jsx-runtime';

            // Hide the JSX pragma from the
            // @babel/plugin-transform-react-jsx plugin
            file.ast.comments = file.ast.comments.filter((c: t.Comment) => c !== jsxComment);

            // Remove the JSX pragma comment from
            // the Babel output.
            //
            // Note that Babel provides no way for us to traverse comments >:(
            // So the best we can do is guess that the JSX pragma is probably at the start of the file.
            if (path.node.body[0].leadingComments) {
              path.node.body[0].leadingComments = path.node.body[0].leadingComments.filter(
                (newComment) => newComment !== jsxComment
              );
            }
          }
        },
        exit(path, state) {
          if (!state.compiledImports && !state.usesXcss) {
            return;
          }

          const { pragma } = state;

          // Always import React if the developer is using
          // /** @jsx jsx */, because these will get converted
          // to React.createElement function calls
          const shouldImportReact = state.pragma.jsx || (state.opts.importReact ?? true);

          preserveLeadingComments(path);

          appendRuntimeImports(path, state);

          if (!pragma.jsxImportSource && shouldImportReact && !path.scope.getBinding('React')) {
            // React is missing - add it in at the last moment!
            path.unshiftContainer('body', template.ast(`import * as React from 'react'`));
          }

          if (state.compiledImports?.styled && !path.scope.getBinding('forwardRef')) {
            // forwardRef is missing - add it in at the last moment!
            path.unshiftContainer('body', template.ast(`import { forwardRef } from 'react'`));
          }

          const filename = basename(state.filename ?? '') || 'File';
          const version = process.env.TEST_PKG_VERSION || packageJson.version;

          path.addComment('leading', ` ${filename} generated by ${packageJson.name} v${version} `);

          // Add a line break after the comment
          path.unshiftContainer('body', t.noop());

          // Callback when included files have been added.
          if (this.includedFiles.length && this.opts.onIncludedFiles) {
            this.opts.onIncludedFiles(unique(this.includedFiles));
          }

          // Cleanup paths that have been marked.
          state.pathsToCleanup.forEach((clean) => {
            switch (clean.action) {
              case 'remove': {
                clean.path.remove();
                return;
              }

              case 'replace': {
                clean.path.replaceWith(t.nullLiteral());
                return;
              }

              default:
                return;
            }
          });
        },
      },
      ImportDeclaration(path, state) {
        const userLandModule = path.node.source.value;
        const isCompiledModule = this.importSources.some((compiledModuleOrigin) => {
          if (compiledModuleOrigin === userLandModule) {
            return true;
          }

          if (
            state.filename &&
            userLandModule[0] === '.' &&
            userLandModule.endsWith(basename(compiledModuleOrigin))
          ) {
            // Relative import that might be a match, resolve the relative path and compare.
            const fullpath = resolve(dirname(state.filename), userLandModule);
            return fullpath === compiledModuleOrigin;
          }

          return false;
        });

        if (!isCompiledModule) {
          return;
        }

        // The presence of the module enables CSS prop
        state.compiledImports = state.compiledImports || {};

        // Go through each import and enable each found API
        path.get('specifiers').forEach((specifier) => {
          if (!state.compiledImports || !specifier.isImportSpecifier()) {
            // Bail out early
            return;
          }

          (['styled', 'ClassNames', 'css', 'keyframes', 'cssMap'] as const).forEach((apiName) => {
            if (
              state.compiledImports &&
              t.isIdentifier(specifier.node?.imported) &&
              specifier.node?.imported.name === apiName
            ) {
              // Enable the API with the local name
              const apiArray = state.compiledImports[apiName] || [];
              apiArray.push(specifier.node.local.name);
              state.compiledImports[apiName] = apiArray;

              specifier.remove();
            }
          });
        });

        if (path.node.specifiers.length === 0) {
          path.remove();
        }
      },
      'TaggedTemplateExpression|CallExpression'(
        path: NodePath<t.TaggedTemplateExpression> | NodePath<t.CallExpression>,
        state: State
      ) {
        if (
          (t.isCallExpression(path.node) &&
            t.isIdentifier(path.node.callee) &&
            path.node.callee.name === state.reactImports?.cloneElement) ||
          // handle member expression React.cloneElement
          (t.isCallExpression(path.node) &&
            t.isMemberExpression(path.node.callee) &&
            t.isIdentifier(path.node.callee.object) &&
            path.node.callee.object.name === 'React' &&
            t.isIdentifier(path.node.callee.property) &&
            path.node.callee.property.name === 'cloneElement')
        ) {
          visitCloneElementPath(path as NodePath<t.CallExpression>, {
            context: 'root',
            state,
            parentPath: path,
          });
          return;
        }

        if (isTransformedJsxFunction(path, state)) {
          throw buildCodeFrameError(
            `Found a \`jsx\` function call in the Babel output where one should not have been generated. Was Compiled not set up correctly?

Reasons this might happen:

[Likely] Importing \`jsx\` from a library other than Compiled CSS-in-JS - please only import from \`${COMPILED_IMPORT}\`.

[Less likely] If you are using \`@babel/preset-react\` (or \`@babel/plugin-transform-react-jsx\`) in your Babel configuration, and you are using \`runtime: classic\`, make sure you do not use the \`pragma\` option. Please use the /** @jsx jsx */ syntax instead, or switch to \`runtime: automatic\``,
            // Use parent node to mitigate likelihood of
            // "This is an error on an internal node." warning in the
            // error output
            path.parentPath.node,
            path.parentPath
          );
        }

        if (isCompiledCSSMapCallExpression(path.node, state)) {
          visitCssMapPath(path, { context: 'root', state, parentPath: path });
          return;
        }

        const hasStyles =
          isCompiledCSSTaggedTemplateExpression(path.node, state) ||
          isCompiledStyledTaggedTemplateExpression(path.node, state) ||
          isCompiledCSSCallExpression(path.node, state) ||
          isCompiledStyledCallExpression(path.node, state);

        if (hasStyles) {
          normalizePropsUsage(path);
        }

        const isCompiledUtil =
          isCompiledCSSTaggedTemplateExpression(path.node, state) ||
          isCompiledKeyframesTaggedTemplateExpression(path.node, state) ||
          isCompiledCSSCallExpression(path.node, state) ||
          isCompiledKeyframesCallExpression(path.node, state);

        if (isCompiledUtil) {
          state.pathsToCleanup.push({ path, action: 'replace' });
          return;
        }

        const isCompiledComponent =
          isCompiledStyledTaggedTemplateExpression(path.node, state) ||
          isCompiledStyledCallExpression(path.node, state);

        if (isCompiledComponent) {
          visitStyledPath(path, { context: 'root', state, parentPath: path });
          return;
        }
      },
      JSXElement(path, state) {
        if (!state.compiledImports?.ClassNames) {
          return;
        }

        visitClassNamesPath(path, { context: 'root', state, parentPath: path });
      },
      JSXOpeningElement(path, state) {
        const compiledXCSSProp = state.opts.processXcss ?? true;
        if (compiledXCSSProp) {
          visitXcssPropPath(path, { context: 'root', state, parentPath: path });
        }

        if (state.compiledImports) {
          visitCssPropPath(path, { context: 'root', state, parentPath: path });
        }
      },
    },
  };
});
