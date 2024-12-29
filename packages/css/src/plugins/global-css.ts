import { hash } from '@compiled/utils';
import { rule } from 'postcss';
import type { Container, Declaration, Plugin, Rule } from 'postcss';

interface PluginOpts {
  classNameCompressionMap?: Record<string, string>;
  callback?: (className: string) => void;
  selectors?: string[];
  atRule?: string;
  parentNode?: Container;
  classHashPrefix?: string;
}

export const groupGlobalRules = (opts: PluginOpts): Plugin => {
  return {
    postcssPlugin: 'group-global-rules',

    OnceExit(root) {
      // console.log('LOL root', root);
      // @ts-ignore
      const uniqueName = '_' + hash(root.source?.input.css);
      const rules: Rule[] = [];
      const orphanDecls: Declaration[] = [];

      root.each((node) => {
        switch (node.type) {
          // TODO: handle atRules case
          case 'decl':
            orphanDecls.push(node);
            break;

          case 'rule':
            const newNode = node.clone({
              selector: `.${uniqueName} ${node.selector}`,
            });
            newNode.parent = root;
            rules.push(newNode);
            break;

          case 'comment':
            node.remove();
            break;

          default:
            break;
        }
      });

      const groupRule = groupDeclIntoRule(orphanDecls, `.${uniqueName}`, {
        parentNode: root,
      });
      if (opts.callback) {
        opts.callback(uniqueName);
      }
      root.nodes = [groupRule, ...rules];
    },
  };
};

const groupDeclIntoRule = (decls: Declaration[], selector: string, opts: PluginOpts) => {
  const newRule = rule({
    raws: { before: '', after: '', between: '', selector: { raw: '', value: '' } },
    nodes: decls,
    selector,
  });
  newRule.parent = opts.parentNode!;
  return newRule;
};

export const postcss = true;
