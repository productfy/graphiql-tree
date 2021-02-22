import DefaultValueCustomizer from './DefaultValueCustomizer';
import type { GraphQLSchema, OperationDefinitionNode, VariableDefinitionNode } from 'graphql';
import NodeCustomizer from './NodeCustomizer';
import React from 'react';

export const DefaultValueCustomizerContext = React.createContext<DefaultValueCustomizer>(
  () => undefined,
);
DefaultValueCustomizerContext.displayName = 'DefaultValueCustomizerContext';

export const DescriptionContext = React.createContext<boolean>(true);
DescriptionContext.displayName = 'DescriptionContext';

export const NodeCustomizerContext = React.createContext<NodeCustomizer>(() => undefined);
NodeCustomizerContext.displayName = 'NodeCustomizerContext';

export const OperationDefinitionContext = React.createContext<OperationDefinitionNode | undefined>(
  undefined,
);
OperationDefinitionContext.displayName = 'OperationDefinitionContext';

export const SchemaContext = React.createContext<GraphQLSchema | undefined>(undefined);
SchemaContext.displayName = 'SchemaContext';

export const VariableHandlerContext = React.createContext<
  (prevNode?: VariableDefinitionNode, nextNode?: VariableDefinitionNode) => void
>(() => undefined);
VariableHandlerContext.displayName = 'VariableHandlerContext';
