import { GraphQLInputType, ValueNode } from 'graphql';

import ParentDefinition from './ParentDefinition';

export interface NodeCustomizerParams {
  depth: number;
  isRequired?: boolean;
  name: string;
  onEdit: (prevValueNode?: ValueNode, nextValueNode?: ValueNode) => void;
  parentDefinition: ParentDefinition;
  type: GraphQLInputType;
  value?: ValueNode;
}

type NodeCustomizer = (params: NodeCustomizerParams) => JSX.Element | void;
export default NodeCustomizer;
