import type {
  DefaultValueCustomizer,
  DescriptionCustomizer,
  NodeCustomizer,
} from './CustomizerTypes';
import type {
  GraphQLSchema,
  OperationDefinitionNode,
  VariableDefinitionNode,
} from 'graphql';

import { createContext } from 'react';

export const DefaultValueCustomizerContext = createContext<DefaultValueCustomizer>(() => undefined);
DefaultValueCustomizerContext.displayName = 'DefaultValueCustomizerContext';

export const DescriptionContext = createContext<boolean>(true);
DescriptionContext.displayName = 'DescriptionContext';

export const DescriptionCustomizerContext = createContext<DescriptionCustomizer>(() => undefined);
DescriptionContext.displayName = 'DescriptionCustomizerContext';

export const NodeCustomizerContext = createContext<NodeCustomizer>(() => undefined);
NodeCustomizerContext.displayName = 'NodeCustomizerContext';

export const OperationDefinitionContext = createContext<OperationDefinitionNode | undefined>(
  undefined,
);
OperationDefinitionContext.displayName = 'OperationDefinitionContext';

export const SchemaContext = createContext<GraphQLSchema | undefined>(undefined);
SchemaContext.displayName = 'SchemaContext';

export const VariableHandlerContext = createContext<
  (prevNode?: VariableDefinitionNode, nextNode?: VariableDefinitionNode) => void
>(() => undefined);
VariableHandlerContext.displayName = 'VariableHandlerContext';
