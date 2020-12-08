import DefaultValueCustomizer from './DefaultValueCustomizer';
import { GraphQLSchema } from 'graphql';
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

export const SchemaContext = React.createContext<GraphQLSchema | undefined>(undefined);
SchemaContext.displayName = 'SchemaContext';
