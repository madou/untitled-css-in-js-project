import * as t from '@babel/types';
import type { NodePath } from '@babel/traverse';
import type { Metadata } from '../types';

export interface UnconditionalCssItem {
  type: 'unconditional';
  css: string;
}

export interface LogicalCssItem {
  type: 'logical';
  expression: t.Expression;
  operator: '||' | '??' | '&&';
  css: string;
}

export interface SheetCssItem {
  type: 'sheet';
  css: string;
}

export type CssItem = UnconditionalCssItem | LogicalCssItem | SheetCssItem;

export interface CSSOutput {
  css: CssItem[];
  variables: {
    name: string;
    expression: t.Expression;
    prefix?: string;
    suffix?: string;
  }[];
}

export interface PartialBindingWithMeta {
  node: t.Node;
  path: NodePath;
  constant: boolean;
  meta: Metadata;
  source: 'import' | 'module';
}
