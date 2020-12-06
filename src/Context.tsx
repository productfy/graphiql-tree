import DefaultValueCustomizer from './DefaultValueCustomizer';
import { GraphQLSchema } from 'graphql';
import NodeCustomizer from './NodeCustomizer';
import React from 'react';

const DefaultValueCustomizerContext = React.createContext<DefaultValueCustomizer>(() => undefined);
DefaultValueCustomizerContext.displayName = 'DefaultValueCustomizerContext';

const NodeCustomizerContext = React.createContext<NodeCustomizer>(() => undefined);
NodeCustomizerContext.displayName = 'NodeCustomizerContext';

const SchemaContext = React.createContext<GraphQLSchema | undefined>(undefined);
SchemaContext.displayName = 'SchemaContext';

export { DefaultValueCustomizerContext, NodeCustomizerContext, SchemaContext };
