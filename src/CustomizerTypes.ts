import type { GraphQLField, GraphQLInputType, ValueNode } from 'graphql';

import type Parent from './ParentDefinition';

// TODO: Fix this
export type DefaultValueCustomizer = (
  arg: any,
  parent: Parent,
) => ValueNode | undefined;

export type DescriptionCustomizer = (
  field: GraphQLField<any, any>,
  parent: Parent,
) => string | undefined;

export interface NodeCustomizerParams {
  depth: number;
  isRequired?: boolean;
  name: string;
  onEdit: (prevValueNode?: ValueNode, nextValueNode?: ValueNode) => void;
  parent: Parent;
  type: GraphQLInputType;
  value?: ValueNode;
}

export type NodeCustomizer = (params: NodeCustomizerParams) => JSX.Element | undefined;
